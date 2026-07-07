---
title: Meeting notes to CRM, automatically
description: Turn meeting notes into previewed, checked updates to Slack, your CRM, and Notion, from a system that never sends the same note twice.
---

A meeting ends. The note-taking app captured it. And then, in most firms, nothing happens: the decisions, action items, and risks stay in the note instead of reaching the places where work happens. By the end of this guide you will have a pipeline that closes that gap. It reads each meeting note, uses an LLM (a large language model, the kind of AI behind Claude) to pull out the decisions, action items with owners, and risks, shows you exactly what it will send, and then delivers it to a Slack channel, a CRM record, or a Notion page. It will never deliver the same note twice, never post to a new destination without your explicit sign-off, and removes anything you told it to keep private before anything leaves your machine.

The guide is grounded in [cereal-milk](https://github.com/80x-djh/cereal-milk), an open-source (MIT) tool that reads meeting notes from Granola (an AI note-taking app) and "pours" them to connected destinations. Its vocabulary is worth adopting even if you build your own. A **pour** is the structured extraction from one note: summary, decisions, action items with owners and due dates, risks with severity. A **flavour** (the tool's own spelling) is a preset that says which meetings it applies to, what to extract, where to send it, and what to leave out. Every code sample below is from the shipped codebase.

:::note[What you'll build]
A pipeline with one AI step and a safety engine around it. The AI turns a note's prose into a typed, checkable object. Deterministic code (ordinary code that always does the same thing given the same input) handles everything else: matching notes to presets, rendering messages, previewing, sending, and remembering what was already sent.
:::

:::note[What you need]
- **A meeting-notes source with an API** (a way for programs to read the notes). Granola here; anything that yields a title, attendees, a summary, and a transcript works.
- **An Anthropic API key** for the extraction step. An API key is the password a program uses to call a service; this one lets your pipeline call Claude, and usage is billed per call (each note costs a few cents, and step 3 caps it).
- **Credentials for at least one destination**: a Slack bot token, an Attio key, or a Notion key. Each is created in that product's settings, no code required.
- **The forced tool-use pattern from [tool use](/reference/tool-use/).** It is the technique that makes the AI's output arrive in a fixed, checkable shape. This guide applies it rather than re-explaining it. An AI assistant such as Claude can write and adapt every code step here for you, or you can run cereal-milk as shipped.
:::

## Why the AI does exactly one job

The pipeline has exactly one judgment call: turning prose ("Lee said he'd land the rate-limiter fix today, and we agreed to cut CSV export to protect Friday") into structured fields. That is an LLM task. Everything around it (matching notes to flavours, rendering messages, sending, recording what was sent) is deterministic code, and keeping it deterministic is what makes the guarantees below enforceable. The system's safety does not depend on the model behaving; it depends on the engine around the model.

Here is the whole pipeline in one picture:

```text
+------------------------------+
| meeting note (content hash)  |
+--------------+---------------+
               v
+------------------------------+   processed-work ledger,
| forced-tool-use extraction   |   keyed on (note, content
| -> typed pour                |   hash, flavour, dest),
+--------------+---------------+   skips any leg already
               v                   sent: a note is never
+------------------------------+   poured twice
| preview: byte-for-byte what  |
| the destination will receive |
+--------------+---------------+
               v
+------------------------------+
| first-send confirm gate      |
+--------------+---------------+
               v
        Slack / CRM / Notion
```

## Step 1: read notes, and give each one a content hash

The reader pulls new notes and normalizes each into a simple shape: `{ id, title, attendees, summaryMarkdown, transcript, contentHash }`. A content hash is a fingerprint computed from the note's text: same text, same fingerprint; any edit, a new one.

The hash matters more than it looks. For "never send twice" purposes, "the same note" means *this exact content*, not just this note ID. If the note-taking app revises a note after you poured it, the new content is legitimately new work; a re-run over unchanged content must do nothing. Hash the content once when the note is read, and carry the hash everywhere.

After this step, every note in the pipeline carries a fingerprint that changes only when its content does.

## Step 2: extract with a forced tool call into a typed pour

Do not ask the model for JSON in prose and hope. Instead, use [forced tool use](/glossary/#forced-tool-use): define one "tool" whose input schema (a formal description of allowed fields and types) *is* your output type, and tell the API the model must call that tool and nothing else. The model's only possible response is data in your shape.

The code below builds the tool from the flavour's settings and makes the forced call:

```typescript
const tool = buildPourTool(flavour); // JSON Schema built from what this flavour extracts

const res = await client.messages.create({
  model,
  max_tokens: 1500,
  system: buildSystemPrompt(flavour),
  tools: [tool],
  tool_choice: { type: "tool", name: tool.name },   // forced: this tool, nothing else
  messages: [{ role: "user", content: renderNoteForPrompt(note) }],
});
```

After this call, you have a pour object with exactly the fields the flavour asked for, not a page of prose to parse.

Three design choices in the schema do quiet safety work. The schema only asks for what the flavour wants, so if `decisions` is not in it, the model structurally cannot invent a decisions section. Fields like `owner` and `due` are allowed to be empty, so the model has a legitimate way to say "not stated" instead of guessing. And every item carries a `citation`, a word-for-word snippet from the source note, so a human previewing the pour can check any line in seconds.

Forcing the tool guarantees shape, not sense, so the output still passes through a validation check (a Zod parse, a library that rejects anything malformed) before it can touch a destination. The full pattern, sharp edges included, is in [tool use](/reference/tool-use/).

## Step 3: cap the size, and the cost, in code

The note-taking app's summary already distills the meeting, so it leads the prompt; the raw transcript comes along only as bounded supporting detail. The code below sets that bound:

```typescript
const TRANSCRIPT_CHAR_BUDGET = 8000;
// When there's no summary the transcript is the only signal, so allow more.
const budget = note.summaryMarkdown ? TRANSCRIPT_CHAR_BUDGET : TRANSCRIPT_CHAR_BUDGET * 2;
```

An unlimited transcript inflates cost and slows extraction for little gain; some meetings run to thousands of segments.

:::caution
Every extraction is a paid API call. The shipped system estimates each call's dollar cost *before* making it and checks it against a per-extraction ceiling; a note that would blow the budget fails loudly instead of spending quietly. Put your equivalent ceiling in code, not in a habit.
:::

This is [context engineering](/reference/context-engineering/) enforced in code rather than by hoping inputs stay small. After this step, no single note can produce a surprise bill.

## Step 4: one render path, so the preview is the message

The core promise to the user: *the preview is the message*. Not a paraphrase, not "roughly this", but byte-for-byte what the destination will receive. Two mechanisms uphold it.

First, every connector (the small piece of code that talks to one destination) exposes `preview(pour)` and `send(pour)`, and both run the same rendering function. Preview touches no network; send posts the rendered output. There is no code path where the sent message could differ from the previewed one, because messages are constructed in exactly one place.

Second, the extraction is cached between previewing and sending. The code below returns the stored pour when one exists:

```typescript
const key = cacheKey(deps.teamId, note, flavour, model);
const hit = POUR_CACHE.get(key);
if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
  return { pour: hit.pour, mock: hit.mock, usd: hit.usd };
}
```

With the cache, approving a previewed pour sends the *same* pour object the preview rendered. This matters because an LLM's output varies from call to call: without the cache, "preview then send" would be two separate extractions, and the human would have approved something other than what went out.

After this step, comparing a delivered message with its preview shows them identical, character for character.

## Step 5: remove private content before anything leaves

Each flavour carries redaction rules: named fields to drop before sending, such as keeping internal `risks` out of a pour that goes to an external CRM. Redaction runs through one shared function applied identically to preview and send, so what you see with a field removed is exactly what goes out with a field removed. Order matters: the removal happens before the connector is invoked, so redacted content never crosses the network at all. It is not "sent, then hidden".

After this step, a redacted field is absent from both the preview and the delivered message.

## Step 6: never pour twice, and gate the first send

Two checks stand between an approved plan and a destination, both enforced in the engine rather than the interface. The code below applies them in order:

```typescript
if (deps.repos.processed.has(note.id, note.contentHash, flavour.id, dest.id, stepIdem)) {
  results.push({ ...leg, status: "skipped-duplicate" });
  continue;
}
const needsConfirm = !deps.repos.confirmations.isConfirmed(flavour.id, dest.id);
if (needsConfirm && !opts.confirmFirstSend) {
  results.push({ ...leg, status: "blocked-needs-confirm" });
  continue;
}
```

The first check is the **ledger**: a record of every (note, content hash, flavour, destination) combination already delivered. A note is never poured twice to the same place, so re-runs, double-clicks, and a scheduled job re-processing an inbox are all safe. The ledger row is written only *after* the destination confirms receipt, so a failed send stays retryable and a successful one is never repeated.

The second check is the **first-send confirmation**, and it exists because the riskiest moment in this system's life is the first time a flavour posts to a new destination: the wrong channel, the wrong CRM object, the wrong tone in front of the wrong audience. The first send to any flavour-destination pair is blocked until a human explicitly confirms it. After one confirmed success, the pair is trusted and later pours flow.

:::caution
The first message to a new destination is the one that can embarrass you. Always send it to a private test channel first, and treat the confirmation gate as part of the product, not an obstacle.
:::

Because both checks live in the engine, every interface inherits them. cereal-milk's web interface and its [MCP](/reference/mcp/) surface (Model Context Protocol, the standard that lets AI assistants use a tool directly) call the same underlying functions, so no interface can pour something another would refuse. That design is dissected in [Model Context Protocol](/reference/mcp/).

## Check your work

1. **Preview fidelity.** Pour one note to a private test channel. Compare the delivered message against the preview; they must be identical, character for character.
2. **Pour it again.** The second attempt must report `skipped-duplicate` and deliver nothing. Then edit the note at the source and re-run: the changed content hash makes it new work, and it pours.
3. **First-send gate.** Connect a fresh destination and send without confirming; expect `blocked-needs-confirm`. Confirm once; the next pour to that pair flows without asking.
4. **Redaction.** Add `risks` to a flavour's redaction list and confirm that both the preview *and* the delivered message omit it.

## If something goes wrong

- **The same note was delivered twice.** Either the ledger row is being written before the destination confirms receipt, or your ledger key is missing one of its four parts (note, content hash, flavour, destination). Check the key first.
- **The delivered message differs from the preview.** The cache between preview and send is not being hit, so the send ran a second, different extraction. Check the cache key and its expiry window.
- **An extraction failed with a budget error.** Working as designed: the note's estimated cost exceeded the per-extraction ceiling. Raise the ceiling deliberately if the note is worth it; do not remove the check.
- **A field you redacted showed up at a destination.** Redaction must run before the connector is invoked, through the same shared function for preview and send. If it runs anywhere else, fix the ordering before anything ships again.

## Variations

- **CRM as the destination.** Point a sales flavour's connector at your deals object and the action items and next steps land on the record itself. The moment the AI starts deciding *values* for qualification fields rather than appending a note, you have crossed into [agents that write to your CRM](/reference/writing-agents-safely/) territory; the [MEDIC qualification agent guide](/guides/medic-qualification-agent/) is that build.
- **Scheduled pours.** A worker that checks the inbox on a timer and pours matching notes is safe precisely because of the ledger and the confirmation gate: the automation can only repeat sends a human already approved once.
- **Offline development.** Ship a deterministic mock extractor (a stand-in that returns fixed output) and sample notes, so the whole pipeline runs with zero credentials. Every guarantee above is then testable without an API key, which is what makes it testable in automated checks.

## See also

- [Tool use](/reference/tool-use/), forced tool calls as schema-checked structured output.
- [Context engineering](/reference/context-engineering/): transcript budgets and cost ceilings, generalized.
- [Model Context Protocol](/reference/mcp/), the thin-adapter pattern that lets every interface inherit the engine's guarantees.
- [Build a MEDIC deal-qualification agent](/guides/medic-qualification-agent/), the same extract-with-citations discipline writing CRM fields.
