---
title: CRM migration
description: "Switching CRMs moves the only copy of your fund's history. The five-phase play that gets it across intact: map, rehearse, import, verify, cut over."
---

Switching CRMs (Affinity to Attio being the switch funds ask about most) usually gets decided like any other purchase: features, pricing, a demo, a signature. But the system being replaced holds years of relationship history, deal flow, and notes that live nowhere else; it is the firm's single source of truth, [the fund's database](/reference/crm-as-database/). Moving that data is the riskiest part of the project. When the move is treated as an afterthought (an export, an import wizard, a long weekend) the damage surfaces months later, as reports that do not reconcile and history nobody trusts.

This is not hypothetical. A fund-of-funds we later worked with came out of a botched Affinity to Attio migration with roughly half of its 4,892 notes being duplicates, over 1,000 of them attached to the fund's own company record, and true first-contact dates recoverable only because they happened to survive in one explicit field. The cleanup took multiple rounds of work: backup-first duplicate removal, AI-assisted duplicate detection, and human review queues. All of it was downstream of a migration done with less care than the fund would apply to changing its own website. The asymmetry is stark. A careful migration costs days. A careless one costs a year of untrustworthy data, plus the careful migration you end up doing anyway, in reverse.

## The play: treat it like moving a production database

Five phases, in order, none skippable.

```text
schema mapping --- every field, type, transform, in writing
      |
      v
dry run ---------- full import, writes disabled, on a copy
      |
      v
import ----------- idempotent, checkpointed; interruptions
      |            resume without duplicating
      v
verify ----------- record counts + spot-checks, both sides
      |
      v
cutover ---------- old system frozen read-only
```

**1. Schema mapping first, in writing.** A schema is the list of fields your CRM holds and what type each one is (text, number, date, dropdown). Before moving a single record, produce a document that maps every field in the old system to a field, type, and conversion rule in the new one, including the fields you are deliberately dropping. This is where you discover the destination schema does not exist yet: custom objects, pipeline attributes, and dropdown options all have to be created before the import. Create them through the API (application programming interface: the doorway that lets a script set up and fill the CRM directly, without clicking through screens) and in a script, not by hand, so the setup can be repeated exactly. One Attio-specific trap: creating an attribute requires a `config` object even when it is empty, or the request is rejected with a 400 error, the API's "your request is invalid". The [Attio API field guide](/reference/attio-api-field-guide/) catalogs these traps.

