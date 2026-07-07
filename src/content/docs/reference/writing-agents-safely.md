---
title: Agents that write to your CRM
description: Four containment patterns that let an AI update your CRM without ever touching what a human typed, tested on a live sales pipeline.
---

A **writing agent** is an [agent](/reference/agents/) (an AI model acting through tools) whose tools can change your system of record, not just read it: it creates or updates CRM fields instead of only answering questions about them. That single capability changes the engineering problem entirely. A [read-only agent](/reference/read-only-agents/) is safe because it has no ability to change anything; its worst turn reads the wrong record. A writing agent's worst turn silently replaces something a human typed into the pipeline, and nobody notices for a month.

## Why this matters for your fund

At some point you will want an agent that writes, because that is where screening and qualification starts paying for itself: findings filed into the pipeline instead of read once and lost. Agents that keep qualification fields current, syncs that stamp stage dates, and pipelines that file meeting notes all earn their keep precisely by writing, and all share one risk: corrupting the pipeline data your partners rely on. The four patterns on this page (**agent-owned namespaces**, **two-lock writes**, **citation-required extraction**, and **provenance logs**) are what make that safe enough to run against a live CRM. They are also a checklist you can hold any vendor or engineer to: if a product writes to your CRM and cannot answer "which of these protections do you have?", that is a finding. All four patterns are grounded in a MEDIC deal-qualification agent shipped for a legal-tech company, including the failures it actually hit on the way to production.

## Why writes are riskier than reads

The gap is not a matter of degree. Three properties of AI-driven systems that are tolerable in a reader become dangerous in a writer:

| Property | In a read-only agent | In a writing agent |
|---|---|---|
| Nondeterminism | A wrong answer, caught by the human reading it | A wrong value persisted where the human *stops* looking, because "the CRM says so" |
| Prompt injection | A note saying "ignore instructions" can at worst skew one answer | The same note can now steer what gets written, to which records |
| Re-runs and retries | A duplicate read costs a few tokens | A duplicate write creates duplicates, overwrites, or re-applies stale extractions |

Three terms from that table, in plain words. **Nondeterminism** means the same input can produce different outputs; AI models are not perfectly repeatable. **Prompt injection** is an attack where text the agent reads (a CRM note, an email) contains instructions the model mistakes for yours. **Tokens** are the small chunks of text a model reads and writes, and the units AI usage is priced in.

There is also a visibility problem specific to CRMs: a corrupted field does not crash anything. It sits there, plausible-looking, feeding pipeline reviews. So the goal is not "the agent never errs" (it will) but "every error is confined to space the agent owns, visible in a log, and reversible." The clean progression, argued in [read-only agents](/reference/read-only-agents/), is to ship read-only first and add writes behind a stricter architecture. This page is that architecture.

## The grounding system: a MEDIC extraction agent

The example throughout is a deal-qualification agent built for a legal-tech company's sales team. MEDIC is a sales-qualification checklist; its fields (Metrics, Economic Buyer, Decision Criteria, Identified Pain, Champion, plus paper process and competition) are what make pipeline reviews useful, and they are exactly the fields that go stale, because updating them is the chore reps skip. The agent reads each deal's notes (call summaries sync into the CRM as notes), extracts those signals with Claude, and files them as *suggestions* for a human to accept. It runs as a daily scheduled pass; a strictly read-only Slack bot fronts the same engine for on-demand summaries.

The diagram below traces one finding's journey from extraction to log, past every safety gate on this page.

```text
┌───────────────────────────────┐
│ extraction (citation required)│
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│    dry-run (the default):     │  either lock closed → decisions
│  decide, log, write nothing   │  are logged, the CRM is untouched
└───────────────┬───────────────┘
                │ lock 1 (--apply) AND lock 2 (LIVE_WRITES=1)
                ▼
┌───────────────────────────────┐
│  live write, into agent-owned │
│  scout_* fields only          │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ provenance log (every action, │
│ written, dry-run, or skipped) │
└───────────────────────────────┘
```

Every pattern below is one stage of that pipeline.

## Agent-owned namespaces: write only to fields you own

The single most important design decision: **the agent never writes to a human-owned field.** For every qualification concept, the workspace carries two fields: the rep-owned field (`economic_buyer`, say) and a parallel agent-owned suggestion field (`scout_economic_buyer`). The `scout_*` prefix marks the agent's namespace, its clearly labeled set of fields. The agent *reads* the rep field to decide whether the rep has already answered the question; it *writes* only to the `scout_*` fields. A human promotes a suggestion into the real field, or ignores it. This is the field-ownership split from [CRM as database](/reference/crm-as-database/), applied to an AI writer:

| Rep-owned field state | Extracted finding | Agent action |
|---|---|---|
| Filled by the rep | Anything | Skip: logged, field never touched |
| Empty | New signal | Write suggestion to `scout_*` |
| Empty | Signal differs from a prior suggestion | Update the `scout_*` suggestion |

Two practical notes. First, "empty" must be checked per field type: an unfilled text field, an unset link to a person, and an unchosen dropdown option all encode emptiness differently, and a naive check will misread one of them. The shipped agent checks emptiness per field type for exactly this reason. Second, the agent's own setup step creates the `scout_*` fields (rehearsal first, then apply), so the boundary is visible right in the CRM's field list.

