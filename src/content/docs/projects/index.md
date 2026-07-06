---
title: Projects overview
description: Free, open-source tools your fund can install today, plus the one commercial product, each documented with the same honesty about how it works.
sidebar: { order: 0 }
---

Everything on this site is grounded in systems that actually run, and this section is where those systems live. Each page documents one tool: what it does, how to install and run it, how it works inside, and the design decisions worth copying. You can read any page yourself, hand it to your engineer, or paste it into an AI assistant; the install commands are exact either way.

Three of the four tools are open source, which means the code is public and free to run, adapt, and inspect, so every claim on their pages can be checked against the code itself. The fourth is [80x](/projects/80x/), the commercial product these docs sit alongside. It gets the same honest architectural treatment and is clearly labeled as the one product page in the section.

| Project | What it is |
|---|---|
| [valentine](/projects/valentine/) | A free meeting-prep tool that checks your fund's CRM for prior contact before a founder call and returns one verdict with its evidence. It can read your CRM but never change it |
| [attio-cli](/projects/attio-cli/) | A command-line tool for the Attio CRM, built for scripts, AI agents, and people who like terminals. It can create, read, update, and delete anything in the CRM |
| [Attio Workflows Handbook](/projects/attio-workflows-handbook/) | An open handbook for Attio's built-in automation engine: every trigger and block documented, credit costs explained, with recipes to copy, at [handbook.80x.ai](https://handbook.80x.ai) |
| [80x](/projects/80x/) | A Mac app that captures WhatsApp conversations into Attio or Affinity, so sourcing and deal chats reach the firm's single source of truth. You start every capture yourself, on the official WhatsApp web client. Commercial product, documented openly |

Beyond these tools, the [awesome-attio](https://github.com/80x-djh/awesome-attio) repo is a curated, community-maintained link list of the wider Attio ecosystem: official docs, developer tools, guides, and marketplace integrations, each checked and described in one line. It lives on GitHub rather than as a page here.

If you are new to the concepts these tools implement, start with the [reference section](/reference/). [What is an agent?](/reference/agents/) walks through valentine's actual decision loop line by line, [read-only agents](/reference/read-only-agents/) explains the safety model valentine is built on, and [CLI vs MCP](/reference/cli-vs-mcp/) explains the cost trade-off behind attio-cli.

## See also

- [Reference](/reference/) — the concepts behind these tools, defined in plain English
- [What is an agent?](/reference/agents/) — valentine's decision loop, explained line by line
- [Read-only agents](/reference/read-only-agents/) — why a tool that cannot write is safe to try on day one
- [CLI vs MCP](/reference/cli-vs-mcp/) — how to choose an interface for your AI tools
