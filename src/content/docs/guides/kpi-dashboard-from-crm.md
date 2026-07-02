---
title: A self-updating KPI dashboard from CRM data
description: Build a password-protected dashboard that rebuilds itself from your CRM every weekday morning. One script, one web page, no server to run.
---

By the end of this guide you will have a KPI dashboard (deal funnel, stage conversion, pipeline speed, sourcing breakdowns) that rebuilds itself from your CRM every weekday morning and lives at a plain web address behind a password. The entire system is one Python script, one scheduled job, and one web page. There is no server to run, no database, no BI subscription, and nothing to keep alive: if the whole pipeline died tomorrow, the last-published dashboard would still load.

The guide is grounded in a dashboard shipped for **a European PE platform**: a chart report generated from an Attio dealflow list, encrypted, and served from GitHub Pages (GitHub's free website hosting), refreshed daily by a scheduled job. The client is anonymized throughout; the architecture, code shapes, and failure modes are exactly what shipped. Where an identifier or label has been genericized, the sample says so.

:::note[What you'll build]
A Python script that reads your pipeline from the CRM, computes the funnel and velocity numbers, and renders them into a single self-contained web page with charts. GitHub Actions (GitHub's free scheduler) runs the script every weekday morning and publishes the page. The page is encrypted; only people with the password can read it.
:::

:::note[What you need]
- **Your pipeline in a CRM list** (this build uses an Attio list) with a stage field and, ideally, one date field per stage. Step 3 explains why the dates matter so much.
- **A CRM API key with read access.** An API key is the password a program uses to read your CRM's data; create it in Attio's settings in a few clicks. It will be stored **only** as a GitHub Actions secret (GitHub's locked storage for passwords).
- **A GitHub repository** (a project folder on GitHub, the free site that stores code, runs it on a schedule, and hosts web pages) with Pages turned on. Public repos get free scheduled runs and free hosting.
- **Python 3.12 and Node 20** available to the scheduled job (Python builds the report, Node encrypts it). The workflow file in step 6 installs both for you; nothing needs installing by hand.
- **The [one-file cron sync](/guides/one-file-cron-sync/) guide.** This build reuses its scheduling and secrets setup, and its habit of checking work by re-running. If terms like [dry run](/glossary/#dry-run) or repo are new, start there. An AI assistant such as Claude can write and adapt every script in this guide for you.
:::

## Why a static page, and why encrypted

A live BI tool, or a small web app that queries the CRM on demand, puts an always-on system between the partner and the numbers, with passwords, uptime, and logins to manage. This build removes all of that. A scheduled job is the only thing holding a CRM credential; it renders everything into one self-contained web page (a "static" page, meaning a plain file with no live system behind it) and publishes it. The security question shrinks to "who can decrypt one file", and the operations question shrinks to "did this morning's job run".

The trade is freshness: the dashboard is only as current as its last run, which a daily schedule makes acceptable for pipeline KPIs. This is the [CRM as database](/reference/crm-as-database/) posture: the CRM stays the single source of truth, and everything downstream is a regenerable copy.

Here is the whole pipeline in one picture:

```text
+----------------------------+
| GitHub Actions cron        |
| (weekday mornings)         |
+-------------+--------------+
              v
+----------------------------+  reads   +---------------------+
| Python generator           |<---------| CRM list payloads   |
| renders one HTML report    |          | (entries/query)     |
+-------------+--------------+          +---------------------+
              v
+----------------------------+
| encrypted static HTML      |
| (one self-contained file)  |
+-------------+--------------+
              v
+----------------------------+
| static host (GitHub Pages) |
| no backend, no server      |
+----------------------------+
```

## Step 1 — pull the list entries from the CRM

First, the script fetches every deal in the pipeline list. Attio serves list entries in pages (batches of 100 here), so the script asks for page after page until one comes back empty or short. Pipeline lists are hundreds of rows, not millions, so "pull everything and compute locally" beats clever filtering.

The code below is the fetch loop:

```python
import os, requests

API_KEY = os.environ["ATTIO_API_KEY"]
BASE = "https://api.attio.com/v2"
H = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
LIST_ID = os.environ["LIST_ID"]  # the pipeline list's UUID

def post(url, body):
    r = requests.post(url, headers=H, json=body); r.raise_for_status(); return r.json()

entries, off = [], 0
while True:
    batch = post(f"{BASE}/lists/{LIST_ID}/entries/query", {"limit": 100, "offset": off})["data"]
    if not batch:
        break
    entries += batch
    if len(batch) < 100:
        break
    off += len(batch)
```

When this works, the number of entries fetched matches the row count you see on the list in Attio.

The raw entries are not chartable yet: dropdown values arrive as option IDs, people as actor IDs, companies as record references. Resolve each kind of ID to its human-readable name once, up front. The code below builds a lookup table for each dropdown field:

```python
optmap = {}
for slug in ["pole", "sector", "funding_round", "passed_reason"]:
    optmap[slug] = {o["id"]["option_id"]: o["title"]
                    for o in get(f"{BASE}/lists/{LIST_ID}/attributes/{slug}/options")["data"]}
```

The output of this whole step is a flat list of simple rows (company, stage, sector, originators, ticket size, one date per pipeline stage) plus a few constants (`stages_in_order`, `generated_at`), written to a file called `payload.json`. Everything downstream reads only this file.

:::tip
Because the payload is a file, you can develop the report against a saved copy without touching the API at all. Save one good `payload.json` and iterate on the charts offline.
:::

## Step 2 — compute the funnel cumulatively, not from current stage

This is where the shipped dashboard had its one real analytical bug, and it is worth understanding even if you never write the code.

The first version computed the funnel from each deal's *current* stage. That produces a snapshot ("where do deals sit today?"), not a funnel. Worse, every killed deal drops out entirely, because its current stage is a terminal "closed/passed" bucket that appears nowhere on the funnel. The platform's partners were looking at a funnel that silently excluded the large majority of their dealflow.

The correct funnel counts each deal at **every stage up to the deepest stage it ever reached**, including deals that were later killed. The "deepest stage reached" signal comes from the per-stage date fields: if a deal has an "LOI date", it reached LOI, whatever happened afterward. Conversion between stages then reads as "of everything that ever reached stage N, how many ever reached stage N+1". That is a real historical conversion rate, computed the same way across the whole report.

Keep all metric computation in one place. The shipped build does it in the page's own chart code, reading the embedded payload; doing it in the Python script is equally valid. What matters is that the payload carries the raw per-deal facts, so fixing a metric definition means changing the report, not re-collecting data.

## Step 3 — make sure the dates actually exist (the backfill)

The cumulative funnel stands entirely on the per-stage date fields, and in the shipped system those dates had two generations of holes. A date-stamping [webhook](/glossary/#webhook) (a program that reacts the moment a deal changes stage; the [webhook guide](/guides/attio-webhook-automation/) builds one) had only existed since a certain date, so older stage changes were never stamped. It had also later gone down for a stretch, so a gap period was missing too. Deals with empty date fields simply vanished from the funnel, and monthly bars went missing. The visible symptom was "the dashboard disagrees with the CRM's own counts".

The fix generalizes: **backfill from the CRM's own history, do not guess.** Attio keeps the full history of a stage field. A request to `GET …/entries/{entry_id}/attributes/{stage_slug}/values?show_historic=true` returns every value the field ever held, each with an `active_from` timestamp. A small scheduled job (the pattern from [the one-file cron sync](/guides/one-file-cron-sync/)) reads that history, takes the earliest timestamp per stage, and fills only empty date fields, so re-running it is always safe.

One backfill run recovered months of true transition dates. The same job now keeps stamping new transitions, and the dashboard depends on it staying healthy. After this step, every deal that ever reached a stage should carry a date for it.

## Step 4 — generate the page

The report is a single HTML template: the page's layout, styles, chart library, and metric logic, with one placeholder where the payload data is spliced in. Generation is three commands run in order; this is the shipped `build.sh`, verbatim in structure:

```bash
python3 build_payload.py        # live CRM list -> payload.json
python3 inject.py               # template.html + payload.json -> plain.html
node encrypt.mjs                # plain.html -> ../index.html (encrypted)
rm -f plain.html                # never commit the decrypted report
```

After running it, you should have a new `index.html` (encrypted, safe to publish) and no `plain.html` left behind.

:::caution
The repo is public, and `payload.json` and `plain.html` contain real deal data. Both must be listed in `.gitignore` (the file that tells git what never to save to the repo) and must never be committed. Only the encrypted `index.html` is published.
:::

The template/payload split earns its keep immediately: you, or a designer, or you six months from now, can iterate on the report against a checked-in *sample* payload, while the real data never enters the repo.

## Step 5 — encrypt the page, publish via Pages

The published `index.html` is encrypted before it leaves the machine, in the style of a tool called StatiCrypt. What ships is a small unlock page containing the real report as an encrypted blob. When someone opens the address and types the password, their own browser stretches the password into a key (through PBKDF2, a deliberate-slowness step that makes guessing expensive), decrypts the blob, and displays the report. No server ever sees the password; the public repo and the public address expose only ciphertext. The shipped build re-implements this in `encrypt.mjs`, including an integrity stamp so a tampered file fails to open rather than displaying something altered.

Publishing is then just a commit: point GitHub Pages at the branch, and have the scheduled job commit `index.html` only when it changed.

:::caution
Be honest about what this protection buys: a password gate for a low-sensitivity report, with the password shared out-of-band. Anyone holding the password keeps every version they ever decrypted, and a determined attacker can try passwords offline forever, limited only by the password's strength. For pipeline KPIs shared with a handful of principals it is proportionate. For anything more sensitive, this is the wrong architecture.
:::

After this step, opening your Pages address in a browser shows the password prompt, and the correct password reveals the dashboard.

## Step 6 — put it on a schedule

A workflow is the small text file that tells GitHub Actions when and how to run your build; the schedule line uses cron syntax, a five-part time pattern (here, 06:17 on weekdays). The shipped workflow, trimmed:

```yaml
on:
  schedule:
    # Daily on weekdays. Off-peak minute (:17) — GitHub drops on-the-hour/half-hour
    # scheduled jobs first under load, so avoid :00 and :30.
    - cron: "17 6 * * 1-5"
  workflow_dispatch:
permissions:
  contents: write
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: pip install requests
      - name: Regenerate encrypted dashboard from live list
        env:
          ATTIO_API_KEY: ${{ secrets.ATTIO_API_KEY }}
          DASH_PASSWORD: ${{ secrets.DASH_PASSWORD }}
        run: bash generator/build.sh
      - name: Commit if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          if ! git diff --quiet -- index.html; then
            git add index.html
            git commit -m "Refresh dashboard $(date -u +%Y-%m-%dT%H:%MZ) [auto]"
            git push
          else
            echo "No change in index.html"
          fi
```

Once this file is in the repo and both secrets are saved, you should see the workflow in the Actions tab with a manual "Run workflow" button, and a green run each weekday morning.

Weekday-daily is the right rhythm for pipeline KPIs: the numbers move on business days, and each run costs about a minute of Actions time. The off-peak `:17` minute, and the "keep Actions repos public or watch the billing" lesson, are both covered in [cron agents](/reference/cron-agents/); this system hit both in production.

## Check your work

1. Run `build.sh` locally against a saved payload and open `plain.html` in a browser. Every chart should render, and `generated_at` should show the current time.
2. Trigger the workflow manually from the Actions tab. Confirm it commits a refreshed `index.html` and that the Pages address serves it.
3. Open the live address in a private browser window, enter the password, and **check two or three headline numbers against the CRM by hand**: count the deals in a stage in the CRM's interface and confirm the funnel bar matches. This catches metric-definition bugs (like the snapshot-versus-cumulative funnel in step 2) that no amount of green runs ever will.
4. Trigger the workflow again with no CRM changes. The run should end at "No change in index.html". That is this build's run-it-twice test.

## If something goes wrong

Every row in this table happened to the shipped system:

| Failure | Symptom | Defense |
|---|---|---|
| **Manual refresh rots** | The pre-schedule version of this dashboard was refreshed by hand and silently froze at its last update for two months: no bars for recent months, wrong closed count | The schedule. A dashboard that does not update itself is a screenshot with extra steps |
| **Schema drift** | Someone renames a field; the script errors (best case) or a column goes silently blank (worst case) | `raise_for_status()` on every API call so the run fails loudly; read fields by names you control; treat a new all-blank column in the payload as a red flag |
| **Missing date fields** | Funnel under-counts; deals vanish | The status-history backfill in step 3, plus a healthy date-stamping job |
| **Wrong source dataset** | The original report was built from a stale, near-duplicate object (an old import) rather than the maintained list: thousands of stage-less ghost records | Decide which list is the real one *first*, and put its ID in exactly one place |
| **Generator not saved anywhere** | The first generator lived on no machine and in no repo; rebuilding the dashboard meant reverse-engineering the published page | Keep the generator in the same repo as the page it produces |

## Variations

- **Multiple audiences, one pattern.** The same generate-encrypt-publish skeleton ships as sibling dashboards for other organizations; only the payload builder and the template differ.
- **Unencrypted internal page.** Skip step 5 and publish to a private Pages site, or attach the report to each run as a downloadable file, if your access controls already cover it.
- **Metrics in Python instead of the page.** Precompute the aggregates in the script and ship a smaller payload. Better when rows are numerous or sensitive, at the cost of a full regeneration whenever a metric definition changes.

## See also

- [CRM as database](/reference/crm-as-database/) — why the CRM is the source of truth and everything else is a regenerable copy.
- [The one-file cron sync](/guides/one-file-cron-sync/) — the write-side sibling; the date-stamping job this dashboard depends on is one.
- [Cron agents](/reference/cron-agents/) — scheduled-job sharp edges: dropped runs, off-peak minutes, private-repo billing.
