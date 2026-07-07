---
title: Guides overview
description: The guides are build-along lessons. Start with the one-file cron sync, then work up to agents. Every guide comes from a system that really runs.
sidebar:
  order: 0
---

Guides are the build-along lessons of this site. Each one takes you by the hand from nothing to a working system: what you will build, what you need before you start, numbered steps you can check as you go, and what to do when something goes wrong.

You do not need to be an engineer. Every technical term is defined the first time it appears, and every guide tells you which steps an AI assistant (such as Claude) can do for you. If you can follow a recipe, you can follow a guide.

Every guide is taken from a system that actually runs today, on a schedule, against a live CRM (the system of record where a fund tracks companies, people, and deals), for a real fund or company. That grounding is why the guides include the unglamorous parts most tutorials skip: the check that makes re-running safe, the switch someone forgot to flip, the scheduled job a platform quietly stopped running. Where the underlying code is open source, the guide links to it. Where it belongs to a client, the client is anonymized and the architecture and lessons are what carry over.

## Where to start

Start with **[the one-file cron sync](/guides/one-file-cron-sync/)**. It is the smallest complete build on the site: one small program that keeps one CRM field correct, run automatically every day by a free scheduler. It teaches the three habits every other guide reuses: preview before you write, write only what changed, and schedule the job so it looks after itself. Budget an afternoon. Every later guide assumes you have seen these habits once.

## The course, in order

After the first guide, take these roughly in order of ambition. Each one is a complete lesson on its own, so you can also jump straight to the problem you have.

1. **[The one-file cron sync](/guides/one-file-cron-sync/)**: one script keeps one CRM field correct, forever, on a daily schedule. The foundation for everything else here. Start with this.
2. **[Sync Stripe revenue into your CRM daily](/guides/stripe-to-crm-sync/)**: pull what each customer has actually paid out of Stripe (the payment system) and write it into the CRM, so portfolio monitoring and pipeline reviews argue about strategy instead of numbers.
3. **[Build an Attio webhook automation](/guides/attio-webhook-automation/)**: stamp a date field the moment a deal changes stage, so your deal-flow funnel and velocity reports have real dates to stand on. Includes the backup job that catches anything the instant path misses.
4. **[A self-updating KPI dashboard from CRM data](/guides/kpi-dashboard-from-crm/)**, a dashboard of your deal funnel and pipeline speed that rebuilds itself every weekday morning. One web page behind a password, with no server and no BI subscription.
5. **[A read-only Slack bot over your CRM](/guides/read-only-slack-bot/)**: a bot your team can ask about any deal in Slack, for meeting prep and quick deal lookups. It answers with citations and cannot change your CRM, because it has no way to write to it. The safest first AI system to put in front of a team.
6. **[Meeting notes to CRM, automatically](/guides/meeting-notes-to-crm/)**: turn meeting notes into decisions, action items, and risks delivered to Slack, your CRM, and Notion, with a preview before anything is sent and a guarantee nothing is sent twice.
7. **[Build a MEDIC deal-qualification agent](/guides/medic-qualification-agent/)**: an AI agent that reads the notes on every deal and suggests qualification values, each backed by a quote from the source, so screening stays current without the chore. Humans stay in charge of the real fields. The full write-safety model, applied.
8. **[Capture WhatsApp conversations into your CRM](/guides/whatsapp-to-crm/)**, sourcing and deal conversations reach your pipeline instead of dying in chat. The privacy-first architecture behind [80x](/projects/80x/): the conversation is read on your machine, shared to the CRM only when you click, and the privacy rule is enforced on the server.

The first four builds use no AI at all. That is deliberate: most of what a fund needs from automation is a script, a schedule, and discipline. Guides 5 through 8 add AI only where the task genuinely requires judgment over prose; the test for when that is true is in [what is an agent?](/reference/agents/).

## How every guide is laid out

Each guide follows the same shape, so you always know where you are:

| Part | What it gives you |
|---|---|
| **What you'll build** | The finished system, described in one plain paragraph before step 1 |
| **What you need** | Accounts, keys, and reading, with an honest note on how technical each item is |
| **Numbered steps** | The build itself, in order, with real code and a check after each step |
| **Check your work** | A concrete test that proves it works, usually "run it twice" |
| **If something goes wrong** | The failures this exact system hit in production, and the fixes |
| **See also** | Where to go next |

Code never stands alone: every code block is introduced by a sentence saying what it does and followed by what you should see. You can skip every code block and still follow the lesson.

## Two pages worth reading first

The guides share a safety posture: nothing writes to production data without a [dry run](/glossary/#dry-run) (a practice mode that shows what would change without changing anything), an explicit switch to go live, and a design that makes re-running harmless. That posture is argued once, in [automation safety](/reference/automation-safety/) and [agents that write to your CRM](/reference/writing-agents-safely/). Read those two pages first, or alongside your first build; every guide applies their rules rather than re-explaining them.

## See also

- [VC playbooks](/playbooks/): if you are still deciding *what* to automate rather than *how*, start there.
- [Reference](/reference/): the concepts behind the guides, each defined in plain English.
- [Glossary](/glossary/): every technical term on the site, one paragraph each.
