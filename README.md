# 80x Docs

**The open standard for agentic engineering and frontier technology in
venture capital.**

A free, open-source knowledge base: concepts, guides, playbooks, and
runnable tools for building software inside a fund — written from shipped
systems and purpose-built to be read by humans and LLMs alike. Every concept
is explained from first principles, every system is documented, every tool
is published. You can check the working.

## Structure

| Section | Path | What lives there |
|---|---|---|
| Start here | `src/content/docs/start-here/` | Manifesto + orientation |
| Reference | `src/content/docs/reference/` | Timeless concepts (agents, MCP, tool use, cron agents, CRM-as-database, safety) |
| Guides | `src/content/docs/guides/` | Step-by-step builds from shipped systems |
| VC playbooks | `src/content/docs/playbooks/` | Operating doctrine for the fund itself |
| Projects | `src/content/docs/projects/` | The open-source tools behind the docs |
| Field notes | `src/content/docs/notes/` | Dated essays and build logs |
| Glossary | `src/content/docs/glossary.md` | One page, all terms |

Editorial rules live in [EDITORIAL.md](./EDITORIAL.md). The publishing
backlog (which repos feed which future pages) lives in
[CONTENT-PIPELINE.md](./CONTENT-PIPELINE.md).

## Built for LLMs

- **`/llms.txt`**, **`/llms-full.txt`**, **`/llms-small.txt`** — the corpus
  as an LLM-ingestible index / single file (generated at build).
- **Append `.md` to any page URL** for its raw markdown source
  (`/reference/agents/` → `/reference/agents.md`), served with a canonical
  source header. Implemented in `src/pages/[...slug].md.ts`.
- **`/robots.txt` explicitly welcomes AI crawlers** (GPTBot, ClaudeBot,
  PerplexityBot, …). Implemented in `src/pages/robots.txt.ts`.
- **JSON-LD** (`TechArticle` / `WebSite`) on every page via the `Head`
  override.
- Editorial rule: every page is self-contained — it makes sense pasted alone
  into a context window.

## Stack

[Astro](https://astro.build) + [Starlight](https://starlight.astro.build),
fully static output, [Pagefind](https://pagefind.app) local search (no
search service), no analytics, no tracking, no external requests. Open
source all the way down.

```sh
npm install
npm run dev       # local dev at localhost:4321
npm run build     # static build to dist/
npm run preview   # serve the build locally
```

## Configuration

Everything site-level is in **`site.config.mjs`** — one file:

- `url` — production domain (drives sitemap, llms.txt, canonical URLs, robots).
- `bookCall` — the "Book a call" CTA target (the site's only monetisation
  besides email capture). Currently a mailto fallback; swap in a Cal.com /
  Calendly URL when ready.
- `newsletterAction` — email-capture form endpoint (plain HTML POST, no JS,
  no CORS preflight). Works with Buttondown-style endpoints or your own.
  When `null`, the form renders as a mailto capture instead.
- `repo`, `social`, `contactEmail`, author details.

## Deploying

Static output — any host works:

- **Vercel**: `vercel --prod` (framework auto-detected), or connect the repo.
- **Netlify / Cloudflare Pages / GitHub Pages**: build command `npm run
  build`, output directory `dist`.

Set `url` in `site.config.mjs` to the production domain before the first
real deploy.

## Licensing

- **Prose content** (`src/content/`): [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- **Code** (everything else, plus code samples inside pages): [MIT](./LICENSE.md)

See [LICENSE.md](./LICENSE.md) for the exact split and
[CONTRIBUTING.md](./CONTRIBUTING.md) for how to contribute.
