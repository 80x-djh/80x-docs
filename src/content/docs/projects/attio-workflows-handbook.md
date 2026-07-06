---
title: Attio Workflows Handbook
description: "An open handbook for Attio's built-in automation engine: every trigger and block documented, credit costs explained, with recipes you can copy."
---

The [Attio Workflows Handbook](https://handbook.80x.ai) is a free, open-source handbook for Attio's Workflows engine, the point-and-click automation builder Attio shipped in June 2026. Workflows let you automate CRM tasks by connecting blocks (a trigger such as "a deal changed stage", followed by steps such as "send an email" or "update a field") without writing code. The handbook documents every trigger and block, explains how workflow credits (the units Attio charges for each automation step) are priced and consumed, covers moving over from Attio's older automation system, and provides follow-along go-to-market builds you can copy into your own workspace.

It exists because the official docs answer "what does this block do" but rarely "what does this cost, what breaks, and how do I assemble twelve of these into a working pipeline", which are the questions Attio admins, revenue-operations people, and consultants actually have. It is a community resource, not affiliated with or endorsed by Attio Ltd.

One licensing note that shapes this page: the handbook's prose carries a license (CC BY-NC-SA 4.0) that forbids commercial reuse, which is different from this site's license, though its code snippets and scripts are MIT and free to reuse. So this page describes the handbook and links into it rather than reproducing its content. Read the real thing at [handbook.80x.ai](https://handbook.80x.ai).

## What's inside

The content is organized into six tabs (the four [Diátaxis](https://diataxis.fr/) modes, a widely used way of structuring documentation, plus two practical additions), around 95 pages in total:

| Section | Pages | What it covers |
|---|---|---|
| Learn | 6 | First-principles orientation to the Workflows engine |
| Guides | 21 | Task-oriented builds: capture-and-qualify, pipeline hygiene, route-and-sequence, signals and AI, platform patterns, and migrating from legacy workflows |
| Reference | 49 | The block catalog: triggers, records, lists, tasks, sequences, delays, conditions, calculations, AI blocks, agents, utilities, integrations, and workspace blocks, plus variable syntax and the credits page |
| Explanation | 13 | Why the engine works the way it does |
| Troubleshooting | 3 | Failure modes observed in real workspaces |
| Pro | 3 | Advanced patterns |

Two structural decisions are worth noting, because they apply to any documentation project your fund might run:

**One canonical fact layer.** The full credit table and plan allowances live on exactly one page (the credits and pricing reference); every other page links to it and never repeats the numbers. When Attio changes pricing, and it has, there is one page to update instead of forty pages quietly going stale.

**Every claim is sourced.** Every claim about behavior or cost points back to the official Attio Help Center or to a documented observation in a real workspace, and pages carry a "last reviewed" line. Screenshots and workflow tests come from the author's own workspace, never from client workspaces.

## Built for humans, search engines, and AI assistants

The site is built with [Mintlify](https://mintlify.com), a documentation platform that also serves the whole handbook as a clean plain-text index at [`/llms.txt`](https://handbook.80x.ai/llms.txt). That means an AI assistant can read the handbook as structured text rather than scraping web pages, so you can point your assistant at it directly. This mirrors this site's own [approach to writing for LLMs](/start-here/for-llms/): documentation that is self-contained and machine-legible is also better documentation for people.

## Run it locally

This section is for your engineer, or for an AI assistant with access to a terminal. The documentation source lives in the repo's `mintlify/` directory: a `docs.json` navigation file plus pages written in MDX, a flavor of plain-text markdown. To preview the site on your own machine, install the Mintlify command-line tool once, then start the preview:

```sh
npm i -g mint        # one-time: install the Mintlify CLI
cd mintlify
mint dev             # local preview at http://localhost:3000
```

You need Node installed for `npm` to work. After `mint dev`, opening `http://localhost:3000` in a browser shows the full handbook running locally.

The repo also ships its quality checks as commands, a habit worth copying for any docs project. Each one prints its findings and fails visibly if something is wrong:

```sh
mint validate        # strict build: exits non-zero on any error
mint broken-links    # verify every internal link resolves
mint a11y            # accessibility: color contrast, image alt text
```

Deploys are automatic: the Mintlify GitHub App watches the repo and publishes the site whenever changes are pushed.

## Contributing

Corrections, verified gotchas, and recipes from real workspaces are welcome. See the repo's [`CONTRIBUTING.md`](https://github.com/80x-djh/attio-workflows-handbook/blob/main/CONTRIBUTING.md) and its enforced writing standard in [`STYLE.md`](https://github.com/80x-djh/attio-workflows-handbook/blob/main/STYLE.md). The bar is the same as for the original content: every claim about behavior or cost needs an official Attio source or a documented workspace observation. Unverified folklore does not merge.

## Source

The handbook lives at [github.com/80x-djh/attio-workflows-handbook](https://github.com/80x-djh/attio-workflows-handbook) and is served at [handbook.80x.ai](https://handbook.80x.ai). Prose is CC BY-NC-SA 4.0; code snippets and scripts are MIT.

## See also

- [awesome-attio](https://github.com/80x-djh/awesome-attio) — a community-maintained link list on GitHub; the handbook is one entry in it
- [attio-cli](/projects/attio-cli/) — for the automations that outgrow the Workflows engine and become scripts or agents
- [CRM as database](/reference/crm-as-database/) — the mental model underneath both workflows and API automation
