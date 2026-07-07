# 80x Docs, content pipeline

The publishing backlog: which shipped systems and repos feed which future
pages. Editorial rules in [EDITORIAL.md](./EDITORIAL.md) apply to everything
here, a page ships only when it can be grounded in something that actually
ran.

Status key: **next** (grounding exists, write it) · **needs grounding**
(system shipped but material needs collecting) · **blocked** (waiting on the
underlying system).

## Guides

| Page | Grounding source | Status |
|---|---|---|
| Affinity → Attio migration, step by step | The migration behind the [CRM migration playbook](src/content/docs/playbooks/crm-migration.md): dry-runs, checkpoints, resume | needs grounding |

## Reference

| Page | Grounding source | Status |
|---|---|---|
| Evals for CRM agents | Parity/grading harnesses built for internal agent projects | needs grounding |
| Agent memory | Persistent file-based memory patterns from internal agent deployments | needs grounding |

## Projects

| Page | Grounding source | Status |
|---|---|---|
| memelord-stripe-attio-sync | The repo (public), currently a "variation" in the cron-sync guide; give it a full project page if it grows | needs grounding |
| artemis-lp-logo-sync | The repo (public), already the worked example in [the one-file cron sync](src/content/docs/guides/one-file-cron-sync.md); a separate page only if it diverges | blocked |

## Field notes

| Page | Grounding source | Status |
|---|---|---|
| Build log: a KPI dashboard rebuild | The 2026-06 dashboard rebuild for a European PE platform (cumulative funnel fix, date backfill) | next |
| What a 4,900-note CRM cleanup taught us | The fund-of-funds notes dedup/re-home job (review queue, redated duplicates) | next |

## How a page graduates

1. Grounding collected (repo, run logs, or anonymized architecture notes).
2. Drafted per [EDITORIAL.md](./EDITORIAL.md): self-contained, no invented
   numbers, clients anonymized.
3. Linked from its section index and any sibling pages that reference it.
4. `npm run build` passes; the page reads correctly at its `.md` URL.