**2. Rehearse with a dry run.** A [dry run](/glossary/#dry-run) executes the full import with writing switched off, or against a sandbox (a separate practice copy of the workspace), and shows you what would happen so you can compare it against what you expect. Every migration script on this site defaults to dry run and requires an explicit `--apply` flag to write anything, per [automation safety](/reference/automation-safety/). The dry run is where mapping mistakes show up as lines in a log instead of corrupted records.

**3. An import that can be safely re-run.** A migration moving tens of thousands of records over an API will be interrupted: a server hiccup, a rate limit, a laptop going to sleep. The script must save its progress as it goes (checkpoints) and resume without creating duplicates. In other words it must be [idempotent](/glossary/#idempotency): running it twice produces the same result as running it once. The usual technique is to key every record on a stable ID from the old system. Store the Affinity ID in a dedicated field in the destination; it becomes your matching key for verification, for re-runs, and for every future backfill. The duplicate catastrophe above was an import without this property, run more than once.

**4. Verify counts on both sides.** After the import, count records per object and per pipeline stage in both systems and put the two columns side by side in a table. Then spot-check: take a random sample of records and compare them field by field, including note text and dates. Counts catch wholesale loss; samples catch mangling.

**5. Cut over with the old system frozen.** Pick a window, make the old CRM read-only, import anything created since the main run, verify again, then move the team.

:::caution
Do not write to both systems "temporarily". Running two live CRMs at once is how you end up with two wrong databases, because the verification counts stop meaning anything. The read-only freeze is what keeps them meaningful.
:::

## What actually bites

The failure modes below are the ones that cost time in real migrations, not theoretical ones.

**Field-type mismatches.** The two systems' field types never line up cleanly. A free-text "Amount" column must become a proper currency field. A multi-select must map onto statuses, which allow one value at a time and have a fixed order. A person's name in a text column must become a link to that person's record, not a string. Every mismatch needs an explicit conversion rule in the mapping document. The import wizard's silent fallback is to turn everything into plain text, which is how you lose the ability to ever sum, sort, or chart that field.

**Dropdown-option mapping.** Dropdown values arrive from the old system as plain text; the new system requires the options to exist first and to match exactly. Six years of Affinity history yields spelling variants, retired stages, and options nobody remembers. List the distinct values in the export first, decide the mapping (including a deliberate policy for unmapped values: fail loudly, never skip silently), create the options via the API, then import. One scheduling note: the order of statuses in Attio cannot be set through the public API at all. Someone has to drag them into order in the interface, so put it on the plan.

**Timestamps that must be preserved.** Notes and interactions carry the dates that make history usable. Many import paths stamp the system's `created_at` (the automatic "row created" timestamp) with the import date, after which every record looks like it was born on migration weekend. Where the API accepts an explicit timestamp on creation, pass the original. Where it does not, write the true date into an explicit field (`date_added`, `meeting_date`) and treat that field as the truth forever. At the fund-of-funds above, the real first-contact dates survived only in an explicit field, while every `created_at` read as the import month. A scheduled job now maintains that field, precisely because system timestamps cannot be trusted after a migration.

**Rate limits versus the naive script.** A rate limit is the cap on how many requests per second an API will accept, and one-request-per-record arithmetic is brutal against it. Illustrative numbers (labeled as such): 5,000 companies, 8,000 people, and 15,000 notes at about 3 requests per second is roughly 2.6 hours of pure API time, before retries, before interactions, and before you discover a mapping bug and need to re-run. Fetch and write in batches where the API allows it, wrap every call in automatic retries that respect the API's own wait instructions (the `Retry-After` header), and set job time limits with real headroom. A directly related production lesson: a daily sync that made one call per company across roughly 3,600 companies ran about 19 minutes against a 20-minute limit and died routinely; fetching in bulk dropped it to about a minute. Design for the re-run, because there will be re-runs.

## Implementation options

### Manual export/import: small books only

Export to CSV (a plain spreadsheet file), clean it up in a spreadsheet, and use the destination's import wizard. This asks nothing technical of you, and it is legitimate for a young fund: a few hundred companies, notes that fit in one person's head, verification that takes an afternoon of eyeballing. The wizard's limits (everything coerced to text, no control over timestamps, no way to resume) are exactly the bite points above. Choose this tier knowingly, not by default.

### Vendor migration: keep the verification yours

CRM vendors and third parties offer white-glove migration, and it can work well. What you do not get by default is visibility into the mapping decisions: which fields were dropped, how dropdowns were coerced, what happened to timestamps. So own those phases yourself. Ask for the mapping document up front, and run your own verification counts and spot-checks before the old system is switched off. Owning the mapping and the verification keeps the fund's memory checkable no matter who runs the import.

### Scripted agentic migration: every decision auditable

For funds with an engineer or a capable AI assistant. A migration script kept in a repo (a shared, history-keeping home for code) covers schema creation, conversions, a checkpointed re-runnable import, and the verification queries. It is the only option where every decision is readable before it runs and comparable after. This is the approach behind the full Affinity to Attio migration that grounds this page: dry runs, checkpoints, resume. "Agentic" here mostly describes the build, not the run. An AI agent drafts and iterates the mapping and conversion rules quickly, while the import itself stays a plain, predictable, resumable script; you want a migration to be uneventful at execution time. Where agents help at run time is the judgment-shaped edges: deciding whether two exports describe the same company, and finding duplicates after the migration, always read-only with a human approving every write, per [writing to a CRM safely](/reference/writing-agents-safely/).

## Metrics that prove it works

| Metric | Definition | What good looks like |
|---|---|---|
| **Record-count parity** | Per-object and per-stage counts, source vs destination, with every difference explained in writing | 100% explained; "explained" may include deliberate drops, but never a shrug |
| **Spot-check pass rate** | % of a random record sample matching field-by-field (including note bodies and original timestamps) | 100% on a sample sized to your paranoia; any failure is a class of bug, not one bad record |
| **Days of dual-running** | Days between cutover and switching off the read-only source | Short and agreed in advance; long dual-running means the verification was not trusted, and indefinite means the migration never finished |

If your migration cannot produce the first two tables, it is not finished, no matter how long ago the import ran.

## See also

- [Attio API field guide](/reference/attio-api-field-guide/): field types, dropdown and status behavior, and the API traps that shape the conversion rules
- [The CRM as your fund's database](/reference/crm-as-database/), why this data deserves database-grade care
- [Automation safety](/reference/automation-safety/): dry runs, backups, and idempotency, the same rails every migration script needs
- [Pipeline hygiene](/playbooks/pipeline-hygiene/), the continuous enforcement that keeps a clean migration clean
