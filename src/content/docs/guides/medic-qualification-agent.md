---
title: Build a MEDIC deal-qualification agent
description: An agent that reads deal notes and suggests MEDIC qualification values, each backed by a quote. Humans stay in charge of the real fields.
---

By the end of this guide you will have an [agent](/reference/agents/) (an AI system that reads data, makes judgments, and acts through tools you give it) that reads the notes on each deal in your CRM, extracts the qualification signals from what was actually said, and writes each finding into a parallel set of suggestion fields it owns (`scout_metrics`, `scout_champion`, and so on). Every finding carries a word-for-word quote from the source note as proof. Humans review the suggestions and promote the good ones into the real fields. The agent never touches a field a human owns, never writes without a quote, and never goes live until two separate locks are deliberately opened.

The guide is grounded in a system shipped for **a legal-tech company**: a configurable qualification agent running daily against an Attio deals object with over two thousand active deals, plus an optional strictly read-only Slack bot over the same engine. The client is anonymized; the architecture, the gating model, and the three bugs that delayed its go-live are exactly as shipped.

:::note[What you'll build]
A scheduled daily job that reads each active deal's notes, asks an LLM (a large language model, the AI behind Claude) to find qualification signals with mandatory quotes, and writes suggestions into agent-owned fields in your CRM. A dry-run mode shows everything it *would* write. Two independent locks keep it read-only until you decide otherwise.
:::

:::note[What you need]
- **Deal notes actually in your CRM.** In the shipped system the source is Attio notes: a call-summary tool syncs call notes there, the calls themselves have no transcripts, and there is no email object, so notes are the only prose source. That is why notes are what the agent reads.
- **An Attio API token and an Anthropic API key.** An API key is the password a program uses to act on your account; one lets the agent read and write the CRM, the other lets it call Claude (billed per call). Both are created in each product's settings, no code needed.
- **Existing human-owned qualification fields** to compare against (text, dropdown, or record-link types; the "is it empty?" check differs by type, as step 2 explains).
- **[Agents that write to your CRM](/reference/writing-agents-safely/), read first.** This guide implements that page's safety rules rather than re-arguing them. Building the agent itself is real programming; an AI assistant such as Claude can write each step for you if you paste in this guide, and the read-only Slack bot at the end is a lower-stakes way to start.
:::

## What MEDIC is and why an agent fits it

[MEDIC](/glossary/#medic) is a sales-qualification framework. For each deal you want to know:

| Letter | Question the field answers |
|---|---|
| **M**etrics | What measurable outcome does the buyer expect? |
| **E**conomic buyer | Who actually controls the budget? |
| **D**ecision criteria / process | How will they evaluate, and what are the steps to a signature? |
| **I**dentify pain | What problem is acute enough to pay for? |
| **C**hampion | Who inside the account is selling on your behalf? |

(The shipped system extracts seven concepts: the five above plus *paper process* and *competition*, the MEDDPICC extensions. The mechanics are identical.)

These fields are what make pipeline reviews useful, and they are exactly the fields that go stale, because keeping the CRM tidy is a tax reps hate paying. But the raw material usually exists: call-recording tools sync summaries into CRM notes, and reps write ad-hoc notes after meetings. Extracting "the champion is the Head of Legal Ops" from prose requires judgment over unstructured text. That is precisely the job that is *not* a [one-file cron sync](/guides/one-file-cron-sync/) and *is* an LLM task. What makes it safe to automate is the write model around the AI, not the AI itself; everything below applies [agents that write to your CRM](/reference/writing-agents-safely/).

Here is the whole flow in one picture:

```text
+-----------------------+
| deal notes in the CRM |
+-----------+-----------+
            v
+-----------------------+   two locks (--apply and
| gated extraction pass |   LIVE_WRITES=1); either
+-----------+-----------+   closed means dry-run
            v
+-----------------------+   a finding without a
| citation check        |   verbatim excerpt is
+-----------+-----------+   dropped: no citation,
            v               no value
+-----------------------+
| scout_* suggestion    |
| fields (agent-owned)  |
+-----------+-----------+
            v
  human review promotes
  into the real fields
```

## Step 1: create the agent-owned suggestion fields

For each concept, create a *parallel* field in the CRM prefixed with the agent's identity: `scout_metrics`, `scout_economic_buyer`, `scout_champion`, and so on. These are [suggestion fields](/glossary/#suggestion-fields), and the prefix is the entire ownership model. It does three jobs at once: the agent's write surface is listable (it may write `scout_*` fields and nothing else), every value's origin is visible at a glance in the CRM, and a human "accepting" a suggestion is a deliberate copy into the real field, never a silent overwrite that already happened.

Run the field-creation script the same way you run everything else in this guide: [dry run](/glossary/#dry-run) first (a practice mode that prints what it would create without creating it), then apply. Creating fields is a write too.

You should now see the `scout_*` fields on the deals object in your CRM, all empty.

## Step 2: map each concept to the human field it shadows

Make the agent configurable rather than hard-coded, because every workspace names its fields differently. A small configuration file (TOML, a plain-text settings format) maps each MEDIC concept to the rep-owned field the agent must *read but never write*:

```toml
[attio]
object = "deals"
exclude_stages = ["Closed Won", "Closed Lost", "Disqualified"]

[[fields]]
concept = "metrics"
ae_attribute = "value_delivered"   # your field's api_slug
ae_type = "text"                    # text | record-reference | select
```

`ae_attribute` (AE means account executive, the rep who owns the deal) is the load-bearing line: it is how the agent decides "has the rep already filled this in?". The `ae_type` matters because "empty" looks different on the wire for a text field, a dropdown, and a record link, so the emptiness check must know the type. `exclude_stages` keeps the agent off closed deals, where suggestions are noise.

After this step, your config file lists one block per concept, each pointing at a real field in your CRM.

## Step 3: gather notes and filter for substance

Each run, for each active deal, the agent pulls the notes from a lookback window and drops the ones with nothing to extract: calendar stubs, one-liners, automated placeholders. This "is it meaningful?" filter is cheap and matters twice. It cuts the token cost (LLM calls are billed by the amount of text processed), and it keeps the extractor from being asked to find signal in noise, which is the situation where models are most tempted to invent.

After this step, a run's log shows how many notes were read and how many were worth extracting from.

## Step 4: extract with citations required, structurally

The extraction call gives Claude the note text and asks for findings per concept, where every finding must include a **word-for-word excerpt from the source note** as its citation. Then the rule is enforced in code, not in the prompt: **any finding without a citation is dropped before it gets anywhere near a write.** The shipped system's rule is blunt: no citation, no value.

This one constraint does most of the anti-hallucination work (hallucination is the standard term for an AI confidently stating something that is not in its source). A fabricated finding has no excerpt to quote, so it dies at the gate. A real finding carries the sentence that proves it, so the human reviewing `scout_champion` can judge it in five seconds without opening the note. [Citation-required extraction](/glossary/#citation-required-extraction) turns "trust the model" into "check the quote".

After this step, every surviving finding in the run's output carries a quote you can search for in the source note.

## Step 5: decide per finding against the human field

For each cited finding, the agent compares against the rep-owned field it shadows and takes exactly one of three actions:

```
AE field filled                      → skip (logged, never touched)
AE empty, scout field empty          → suggest_new    → write scout_<concept>
AE empty, scout field differs        → suggest_update → overwrite scout_<concept>
```

The first row is the contract with the humans: **if a rep wrote something, the agent defers, always**, even when the notes suggest the rep is wrong. Disagreement is surfaced by the suggestion sitting next to the human value, not by the agent editing people's work. This is what makes reps tolerate, and then start relying on, an agent in their pipeline.

## Step 6: gate writes twice, log everything

No write happens unless **both** locks are open: an `--apply` flag on the command that starts the run, *and* a `LIVE_WRITES=1` environment variable (a named setting the program reads at startup). One lock is per-run intent, "this run may write". The other is a standing [kill switch](/glossary/#kill-switch), "this deployment may write". Either one closed leaves the agent in dry-run, where it does all the reading, extraction, and deciding, and writes nothing. This is the [two-lock write](/glossary/#two-lock-write) pattern.

Every action, whether written, dry-run, or skipped, goes into a local SQLite log (SQLite is a database that lives in a single file, with nothing to install or run). Each row records the deal, the field, the previous, new, and rep values, the source note and excerpt, the model used, and the timestamp. This is the [provenance](/glossary/#provenance) trail that answers "why does this field say that?" months later. It also doubles as the run's memory: a finding already processed for a given deal, field, and source note is not proposed again, which is what makes re-runs safe.

:::caution
One shipped bug lives exactly here, and it is subtle enough to steal the lesson from. The duplicate check originally matched on (deal, field, source note) **without distinguishing dry-run rows from live rows**. Weeks of dry-running filled the log, and then blocked those same findings from ever being written once live mode was switched on. The fix was one condition (`AND dry_run = 0`). If your duplicate check ignores whether the action actually happened, dry-running poisons production.
:::

After this step, running with either lock closed prints a full report of intended writes and changes nothing in the CRM.

## Step 7: run it daily, then actually verify it went live

Schedule the batch pass daily; any scheduler works (the options are in [cron agents](/reference/cron-agents/)). Then verify liveness end to end, because layered safety fails *closed*, and silently. The shipped system "ran" for days without writing anything, for three compounding reasons: the environment kill switch was still `0`, the scheduled command was missing `--apply`, and the dry-run-poisoned duplicate check described above. Every layer did its job; the operator simply had not opened the locks. A fourth, quieter issue capped each run at 50 deals sorted newest-first, covering a sliver of a 2,000-deal pipeline and systematically missing the older, later-stage deals that actually had notes worth reading.

The go-live checklist that falls out of those four:

1. Set `LIVE_WRITES=1` in the deployment.
2. Include `--apply` in the scheduled command.
3. Size the per-run deal cap to your pipeline.
4. Choose an ordering that reaches the deals with source material.

After this step, the day's log shows real writes, and the `scout_*` fields in the CRM are filling in.

## Check your work

1. **Dry-run one deal you know well.** Run against a single deal with rich notes, locks closed. Read the proposed `scout_*` values and check each citation against the note; the excerpt must actually appear there.
2. **Check the skip behavior.** Pick a deal where a rep filled a field. The log must show `skip`, and the rep's value must be untouched.
3. **Go live on one deal.** Open both locks for a single-deal run and confirm the `scout_*` fields appear in the CRM with the expected values. The shipped go-live was verified exactly this way, on one deal, before any backfill.
4. **Run twice.** A second live run over the same notes must propose nothing new. If it writes again, your duplicate check is broken; see step 6.

## If something goes wrong

- **The agent "runs" but nothing ever appears in the CRM.** Work through the go-live checklist in step 7: the kill switch, the `--apply` flag, the deal cap, and the ordering. In the shipped system all four were wrong at once, and no error was raised, because safety layers fail quietly.
- **Findings that showed up in dry runs never get written live.** The dry-run-poisoning bug from step 6: your duplicate check is matching dry-run rows. Add the `dry_run = 0` condition.
- **A suggestion appears with no quote, or a quote that is not in the note.** The citation gate is not being enforced in code. Fix that before anything else; it is the anti-hallucination mechanism.
- **A rep's field was overwritten.** The step 5 contract has been violated, which should be structurally impossible if the agent only writes `scout_*` fields. Audit the write path and the field list it is allowed to touch.

## The optional read-only Slack bot

The same engine supports a second front end with the opposite risk profile: a Slack bot that answers `@bot <deal name>` with that deal's MEDIC summary, citations included, in the message thread. It shares the extraction and formatting code but has **no write path at all**: read-only because the write code is absent, not because a rule forbids it, which is the guarantee explained in [read-only agents](/reference/read-only-agents/). (Its only write permission is posting its own Slack replies.)

:::tip
This bot is the cheapest way to get value from the agent before anyone is comfortable opening the write locks. Run it for a week, let the team judge the extractions in conversation, then go live on writes. The [read-only Slack bot guide](/guides/read-only-slack-bot/) builds it.
:::

## Variations

- **Different frameworks, same skeleton.** MEDDPICC (as shipped), BANT, or your fund's own qualification rubric: only the concept list and the config mapping change. Nothing in steps 3 through 7 knows what the letters stand for.
- **VC diligence instead of sales.** Map concepts like "traction claims", "round dynamics", and "key risks" onto suggestion fields on a deals object; the citation-required, suggest-don't-overwrite mechanics transfer intact. The operating rhythm this feeds is covered in [pipeline hygiene](/playbooks/pipeline-hygiene/).
- **Human-in-the-loop promotion.** Promotion can stay manual (a partner copies the suggestion into the real field) or get a lightweight review interface. Keep the agent out of it either way: the day the agent writes a rep-owned field "just this once", the ownership model is gone.

## See also

- [Agents that write to your CRM](/reference/writing-agents-safely/): two-lock writes, agent-owned fields, and citation-required extraction as general rules.
- [Read-only agents](/reference/read-only-agents/): why the Slack bot's guarantee is structural, not a promise.
- [Pipeline hygiene](/playbooks/pipeline-hygiene/), the fund-operations problem this agent exists to solve.
- [The one-file cron sync](/guides/one-file-cron-sync/), the non-AI baseline; reach for this agent only when the field requires judgment.
