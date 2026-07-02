---
title: Sync Stripe revenue into your CRM daily
description: A daily job that writes each customer's lifetime revenue and per-product spend from Stripe into your CRM, so reviews argue strategy, not numbers.
---

Every pipeline and portfolio review stumbles on the same question: *how much has this customer actually paid us?* By the end of this guide, your CRM answers it. A scheduled job pulls every payment from Stripe (the payment system that processes the company's charges) once a day, adds up each customer's lifetime revenue and spend per product, and writes one record per paying customer into your CRM, linked to the matching person, so revenue sits next to the relationship it belongs to.

The guide is grounded in [memelord-stripe-attio-sync](https://github.com/80x-djh/memelord-stripe-attio-sync), a shipped, public sync that runs daily for a consumer SaaS company's Attio workspace. Every code sample below is taken from that repo. The technology is deliberately plain: one Python file with no add-on packages at all, because a revenue number your team argues from should not depend on a stack of third-party code.

There is no AI in this build. It is a [cron agent](/reference/cron-agents/) (a script run on a schedule), and structurally it is [the one-file cron sync](/guides/one-file-cron-sync/) with Stripe as the reading side. If you have not built that one yet, it is the smaller on-ramp and this guide assumes its habits.

:::note[What you'll build]
A Python script, run every morning by GitHub Actions (GitHub's free scheduling service), that reads every charge and paid invoice from Stripe, computes two numbers per customer (lifetime revenue, and spend split by product), and writes them into a dedicated object in Attio. Running it twice never creates duplicates.
:::

:::note[What you need]
- **A Stripe restricted API key** with read access to customers, charges, and invoices. An API key is the password a program uses to act on your account; "restricted" means this one can only read, never change anything in Stripe. You create it in the Stripe dashboard under Developers, no code involved.
- **An Attio API key** for the target workspace, with rights to create objects and write records. Also created in settings, in a few clicks.
- **A GitHub repository** (a project folder on GitHub, the free website that stores code and runs it on a schedule) to hold the script and the schedule.
- **Python 3.9 or newer** on your computer for testing. Python comes preinstalled on Macs; there are no packages to install. An AI assistant such as Claude can write and adapt every code step in this guide for you.
- **The safety habits from [automation safety](/reference/automation-safety/)**: the [dry run](/glossary/#dry-run) (previewing changes before making them) and [idempotency](/glossary/#idempotency) (a job that is safe to run twice). This guide applies them without re-arguing them.
:::

## What the sync computes

Two totals per customer, taken from different Stripe records because each is trustworthy for a different question:

| Aggregate | Source | Rule |
|---|---|---|
| Lifetime revenue | Succeeded charges | `amount_captured − amount_refunded`, summed; closely matches the Stripe dashboard's gross revenue |
| Per-product spend | Paid invoices | Each invoice's `amount_paid` distributed across its line items pro-rata by line amount |

The pro-rata step is the subtle one, so here it is in plain words. An invoice's line items say what was *billed*; `amount_paid` says what was actually *collected*. Discounts and partial payments make those two differ. If you credited each product with its full billed amount, the product totals would overstate reality. Splitting the collected amount across the lines, in proportion to what each line billed, handles both cases correctly.

## Step 1 — create the custom object, once

Revenue does not belong on the person record. A person is a relationship; a Stripe customer is a billing identity; one email address can map to several billing identities. So the sync owns a separate custom object in Attio called `stripe_customers`, whose fields are maintained entirely by the machine:

- `stripe_customer_id` (text, **unique**) — the match key, meaning the one field the sync uses to recognize "this record is that customer"
- `total_revenue`, plus one `spend_<product>` currency field per product
- `person` — a link to the matching record in People
- `first_charge_at`, `last_charge_at`, `last_synced_at` — timestamps
- `stripe_url` — a link straight to the customer in the Stripe dashboard

The shipped repo creates all of this in a separate script, `bootstrap_attio.py`, which checks whether each field already exists before creating it, so running it again is harmless. Set the structure up once, then leave it; the daily job only maintains values.

You should now see the `stripe_customers` object in Attio with all its fields, empty.

## Step 2 — add up lifetime revenue from charges

The script walks through every charge in Stripe's history (Stripe serves them in pages; the script keeps asking for the next page until there are none left), keeps the successful ones, and sums each customer's total net of refunds.

The code below is that loop:

```python
for ch in stripe_paginate("/charges", {"limit": 100}):
    if ch.get("status") != "succeeded":
        continue
    cust = ch.get("customer")
    if not cust:
        continue
    net = (ch.get("amount_captured") or ch.get("amount") or 0) - (ch.get("amount_refunded") or 0)
    if net <= 0:
        continue
    a = agg[cust]
    a["total_revenue_cents"] += net
```

After this step the script holds, in memory, one running total per customer. Everything stays in whole cents until the final write: adding fractions of dollars invites rounding errors, so decimals are for display, not accounting. The same loop also records each customer's earliest and latest charge dates, which become `first_charge_at` and `last_charge_at`.

## Step 3 — split spend by product from paid invoices

Next, the script fetches every paid invoice and distributes each invoice's collected amount across its line items, in proportion to what each line billed:

```python
for inv in stripe_paginate("/invoices", {"limit": 100, "status": "paid"}):
    cust, paid = inv.get("customer"), inv.get("amount_paid") or 0
    if not cust or paid <= 0:
        continue
    lines = (inv.get("lines") or {}).get("data") or []
    line_total = sum(max(ln.get("amount") or 0, 0) for ln in lines)
    if line_total <= 0:
        continue
    for ln in lines:
        amt = ln.get("amount") or 0
        if amt <= 0:
            continue
        product_id = (((ln.get("pricing") or {}).get("price_details")) or {}).get("product") \
            or ((ln.get("price") or {}).get("product"))
        slug = PRODUCT_SLUGS.get(product_id, FALLBACK_SLUG)
        agg[cust]["per_product_cents"][slug] += int(round(amt * paid / line_total))
```

After this step, each customer's totals also carry a per-product breakdown. `PRODUCT_SLUGS` is a small hand-maintained list mapping Stripe product IDs to Attio field names, with a `spend_other` fallback so a newly launched product shows up as an unexplained bucket instead of silently vanishing. When a product launches, you add one line to the map and one field to the bootstrap script.

One known, documented gap: charges that have no invoice count toward `total_revenue` but toward no product. For this business almost everything flows through checkout, invoice, then subscription, so the gap is negligible. Write your equivalent caveat down in the project's README (the notes file every repo carries), because someone will eventually ask why the columns do not sum to the total.

## Step 4 — write to the CRM as an upsert

This is where the safety lives. An **upsert** is a write that means "update the record if it exists, create it if it does not". Attio does this in one call when you name a `matching_attribute`: if a record with this `stripe_customer_id` exists, it is updated in place; if not, one is created. Run the job twice and the second run rewrites the same records with the same values, so duplicates are impossible.

The write itself is one call:

```python
attio_req(
    "PUT",
    "/objects/stripe_customers/records",
    {"data": {"values": values}},
    params={"matching_attribute": "stripe_customer_id"},
)
```

After a run, every paying customer has exactly one record in `stripe_customers`, whether it is the first run or the hundredth. Currency fields need their values wrapped as `{"currency_value": dollars}`; the [Attio API field guide](/reference/attio-api-field-guide/) catalogs that wrapper and the others you will meet. The shipped job also skips customers with zero lifetime revenue, because Stripe accumulates free signups the CRM does not need.

The helper that makes these calls retries temporary failures with growing pauses between attempts, including a quirk found in the field: Attio occasionally returns a spurious "not authorized" error under load, and the script treats it as temporary, alongside genuine rate-limit and server errors. Retrying inside the script is precise; re-running the whole job is a blunt instrument.

## Step 5 — link the person by email

The revenue record is most useful joined to the human being. The script looks up each customer's email in Attio's People object, matching only on the exact address in lower case, and caches lookups so a repeated email costs one query:

```python
body = {"filter": {"email_addresses": {"email_address": email.strip().lower()}}, "limit": 1}
res = attio_req("POST", "/objects/people/records/query", body)
if res.get("data"):
    values["person"] = {
        "target_object": "people",
        "target_record_id": res["data"][0]["id"]["record_id"],
    }
```

After this step, customers whose email exists in the CRM show a `person` link on their record. No match is fine: the record simply carries no link until the person appears in the CRM, and the next day's run links it. Exact-match on a normalized email is deliberately cautious, because attaching revenue to the wrong person is worse than attaching it to no one.

## Step 6 — schedule it daily

A workflow is the small text file that tells GitHub Actions when and how to run your script; the schedule line uses cron syntax, a five-part time pattern where `"0 7 * * *"` means "at 07:00 every day". The shipped workflow, trimmed:

```yaml
on:
  schedule:
    - cron: "0 7 * * *"   # daily, off business hours
  workflow_dispatch:
concurrency:
  group: sync
  cancel-in-progress: false
jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 90
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Run sync
        env:
          STRIPE_API_KEY: ${{ secrets.STRIPE_API_KEY }}
          ATTIO_API_KEY: ${{ secrets.ATTIO_API_KEY }}
        run: python -u sync.py
```

Once this file is in the repo and both keys are saved as Actions secrets (GitHub's locked storage for passwords, readable by the workflow but by nobody else), you should see the workflow in the repo's Actions tab with a manual "Run workflow" button.

The details that matter: `workflow_dispatch` gives you that manual button; the `concurrency` block stops two runs from overlapping; `timeout-minutes` limits a hung run. This sync walks every charge in the account's history, so it allows 90 minutes where a small sync would set 10. The shipped workflow also saves each run's log as a downloadable file even when the run fails, so a bad run from last week is still diagnosable.

Daily is the right frequency: revenue review happens at most daily, and a full-history rescan is not something to run every 15 minutes.

:::caution
Scheduled workflows in private repos consume paid Actions minutes, and a billing lapse silently stops the schedule with nothing turning red. That, and GitHub dropping runs scheduled on busy minutes like `:00` and `:30`, are covered in [cron agents](/reference/cron-agents/).
:::

## Check your work

1. **One customer first.** The repo ships `test_one.py <cus_id>`, a small script that computes and prints a single customer without touching the rest of the account. Pick a customer whose history you know (a refund, a discount, several products) and check every number by hand against the Stripe dashboard. They should match exactly.
2. **Reconcile the total.** A full run prints `total revenue across all customers` before writing anything. Compare it against the Stripe dashboard's gross revenue line. It should match closely, and you should be able to explain any gap (non-captured charges, disputes).
3. **Run it twice.** The second run writes the same values onto the same records. You should see zero new records in Attio.

## If something goes wrong

- **Record count grows on every run.** Your match key is not actually unique, so the upsert is creating instead of updating. Fix the `stripe_customer_id` field's unique setting, not the symptom.
- **The product columns do not sum to the total.** Expected: charges with no invoice count toward lifetime revenue but no product (see step 3). If the gap is large for your business, that assumption does not hold for you.
- **A new product's revenue is missing.** It is landing in the `spend_other` bucket. Add the product ID to `PRODUCT_SLUGS` and a matching field to the bootstrap script.
- **Occasional "unauthorized" errors from Attio mid-run.** A known quirk under load; the script's retry logic treats them as temporary. If they persist across retries, the key really has a problem.
- **The scheduled run stopped happening.** Check the Actions tab and the repo's billing; see the caution in step 6.

## Variations

- **Subscription status.** The shipped sync also rolls each customer's subscriptions up into one status value: Active, Past Due, Canceled (split into voluntary versus involuntary, from `cancellation_details.reason`), or No Subscription. That turns the object into a churn dashboard for free.
- **Other billing systems.** Chargebee, Paddle, or even a bank export reduce to the same skeleton: page through the money events, total them per external identity in whole cents, upsert by a unique external ID, link by normalized email.
- **Fund-side use.** Point the reading side at a portfolio company's revenue feed and the writing side at your deals object, and the same pattern keeps live revenue on the records your Monday meeting actually looks at. That is the [CRM as database](/reference/crm-as-database/) posture, applied.

## See also

- [The one-file cron sync](/guides/one-file-cron-sync/) — the smaller build this guide extends.
- [Cron agents](/reference/cron-agents/) — scheduling, retries, and the GitHub Actions sharp edges in full.
- [Attio API field guide](/reference/attio-api-field-guide/) — value wrappers, upserts, and rate limits.
- [CRM as database](/reference/crm-as-database/) — why the CRM is the right home for this number.
