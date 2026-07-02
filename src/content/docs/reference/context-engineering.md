---
title: Context engineering
description: How to control what an AI model reads before it answers, so your agents stay fast, cheap, and accurate instead of slow, expensive, and confused.
---

Context engineering is the practice of deciding what an AI model gets to read before it answers, and just as importantly, what it does not. Everything a model reads sits in its **context window**: the model's working memory, the bounded space holding the instructions, documents, and results it can see during one request. Prompt engineering asks "how do I phrase the instruction?" Context engineering asks a broader question: of everything I *could* show the model, what earns its place? For a fund, the answer decides the quality and the cost of every AI-written screening memo and meeting brief.

## Why this matters for your fund

If your fund builds anything with AI (an [agent](/reference/agents/) that preps meetings from the CRM, a pipeline that files meeting notes, a screening assistant), context engineering decides whether it is fast, cheap, and accurate, or slow, expensive, and confused. A meeting brief built from the three relevant notes beats one built from three hundred, on quality and on cost at once. It also changes how your team should write things down: notes, runbooks, and internal wikis that an AI will one day read need to be written a particular way, covered below. You do not need to write code to apply most of this page.

The context window is the scarcest resource in an AI system. Not because it is small (current models accept hundreds of thousands of tokens, the small chunks of text a model reads and writes and the units AI usage is priced in), but because everything in it costs money on every request, adds waiting time, and competes for the model's attention. A model reasoning over 2,000 relevant tokens outperforms the same model reasoning over 200,000 mostly-irrelevant ones. So the goal is not to fill the window; it is to keep it small and relevant.

## System prompt vs retrieved context

A well-engineered agent context has two distinct layers:

- **The system prompt** is the standing instruction sheet the model gets on every run: its role, its operating rules, its decision criteria, its output format. It should be identical from run to run, down to the character (this matters for caching, covered below).
- **Retrieved context** is what is true for *this* run only: the specific records, documents, or tool results the current task needs. It arrives late, through tools or explicit insertion, and it is different every time.

