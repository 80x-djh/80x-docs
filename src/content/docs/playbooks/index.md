---
title: Playbooks overview
description: What a VC playbook is, how to choose between manual, CRM-native, and agentic ways to run one, and the three plays this section covers.
sidebar:
  order: 0
---

A **playbook** describes one thing your fund should be running: what the capability is, how often it runs, and how you would know it is working. It sits between strategy ("we should run this fund on systems we own") and implementation ("here is the script and its schedule"). The [reference](/reference/) section explains concepts. The [guides](/guides/) each show one concrete build. A playbook sits above both and answers the question a partner actually asks: what should this fund be running, and how would we know it works?

Every playbook on this site follows the same four-part shape, so you can read any of them on its own:

| Part | What it answers |
|---|---|
| **The problem in fund terms** | Why this matters to returns, coverage, or reporting, not to engineering |
| **The play** | What to run, described without committing to any particular tool |
| **Implementation options** | The same play at three levels of automation: manual, CRM-native, agentic |
| **Metrics that prove it works** | Numbers a fund can compute directly from its own CRM |

Throughout this section, **CRM** means your customer relationship management system: the database where the fund tracks companies, people, deals, and every interaction with them. Why that framing matters is covered in [the CRM as your fund's database](/reference/crm-as-database/).

## Why three implementation tiers

Every play here can be run by a person with a spreadsheet, by the automation features already built into a modern CRM, or by scheduled scripts and [agents](/reference/agents/) (programs that use an AI model to decide their next step). The tiers are not a ladder you must climb in order. They are trade-offs between cost and reliability, and the right one depends on how many records you manage and how much your team wants to take on.

- **Manual.** A named person, a recurring calendar slot, and a checklist. This tier asks nothing of you technically, only discipline. Pick it if your fund is small (a few calls a week, a few hundred records) and one person genuinely owns the slot. Know the failure mode going in: the work stops the moment that person gets busy, and nothing tells you it stopped. Honest for small books; unreliable at scale.
- **CRM-native.** Saved views, required fields, and the workflow features inside the CRM itself. This tier asks for someone comfortable administering your CRM, but no code and nothing to host. Pick it for anything your CRM vendor already does well. The limit: this configuration lives only inside the CRM. There is no written copy of it your team can review, and when it silently stops working, nothing alerts you. We have watched exactly this happen; see [pipeline hygiene](/playbooks/pipeline-hygiene/).
- **Agentic.** Scheduled jobs and agents that work through the CRM's API (application programming interface: the doorway that lets software read and write your CRM's data directly, without using its screens). This tier asks for an engineer, or a capable AI assistant, plus the [safety habits](/reference/automation-safety/) this site teaches. Pick it for anything that must be provably correct or must survive staff changes. It costs the most to set up, and it is the only tier that keeps logs you can read, can be tested, and repairs its own drift.

Most funds should run a mix: CRM-native for what the vendor does well, agentic for anything that must be provably correct or must outlast any one employee, and manual as the human review layer on top.

## The playbooks

Five are live:

- **[Sourcing and signals](/playbooks/sourcing-and-signals/)**, the best signal your fund has is its own history: the meetings taken, the decks received, the founders already met. Capture every touch, check for prior contact before each call, and make warmth visible in every pipeline view.
- **[Pipeline hygiene](/playbooks/pipeline-hygiene/)**: when the CRM is wrong, every report built on it is wrong. Keep it accurate with checks that run continuously, not with quarterly cleanups.
- **[CRM migration](/playbooks/crm-migration/)**: switching CRMs looks like a purchasing decision, but it moves the only copy of your fund's history. Treat the move with the care it deserves, or spend the next year cleaning up after it.
- **[Deal qualification](/playbooks/qualification/)**, the answers that qualify a deal live in call notes nobody rereads. Extract them into suggestion fields with citations, cover the whole pipeline, and leave the judgment with the partner.
- **[LP fundraising operations](/playbooks/lp-fundraising-ops/)**, run the raise from limited partners (LPs, the investors in your fund) like deal flow in reverse: stages, owners, a commitment-weighted pipeline against target, and stale-contact hygiene.

## How to use a playbook

Read the problem section first and decide whether it is your problem. Some funds genuinely do not have a hygiene problem yet, and running plays you do not need is its own waste. If the problem is yours, pick the tier that matches your book size. Then set up the metrics before you build anything. They are cheap (usually one CRM view or one query), and a baseline measured before the build keeps everyone honest. Metrics defined after the build tend to get defined in whatever way flatters the build.

Every playbook links onward to the reference pages that explain its concepts and the guides that implement its plays. The path from "what to run" to "running it" is never more than two clicks.

## See also

- [Reference](/reference/): the concepts behind every play, defined in plain English
- [Guides](/guides/), step-by-step builds that implement the plays
- [The CRM as your fund's database](/reference/crm-as-database/), the mental model every playbook rests on
- [Automation safety](/reference/automation-safety/), the habits that keep the agentic tier safe
