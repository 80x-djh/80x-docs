# growth-docs — CLAUDE.md

**80x.ai/docs** — the public, open-standard docs for agentic engineering in venture capital.
Teaching prose for non-engineer VCs. Part of the `~/github` workspace (`80x-org/growth-docs`);
see `~/github/CLAUDE.md` for the org-wide map.

## Stack
**Astro + Starlight** (`astro.config.mjs`, `site.config.mjs`), with `starlight-llms-txt` generating
the machine-readable surfaces. Served at 80x.ai/docs (proxied from `growth-landing`), deployed on Vercel.

## Layout
- `src/content/docs/` — **the docs themselves** (`.md`/`.mdx`). Sections: `start-here/`, `guides/`, `playbooks/`, `reference/`, `learn/` (courses), `notes/`, `projects/`, plus `index.mdx` and `glossary.md`. Add/edit pages here.
- `src/pages/` — generated surfaces: `[...slug].md.ts` (raw-markdown mirror of every page), `[section]/llms.txt.ts` (per-section llms.txt), `robots.txt.ts`.
- `src/components/` — Astro UI incl. Starlight component overrides (`PageTitle`, `SiteTitle`, `Head`), `course/`, `landing/`, `EmailCapture`, `WhatsAppButton`.
- `src/lib/structured-data.mjs` — JSON-LD. `src/styles/custom.css` — theme. `src/diagrams/` — pre-rendered SVGs.
- **Config:** `astro.config.mjs` (Starlight setup, sidebar, component overrides, llms-txt), `site.config.mjs` (`SITE` title etc).
- **Read before writing:** `EDITORIAL.md` (the writing bar — teaching prose for non-engineer VCs, no AI slop), `CONTENT-PIPELINE.md`, `CONTRIBUTING.md`.

## Run
```
npm install && npm run dev          # also: build · preview · diagrams (mermaid → SVG via scripts/render-diagrams.mjs)
```
Regenerate diagrams with `npm run diagrams` after editing any mermaid source; commit the SVGs.

## Deploy & conventions (important)
- **Vercel, team `eightyx`.** Commits MUST be authored **`daniel@bastoni.xyz`** (pinned as this repo's `user.email`) or the build is silently `BLOCKED`.
- **No em dashes (—)** anywhere. Hard rule — reads as AI slop. Replace by role (comma/colon/period). Follow `EDITORIAL.md` for voice.
- Sidebar/nav is config-driven in `astro.config.mjs` — new top-level sections need a sidebar entry.
- Push via the `80x-djh` account. Commit/push only when asked; branch off `main` first.
