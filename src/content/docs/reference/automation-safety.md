---
title: Automation safety
description: How CRM automations fail (loops, duplicate writes, runaway spend), and the three questions to ask before you switch any automation on.
---

Automation safety means designing your CRM automations so that when they fail, they fail in small, harmless ways. This page gives you three questions to ask before you switch any automation on, whether it is a workflow (an automation built inside your CRM by connecting trigger and action blocks), a cron (a job that runs on a timer; see [cron agents](/reference/cron-agents/)), or an [agent](/reference/agents/) (an AI model acting through tools).

## Why this matters for your fund

An unsafe automation does not usually fail loudly. It loops silently overnight, writes the same record twice, or spreads across a thousand records before anyone notices. The costs land on the fund directly: burned automation credits, duplicated records a human has to clean up, and quiet corruption of the deal flow and pipeline data partners rely on. Every pattern on this page exists because one of those things happened to somebody in production. The concepts apply on any platform; the examples come from Attio workflows and GitHub Actions crons (scheduled jobs run by GitHub's free automation service) that run daily against live fund CRMs.

The whole discipline compresses into three questions you ask before publishing anything that writes:

1. **Can this trigger itself?** (loops)
2. **What happens if it runs twice?** (idempotency, defined below)
3. **How much damage can one bad run do?** (blast radius)

## Self-triggering infinite loops

The most expensive failure shape in workflow engines is a workflow that feeds itself. The diagram below traces the cycle: an update fires the workflow, the workflow writes an update, and that write fires the workflow again.

```text
Record updated on Companies
  -> workflow runs
  -> Update record on the same Company
  -> Record updated fires again
  -> workflow runs again ...
```

Once you see the shape, the danger is obvious: nothing in the cycle ever stops it. Nothing in most workflow engines stops it either. A workflow that listens to an object (a table of records, like Companies) and writes to that same object will re-trigger itself, and the loop runs until you notice the credit graph or disable the workflow.

:::caution[Loops bill you on every pass]
If the loop includes a billed step (a write, an enrollment, an AI call), every pass charges again. A loop left running overnight can eat a meaningful share of a monthly credit allowance.
:::

Two cheap guards break the chain, and you should use both:

- **Scope the trigger.** Configure the trigger to watch only specific attributes (fields on a record), and never write those attributes from inside the workflow. If the trigger watches `owner` and the workflow writes `last_touched_at`, the write can never re-fire the trigger. The loop becomes impossible, not merely unlikely.
- **Add an early filter on authorship.** When the watched and written attributes cannot be fully separated, put a condition immediately after the trigger: `Updated by → Type → is not → Workflow`. Human edits pass; the workflow's own writes stop the run after a single free pass that changes nothing. When the filter stops a run, that is the guard doing its job, not an error.

The [Attio Workflows Handbook](https://handbook.80x.ai) covers the Attio-specific mechanics in depth; see its [infinite loops and safety](https://handbook.80x.ai/explanation/infinite-loops-and-safety) explanation for the exact block configurations. The shape, though, is universal. Webhooks (messages one system sends another when something happens) that update the record that fired them, Zapier zaps chained through a shared field, and two workflows that each trigger on the other's output all reduce to the same self-feeding cycle, and the same two guards break it.

## The idempotency habit: what if it runs twice?

Loops are the dramatic failure. The quiet one is the duplicate write. Retries, manual re-runs, overlapping schedules, and webhook redelivery (the sending system delivering the same message twice, which is normal behavior) all mean any automation will eventually execute twice against the same record. Before every write, ask: **what happens if this runs twice?** A second pass that creates another task, another list entry, or another email enrollment produces silent duplicates that a human has to find and clean up.

**Idempotent** is the engineering word for the property you want: designed so that running it a second time changes nothing. Three techniques cover almost every case:

| Technique | How it works | When to use |
|---|---|---|
| Upsert | Match on a unique key (email, external ID) and update instead of create | Record creation of any kind |
| Fill-only-empty | Write a field only when it currently has no value | Backfills, date stamping |
| Compare-before-write | Compute the desired value, PATCH only if it differs | Derived/mirror fields |

(An **upsert** is a combined update-or-insert, and **PATCH** is the standard API request for updating part of a record; an API is the doorway programs use to read and write a system's data.)

A production cron that maintains stage-transition dates for a European PE platform's dealflow list uses the second and third techniques together. It reconstructs the true first-entry date for every stage from the CRM's status history, then fills only fields that are still empty, so a manually entered date is never overwritten and re-running the job is always safe. The snippet below is the entire fill-only-empty rule.

```python
date_patch = {}
for slug, day in first_entry_dates.items():
    if not get_date_value(entry, slug):  # only fill empties
        date_patch[slug] = day
```

Notice the guard is one line: if the field already has a value, the job leaves it alone. Its sibling step formats a display string from a currency field and compares before writing, so a record that is already correct costs zero write calls. Again the guard is a single comparison.

```python
want = format_amount(label, amount)
if get_text_value(entry, disp_slug) != want:
    display_patch[disp_slug] = want
```

That cron runs twice an hour, every weekday, against live data, and it is safe because every write changes nothing unless something actually changed. The [one-file cron sync](/guides/one-file-cron-sync/) guide walks through building a full sync in this style, and the [webhook automation](/guides/attio-webhook-automation/) guide applies the same habit to event-driven writes, where redelivery makes idempotency non-optional.

## Shutting down a runaway

When something is already looping or misfiring, the order of operations matters, because every second it stays live costs another pass.

1. **Disable first, diagnose second.** Turn the workflow off (or disable the schedule, or revoke the API key if you cannot reach the switch). In-flight runs finish; new ones stop.
2. **Read the run log.** Workflow run tabs and Actions logs show every execution and what it cost. Confirm the loop and measure the damage.
3. **Find the write that re-triggered the trigger.** Trace from trigger to write step until you find the overlap. That overlap is the loop.
4. **Add a guard.** Scope the trigger away from the written attribute, or add the authorship filter.
5. **Test on one record**, confirm exactly one run, then re-enable.

:::tip[Know where the off switch is before you need it]
A kill switch is any control that stops an automation immediately. If yours has no off switch reachable in under a minute, add one before it runs unattended.
:::

## Rate limits and credit budgets

Every automation spends from two budgets: the platform's rate limit (how many requests per second it will accept before refusing) and its billing meter (credits, API calls, tokens). Design against both. A loop over N records that fetches each record's history separately makes N+1 requests per pass: fine at 200 records twice an hour, a rate-limit incident at 20,000. Page through queries with explicit limits, prefer compare-before-write so clean passes are cheap, and remember that platforms without per-workflow spending caps leave the loop guard and the trigger scope as your only real spend controls. The [Attio API field guide](/reference/attio-api-field-guide/) lists the concrete limits and the retry behavior that respects them.

## Blast-radius thinking

The cheapest insurance is making a misbehaving automation small before it can grow:

- **Dry-run first.** A dry run is a rehearsal mode: the automation logs what it *would* write without writing anything. Every writer should support one. The stage-dates cron reads `DRY_RUN=1` from its environment and prints every change it would make. A preview that exactly matches live behavior is the strongest check you can get before touching data.
- **Smallest scope.** Test on one record (a manual run-on-this-record trigger, or a single-ID option) before letting anything run against the whole object. Cap wide-ranging loops at a low limit while testing.
- **Checkpoints.** Long-running migrations and backfills should record their progress so an interrupted run resumes instead of restarting, because restarting a non-idempotent job is how duplicates multiply. The [CRM migration playbook](/playbooks/crm-migration/) treats checkpoints and verification as first-class steps.

The strongest blast-radius control is structural: automations that only read cannot loop, duplicate, or corrupt anything; see [read-only agents](/reference/read-only-agents/). When an agent must write, the containment patterns in [agents that write to your CRM](/reference/writing-agents-safely/) (owned namespaces, two-lock writes, provenance logs) pick up where this page ends.

## See also

- [Agents that write to your CRM](/reference/writing-agents-safely/) — containment patterns for AI-driven writers
- [Cron agents](/reference/cron-agents/) — scheduling gotchas for GitHub Actions automations
- [The one-file cron sync](/guides/one-file-cron-sync/) — a complete idempotent sync with a dry-run flag
- [Build an Attio webhook automation](/guides/attio-webhook-automation/) — idempotency under webhook redelivery
- [Attio Workflows Handbook](https://handbook.80x.ai/explanation/infinite-loops-and-safety) — the Attio-specific loop guards, block by block
