---
title: The one-file cron sync
description: "Your first automation: one small script that keeps a CRM field correct every day, runs on a free schedule, and is always safe to re-run."
---

If you build one thing from this site, build this. By the end of this guide you will have a single small program (a script) that keeps one field in your CRM correct, forever, without anyone thinking about it. A free scheduler runs it every day. It fixes only the values that are wrong, prints a one-line summary, and turns red where you can see it when something fails. Re-running it is always safe, because a run that finds nothing wrong changes nothing.

There is no AI in this build, and no framework, server, or database. Most fund automations should look like this before they are anything else.

The guide is grounded in [artemis-lp-logo-sync](https://github.com/80x-djh/artemis-lp-logo-sync), a shipped, public sync of about 190 lines. It fills in a `logo_url` field on a fund's LPs (limited partners, the investors in a fund) in Attio, using each LP's associated company. Every code sample below is taken from that file.

:::note[What you'll build]
One file of code that reads records from your CRM (the system where your fund tracks companies, people, and deals; Attio in this guide), works out what one field *should* say for each record, and updates only the fields that are wrong. GitHub Actions, a free scheduling service, runs it once a day and keeps a log of every run.
:::

:::note[What you need]
- **A CRM API key.** An API is the doorway that lets a program read and write your CRM's data; an [API key](/reference/attio-api-field-guide/) is the password that opens it. For Attio, create a token in workspace settings with read access to the source objects and read-and-write access to the target field (the shipped sync uses the `object_configuration:read` and `record_permission:read-write` scopes). A few clicks, no code.
- **A GitHub account and a repository.** GitHub is a free website that stores code and can run it on a schedule. A repository (a "repo") is one project's folder there. Creating both is form-filling, not programming. Public repos get free scheduled runs, which matters in step 6.
- **Node 20 or newer on your computer.** Node is the free program that runs JavaScript files; installing it is a download from nodejs.org. If you prefer Python, the pattern is identical.
- **The target field already created in your CRM.** Create it once, by hand, in the CRM's own interface. The script's job is keeping values correct, not creating fields.
- **A terminal.** The terminal is the text window where you type commands to your computer (the Terminal app on a Mac). You will use it for three commands, all given below. An AI assistant such as Claude can do every code step in this guide for you: paste in a step and ask it to write and run the code.
- **Ten minutes with [automation safety](/reference/automation-safety/).** It explains the two habits this guide relies on: the [dry run](/glossary/#dry-run) (a practice run that shows what it would change without changing anything) and [idempotency](/glossary/#idempotency) (a job that is safe to run twice, because the second run finds nothing left to do).
:::

## What a derived field is

A [derived field](/glossary/#derived-field) is any field whose correct value can be computed from other data you can read: a logo URL from a company domain, a display string from a currency amount, a revenue number from Stripe, a "days in stage" from a timestamp. Because the correct value is computable, the script never needs to remember anything between runs. Every run recomputes the truth from scratch and nudges the CRM toward it.

That is what makes this pattern so robust. There is no saved position to corrupt, no queue of pending changes to lose, no missed event to replay. See [CRM as database](/reference/crm-as-database/) for why derived fields are worth having at all.

## Step 1 — write the rule as one sentence, then as a function

Write down, in one plain sentence, the rule that produces the field's correct value. For the LP logo sync: *"an LP's `logo_url` is its linked company's `logo_url`; failing that, a favicon service URL for the company's root domain; failing that, an initials avatar seeded from the LP's name."*

That sentence then becomes a small function. The code below tries the three sources in order and returns the first one that exists; it reads nothing over the network and changes nothing, so it is trivially easy to test:

```javascript
function desiredLogoFor(company, lpName) {
  return (
    companyLogoUrl(company) ||
    faviconFallback(rootDomain(company)) ||
    initialsAvatar(lpName)
  );
}
```

You should now have one sentence and one function of a few lines that mirrors it exactly.

One honest check before you continue: if you cannot write your rule as a plain function of data you can read, you do not have a derived field. You have a workflow or an agent problem, and this is the wrong guide.

## Step 2 — fetch all the records

Your script needs every record so it can check every value. CRM APIs return records in pages (batches of a few hundred at a time), so the script asks for a page, then the next, until a page comes back short. That is all "pagination" means.

The code below defines one small helper for talking to Attio, then fetches every LP record, page by page. The API key comes from an environment variable, a named setting the script reads when it starts, so the key never appears in the code itself:

```javascript
const API = "https://api.attio.com/v2";
const KEY = process.env.ATTIO_API_KEY;
const DRY = process.env.DRY_RUN === "1";

async function attio(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function listAllLps() {
  const out = [];
  const pageSize = 500;
  let offset = 0;
  while (true) {
    const { data } = await attio("POST", "/objects/lps/records/query", { limit: pageSize, offset });
    out.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}
```

When this step works, printing the length of the fetched list shows the same record count you see in the CRM's own interface.

If your rule needs related records (here, each LP's linked company), fetch those in small parallel batches rather than one at a time; the shipped file uses a helper that runs 12 requests at once. The fiddly part of Attio is how values arrive wrapped (`values.name[0].value`, references under `target_record_id`); the [Attio API field guide](/reference/attio-api-field-guide/) catalogs every shape you will meet.

## Step 3 — compare before writing

This is the heart of the pattern. For each record, the script computes the desired value, reads the current value, and plans a write *only when the two differ*.

The code below does that comparison and sorts each record into one of three buckets: needs an update, already correct, or has no source data to derive from:

```javascript
const current = firstValue(lp.values?.logo_url);
if (!desired) { missing++; continue; }
if (current === desired) { skipped++; continue; }
updates.push({ lpId, name, desired, current });
```

After this step, a run over a healthy dataset plans zero updates and touches nothing: no writes, no "last modified" churn, no needless [webhook](/glossary/#webhook) traffic (a webhook is a message the CRM sends to other systems whenever something changes, so pointless writes create pointless messages), and no pressure on the API's rate limit (the cap on how many requests you may make per minute). The script converges on correct instead of acting for the sake of it. The three counters (`updated`, `skipped`, `missing`) feed the summary line in step 5.

## Step 4 — put a safety switch on the writes

The write path checks one environment variable. In dry-run mode the script prints a sample of what it *would* change and changes nothing. In live mode it applies the changes, a few at a time, with each record's errors caught individually so one bad record cannot kill the whole run:

```javascript
console.log(`planned updates: ${updates.length}`);
if (DRY) {
  for (const u of updates.slice(0, 20)) {
    console.log(`  DRY ${u.name}: ${u.current || "(empty)"} -> ${u.desired}`);
  }
} else {
  await mapLimit(updates, 8, async (u) => {
    try {
      await updateLpLogo(u.lpId, u.desired);   // PATCH /objects/lps/records/:id
      updated++;
    } catch (e) {
      console.error(`failed ${u.name}: ${e.message}`);
      errors++;
    }
  });
}
```

In dry-run mode you should see up to 20 lines starting with `DRY`, each showing a current value and the value that would replace it. In live mode you see none of those lines; the changes simply happen.

:::caution
Live mode writes to your real CRM. While you are building, keep `DRY_RUN=1` set and read the planned updates until every one of them is explainable. The shipped sync, being proven, applies by default and takes `DRY_RUN=1` to preview; while developing, invert that and make dry-run the default.
:::

## Step 5 — log one line and fail loudly

Each run should end with a single summary line, and a run with errors should visibly fail. The two lines below do both; a non-zero exit code is how a program tells the scheduler "this run failed", which GitHub turns into a red run and an email to you:

```javascript
console.log(`done. updated=${updated} skipped=${skipped} no_source=${missing} errors=${errors}`);
if (errors > 0) process.exit(2);
```

That one line is your entire monitoring system. When the job runs on GitHub, you read it in the run's log; when something breaks, you get a red run and a notification instead of silent rot.

## Step 6 — schedule it with GitHub Actions

GitHub Actions runs code on a schedule you declare in a small text file (a "workflow") stored in the repo. The schedule uses cron syntax, a five-part pattern that reads minute, hour, day, month, weekday; `"*/15 * * * *"` means "every 15 minutes". (A scheduled job like this is what the reference section calls a [cron agent](/reference/cron-agents/).)

The workflow below is the shipped one, trimmed only for length. It runs the sync every 15 minutes, and also gives you a button in GitHub's interface to trigger a run by hand, with a "dry run" checkbox:

```yaml
name: sync-lp-logos
on:
  schedule:
    - cron: "*/15 * * * *"
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Dry run (no writes)"
        type: boolean
        default: false
concurrency:
  group: sync-lp-logos
  cancel-in-progress: false
jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Run sync
        env:
          ATTIO_API_KEY: ${{ secrets.ATTIO_API_KEY }}
          DRY_RUN: ${{ inputs.dry_run && '1' || '' }}
        run: node sync.mjs
```

Once this file is in the repo (under `.github/workflows/`) and the key is saved as a secret, you should see the workflow listed in the repo's Actions tab, with a "Run workflow" button.

Four details in that file are load-bearing:

1. **The API key lives only in Actions secrets.** Secrets are GitHub's locked cupboard for passwords: the workflow can use the key, but nobody can read it back out. The key is never in the code and never needs to sit on a laptop.
2. **`workflow_dispatch` with a `dry_run` input** gives you a manual, no-writes trigger from GitHub's interface, forever.
3. **The `concurrency` block** stops two runs from overlapping if one is slow.
4. **`timeout-minutes`** limits the damage if a run hangs.

:::tip
Schedule on an odd minute like `:17`. GitHub drops scheduled runs when it is busy, and it is busiest at `:00` and `:30`.
:::

:::caution
Scheduled workflows in **private** repos consume paid Actions minutes. If billing or a spending limit lapses, GitHub silently stops running the schedule and nothing turns red. A sibling of this sync died for a week exactly that way. Keep these repos public if the code and IDs allow it, or watch the billing. Both sharp edges are covered in depth in [cron agents](/reference/cron-agents/).
:::

Pick a frequency that matches how fast the data changes. This sync runs every 15 minutes because logos should appear soon after an LP is added; a revenue or date-stamping sync is fine once a day.

## Check your work: run it twice

The test of a safe sync is simple. Open your terminal in the repo's folder and run these three commands in order:

1. `DRY_RUN=1 node sync.mjs` — a practice run. Read the planned updates; every one should be explainable.
2. `node sync.mjs` — the real run. Note the `updated=` count in the summary line.
3. `node sync.mjs` again, immediately. This second run must report `planned updates: 0` and `updated=0`. Every record now matches its desired value, so the run reads everything and writes nothing.

Finally, go to the repo's Actions tab, press "Run workflow" with the dry-run box ticked, and confirm the log there shows the same zero-update summary. Your sync now runs itself.

## If something goes wrong

- **The second run keeps writing.** Your comparison in step 3 is broken, almost always a formatting mismatch between what you compute and what the CRM sends back (a trailing slash, upper versus lower case, `0.40` versus `0.4`). Fix the comparison, not the symptom: a sync that rewrites the same value every run hides real changes, floods webhooks, and eventually hits the rate limit.
- **A scheduled run never happened.** Two known causes: GitHub skipped a congested `:00`/`:30` slot (move to an odd minute), or the repo is private and a billing problem silently disabled the schedule (see the caution in step 6).
- **The run is red with `errors=` above zero.** One or more records failed to write. Scroll the log for lines starting `failed` to see which records and why; the per-record error handling means the rest of the run completed normally.

## Variations

The skeleton (fetch, derive, compare, gated write, summary, schedule) carries unchanged across very different fields:

- **External-system syncs.** [memelord-stripe-attio-sync](https://github.com/80x-djh/memelord-stripe-attio-sync) is the same shape with Stripe as the reading side: fetch revenue from Stripe daily, compute the figure per company, write it to Attio only where it changed. The [Stripe guide](/guides/stripe-to-crm-sync/) builds it end to end.
- **Display-string syncs.** A currency field mirrored into a human-readable text field (`0.375` becomes `"EBITDA: 0.4m €"`). One shipped system did this inside the CRM's own automation builder, which silently stopped one week, with no log, no error, and no code anywhere to inspect. Rebuilding it as a one-file Actions cron made it observable and self-healing: the sync now rewrites the display text whenever it drifts from the source value.
- **Date-stamping syncs.** Stamp a date field when a record first reaches a state, reading the CRM's own status history so the stamp is the *true* transition date. The compare step becomes "fill only if empty", which is idempotency in its simplest form.

When the rule stops being computable, because deciding the value requires reading prose and exercising judgment, you have left cron-sync territory. You then want [an agent with a write-safety model](/reference/writing-agents-safely/); the [MEDIC qualification agent guide](/guides/medic-qualification-agent/) is that build.

## See also

- [Automation safety](/reference/automation-safety/) — the dry-run, idempotency, and kill-switch rules this guide applies.
- [Cron agents](/reference/cron-agents/) — the GitHub Actions scheduling sharp edges, in full.
- [Attio API field guide](/reference/attio-api-field-guide/) — value wrappers, query endpoints, and the other details you will hit in step 2.
- [A self-updating KPI dashboard from CRM data](/guides/kpi-dashboard-from-crm/) — the read-only sibling of this pattern.
