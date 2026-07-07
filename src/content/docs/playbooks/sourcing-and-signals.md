---
title: Sourcing and signals
description: Your fund's own meetings, messages, and intros are its best sourcing signal. Capture every touch, and never walk into a first call blind.
---

Every fund has had this meeting. A partner takes a first call with a founder and learns, halfway through, that a colleague met the same founder two years ago, or passed on their previous company. The history existed inside the firm. Nobody checked, because checking was nobody's job.

This playbook is about sourcing: the work of finding companies before they raise, which includes not losing the ones your firm has already found. The scale of the problem: a mid-size fund's top of funnel (inbound decks, intros, event conversations, cold outreach, portfolio referrals) runs to thousands of touches a year, while partner attention is a few first calls a week. A sourcing system has two jobs. It decides which touches earn that attention, and it makes sure no touch the fund already had gets forgotten.

The best signal your fund has is its own history: the meetings it took, the decks it received, the messages its partners answered. That history has three properties nothing you can buy has. It is auditable, meaning you can trace exactly why a company surfaced and defend the reasoning to your investment committee. It is yours, sitting in your own records and compounding with every interaction for as long as the fund exists. And it is unique to you: no other firm has your relationship history, which is exactly what makes it an edge.

The doctrine of this playbook: own your signal layer, starting with the one signal source that is unique to your fund and free, which is what your fund already touches.

## The play: own your signal layer

Your fund generates first-party signal every day. Someone took a meeting. A founder messaged a partner on WhatsApp. A deck arrived by email. A colleague met the founder at a conference two years ago. Almost all of it evaporates, because it never gets written down anywhere searchable. The play has three parts, and all of them happen in your CRM (customer relationship management system: the database where the fund tracks companies, people, deals, and every interaction; see [the CRM as your fund's database](/reference/crm-as-database/)).

**1. Capture every touch into the CRM as a record.** Meetings, messages, and inbound become notes and interaction entries attached to the right company and person, each with the real date of the touch, an author, and a source. The working rule: if a touch is not a record, it does not exist. One sharp edge from a real cleanup at a fund-of-funds shows why the date matters. After a bulk import, the `created_at` timestamp (the date the CRM stamps automatically when a row is created) on every company was the import date. The true first-contact date survived only because someone had written it into an explicit `date_added` field. System timestamps record when the row was born, not when the relationship was. Always capture touch dates as fields of their own.

**2. Check prior contact before every first call.** The cheapest, highest-yield question in venture is: has anyone at this fund touched this company or founder before? A prior touch changes the meeting ("great to reconnect, you spoke with my partner in 2024"), and a missed one is quietly embarrassing. This is exactly what [valentine](https://github.com/80x-djh/valentine) does. It is a small, free, open-source [agent](/reference/agents/) (a program that uses an AI model to search and decide) that checks your CRM before a call and returns a one-line verdict: `prior_contact`, `clean`, or `ambiguous`, along with the record IDs it relied on, so you can check its work. It is a [read-only agent](/reference/read-only-agents/): its code contains no way to change, send, or delete anything, so pointing it at your live CRM risks nothing. The [agents reference](/reference/agents/) walks through its entire decision loop in about 60 lines of code.

**3. Let derived fields surface what is warm.** A [derived field](/glossary/#derived-field) is a field that a program fills in automatically from other data, never typed by hand. Raw touch records answer one-off questions; derived fields make warmth visible in every list you look at. Useful ones: a `last_contact_date` stamped from the most recent interaction, a `touch_count`, a `source` showing where the company came from, and a `days_since_last_touch`. Sort any pipeline view by `days_since_last_touch` and you have a re-engagement queue. Filter inbound by `source` and you know which channels actually convert. This is the same derived-field discipline that keeps reports trustworthy in [pipeline hygiene](/playbooks/pipeline-hygiene/); sourcing is just its highest-leverage application.

None of this rules out buying external data later. It changes the order: external data becomes enrichment on top of a signal layer you own, joined to your own touch history, rather than a substitute for having one.

## Implementation options

### Manual: the weekly triage

A named person owns a weekly slot. They walk the week's calendar and inbox, create or update a CRM record for every touch, stamp the date and source, and check the coming week's calls against CRM search for prior contact. This asks nothing of you technically. It works for a two-person fund doing a few calls a week. It fails predictably at scale: capture is the first casualty of a busy week, and manual search misses the ambiguous cases (the founder whose previous company you passed on), which are precisely the valuable ones.

### CRM-native: views and workflows

Modern CRMs get you meaningfully further with no code, if someone on your team is comfortable administering the CRM. Calendar and email integrations log meetings and threads automatically. A required `source` field on pipeline entry stops unattributed records at the door. Saved views ("inbound this week, untriaged" or "warm, no touch in 90 days") turn the weekly triage into a five-minute scan. The CRM's built-in workflow features can stamp `last_contact_date` whenever an interaction is created. Two limits. First, message channels the CRM does not integrate: WhatsApp is where a large share of founder communication actually happens, and it stays invisible. Second, prior-contact checking stays manual, and a search box is only as good as the person remembering to use it.

### Agentic: capture agents and pre-call checks

The full play, for funds with an engineer or a capable AI assistant and somewhere to run scheduled jobs. A capture pipeline turns messages into structured CRM records; the [WhatsApp to CRM guide](/guides/whatsapp-to-crm/) is one complete build. A [cron agent](/reference/cron-agents/) (a job that runs automatically on a timetable) keeps the derived fields current, so `last_contact_date` and `days_since_last_touch` are always right; the [one-file cron sync](/guides/one-file-cron-sync/) is the smallest complete example. And a pre-call check runs against tomorrow's calendar automatically, so the prior-contact question is answered before anyone thinks to ask it: valentine invoked once per meeting, with its verdict dropped wherever the team already reads (Slack, the calendar invite, or the CRM record itself).

:::note
The pre-call check is safe to run unattended because it can only read. The capture and derived-field jobs do write to the CRM, so they need everything in [automation safety](/reference/automation-safety/): rehearsal runs, backups, and writes that never overwrite a value a human set.
:::

## Metrics that prove it works

All three are computable directly from your own CRM.

| Metric | Definition | What good looks like |
|---|---|---|
| **Prior-contact check coverage** | % of first calls preceded by a prior-contact check (agentic: % of calendar events the check ran on) | Trending to ~100%; this one should be binary and boring |
| **Time-to-first-touch** | Median time from a touch arriving (inbound email, intro, message) to a structured CRM record existing for it | Days shrinking to hours as capture moves from manual to automated |
| **Source attribution rate** | % of pipeline records with a non-empty, non-"other" `source` | High and stable; every unattributed record is a channel you cannot evaluate |

Measure all three before you change anything, so the baseline is honest. Funds that skip the baseline can never show the play worked, which usually means the metrics get quietly redefined to flatter the build (see the [playbooks overview](/playbooks/)).

## See also

- [Read-only agents](/reference/read-only-agents/): why the pre-call check is safe by construction, not by policy
- [valentine](/projects/valentine/), the open-source prior-contact checker ([source](https://github.com/80x-djh/valentine))
- [WhatsApp to CRM capture](/guides/whatsapp-to-crm/), the message-capture build
- [Pipeline hygiene](/playbooks/pipeline-hygiene/), the play that keeps the captured data trustworthy
