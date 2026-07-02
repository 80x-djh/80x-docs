---
title: Deal qualification
description: "Qualification evidence lives in call notes nobody rereads. The play: extract it into suggestion fields with citations, and keep the decision human."
---

A deal comes up in Monday's pipeline review. A partner asks who at the company actually controls the budget, and the room goes quiet. Someone was told the answer on a call three weeks ago, and it went into the meeting note, where it has sat unread ever since. The firm knows; nobody in the room does.

This is the screening and qualification workflow: deciding which deals deserve the fund's time, and being able to say why. Most CRMs (customer relationship management system: the database where the fund tracks companies, people, and deals; see [the CRM as your fund's database](/reference/crm-as-database/)) carry qualification fields for exactly this purpose: is the pain real, who decides, what would the decision process look like, who inside the company wants this to happen. And at most firms those fields are empty or stale, while the evidence that would fill them arrives every week as call notes.

This playbook generalizes a system in production at a legal-tech company: a daily pass over a pipeline of more than 2,000 active deals that reads each deal's meeting notes, extracts qualification findings, and files them as suggestions for a human to accept or reject. That system qualifies sales deals, not investments, but the doctrine transfers without modification, because the shape of the problem is identical: qualification is answered in conversation, recorded as prose, and then read by no one.

## Why qualification evidence decays

Qualification evidence decays for a structural reason: capture and use happen in different places. What was said gets captured where writing is easy, in a meeting note. What gets used in reviews and reports is structured fields, which someone has to fill in by hand, and keeping fields current is a tax that busy people defer indefinitely. So the note is written once and rarely reopened, the field is read weekly and rarely updated, and the two drift apart.

The evidence does not disappear; it becomes unreachable. Answering "who is the economic buyer here?" means rereading every note on the deal, so in practice nobody answers it, and pipeline reviews run on memory. The decay is also worst exactly where qualification matters most: the deals deepest in the pipeline have the most notes and the oldest field values, so the fund's best-documented deals are the ones whose structured picture is furthest from what the notes actually say.

