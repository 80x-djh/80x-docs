---
title: Contributing
description: How to fix a page, report an error, or contribute a guide to 80x Docs, plus what the editorial bar and the licensing mean for you.
---

80x Docs is an open reference, and anyone can improve it. This page shows you the four ways to contribute (fix a page, report an error, propose a page, or share something you built), the editorial bar every page meets, and what the licensing lets you do with the content. The site's accuracy depends on readers who spot problems, so even a one-line report helps.

All contributions go through the [GitHub repo](https://github.com/80x-djh/80x-docs). GitHub is the site where code and text projects are stored and edited in public, and a repo (repository) is one such project. Every page here is a plain-text file, so contributing means editing text, not learning a publishing system.

## Fix a page

Open the [GitHub repo](https://github.com/80x-djh/80x-docs), find the page's source file under `src/content/docs/`, and click GitHub's pencil (edit) icon at the top of the file. Make the change and submit it. GitHub walks you through the steps and packages your change as a pull request, which is simply a proposed edit the site's author reviews before it goes live. This is the right path for typos, broken links, outdated API details, and clarifications.

:::tip[No GitHub account yet?]
Creating one is free and takes a minute, and GitHub's web editor handles all the mechanics for you. You never need to install anything to fix a page.
:::

## Report an error

If you spot something wrong but do not want to write the fix, [open an issue](https://github.com/80x-djh/80x-docs/issues). An issue is a public note attached to the repo describing a problem. The most useful reports say three things: what you ran, what the page claims, and what actually happened.

Factual errors (an API behavior that changed, a gotcha that no longer applies) are treated as bugs and fixed fast, because the site's entire value is that it is accurate. The [Attio API field guide](/reference/attio-api-field-guide/) in particular depends on this kind of field report.

## Propose a page

Open an issue describing the page before writing it. A good proposal does three things:

- Names the section it belongs in: reference, guide, playbook, project, or field note. See [What is 80x Docs?](/start-here/what-is-80x-docs/) for how they differ.
- States what a reader can do after reading it.
- Points at the system you built that grounds it.

The third one matters most. Every page on this site traces back to something that actually ran, and proposals are held to the same bar.

## Contribute a recipe or case study

The strongest contribution is a guide or field note drawn from something you shipped: a scheduled sync, a CRM automation, an [agent](/reference/agents/) with a real failure mode you debugged. Anonymize clients (as this site does), keep the code, keep the mistakes. Pages like [the one-file cron sync](/guides/one-file-cron-sync/) are the template: a complete, runnable pattern with its sharp edges documented.

## The editorial bar

Everything on this site follows one editorial system (`EDITORIAL.md` in the repo). The short version:

- **Grounded in something you actually ran.** Every strong claim traces to shipped code, a citation, or a reproducible step. No invented metrics, clients, or benchmarks; if a number is illustrative, say so.
- **Written for a non-engineer.** The reader is a partner, principal, or ops lead at a fund, not a professional engineer. Plain English, short sentences, and every technical term defined at first use.
- **Practitioner voice.** Concrete file names, API shapes, failure modes, costs. Write from the build, not the sidelines.
- **Calm tone.** Define terms before using them. No hype and no exclamation marks; let the specifics speak for themselves.
- **Self-contained pages.** Each page must make sense pasted alone into an LLM's context window (the bounded amount of text an AI model can read at once): state the definition up front, use headings that are meaningful out of context, use tables for lists of facts, and tag code blocks with their language. See [context engineering](/reference/context-engineering/) for why this matters.
- **Confidentiality.** Client names and identifying detail never appear unless the underlying repo is already public. "A European PE platform" is fine; the client's name is not.
- **Mechanics.** US spelling, sentence-case headings, frontmatter (the small metadata block at the top of each page file) with a `title` of at most 60 characters and a standalone `description` of at most 160, no H1 heading in the body, and internal links written as root-relative paths with trailing slashes.
- **No selling.** Content pages never pitch. The site has exactly two monetization surfaces (a header call-to-action and a footer email card), and contributions do not add more.

## Licensing

| Content | License | What it means |
|---|---|---|
| Prose | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Reuse, adapt, and republish (commercially too) if you credit 80x Docs and share your derivative under the same license |
| Code samples | [MIT](https://opensource.org/license/mit) | Use in anything, including closed-source commercial products; keep the license notice |

Practically: paste the code into production without ceremony, and quote or adapt the prose freely as long as attribution and share-alike travel with it. By contributing, you agree your prose and code are published under these licenses.

:::caution[One licensing caveat]
Do not paste in content whose license conflicts with the site's. The [Attio Workflows Handbook](/projects/attio-workflows-handbook/), for example, is CC BY-**NC**-SA (its license forbids commercial reuse), so link to it rather than copying it wholesale.
:::

## See also

- [What is 80x Docs?](/start-here/what-is-80x-docs/), the site's sections and how content is produced
- [Use this site with an LLM](/start-here/for-llms/), citation mechanics and machine-readable URLs
- [The one-file cron sync](/guides/one-file-cron-sync/), the template for a contributed guide