[valentine](https://github.com/80x-djh/valentine), the open-source pre-call prior-contact checker, illustrates the split. Its system prompt is a single frozen constant: the agent's mode ("READ-ONLY. Always."), its process, its verdict criteria, and the shape of its one-line summary. No CRM data appears in it. The CRM data arrives through two read tools: `search_crm` finds candidate records, and `get_context` pulls notes, list memberships, and linked people, but only for a promising match. The agent never receives the whole CRM; it receives the handful of records its own searches surfaced. See [what is an agent?](/reference/agents/) for the loop that drives this.

## Retrieval beats stuffing

The naive alternative to retrieval is "stuffing": export everything and paste it into the prompt. It fails three ways. Cost, because you pay for every token on every call. Speed, because processing time grows with input size. Accuracy, because relevant facts drown in irrelevant ones; models demonstrably pay less reliable attention to material buried in the middle of very long inputs.

Retrieval means the model, or the program around it, pulls in only what the task needs. That can be tool-driven, like valentine searching and then drilling down, or the surrounding program can enforce an explicit budget. [cereal-milk](https://github.com/80x-djh/cereal-milk), the meeting-notes-to-CRM tool behind [the pour pattern](/guides/meeting-notes-to-crm/), does the latter when preparing a meeting note for extraction. The note-taking app's enhanced summary already distills the meeting, so the summary leads and the raw transcript is included only up to a size limit. The function below assembles the text the model will see, and cuts the transcript off at that limit.

```typescript
// Some meetings run thousands of transcript segments. Unbounded, they blow up
// prompt size, latency, and cost for little extraction gain.
const TRANSCRIPT_CHAR_BUDGET = 8000;

export function renderNoteForPrompt(note: Note): string {
  const parts = [`# ${note.title}`];
  if (note.summaryMarkdown) parts.push("## Enhanced note\n" + note.summaryMarkdown);
  if (note.transcript?.length) {
    // When there's no summary the transcript is the only signal, so allow more.
    const budget = note.summaryMarkdown ? TRANSCRIPT_CHAR_BUDGET : TRANSCRIPT_CHAR_BUDGET * 2;
    const full = note.transcript.map((s) => `${s.speaker}: ${s.text}`).join("\n");
    parts.push(full.length > budget ? full.slice(0, budget) + "\n…[truncated]" : full);
  }
  return parts.join("\n");
}
```

Two details in that code are worth copying even if you never write code yourself. The budget adapts: when the summary is missing, the transcript is the only signal, so its allowance doubles. And the same prepared text feeds a cost estimate (using a rough rule of 4 characters per token) that is checked against a per-call spending ceiling *before* the request is sent. The size limit is enforced by the program, not by hoping inputs stay small.

## Self-contained documents

Retrieval has a consequence for how you write: any document might be pulled out and read *alone*. A page that says "as mentioned above" or "using the setup from the previous chapter" breaks the moment a retrieval system, an agent, or a human with a clipboard separates it from its siblings.

This site is written under that constraint deliberately. Every page states its definition up front, uses headings that make sense out of context ("Rate limits in the Attio API", not "Limits"), and never leans on a previous page, because the expected reader is as likely to be an AI as a browser.

:::tip[Write your internal documents the same way]
The same rule applies to anything your agents will one day retrieve: CRM notes, runbooks, internal wikis. If a chunk of text cannot stand alone, it cannot be retrieved usefully. Prefer full names over "he agreed", dates over "last week", and the deal name in the note itself rather than only in the filename.
:::

## llms.txt as a curated index for AI readers

`llms.txt` is an emerging convention: a plain-text file at a website's root that gives AI models a curated index of the site, with a one-line description per page. Its companion `llms-full.txt` bundles the full content of every page into one file, for models that want everything in one fetch.

The reason it works is context engineering in miniature. An AI pointed at raw web pages wastes tokens on menus, scripts, and page decoration; `llms.txt` hands the model a pre-filtered, high-signal index instead. This site publishes both files, plus a plain-text version of every page, so an agent can pull exactly one page's content at exactly one page's token cost. Details in [use this site with an LLM](/start-here/for-llms/).

## Context rot on long sessions

Long agent sessions accumulate clutter. Every tool call leaves its result in the transcript, so a 40-turn session carries the full output of tool call #3 into turn #40, where it is almost certainly irrelevant, but still paid for, still occupying attention, and still capable of anchoring the model on stale facts. The symptoms of context rot: the agent re-answers an old question, acts on information that was superseded mid-session, or grows vague as the session lengthens.

Three mitigations, from cheapest to most involved:

1. **Bound the session.** valentine caps its loop at 10 steps and targets 6 or fewer tool calls per run. Small tasks should produce small transcripts by design.
2. **Prune.** Drop or shorten old tool results the model no longer needs. Model providers increasingly offer this as a built-in feature called context editing.
3. **Summarize and restart.** Compress the history into a short summary and continue in a fresh context, trading perfect recall for restored attention.

The cheapest fix of all is architectural: prefer many short, single-purpose agent runs over one long-running session. A scheduled agent that starts fresh each morning never rots; see [cron agents](/reference/cron-agents/).

## Caching economics

Prompt caching changes how you should *order* context. Model providers can cache the already-processed opening portion of a prompt so it does not have to be processed again. On Anthropic's API (the web service your code calls to reach Claude), cached tokens are re-read at roughly a tenth of the normal input price, while writing to the cache costs a small premium (about 1.25x for the default 5-minute lifetime). The cache matches the opening of the prompt exactly, so a single changed character invalidates everything after it. The default cache entry lives for about five minutes and is refreshed each time it is used.

Two rules fall out:

- **Stable content first, changing content last.** Frozen system prompt and tool definitions at the front; the per-request question at the end. A timestamp or request ID inserted at the top of the system prompt silently destroys the cache on every call.
- **Caching rewards steady loops.** An agent making a tool call every few seconds keeps the cache warm and pays about a tenth of the price for its ever-growing history; a job that runs hourly re-pays full price each time. This is also why swapping tools or models mid-session is expensive: tool schemas sit at the very start of the prompt. The token weight of those schemas is measured concretely in [CLI vs MCP: real benchmarks](/notes/cli-vs-mcp-benchmarks/).

## Practical rules

1. **Budget explicitly.** Give every context source a size cap enforced in code, like cereal-milk's transcript budget. Never rely on inputs staying small on their own.
2. **Freeze the system prompt.** Rules in the system prompt, data through tools. No timestamps, no per-user insertions.
3. **Retrieve narrow, then drill down.** A search returns candidates; a second call fetches depth for the one that matters (valentine's `search_crm`, then `get_context`).
4. **Write everything retrievable as if it will be read alone.** No "as above", no unstated prerequisites.
5. **Prefer short runs.** A fresh context per task beats heroic cleanup inside a long one.
6. **Check the numbers.** Log input tokens and cache reads per run; a cache-read figure stuck at zero means something changing has crept into the front of your prompt.

## See also

- [What is an agent?](/reference/agents/) — the loop these contexts are assembled inside
- [Tool use](/reference/tool-use/) — the mechanism agents use to retrieve context
- [CLI vs MCP](/reference/cli-vs-mcp/) — why tool schemas themselves are a context cost
- [Use this site with an LLM](/start-here/for-llms/) — llms.txt, per-page Markdown URLs
- [Meeting notes to CRM, automatically](/guides/meeting-notes-to-crm/) — the pipeline the transcript-budget example ships in