The payoff: even a maximally wrong run (invented extractions, prompt-injected content, the works) lands entirely inside fields whose only consumer is a human deciding whether to promote them. The damage is capped at the suggestion column.

## Two-lock writes: a standing switch and a per-run flag

No write executes unless **two independent locks are open**: a per-run `--apply` flag (an option passed each time the job is started) *and* an environment variable, a named setting supplied to the program, set to `LIVE_WRITES=1`. Miss either and the run is a full dry run, a rehearsal: the pipeline executes, decisions are made, the log fills up, but nothing touches the CRM.

| `--apply` | `LIVE_WRITES=1` | Result |
|---|---|---|
| no | no | Dry-run |
| yes | no | Dry-run |
| no | yes | Dry-run |
| yes | yes | Live writes |

Why two locks and not one? They answer to different people on different timescales. The flag expresses intent for this run: a schedule or an operator saying "this run should write." The environment variable is a standing kill switch: set it to `0` and every future run degrades to rehearsal, regardless of what the schedule passes, without touching code or schedules. That is the under-a-minute off switch that [automation safety](/reference/automation-safety/) calls for. And because both locks default to closed, the safe state is the unconfigured state: a fresh install or a half-finished deployment refuses to write.

## Citation-required extraction: no source, no value

Every extracted value must carry a word-for-word excerpt from the note or message it came from, **and a finding without a citation is dropped**, not written with a warning. This is the write-side twin of the required `citations` field in valentine's verdict tool (see [what is an agent?](/reference/agents/)), and it does two jobs at once:

- **It blocks invented answers structurally.** The model cannot quote what the notes do not contain, so a fabricated economic buyer fails the gate before any write decision is made. The failure changes from "plausible wrong value in the CRM" to "no suggestion," which costs nothing.
- **It makes review a two-second decision.** The human looking at `scout_economic_buyer` sees the quoted sentence from the call summary next to the suggested value. Accepting or rejecting requires no digging.

The rule is deliberately blunt. A softer version ("cite where possible") erodes as models and prompts change; a hard drop rule can be tested, and it holds.

## Provenance: log every action, including the ones that did not write

Every action the agent takes (written, dry-run, or skipped) goes into a provenance log, a record of what was done and why, kept in SQLite, a small database that lives in a single file on the machine. Each entry holds the deal, the field, the previous value, the new value, the rep-owned value it deferred to, the source note and excerpt, the model used, and a timestamp, grouped by run. That log is three things:

- **An audit trail.** "Why does this field say that?" has a lookup-able answer, down to the note that justified it.
- **An undo map.** Because previous values are recorded, any write can be reversed, and a whole bad run can be reversed as a unit by its run ID.
- **The dry-run preview.** A rehearsal produces the same log rows as a live run minus the write itself, so "what would this change?" is answered by the same table you audit later.

The query below, in SQL (the standard language for asking databases questions), pulls up everything the most recent run did.

```sql
-- what did the most recent run do?
SELECT deal, field, action, new_value, source_excerpt
FROM provenance
WHERE run_id = (SELECT run_id FROM provenance ORDER BY id DESC LIMIT 1);
```

The answer comes back as a table: one row per action, each with the value written and the note excerpt that justified it.

## Failure modes actually hit

The agent above shipped, and going live surfaced three compounding faults. All were instructive, and none was catastrophic, because the containment held while they were found.

**Silent dry-run in production.** The daily scheduled job ran for days writing nothing: the kill switch was still `0` *and* the schedule's script omitted `--apply`. Both locks were doing their job, but the operators read the scheduled runs as working. The lesson is not to weaken the locks. It is that a rehearsal must announce itself in its run summary loudly enough that a human notices "0 writes, 14 would-be writes" on a job that is supposed to be live.

**The duplicate check that blocked real writes.** To survive re-runs on the same input, the agent skips any (deal, field, source-note) combination already present in the provenance log. The shipped version matched those rows *without checking whether they were rehearsal rows*, so weeks of dry-running had seeded the log with entries that then blocked the same suggestions from ever being written live. The fix was one condition (`AND dry_run = 0`), but the general lesson is sharper: your duplicate protection must distinguish "processed" from "actually applied," or your rehearsals will block the real thing.

**Partial coverage from a leftover test cap.** A per-run cap on how many deals to scan, sensible while testing, shipped at its low test value, and the run ordered deals newest-first, so the agent never reached the older, later-stage deals that actually had notes worth extracting. A partial pass is a safety issue, not just a coverage one: humans assume a field-filling agent has *seen everything*, and act on its silence. Test caps need an explicit production value and a logged "scanned X of Y" count.

The classic disaster, overwriting human edits, never fired. That is the architecture working: the owned namespace plus the skip-if-rep-filled rule make it structurally hard, not merely discouraged. The failures that remained were all recoverable operational faults, visible in the provenance log, fixed without any data cleanup.

## See also

- [Read-only agents](/reference/read-only-agents/), the default posture this page escalates from
- [Automation safety](/reference/automation-safety/): idempotency, kill switches, and dry-run gates for anything unattended
- [CRM as database](/reference/crm-as-database/), the ownership split that owned namespaces formalize
- [Build a MEDIC deal-qualification agent](/guides/medic-qualification-agent/): the full system this page is grounded in, step by step
- [Attio API field guide](/reference/attio-api-field-guide/), the API sharp edges a writer must handle
