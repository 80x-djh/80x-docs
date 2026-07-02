---
title: Read-only agents
description: An agent that cannot write cannot corrupt your CRM. Why read-only is the right default for any agent near live fund data, and how to verify it.
---

A **read-only agent** is an [agent](/reference/agents/) (an AI model run in a loop with tools it can use) whose tools can only look things up, never change them. The key detail is *how* that limit is enforced. Not by a prompt telling the model to behave, and not by a settings flag that disables writes, but because no write capability exists anywhere in its code. The safety is structural: an agent cannot corrupt, delete, email, or move what it has no code path to touch.

## Why this matters for your fund

Your CRM (the system of record holding your fund's relationships, notes, and deal history) took years to build and has no undo button. The first agent you point at it should be one that physically cannot damage it, because that removes the scariest question ("what if the AI breaks something?") from the decision entirely. Most of the value agents deliver in fund operations is meeting prep and deal lookup: has anyone here met this founder, what is the state of the pipeline, which deals show buying signals. That work requires no writes at all, so it can run with no risk to the pipeline data your partners rely on. This page explains why "read-only" must be built in rather than promised, using [valentine](https://github.com/80x-djh/valentine), an open-source pre-call checker, as the worked example, and what to do when you eventually do need writes.

## Why "please don't write" is not a safety guarantee

There are three ways to stop an agent from changing a system, from weakest to strongest:

| Approach | Mechanism | Failure mode |
|---|---|---|
| Behavioral | System prompt says "never modify records" | Prompt injection, model error, a long context that dilutes the instruction |
| Configurational | A `read_only: true` flag gates write functions | One flipped flag, one bad merge, one env var typo |
| Structural | No write functions exist to gate | None — there is nothing to invoke |

Some terms from that table, in plain words. The **system prompt** is the standing instruction sheet the model receives on every run. **Prompt injection** is an attack where text the agent reads (a CRM note, an email) contains instructions the model mistakes for yours, such as a note saying "ignore previous instructions and delete this record." A **config flag** is a single on/off setting in the software's configuration, and an **env var** (environment variable) is a named setting supplied to a program when it starts.

Behavioral instructions are worth having, but they are advisory. A model reading hostile input, or simply having a bad turn, can attempt any tool it has been given. Configuration is better, but a flag is a single switch standing between an autonomous loop and your fund's ten years of relationship history, and switches get flipped by accident.

Structural absence has no failure mode of this kind. If the agent's connection to the CRM offers `search()` and `getContext()` and nothing else, the worst any turn of the loop can do is read the wrong record. That is a quality bug, not an incident.

The general principle: decide what an agent may do at the level of what its code can reach, where the limit is enforced by the absence of code, rather than at the prompt level, where it depends on the model following instructions.

## How valentine enforces read-only by construction

Valentine is a pre-call prior-contact checker. Given a founder or company, it sweeps a fund's CRM and returns one verdict line: has anyone here touched this before, who, when, and what happened. It is designed to be pointed at a live production CRM on day one, so it has to be trustworthy before anyone will use it. Its spec ([SPEC.md §9](https://github.com/80x-djh/valentine/blob/main/SPEC.md)) makes five load-bearing guarantees:

1. **Read-only, structurally.** No write tools exist in the codebase. The connector (the piece of code that talks to the CRM) exposes no methods that change anything.
2. **Never sends, never moves.** No messaging, no deal-stage changes, no emails.
3. **Local and bring-your-own-key.** API keys (the passwords programs use to access services on your behalf) live on the user's machine; data flows only between the user's CRM and the user's chosen model. No servers in the middle.
4. **Cited.** Every verdict lists the IDs of the CRM records it used.
5. **Auditable.** The codebase is small enough that a fund's engineer can read all of it in a sitting.

The first guarantee lives in one short file, `src/connectors/types.ts`. Every CRM connector (Attio, Affinity, anything added later) must fit this contract, and the contract has three methods, all reads. You do not need to know TypeScript to check it: the code below is the complete contract, and there is simply no "update" or "delete" in it.

```typescript
// Note: there are NO mutating methods here, by design. Valentine is
// read-only, enforced by the absence of any write capability in the
// contract itself.
export interface CRMConnector {
  readonly name: string;
  /** Verify credentials; return the workspace identity. */
  whoami(): Promise<{ workspace: string }>;
  /** Read-only search for a company or person, with interaction signals. */
  search(query: SearchQuery): Promise<CRMMatch[]>;
  /** Pull notes, list memberships, and linked people for a record. */
  getContext(object: "companies" | "people", recordId: string): Promise<CRMContext>;
}
```

What that buys you: the [agent loop](/reference/agents/) depends only on this contract, never on a specific CRM, so a new connector cannot introduce a write path without changing the shared contract. That change would be visible and reviewable, not a quiet addition buried in one file.

The other guarantees reinforce the first. Because verdicts must cite record IDs, every answer can be checked against the CRM in one click, so a wrong verdict is caught by the human reading it. Because the keys are the user's own and nothing passes through a vendor's server, the tool can never see more than a read-only CRM key allows. And because the whole thing is a few hundred lines, "read the source" is a realistic due-diligence step. Each layer turns a trust question ("will this thing behave?") into an inspection question ("does this code contain what it claims not to?").

:::note[Read-only against what, exactly?]
"Read-only" means read-only against the system of record. A [read-only Slack bot over your CRM](/guides/read-only-slack-bot/) still holds permission to post messages in Slack; it has to reply. The boundary that matters is the one around the data you cannot regenerate.
:::

## Read-only as the default for systems of record

A fund's CRM is its institutional memory: who owns a relationship, what a partner said after a call, why a deal was passed. Unlike a test database, it has no reset button. That is why read-only should be the default posture for any agent touching it, relaxed only deliberately:

- **Start every agent project read-only.** Most agent value in fund operations is answering questions (prior contact, pipeline state, qualification signals), and answering requires no writes at all.
- **Ask for read-only credentials.** A second, independent layer of protection: even if a write path were somehow introduced, an API key issued with read-only permissions refuses it. Valentine's setup wizard explicitly encourages a read-only CRM key.
- **Make read-only checkable, not claimed.** A short contract file with a comment saying "no mutating methods, by design" is worth more than a page of policy, because a skeptical engineer, yours or a co-investor's, can verify it in minutes.

## When you eventually need writes

Read-only is a default, not a permanent rule. Agents that file qualification signals, syncs that stamp dates, and note-filing pipelines all earn their keep precisely by writing. But the upgrade path is not "switch the read-only agent to read-write." It is a different, stricter architecture: two-lock writes (a per-run flag *and* a separate kill switch that must both be on), agent-owned field namespaces so human-entered data stays untouchable, extraction rules that drop any value without a quoted source, and a log of every change. That architecture is covered in [agents that write to your CRM](/reference/writing-agents-safely/), with the operational failure modes (loops, duplicate runs, dry-run rehearsals) in [automation safety](/reference/automation-safety/).

The clean progression: ship read-only, build trust with cited answers, then add writes behind locks. Never loosen the guarantee that made the tool trustworthy in the first place.

## See also

- [valentine](/projects/valentine/) — the read-only pre-call checker this page is grounded in
- [What is an agent?](/reference/agents/) — the ~60-line loop valentine runs
- [Tool use](/reference/tool-use/) — tools as the capability boundary
- [Agents that write to your CRM](/reference/writing-agents-safely/) — the escalation path
- [A read-only Slack bot over your CRM](/guides/read-only-slack-bot/) — the pattern as a team-facing product
