---
title: Pipeline hygiene
description: Unreliable pipeline reports come from a CRM that has quietly drifted. Keep it accurate with small automated checks that run continuously, not cleanups.
---

The funnel chart in the LP deck. The conversion rates at the partner offsite. The "deals reviewed this quarter" number. Every one of these comes from the same place: the system where your team records deals. If that system is wrong, every one of those numbers is wrong, and wrong in the worst way: silently, plausibly, and in whichever direction nobody checks.

Pipeline hygiene is the maintenance side of deal flow and pipeline management: the discipline of keeping that system truthful. The core claim of this playbook is that it only works as automation that runs continuously. Quarterly cleanups do not work, because the dirt accumulates continuously: three weeks after a cleanup, the pipeline is dirty again and the reports are wrong again.

## How a CRM lies, concretely

Your CRM (customer relationship management system: the database where the fund tracks companies, people, and deals) can mislead you in three main ways. Each example below comes from a system we were brought in to fix. Clients are anonymized per this site's rules; the numbers are real.

**Duplicates.** A fund-of-funds came out of a botched migration (a migration is the move of all data from one CRM to another, here Affinity to Attio) with 4,892 notes in the workspace. A first cleanup removed duplicates carefully: a full backup was taken before anything was touched, and every deletion was rehearsed in a [dry run](/glossary/#dry-run) first, meaning the program reported what it would delete without deleting it. That pass left 3,407 notes. Later passes caught subtler duplicate types (re-imports stamped with a second date, the same note captured by two different tools, twins that differed only in formatting) and brought the total to 2,358. Roughly half the notes in the CRM were copies. Over 1,000 of them had been dumped onto the fund's own company record. Until the cleanup, "how many touchpoints do we have with this company?" returned numbers that were confidently, meaninglessly double.

**Dead deals with no close dates.** Deals that die in conversation but never in the CRM sit in active stages for months. Every open-pipeline count is inflated, every conversion rate diluted, and the one report a GP most wants ("what is actually live right now?") can only be read with a partner's memory as the decoder. For one fund we run automated email alerts that flag stale deals (no activity beyond a threshold) and deals whose expected close date has passed, delivered to the deal owner on a schedule. The alert does not close the deal; a human does. What it removes is the option of not deciding, silently, forever.

**Missing date stamps.** Funnel and speed metrics are computed from the dates deals moved between stages. At a European PE platform, those dates were being stamped by a [webhook](/glossary/#webhook) (a real-time trigger: the CRM calls your program the instant something changes) that had quietly stopped running. A separate automation inside the CRM, which maintained calculated display fields, had also stopped, months earlier. The only way anyone could tell was by noticing that every record created before a certain date had the field and every record created after did not. Deals with missing dates simply vanished from the funnel chart. The report was not wrong so much as quietly incomplete, which is worse, because incomplete looks fine. The fix backfilled 76 date fields across 54 deals from the CRM's own status history, then moved the stamping into a scheduled job that re-checks everything on every run.

The common thread: none of this was carelessness. It was one-shot fixes (a migration script run once, a webhook deployed once, an automation configured once) with nothing checking afterward that the rule they enforced still held.

## The play: rules that are continuously enforced

Write each hygiene rule down as an invariant, which is a statement that must always be true. For example: "every deal in a closed stage has a `closed_date`", "no two notes on a record are identical", "no active deal goes untouched for 60 days without a flag". Then run a scheduled job (a small script that runs automatically on a timetable) that enforces each one: it checks the whole book, repairs what it safely can, and flags what it cannot. The enforcement jobs share four properties, covered in depth in [automation safety](/reference/automation-safety/):

- **Idempotent.** [Idempotent](/glossary/#idempotency) means running the job twice has the same effect as running it once: a run that finds nothing to fix changes nothing. That makes running it daily free and safe. The dedup tool above, re-run after its cleanup, plans zero further deletions. That is the test.
- **Fill empty, never overwrite.** Backfills write only where a field is blank, so the automation can never wipe out a value a human set deliberately.
- **Backup first, dry run by default.** Every job that deletes or changes data writes a full backup and a log of intended changes before touching anything, and does nothing until you explicitly tell it to apply. The fund-of-funds dedup ran to completion across four passes with zero errors and a complete rollback trail, because that was the default posture, not heroics.
- **Escalate ambiguity, do not resolve it.** The dedup left 60 groups of look-alike notes for human review rather than guessing, and published its lowest-confidence findings to a review list inside the CRM itself rather than deleting them. An automation that guesses on ambiguous data is just a hygiene problem on a schedule.

## Implementation options

### Manual: the quarterly cleanup

An ops person exports the book, hunts duplicates in a spreadsheet, and chases deal owners for close dates. This is how most funds actually operate, and it fails on mechanism, not effort: debt builds up continuously and cleanups happen occasionally, so reports are only trustworthy in the week after a cleanup. It is a reasonable choice for a book of a few hundred records. Past that, the cleanup itself becomes a project nobody schedules.

### CRM-native: required fields and workflows

If someone on your team administers the CRM, its built-in features prevent a real share of the debt at the source: required fields on stage changes ("cannot move to Closed without a `closed_date`"), built-in duplicate detection on website domain or email, and workflow rules that stamp a date when a status changes. Use these; prevention is cheaper than repair. Two structural limits, though. First, these rules only apply when a person edits through the CRM's screens. Imports, integrations, and API writes (software writing to the CRM directly) go around them, which is exactly how the migration mess above got in. Second, automation configured inside the CRM exists nowhere else: there is no written copy, no change history, and no alert when it stops.

:::caution
Both silent failures in the date-stamping story above were automations that lived only inside the CRM or ran only once. If a report your fund relies on depends on an automation, that automation needs to live somewhere you can see it running.
:::

### Agentic: enforcement jobs on a schedule

The full play, for funds with an engineer or a capable AI assistant. Each invariant becomes a small scheduled job kept in version control (a shared, history-keeping home for code, typically GitHub) and run on a timetable, typically as a GitHub Actions cron job, which is GitHub's built-in scheduler. Each job has logs, retries, and the safety properties above. The [one-file cron sync](/guides/one-file-cron-sync/) is the template: one file, one invariant, fill-empty writes, idempotent by construction. Real jobs in this shape from the systems above: a daily job stamping each company's first-contact date from its earliest pipeline entry; a half-hourly job re-checking calculated fields and stage dates and repairing any drift; stale-deal and overdue-close alerts on a schedule.

One production lesson worth stealing: the first version of the date-stamping job made one API call per company across roughly 3,600 companies. It ran about 19 minutes against a 20-minute limit, and on slow days a single transient server error (a 502, the web's "try again later") killed the whole run. Fetching all the data in bulk up front and wrapping every call in automatic retries brought the same job down to about a minute. Enforcement jobs must themselves be reliable, or they become one more silent failure.

### What "agentic" adds beyond a schedule

Scheduled scripts enforce rules that can be stated precisely. The judgment-shaped remainder ("are these two differently worded notes the same meeting?") is where an [agent](/reference/agents/) earns its cost. The fund-of-funds' final dedup pass sent agents through each company's notes to find functional duplicates (same meeting, different formatting), with a second verification step that argued against each finding and correctly rejected 5 false candidates. The agents only identified; humans approved every deletion. That division of labor is described in [writing to a CRM safely](/reference/writing-agents-safely/).

## Metrics that prove it works

| Metric | Definition | What good looks like |
|---|---|---|
| **Required-date completeness** | % of records where every date the funnel needs (entered-stage, closed, first-contact) is populated | ~100%, held flat by enforcement; a dip means a job broke |
| **Duplicate rate** | Duplicate records/notes found per enforcement run | Spikes at cleanup, then near-zero per run; a rising trend means some source is injecting them |
| **Stale-deal count** | Active-stage deals with no activity past threshold | A steady, low number with visible weekly turnover; zero usually means the threshold is too loose |

Watch the shape of the trend as much as the level. One-shot cleanups produce a sawtooth chart: clean, decay, clean, decay. Continuous enforcement produces a flat line. If your hygiene metrics sawtooth, you have cleanups, not hygiene.

## See also

- [Automation safety](/reference/automation-safety/) — dry runs, backups, idempotency, and kill switches for anything unattended
- [The one-file cron sync](/guides/one-file-cron-sync/) — the smallest complete enforcement job
- [The CRM as your fund's database](/reference/crm-as-database/) — why hygiene is a database-administration problem
- [CRM migration](/playbooks/crm-migration/) — how the worst hygiene debt gets created in a single afternoon
