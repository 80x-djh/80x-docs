---
title: Build an Attio webhook automation
description: Stamp a date field the instant a deal changes stage, safely even when events repeat, with a scheduled backup that catches anything missed.
---

By the end of this guide you will have a small always-on program that reacts to a CRM change the moment it happens. A deal moves to a new pipeline stage, Attio sends your program a [webhook](/glossary/#webhook) (a message a service sends to your code the instant something happens), and your program stamps the entered-stage date on that deal. It writes only if the date field is still empty, so a date someone typed by hand is never overwritten. You will also build the piece most webhook tutorials skip: a companion scheduled job that keeps the data correct even when the webhook misses events, because sooner or later it will.

The guide is grounded in a system shipped for **a European PE platform**. Their dealflow list carries one date field per pipeline stage (`pre_screening_date`, `pre_ic_date`, `closed_date`, and so on), those dates feed the funnel-conversion and stage-velocity reports, and a webhook handler stamps each date on the day the deal enters the stage. The client is anonymized; the architecture, code shapes, and the failure that taught the biggest lesson here are exactly as shipped.

:::note[What you'll build]
Two cooperating pieces. First, a small web service (a program that runs continuously and listens for messages at an internet address) that receives Attio's "a deal changed" messages and stamps the right date field within seconds. Second, a scheduled backup job on GitHub Actions that reads the CRM's own history twice an hour and fills in any date the webhook missed.
:::

:::note[What you need]
- **An Attio API key** with read-and-write access to the target list. An API key is the password a program uses to act on your CRM; you create it in Attio's settings in a few clicks.
- **The date fields already created on the list**, one per stage. Create them by hand in Attio's interface.
- **Somewhere to run a small service with a public web address**: a $5-a-month virtual machine, or a hosting platform like Fly.io. This is the real cost of webhooks over scheduled jobs, and the most technical item on this list. GitHub Actions cannot receive a webhook, so the free scheduler alone is not enough here. An AI assistant such as Claude can write the code in this guide and walk you through the hosting setup step by step.
- **The three safety questions from [automation safety](/reference/automation-safety/)**, especially "what happens if it runs twice?". Webhooks deliver the same event more than once, so that question is not optional here.
:::

## When a webhook beats a scheduled job

A webhook buys you exactly one thing: **speed**. The event arrives seconds after the change, so a partner who drags a deal to Pré-CI sees the date appear before they have moved on. A scheduled job doing the same work every 30 minutes produces the identical date, just later.

That is the whole trade. Against it, webhooks carry three structural weaknesses that a scheduled job does not have:

1. **They only see events after they exist.** A webhook knows nothing about the six months of stage changes that happened before it was set up, or during any outage.
2. **Deliveries repeat.** Webhook providers resend events after timeouts, retries, and their own internal hiccups. Your program *will* receive the same event twice.
3. **A dead receiver fails silently.** When your service is down, nothing errors on the CRM side. Events are simply not delivered, and the data quietly stops being maintained.

So the honest decision rule: use a webhook when a human is watching the field and the freshness is worth running a service for; use [a scheduled job](/guides/one-file-cron-sync/) when "correct within the hour" is enough. And when you do build the webhook, pair it with the scheduled backup anyway. That is step 5.

Here is the whole system in one picture. The left path is fast; the right path is what makes it correct:

```text
   event path (latency)          reconciliation path (correctness)

+----------------------+         +----------------------------+
| Attio webhook:       |         | GitHub Actions cron,       |
| list-entry.updated   |         | twice hourly on weekdays   |
+----------+-----------+         +--------------+-------------+
           v                                    v
+----------------------+         +----------------------------+
| verify HMAC, ack,    |         | read full status history   |
| re-fetch entry, map  |         | (show_historic=true),      |
| stage -> date field  |         | earliest active_from wins  |
+----------+-----------+         +--------------+-------------+
           |                                    |
           +-----------------+------------------+
                             v
           write the date only if the field is
           still empty (redelivery is a no-op,
           human edits are never clobbered)
```

## Step 1 — register the webhook, filtered to your list

You create an Attio webhook through the API: one request to `POST /v2/webhooks` naming the web address to deliver to and which events you want. Subscribe to `list-entry.updated` and filter to the one list you care about, so Attio never sends events you would only throw away.

The code below is the body of that registration request:

```javascript
body: JSON.stringify({
  data: {
    target_url: WEBHOOK_URL,
    subscriptions: [{
      event_type: "list-entry.updated",
      filter: {
        "$and": [{ field: "list.id", operator: "equals", value: LIST_ID }],
      },
    }],
  },
})
```

The response includes a **secret**, a private code Attio will use to prove later messages really come from Attio. Save it into your service's settings (its environment variables, the named values a program reads at startup) and restart the service. The shipped registration script also deletes any existing webhook pointing at the same address before creating a new one, so re-running the registration is harmless.

You should now see the webhook listed when you query `GET /v2/webhooks`, with your address and subscription on it.

## Step 2 — verify the signature before trusting anything

Your receiving address is public, and it leads to a program that writes to your CRM. Anyone who discovers the address can send it fake messages. Attio prevents this by signing each delivery: it computes an HMAC (a cryptographic fingerprint made with the shared secret) of the exact message bytes and sends it in the `x-attio-signature` header. Your service recomputes the fingerprint and rejects anything that does not match.

The code below captures the raw bytes before any parsing changes them, then compares fingerprints in constant time (a comparison method that gives attackers no timing clues):

```javascript
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

function verifySignature(req) {
  const signature = req.headers["x-attio-signature"];
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET)
    .update(req.rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}
```

After this step, a genuine delivery passes and anything else is rejected with a 401 ("not authorized") response. Log the rejections: a burst of bad signatures means either the secret was rotated or someone is probing your address.

## Step 3 — fetch fresh state, then fill only if empty

The event tells you *that* a deal changed, not reliably what it looks like now. By the time you process a delivery (or a redelivery from an hour ago), the deal may have changed again. So the handler treats the event as a doorbell: it re-fetches the deal from the API, reads the current stage, maps it to a date field, and writes **only when that field is empty**.

The code below is that whole decision:

```javascript
async function handleStageChange(entryId) {
  const entry = await getEntry(entryId);                       // fresh read, not event payload
  const statusId = entry.entry_values?.deal_stage?.[0]?.status?.id?.status_id;
  const dateSlug = STAGE_DATE_MAP[statusId];                   // status_id -> "pre_ic_date" etc.
  if (!dateSlug) return;                                       // unmapped stage: skip

  const existing = entry.entry_values?.[dateSlug];
  if (existing?.length && existing[0].value) return;           // already stamped: never overwrite

  const today = new Date().toISOString().split("T")[0];
  await updateEntry(entryId, { [dateSlug]: today });
}
```

After this step, moving a deal into a mapped stage writes today's date into the matching field, once.

That single "is it empty?" check carries three guarantees at once:

- **A repeated delivery does nothing.** The second copy of the event finds the field already filled and stops. That is [idempotency](/glossary/#idempotency) (safe to run twice) in its simplest form.
- **Human edits are never overwritten.** If someone corrected a date by hand, the handler respects it forever.
- **Re-entering a stage does not rewrite history.** The field records the *first* entry into the stage, which is what funnel math wants.

Fill-only-if-empty is the webhook counterpart of the compare-before-write habit in [automation safety](/reference/automation-safety/).

## Step 4 — acknowledge fast, process after

Attio expects a quick "received" response (a 200 status) to each delivery. If your program is slow to respond, Attio assumes failure and resends, which multiplies your load for no benefit. So the handler answers first and does the work after:

```javascript
app.post("/webhook", async (req, res) => {
  if (!verifySignature(req)) return res.status(401).json({ error: "invalid signature" });
  const entryId = req.body.data?.id?.entry_id;
  res.status(200).json({ ok: true });          // ack before processing
  try { await handleStageChange(entryId); }
  catch (err) { console.error(`entry ${entryId}:`, err.message); }
});
```

After this step, deliveries are acknowledged in milliseconds and processed right after. This ordering is safe only because step 3 made processing repeatable: if the program dies after acknowledging but before writing, either a redelivery or the backup job in step 5 picks up the loss. Add a `GET /health` route while you are here (a simple address that answers "I am alive"); you will use it to monitor the failure mode below.

## Step 5 — add the scheduled backup, because the webhook will miss events

This step separates a demo from a system, and it exists because of a production failure worth retelling. The shipped webhook ran fine for a while. Then its hosting went away, and nothing complained: deals kept moving through stages, no dates were stamped, and because the funnel reports keyed off those dates, deals silently vanished from the funnel. No error anywhere. Just numbers that were quietly wrong, until a human asked why the funnel counted 81 deals when the list held 134.

:::caution
A dead webhook receiver produces no error on either side. If your reports depend on webhook-maintained data and you have no backup job, the failure mode is wrong numbers presented confidently.
:::

The fix reads the truth instead of trying to catch every event. Attio keeps the full history of a stage field, so a scheduled job can reconstruct the real first-entry date for every stage a deal ever passed through, including changes from before the webhook existed. The request below asks Attio for that history; the earliest `active_from` timestamp per stage is the true entry date:

```python
resp = requests.get(
    f"{BASE}/lists/{LIST_ID}/entries/{entry_id}/attributes/deal_stage/values",
    headers=HEADERS,
    params={"show_historic": "true", "limit": 100},
)
for v in resp.json()["data"]:
    title = v["status"]["title"]
    day = v["active_from"][:10]     # earliest active_from per stage wins
```

The backup job applies the same fill-only-if-empty rule and runs twice an hour on weekdays via GitHub Actions (the free scheduler; the [one-file cron sync guide](/guides/one-file-cron-sync/) shows the setup). Its very first run backfilled 76 date fields across 54 deals with true historical dates the webhook could never have known.

With the backup in place, the roles are clear: the webhook is the speed, the scheduled job is the correctness. If the receiver dies again, dates arrive within half an hour instead of never. The full argument for reconciling from stored history rather than chasing events is in [CRM as database](/reference/crm-as-database/).

## Check your work

1. **Signature check.** Send a garbage message to your address; you should get a 401. Resend a captured real delivery unmodified; you should get a 200.
2. **Move a test deal.** Drag one deal to a new stage in Attio. The date field should fill in with today's date within seconds.
3. **Redeliver.** Send the same event again. The log should show "already set, skipping", and the record's history in Attio should show exactly one write.
4. **Human precedence.** Hand-edit a date field to a different date, move the deal out of that stage and back in. The manual date must survive.
5. **Kill it.** Stop the service, move a deal, and confirm nothing errors anywhere (that silence is the lesson of step 5). Then confirm the backup job stamps the correct date on its next run.

## If something goes wrong

- **Dates stopped appearing and nothing is red.** The receiver is probably down; check its `/health` address. This is the silent failure from step 5, and it is why the backup job exists. If the backup is running, dates still arrive within half an hour.
- **A burst of 401s in the log.** Either the webhook secret was rotated (re-register and update the service's environment) or someone found your address and is probing it. Both are worth knowing about, which is why you log them.
- **The same date written twice, or a manual date overwritten.** Your fill-only-if-empty check in step 3 is not running before the write. That check is the entire safety model; fix it before anything else.
- **Attio keeps resending the same event.** Your handler is responding too slowly. Make sure it acknowledges before processing, as in step 4.

## Variations

- **Other stamp-on-event fields.** "First responded at", "owner assigned at", "moved to legal at": anything of the form *record the first time X became true* is this exact build with a different stage-to-field map.
- **Webhook triggers the scheduled job.** If you cannot host a service at all, some teams point the webhook at a relay that starts the reconciliation workflow via `workflow_dispatch` (GitHub's manual-trigger mechanism). Worst-case delay becomes one workflow start rather than one schedule tick.
- **Notifications instead of writes.** A handler that posts "deal X entered Pré-CI" to Slack keeps the speed win with zero write risk. There is no data to damage, though duplicate messages still argue for the same discipline.

## See also

- [Automation safety](/reference/automation-safety/) — idempotency, loops, and blast radius; redelivery makes it mandatory here.
- [CRM as database](/reference/crm-as-database/) — why reconciling from status history beats chasing events for correctness.
- [The one-file cron sync](/guides/one-file-cron-sync/) — the companion scheduled-job pattern, built end to end.
- [Attio API field guide](/reference/attio-api-field-guide/) — status-value shapes and the `show_historic` parameter.
