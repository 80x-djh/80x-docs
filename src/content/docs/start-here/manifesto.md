---
title: The open standard for agentic engineering in VC
description: "Why this site is open and free: shared definitions, patterns from shipped systems, and open-source tools any fund can inspect and use."
---

This page explains why 80x Docs exists and why everything on it is open and free. Agentic engineering means building software with and around AI [agents](/reference/agents/): programs that use an AI model to get real work done, such as keeping your CRM clean or reading meeting notes for you. This site publishes the definitions, the patterns, and the code for doing that inside a venture fund, as an open standard anyone can use and check. Ten minutes here will tell you what the site gives you, why your fund's own data is the asset that matters, and why you can trust what you read.

## What an open standard is, in practice

"Open standard" means the same thing here that it means everywhere else in engineering: shared, published knowledge that anyone can check. Concretely, three things:

- **Shared definitions.** Terms like [agent](/reference/agents/), [tool use](/reference/tool-use/), and [idempotency](/glossary/#idempotency) (designing a job so that running it twice changes nothing the second time) are defined precisely and in plain English, so that you, your team, and your AI assistants all mean the same thing by the same words. A single [glossary](/glossary/) covers every term the site uses.
- **Documented patterns.** Reference pages, [guides](/guides/), and [playbooks](/playbooks/) that each trace back to a system that actually ran: real pipelines, real schedules, real failure modes.
- **Runnable code.** Open-source tools linked from every [project page](/projects/), so the working code behind an explanation is always one click away.

A standard published this way belongs to everyone who uses it. Anyone can adopt the definitions, reproduce the builds, and correct the record.

## Your fund's advantage is data it already produces

A fund generates genuinely proprietary data every working day: the meeting notes from partner meetings and founder calls, WhatsApp and email threads, the full history of every deal that moved through the pipeline, the reasons deals were passed, the state of every LP conversation. No one else has this data. The meeting notes alone are a proprietary data asset, because no one else was in the room. It is the one dataset where a fund starts with a monopoly.

In most funds, that data evaporates. Meeting context stays in someone's head or in a notes app that never reaches the [CRM](/reference/crm-as-database/), the system where the fund tracks companies, deals, and people, and the natural place for its single source of truth. Deals change stage with no record of when, so you cannot later work out how fast deals move or where they drop off. Pass reasons live in a Slack thread. The advantage exists for a moment and is gone, because nobody owns the capture and the plumbing.

The systems this site documents are, almost without exception, plumbing for exactly this data:

- A scheduled job (a [cron](/reference/cron-agents/), the standard name for software that runs other software on a timer) that reconstructs the true date each deal entered each stage from the CRM's own history, so the funnel becomes measurable.
- A message-capture pipeline that lands WhatsApp deal context in the CRM instead of leaving it on a partner's phone.
- A daily job that puts each customer's lifetime Stripe revenue next to the record where decisions get made ([memelord-stripe-attio-sync](https://github.com/80x-djh/memelord-stripe-attio-sync), public).
- An extraction agent that reads meeting notes and files cited qualification signals into fields the team reviews.

What these systems have in common is that they all land clean, owned operational data in one queryable place, keeping the CRM the firm's single source of truth. That data is the foundation every later dashboard, analysis, and agent stands on. It compounds when the fund owns the capture end to end and understands every system that touches it, which is exactly the kind of system this site teaches you to build.

## Openness is how you can trust it

Anyone can claim to have built systems like these. Publishing everything lets you check the claim instead of taking it on trust. That is the mechanism this site runs on.

Every concept is defined in plain terms before it is used. Every system is documented with its failure modes included: the [webhook](/glossary/#webhook) (an automatic message one system sends another when something happens) that died silently, the workflow loop that burned credits overnight, the API that returned spurious "unauthorized" errors under load. Where the system is open source, the page links to the repo (the public folder holding the code) and quotes the actual code. The [agent loop on the agents page](/reference/agents/) is [valentine](https://github.com/80x-djh/valentine)'s real `src/agent.ts`, not pseudocode. Where a number is quoted, its source is stated: the CLI-vs-MCP token figures come from a benchmark report published in the [attio-cli](https://github.com/80x-djh/attio-cli) repo, caveats and estimation method included.

Published knowledge can be checked. When valentine claims it can only read your data and never change it, you do not have to trust the claim; you (or your engineer, or your AI assistant) can open the code and confirm that no write function exists. When a page recommends specific off-peak minutes for a scheduled job, the workflow file with that exact comment is right there. Your due diligence changes from "will this behave?" to "does the code contain what it claims?", and the second question has a checkable answer.

Openness also keeps the content accurate. A definition anyone can read is a definition anyone can correct, and the [contribution path](/start-here/contributing/) treats factual errors as bugs to fix fast. A claim that sits next to runnable code cannot stay vague, and a system documented with its sharp edges cannot be oversold.

## One person can now build fund software

Fund-internal software used to mean a data team: engineers, infrastructure, maintenance, and a budget only the largest platforms could justify. That constraint is gone.

Agentic engineering, meaning building with AI agents and using AI coding assistants to do the building, has collapsed the cost of fund software to the point where one practitioner can ship and operate it. The systems behind this site are the evidence:

- Self-updating KPI dashboards generated daily from CRM data for a European PE platform, a US VC fund, and a talent agency, with no server to run at all.
- Field syncs that run twice hourly against live pipelines and can safely run twice ([artemis-lp-logo-sync](https://github.com/80x-djh/artemis-lp-logo-sync) is a public example of about 200 lines).
- An extraction agent for a legal-tech company that must cite its sources and writes only into fields set aside for machines.
- A full migration from Affinity to Attio with dry runs (preview-only passes that show every change before making it), checkpoints, and the ability to resume after an interruption.

Each of these would have been a data-team project a few years ago. Each was built, and is run, by one person.

That is the site's subject: the specific, reproducible mechanics of building this class of software. [What an agent is](/reference/agents/), [how tools work](/reference/tool-use/), [how to run jobs unattended safely](/reference/automation-safety/), [why the CRM should be your fund's single source of truth](/reference/crm-as-database/), and step-by-step guides taken from the shipped systems above.

## What this site commits to

- **Everything is free.** Every reference page, guide, playbook, and project page, with no login and no gated tier. The open-source tools are free to run, fork, and audit.
- **Everything is grounded in something that shipped.** Running on real pipelines, usually on a schedule, usually unattended. When a number is illustrative rather than measured, the page says so.
- **Clients are anonymized.** Client systems inform the content, but client names and data never appear; only already-public repos are named and linked.
- **No invented numbers.** No synthetic metrics, no hypothetical clients, no benchmarks that were not measured.
- **One paid pathway.** If you want these systems built inside your fund rather than building them yourself, you can book a call. That is the entire business model. Pages never sell mid-content, and there is nothing else to buy.

## See also

- [What is 80x Docs?](/start-here/what-is-80x-docs/) — the site's sections, how content is produced, and who writes it
- [What is an agent?](/reference/agents/) — the first reference page, grounded in a real agent loop of about 60 lines
- [The one-file cron sync](/guides/one-file-cron-sync/) — the smallest complete build on the site, from a public repo
