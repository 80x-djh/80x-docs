---
title: LP fundraising operations
description: "Run your raise like deal flow in reverse: LP stages, owners, a commitment-weighted pipeline against target, and stale-contact hygiene in your CRM."
---

For most of a fund's life, the partners ask the questions: they diligence companies, judge teams, and decide where the money goes. During a raise, the direction reverses. Limited partners ([LPs](/glossary/#lp-limited-partner), the investors in a fund) diligence you: your track record, your team, your pipeline, your references. You are the one being qualified.

Inside the firm, that reversal creates the question founders usually face: where does the raise actually stand? Ask it mid-raise and the honest answer at many funds is a feeling. Conversations live in individual partners' inboxes, the target list is a spreadsheet with three owners and no dates, and "how much is committed against target?" gets answered from memory. LP fundraising and investor relations is a pipeline workflow like any other; most funds just never build the pipeline for it, because raising feels like a season rather than an operation.

This playbook is grounded in a fundraising pipeline built for an Australian VC fund raising its first fund, inside its CRM (customer relationship management system: the database where a fund tracks companies, people, and every interaction; see [the CRM as your fund's database](/reference/crm-as-database/)): 50-plus LP records, 17 live pipeline entries at the time of the build, and the stage, probability, and view structure described below.

## The play: run the raise like deal flow in reverse

In a deal pipeline the fund diligences companies. In a raise the fund is the company, and the LPs are the pipeline. Everything your firm already knows about running deal flow (stages, owners, dates, follow-up hygiene) applies unchanged. The play has three parts.

**1. Model LPs as records of their own, with a pipeline on top.** LPs get their own object in the CRM rather than being wedged in among portfolio companies, and the raise itself is a pipeline list over those records. Each pipeline entry carries the fields a raise actually needs: target commitment, probability, owner, lead source, last contact date, interest level (High, Medium, or Low), and LP type (family office, institution, and so on). Owner and last contact date are the two that keep the raise honest; the rest make it reportable.

:::tip
Record every commitment in the fund's home currency from day one. A pipeline summed across un-converted currencies is not a number, and the middle of a raise is the wrong time to start normalizing.
:::

**2. Use stages that match how LP conversations actually move, and give each one a probability.** A raise's funnel has different edges from a deal funnel, so the grounded build extended the standard stages in both directions: a "Contacted" stage at the top, because early in a first raise much of the book is outreach that has not yet been answered, and a "Closed / Wired" stage at the bottom, because a verbal commitment is not capital until it is wired. Each stage maps to a probability, which is what turns the pipeline into a forecast: multiply each entry's target commitment by its stage's probability, add them up, and you have the **weighted pipeline**, a single number the fund can hold up against its target. If the weighted pipeline covers the target several times over, the raise is on track; if it covers only a fraction of it, the problem is at the top of the funnel, and no amount of closing effort will fix it.

**3. Build the views that answer the partners' actual questions.** The grounded build keeps eight saved views over the same 17 live entries, and they earn their place by each answering a question someone asks weekly: by owner (who is carrying which relationships, and who is overloaded), by stage (where the funnel is thick and where it is thin), by LP type (is this raise leaning too hard on family offices), and stale contacts (live entries whose last contact date has slipped past a threshold). The stale-contacts view is the hygiene loop of the raise. In fundraising, silence is how commitments die, and a view that surfaces every relationship going quiet turns "we should circle back to them" from a memory into a queue.

## Implementation options

### Manual: the spreadsheet

One sheet, one row per LP, columns for stage, owner, commitment, and last contact. This is how most first raises start, and for a small book run by a single partner it is legitimate. It fails in predictable ways as the raise grows: several partners edit or forget to, nothing records when a stage changed so the funnel has no history, the weighted arithmetic is a formula someone must maintain, and "what has gone quiet?" is a question the sheet cannot ask on its own.

### CRM-native: an LP object and a fundraising list

The grounded build, and the right default for most funds. Someone comfortable administering your CRM can click it together in an afternoon, no code: create the LPs object, add the fundraising list with the fields above, extend the stage funnel with the raise-specific stages, assign each stage its probability, and save the views. From then on the raise runs where the rest of the firm's data already lives, every conversation logged against the LP it belongs to.

:::note
If whoever sets this up scripts it through the CRM's API (application programming interface: the doorway that lets a program set up and fill the CRM directly, instead of clicking through screens), three Attio traps from this exact build are worth knowing in advance: creating a field requires a `config` object even when there is nothing to configure, the order of stages cannot be set through the API and has to be dragged into place in the app, and saved views can be listed but not created or changed programmatically. All three are documented in the [Attio API field guide](/reference/attio-api-field-guide/).
:::

### Plus light automation: stamps and reminders

The agentic tier here is deliberately small; a raise does not need new systems, it needs two jobs of the kind [pipeline hygiene](/playbooks/pipeline-hygiene/) already uses. First, a last-contact-date stamp: a scheduled job ([cron agent](/glossary/#cron-agent), a job that runs automatically on a timetable; see [cron agents](/reference/cron-agents/)) that sets each LP's last contact date from the most recent logged interaction, so the stale-contacts view is always right without anyone typing dates. Second, stale-LP reminders: a scheduled check that messages the owner when a live entry crosses the staleness threshold. Both fit the shape of [the one-file cron sync](/guides/one-file-cron-sync/): one small file, one rule, safe to re-run, with the [automation-safety](/reference/automation-safety/) habits (dry runs, never overwriting a value a human set) applied as usual.

## Metrics that prove it works

All three are computable directly from the pipeline list.

| Metric | Definition | What good looks like |
|---|---|---|
| **Weighted pipeline vs fund target** | Sum of target commitment × stage probability across live entries, divided by the fund's target | A coverage multiple the Monday meeting opens with; the trend matters more than the level, and entries that never get re-weighted as stages change are reporting hope, not forecast |
| **Share of LPs with a next step** | % of live pipeline entries with an owner and a concrete next action | Near 100%; a live entry with no next step is a stale contact in waiting |
| **Days since last contact** | Median, and worst case, across live entries | A low median with no long tail; watch the worst case, because the average hides exactly the relationships that are dying |

Set the staleness threshold before the raise gets busy, and measure the baseline before adding any automation, so the improvement is provable (see the [playbooks overview](/playbooks/) on baselines).

## See also

- [The CRM as your fund's database](/reference/crm-as-database/), why the raise belongs in the same system as everything else
- [Attio API field guide](/reference/attio-api-field-guide/), the API traps hit while building this exact pipeline
- [The one-file cron sync](/guides/one-file-cron-sync/), the template for the last-contact stamp and the reminder job
- [Pipeline hygiene](/playbooks/pipeline-hygiene/): the same follow-up discipline, applied to deals instead of LPs
