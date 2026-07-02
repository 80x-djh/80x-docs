# 80x Docs — editorial system

This file is the single source of truth for how content on this site is
written. Every page — human- or agent-authored — follows it.

## What this site is

The open standard for **agentic engineering and frontier technology in
venture capital**. It is a knowledge base first: everything is open,
grounded in shipped systems, and free. The reader should finish any page
thinking "I understand this now, and I could do it."

## Who it is for (the reader on every page)

Partners, principals, and operations leads at venture funds who want to
build and use technology inside their firm. They are smart and busy. They
are **not professional engineers**: assume no prior knowledge of APIs,
webhooks, cron, or JSON. Some have never opened a terminal. Write every
page so that this reader can follow it start to finish, and so that a
technical reader loses nothing but a few definitions they already knew.

They already read practitioner newsletters about running a fund with data
and AI, so they think in **fund workflows, not technologies**. Anchor every
page to one or more of these named workflows, in the reader's own words:

- **Sourcing** — finding companies before they raise
- **Screening and qualification** — deciding which deals deserve time
- **Meeting prep and meeting notes** — walking in briefed, capturing what
  was said, and keeping it (notes are a firm's proprietary data asset)
- **Deal flow and pipeline management** — stages, hygiene, follow-ups
- **Due diligence** — evidence gathering on a live deal
- **Portfolio monitoring** — KPIs, reporting, board prep
- **LP fundraising and investor relations** — raising the fund itself
- **The firm's single source of truth** — one CRM every system reads
  and writes, instead of data scattered across inboxes and spreadsheets
- **Cost and ROI** — what an automation or agent costs to run (tokens,
  credits, engineering time) against the hours it returns

"Why this matters for your fund" passages and guide openings should name
the workflow, not the technology ("this is how screening notes stop dying
in inboxes", not "this automates data entry"). Never use the phrase
"data-driven" anywhere on the site.

## Voice: teach, don't perform

The register is a good teacher's, not an essayist's. Every page teaches
one thing and gets out of the way.

- **Plain English first.** Short sentences. One idea per sentence. Active
  voice. Second person ("you") for anything the reader does.
- **Define every technical term at first use**, in the sentence itself or a
  short parenthesis, and link it to the [glossary](src/content/docs/glossary.md).
  Never let jargon pass unexplained: not API, not webhook, not idempotent.
- **Tell the reader early what they will get.** The first paragraph of any
  page answers: what is this, why does it matter to a fund, and what will
  you be able to do after reading.
- **No applause lines.** Delete aphorisms, epigrams, and clever inversions
  ("the confidence is in the specificity", "safe because it is boring",
  "X is not Y, it is Z"). If a sentence exists to sound good rather than to
  explain, cut it.
- **Code never stands alone.** Before a code block, say in one plain
  sentence what it does. After it, say what the reader should see or check.
  A reader who skips every code block must still be able to follow the page.
- **Use asides for the reader's safety and comfort**: `:::note` for helpful
  context, `:::tip` for shortcuts, `:::caution` for anything that can cost
  money or damage data.
- **Practitioner, not commentator.** Concrete file names, API shapes,
  failure modes, costs. Every strong claim is grounded in something
  shipped, cited, or reproducible. No invented metrics, clients, or
  benchmarks; if a number is illustrative, say so.
- **Calm and positive.** No hype, no exclamation marks, no arguing against
  vendors or competitors. The knowledge carries the argument.
- **At most one em dash per sentence.** Never use a pair of em dashes as
  parenthetical brackets; use commas, parentheses, or two sentences.
- **Diagrams welcome, as text.** Where a flow, loop, or boundary is easier
  to see than to read, add one ASCII diagram in a fenced ` ```text ` block
  (≤20 lines, ≤72 columns). Text diagrams survive `.md` URLs and llms.txt.
- US spelling. Sentence-case headings. Headings say what the section
  contains in plain words ("Before you start", "How it works", "Common
  problems", "See also").

A quick calibration example. Instead of:

> Automation safety is the discipline of designing CRM automations so that
> their worst-case behavior is boring.

write:

> Automation safety means designing your CRM automations so that when they
> fail, they fail in small, harmless ways. This page gives you three
> questions to ask before you switch any automation on.

## Standard scaffolding per section

- **Reference pages** open with a plain-English definition, then a short
  "Why this matters for your fund" passage before any mechanics.
- **Guides** open with two asides before step 1: `:::note[What you'll
  build]` and `:::note[What you need]` (prerequisites in plain words, with
  links). Steps are numbered, each verifiable. End with "If something goes
  wrong" (or "Common problems") and "See also".
- **Playbooks** open with the problem stated in fund terms a partner would
  recognize, no technology vocabulary until the play itself.
- **Every page** ends with a short "See also" list of 2 to 4 links.

## Confidentiality

Client systems inform content but client names, data, and identifying detail
never appear unless the underlying repo is already public. Anonymize as "a
European PE platform", "a US fintech fund", "a talent agency" etc. Public
repos (valentine, attio-cli, awesome-attio, attio-workflows-handbook,
memelord-stripe-attio-sync, artemis-lp-logo-sync) may be named and linked
freely.

## Page anatomy

Every page is a `.md` (or `.mdx` only if it needs components) file under
`src/content/docs/` with frontmatter:

```yaml
---
title: Short, specific, ≤60 chars   # renders as the H1 — do NOT repeat an H1 in the body
description: One sentence, ≤160 chars, standalone — it feeds search, OG tags, and llms.txt
---
```

Optional: `sidebar: { order: N }` to pin position (lower = higher).

## Writing for LLMs (and therefore for everyone)

- **Self-contained pages.** Never rely on "as mentioned above" or a previous
  page. Each page must make sense pasted alone into a context window.
- **Front-load the definition.** First paragraph answers "what is this and
  when do I use it" — no throat-clearing.
- **Explicit headings** that are meaningful out of context ("Rate limits in
  the Attio API", not "Limits").
- **Tables for enumerable facts**, prose for reasoning.
- **Fenced code blocks with language tags**, runnable where possible.
- **Link generously** between pages using root-relative paths with trailing
  slashes: `[agents](/reference/agents/)`. Link to repos with full URLs.

## Section conventions

| Section | Directory | Shape |
|---|---|---|
| Start here | `start-here/` | Positioning + orientation pages |
| Reference | `reference/` | Timeless concept pages: what it is → why it exists → how it works → sharp edges → related |
| Guides | `guides/` | Task-oriented: outcome stated up front → prerequisites → numbered steps → verification → variations |
| VC playbooks | `playbooks/` | Operating doctrine: the problem in fund terms → the play → implementation options (manual / CRM-native / agentic) → metrics that prove it works |
| Projects | `projects/` | One page per open-source tool: what it does in one line → install/run → how it works → design decisions → repo link |
| Field notes | `notes/` | Dated essays/build logs; opinionated is fine, grounded is mandatory |
| Glossary | `glossary.md` | One page, alphabetized `##` terms, one-paragraph definitions |

Each section directory has an `index.md` (`sidebar: { order: 0 }`, titled
"Overview"-style) that maps the section and links every page in it.

## Monetisation surfaces (do not add more)

The site has exactly two: the **Book a call** CTA (header + footer, config in
`site.config.mjs`) and the **email capture** card (auto-appended to every
page footer). Content pages never sell; a closing "related" section may link
to relevant guides/projects, nothing else.

## Licensing

Prose: CC BY-SA 4.0. Code samples: MIT. Don't paste in content whose license
conflicts (note: the Attio Workflows Handbook prose is CC BY-**NC**-SA — link
to it rather than copying it wholesale).