A framework makes the loss visible, because it turns "is this deal qualified?" into specific questions with specific homes. [MEDIC](/glossary/#medic) is one such framework: Metrics (what measurable outcome does the buyer expect), Economic buyer (who controls the budget), Decision criteria and Decision process (how they will evaluate, and the steps to a decision), Identify pain (what problem is acute enough to act on), and Champion (who inside the account is pushing for it). The shipped system extracts those plus two extensions, paper process and competition. Nothing in this playbook depends on the letters; a fund's own diligence rubric (traction claims, round dynamics, key risks) slots into the same machinery.

## The play: extraction with citations, decisions with humans

The play has three commitments. Together they let an automated reader do the rereading nobody does, without ever taking the judgment away from the people who own it.

**1. Extract into suggestion fields, never the real ones.** For each qualification concept, create a parallel [suggestion field](/glossary/#suggestion-fields): a field the automated system owns, prefixed so its origin is unmistakable (the shipped system prefixes every one with `scout_`, as in `scout_champion`). The system reads each deal's notes and writes what it found into its own fields only. The human-owned fields are never touched, even when the notes suggest the human's value is wrong; disagreement surfaces as a suggestion sitting next to the human value, not as an edit to someone's work. Accepting a suggestion is a deliberate act, a person copying it into the real field. That boundary is the whole reason a team comes to trust the system rather than resent it.

**2. Require a citation on every finding.** Every extracted value carries a word-for-word excerpt from the meeting note it came from, and any finding without one is discarded before it is written anywhere. This is [citation-required extraction](/glossary/#citation-required-extraction), and it does two jobs. It blocks fabrication, because an invented finding has no source sentence to quote. And it makes review fast, because the person looking at a suggested champion sees the exact sentence that supports it and can judge it in seconds without opening the note.

**3. Cover the whole pipeline, and verify that you do.** Qualification extraction only changes how the fund operates if it reaches every active deal, on a schedule, so the fields stay close to the conversations. The shipped system runs daily. It also supplies the cautionary tale: early runs were capped at 50 deals per run as a precaution, sorted newest-first. Against a pipeline of more than 2,000 active deals, that combination quietly covered a sliver, and the newest deals are the ones with the fewest notes, so the older, later-stage deals with real source material were systematically missed until the cap was lifted. Treat coverage as a number you measure across the whole pipeline, not a property you assume because the job ran.

## Implementation options

### Manual: the pre-review reread

A named person rereads the recent notes on every deal due for review and updates the qualification fields by hand. This asks nothing technical and works for a small book, a handful of live deals with one owner. It fails on mechanism: rereading prose is exactly the tax that caused the decay, so coverage collapses to whichever deals are being discussed this week, and the rest of the pipeline keeps rotting.

### CRM-native: required fields and note templates

If someone on your team administers the CRM, its built-in features reduce how much evidence gets lost at the source. Required qualification fields on stage changes ("cannot move to diligence without a champion recorded") force the question to be answered at least once. Meeting-note templates with a heading per concept make the answers easier to find later. Both are worth doing, and both have the same limit: they are prevention, not extraction. Required fields filled under deadline pressure collect placeholder values, nothing native to the CRM reads prose and proposes field values from it, and neither mechanism revisits a deal when a later call changes the answer.

### Agentic: a scheduled extraction agent

The full play, for funds with an engineer or a capable AI assistant. A scheduled daily job reads each active deal's notes, asks an AI model for findings per concept with mandatory quotes, and writes the cited survivors into the suggestion fields. Everything the [automation-safety](/reference/automation-safety/) discipline requires applies: the shipped system rehearses in [dry run](/glossary/#dry-run) (a practice mode that reports what it would write without writing), keeps a [kill switch](/glossary/#kill-switch) that stops all writes with one setting, and logs every action, written or skipped, with its source note and excerpt, which is the [provenance](/glossary/#provenance) trail that answers "why does this field say that?" months later.

:::caution
One record-keeping bug from the shipped system is worth knowing before you build. Its log of already-processed findings did not distinguish rehearsal rows from live ones, so weeks of dry running filled the log and then blocked those same findings from ever being written once live mode was switched on. If your "have I done this already?" check ignores whether the action actually happened, rehearsal poisons production.
:::

The complete build, step by step and with the shipped system's other go-live lessons, is the [MEDIC deal-qualification agent guide](/guides/medic-qualification-agent/). The wider rules it implements are in [agents that write to your CRM](/reference/writing-agents-safely/).

## Metrics that prove it works

All three are computable directly from your own CRM and the system's own log.

| Metric | Definition | What good looks like |
|---|---|---|
| **Qualification coverage** | % of active deals whose qualification fields are populated, by a human value or a cited suggestion | Rising toward the whole pipeline; measure across all active deals, never just the last run's batch (the 50-deal cap above passed the second test while failing the first) |
| **Citation rate** | % of suggested values carrying a word-for-word quote that actually appears in a source note | 100% by construction; anything lower means the citation gate is being bypassed, which is the one failure to fix before all others |
| **Human acceptance rate** | % of suggestions a reviewer promotes into the real fields | A steady, meaningful share; near zero means the extraction is not trusted or not useful, and 100% means the review has become a rubber stamp |

Measure coverage before the build, so the baseline is honest and the improvement is provable (see the [playbooks overview](/playbooks/) on baselines).

## See also

- [Build a MEDIC deal-qualification agent](/guides/medic-qualification-agent/) — the complete build this doctrine generalizes
- [Agents that write to your CRM](/reference/writing-agents-safely/) — suggestion fields, citations, and two-lock writes as general rules
- [Meeting notes to CRM](/guides/meeting-notes-to-crm/) — getting the source material into the CRM in the first place
- [Pipeline hygiene](/playbooks/pipeline-hygiene/) — the discipline that keeps the rest of the pipeline data as honest as the qualification fields
