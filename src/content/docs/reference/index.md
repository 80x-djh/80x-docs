---
title: Reference overview
description: A map of the reference section, where every core concept behind fund automation is explained in plain English, grounded in systems that run.
sidebar:
  order: 0
---

The reference section holds the lasting material: the concepts that stay true no matter which vendor or software version you use. Every page starts with a plain-English definition, explains why the idea matters to a fund, and then grounds it in a system that has actually shipped and run in production. You do not need an engineering background for any of them; every technical term is defined the first time it appears. Each page also stands alone, so you can read them in any order, or paste one into an AI assistant. If you want a path, read them in the order below.

## Foundations

Start here if you are new to this material. These five pages build on each other.

- [What is an agent?](/reference/agents/): what the word actually means, shown through a real 60-line example that does a fund's meeting prep, followable without reading code.
- [Tool use](/reference/tool-use/): how an agent reads your pipeline and files a screening note back, with answers in a fixed shape your CRM can store.
- [Model Context Protocol](/reference/mcp/): the standard plug that connects AI apps like Claude to the firm's single source of truth, and how to keep it safe.
- [CLI vs MCP](/reference/cli-vs-mcp/): the two ways to connect an agent to your pipeline, and what each one costs a firm per month, measured.
- [Context engineering](/reference/context-engineering/): controlling what a model reads, which sets the quality of a screening memo and the token bill for producing it.

## Operations

How agents run on their own schedule, and where their data lives.

- [Cron agents](/reference/cron-agents/): pipeline hygiene and portfolio monitoring on a timer, with nothing left switched on in between, plus the scheduling traps that bite in production.
- [CRM as database](/reference/crm-as-database/): why the CRM should be the firm's single source of truth, where deal flow, meeting notes, and LP records all live, and how automations keep it current.

## Safety

Read these before letting any automation touch live data. They go from the cheapest guarantee to the most nuanced.

- [Read-only agents](/reference/read-only-agents/): meeting prep and deal lookup from an agent that has no ability to change anything, guaranteed by how it is built rather than by a promise.
- [Agents that write to your CRM](/reference/writing-agents-safely/), the four containment patterns that let an AI file screening findings into your pipeline without ever touching what a human typed.
- [Automation safety](/reference/automation-safety/), three questions to ask before switching on anything that writes: can it trigger itself, what if it runs twice, and how much damage can one bad run do.

## Field guides

Hard-won lessons for specific platforms.

- [Attio API field guide](/reference/attio-api-field-guide/): the traps in Attio's programming interface that cost real projects an afternoon each, collected so yours do not.

## See also

- [Guides](/guides/), complete step-by-step builds that apply these concepts; the [one-file cron sync](/guides/one-file-cron-sync/) is a good first project once you have read the safety pages.
- [VC playbooks](/playbooks/): the same patterns translated into fund operations, stated in fund terms.
- [Glossary](/glossary/), one-paragraph definitions when you need a term fast.
