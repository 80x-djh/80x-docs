---
title: What is 80x Docs?
description: A free, open library that teaches venture funds to build and use technology, written in plain English from systems that actually run.
---

80x Docs is a free reference site that teaches venture funds how to build and use technology inside the firm. It starts from the workflows a fund already runs (sourcing, screening deals, capturing meeting notes, keeping the pipeline clean, monitoring the portfolio, raising from LPs, the limited partners who invest in your fund) and shows how [agents](/reference/agents/) (programs that use an AI model to get real work done on their own), data syncs, and dashboards can carry more of that work, all anchored on your [CRM](/reference/crm-as-database/), the system where your fund tracks companies, deals, and people. Everything here comes from systems that ran in production for real funds and companies. After this page you will know what lives in each section, how the content is produced, and where to start.

This is a reference, not a newsletter. The pages are written to be looked up when you need them, and each one stands alone. That also makes them easy to hand to an LLM (a large language model, the AI behind tools like Claude and ChatGPT): you can paste any single page into one and it makes sense on its own.

The site exists to be the open standard for agentic engineering and frontier technology in venture capital: the playbooks, the code, and the failure modes are all published, so anyone can check the working. The full argument is in [the manifesto](/start-here/manifesto/).

## Who this site is for

This site is written for partners, principals, and operations leads at venture funds who want to build and use technology in their firm. If you think in fund workflows rather than technologies, you are the intended reader: every page starts from sourcing, screening and qualification, meeting prep and meeting notes, deal flow and pipeline management, due diligence, portfolio monitoring, or LP fundraising, and treats the technology as the means. The site assumes no engineering background. Every technical term is defined in plain words the first time it appears, and no page expects you to have opened a terminal (the window where you type commands to your computer) before.

Technical readers are welcome too. If you already write code, you lose nothing but a few definitions you already knew: the systems, the code, and the failure modes are all real and all documented.

## The six sections

| Section | What lives there | Read it when |
|---|---|---|
| [Start here](/start-here/manifesto/) | Orientation: the manifesto, this page, [how to use the site with an LLM](/start-here/for-llms/), how to contribute | You are new, or pointing an AI assistant at the site |
| [Reference](/reference/) | The concepts, each defined in plain English: [what an agent is](/reference/agents/), tool use, MCP, [CLI vs MCP](/reference/cli-vs-mcp/), cron agents, [the CRM as your fund's database](/reference/crm-as-database/), read-only agents, [writing to a CRM safely](/reference/writing-agents-safely/), automation safety, an [Attio API field guide](/reference/attio-api-field-guide/) | You want to understand an idea, like making the CRM your fund's single source of truth, before building |
| [Guides](/guides/) | Step-by-step builds with numbered steps: [WhatsApp to CRM capture](/guides/whatsapp-to-crm/), a [deal-qualification agent](/guides/medic-qualification-agent/), a [self-updating KPI dashboard](/guides/kpi-dashboard-from-crm/), Stripe to CRM sync, webhook automations, a read-only Slack bot, [the one-file cron sync](/guides/one-file-cron-sync/) | You have a workflow to fix (screening notes dying in inboxes, portfolio KPIs assembled by hand) and want the steps |
| [VC playbooks](/playbooks/) | What to run in your fund, described in fund terms: [sourcing and signals](/playbooks/sourcing-and-signals/), qualification, [pipeline hygiene](/playbooks/pipeline-hygiene/), LP fundraising ops, [CRM migration](/playbooks/crm-migration/) | You are deciding what your fund should run for sourcing, screening, pipeline, or LP fundraising, not yet how |
| [Projects](/projects/) | One page per free, open-source tool: [valentine](/projects/valentine/), [attio-cli](/projects/attio-cli/), the [Attio Workflows Handbook](/projects/attio-workflows-handbook/), and [80x](/projects/80x/) itself | You want a tool you can install today, like a pre-call brief on your fund's prior contact |
| [Field notes](/notes/) | Dated essays and build logs: [real CLI-vs-MCP benchmarks](/notes/cli-vs-mcp-benchmarks/), [human-shaped automation](/notes/human-shaped-automation/), [spec-first agentic engineering](/notes/spec-first-agentic-engineering/) | You want the opinionated, dated layer, including what automation actually costs to run |

There is also a single [glossary](/glossary/) page defining every technical and fund-operations term the site uses.

The sections form a rough reading order. A reference page explains a concept. A guide shows one concrete build of it. A playbook places it in a fund's operating rhythm. A project page hands you a tool that already implements it.

## How the content is produced

Every page is grounded in a system that actually shipped. Not a demo, but software running on real pipelines for real funds and companies, usually on a schedule, usually with no one watching:

- **Message-capture pipelines.** 80x, the WhatsApp-to-CRM product for funds, is where the privacy-first capture architecture in the guides comes from.
- **CRM agents.** A deal-qualification agent that reads meeting notes and writes cited findings into review fields for a legal-tech company. A pre-call checker (valentine, open source) that looks up your fund's prior contact with a company and cannot change any data, by design.
- **Dashboards.** Self-updating KPI dashboards built from CRM data for a European PE platform, a US VC fund, and a talent agency. Each is a Python script run daily by GitHub Actions (a free scheduler built into GitHub, the site where code is stored and shared), producing an encrypted static web page with no server to maintain.
- **Syncs and migrations.** Daily Stripe-revenue syncs, automatic date stamping when deals change stage, one-file [idempotent](/glossary/#idempotency) field syncs (idempotent means running the job twice changes nothing the second time), and a full Affinity-to-Attio migration with dry runs, checkpoints, and resume.

Where the underlying system belongs to a client, the client is anonymized ("a European PE platform", "a US VC fund") and no client data appears. The architecture, the sharp edges, and the code patterns are what carry over. Where the system is open source, the page links straight to the repo (the public folder holding the project's code). Nothing is invented: no synthetic metrics, no hypothetical clients, no benchmark numbers that were not measured. When a number is illustrative, the page says so.

The pages are also written to work for AI assistants. Each one is self-contained, states its definition up front, and uses headings that make sense out of context, so you can paste any single page into a model and it holds up alone. The mechanics are documented in [Use this site with an LLM](/start-here/for-llms/).

## Who writes it

Daniel Hull, the builder of 80x. One practitioner, writing from the build: the file names, API quirks, and failure modes on these pages are the ones actually hit while shipping the systems above. Contributions are welcome. See [Contributing](/start-here/contributing/) for the editorial standards and licensing (prose is CC BY-SA 4.0, code samples are MIT).

## What is free and what is paid

Everything on this site is free: every reference page, every guide, every playbook, every project, forever, with no login and no gated tier. The open-source tools are free too.

Exactly one thing is paid: **a call**. If you want these systems built for your fund rather than building them yourself, book a call via the button in the header. That is the entire business model. The docs never sell mid-page, and there is nothing else to buy.

## See also

- [The open standard for agentic engineering in VC](/start-here/manifesto/) — why the site exists
- [What is an agent?](/reference/agents/) — the first reference page
- [The one-file cron sync](/guides/one-file-cron-sync/) — the smallest complete build on the site
