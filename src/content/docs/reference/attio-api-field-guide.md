---
title: Attio API field guide
description: "The traps in Attio's API that cost real projects an afternoon each: value envelopes, query endpoints, PUT vs PATCH, spurious 401s, immutable notes."
---

This page collects the sharp edges of the Attio API, learned from running production automations against it: syncs, cleanup tools, dashboards, and agents, across multiple live fund workspaces. An API (application programming interface) is the doorway programs use to read and write a system's data; everything on this page is about talking to Attio through that doorway rather than through its normal screens. Everything here was either hit in production or is verified against the source code of [attio-cli](https://github.com/80x-djh/attio-cli) and [valentine](https://github.com/80x-djh/valentine).

## Why this matters for your fund

You may never call this API yourself, but whoever automates your CRM will: your engineer, a contractor, or an AI assistant you point at the docs. If Attio is your firm's single source of truth, this API is how every sync, dashboard, and agent reaches it, and each trap below has cost a real project an afternoon. Handing this page to whoever builds (or pasting it into the AI doing the building) is the cheapest way to skip those afternoons, and knowing the failure stories helps you ask better questions when an automation misbehaves. The official docs at [developers.attio.com](https://developers.attio.com) describe how things should work; this is the list of ways they surprise you.

Three basics before the traps. The base address for every request is `https://api.attio.com/v2`. Every request must include an API key (the password a program uses to act on your workspace) sent as `Authorization: Bearer <key>`. And those keys do not expire, though you can revoke them at any time.

## Every value lives in an envelope

All responses wrap their content in `{"data": ...}`, so a program must always unwrap `.data` before touching anything. Inside a record, **every field value arrives as a list of typed value objects**, even for fields that hold a single value, and each object's internal shape depends on the field's type. The response below shows one company record; notice how even the simple name is wrapped in layers of packaging.

```json
{
  "data": {
    "id": { "workspace_id": "…", "object_id": "…", "record_id": "97f5397f-…" },
    "created_at": "2026-03-14T09:21:07.000000000Z",
    "web_url": "https://app.attio.com/…",
    "values": {
      "name":       [{ "attribute_type": "text",   "value": "Acme GmbH" }],
      "domains":    [{ "attribute_type": "domain", "domain": "acme.com", "root_domain": "acme.com" }],
      "deal_stage": [{ "attribute_type": "status", "status": { "title": "Due diligence", "id": { "…": "…" } } }],
      "ebitda":     [{ "attribute_type": "currency", "currency_value": 2500000 }]
    }
  }
}
```

The catch: the key holding the actual value is different for nearly every field type ("Acme GmbH" sits under `value`, but the stage title sits under `status.title`). This table is lifted from attio-cli's value flattener (`src/values.ts`), which exists precisely because no single lookup works:

| `attribute_type` | Where the value actually is |
|---|---|
| `text`, `number`, `checkbox`, `date`, `timestamp`, `rating` | `value` |
| `currency` | `currency_value`, **not** `value` |
| `select` | `option.title` (a full option object, not a string) |
| `status` | `status.title` (same) |
| `domain` | `domain` (with `root_domain` alongside) |
| `email-address` | `email_address` |
| `personal-name` | `full_name`, or `first_name` + `last_name` |
| `phone-number` | `original_phone_number` |
| `location` | `locality`, `region`, `country_code` |
| `record-reference` | `target_object` + `target_record_id` |
| `actor-reference` | `referenced_actor_id` |
| `interaction` | `interaction_type` + `interacted_at` |

Writing is simpler than reading, which surprises people. The request wraps values in `{"data": {"values": {...}}}`, but you send plain values and the API adds the packaging itself. A dropdown field takes its option name as plain text; a multi-select takes a list of names. The request below writes three fields on a company.

```json
{ "data": { "values": {
  "name": "Acme GmbH",
  "deal_stage": "Due diligence",
  "sectors": ["Fintech", "B2B SaaS"]
} } }
```

Compare it with the response above and you see the asymmetry: what you write as `"Due diligence"` comes back wrapped in the full envelope. Every program consuming this API needs a small unwrapping layer like the table above; budget for it on day one.

## Reading records is a POST, not a GET

Requests to an API carry a verb saying what kind of operation they are: GET normally means "read something" and POST normally means "create something." Attio breaks with that convention for a practical reason: the requests that list or filter records need somewhere to put their filters, so they travel as POSTs.

:::note[The 404 that is really a wrong verb]
If you (or your AI assistant) reach for GET on the query endpoints, the API answers 404 "not found," which reads like a permissions problem. It is not; it is the wrong verb.
:::

| Operation | Endpoint |
|---|---|
| List/filter records | `POST /objects/{object}/records/query` |
| List/filter list entries | `POST /lists/{list}/entries/query` |
| Full-text search across objects | `POST /objects/records/search` |
| Single record | `GET /objects/{object}/records/{record_id}` |
| Notes for a record | `GET /notes?parent_object=…&parent_record_id=…` |
| Objects, lists, attributes, members, `/self` | plain `GET` |

Query requests take `{"filter": {...}, "sorts": [...], "limit": N, "offset": N}`. Filters use operator keywords borrowed from the MongoDB database, such as `{"name": {"$contains": "acme"}}`, `$eq` (equals), `$gte` (greater than or equal), and `$not_empty`, combined with `$and`/`$not`. Simple equality can be written as shorthand (`{"domains": "acme.com"}`). Results come in pages, and you page by count-and-skip (`limit` and `offset`) with no bookmark to resume from: keep requesting until a short page comes back. attio-cli's `src/pagination.ts` is a reference implementation.

One more shape trap: **list entries are not records.** A list entry (a record's membership row in a list, which carries its own fields) returns its values under `entry_values` rather than `values`, its writes go in `{"data": {"entry_values": {...}}}`, its parent record is `parent_record_id`, and a list's entry fields are a separate set from the parent object's, fetched via `GET /lists/{list}/attributes` rather than the object's field list.

## Never guess attribute slugs

A **slug** is the permanent internal name a field gets when it is created, and it is routinely nothing like the label you see on screen. Real examples from production workspaces: a field displayed as "Ticket" whose slug is `target_raise`; one displayed as "CA" whose slug is `amount_invested`; a migrated workspace whose Affinity ID landed under the auto-generated slug `affinity_id_8`. Guess from the visible label and you will filter on a field that does not exist, and a query filter on a nonexistent field fails or matches nothing rather than telling you why.

The fix is mechanical: list the fields before you touch them. The command below, using attio-cli, prints every field on the companies object with its real slug.

```bash
attio attributes list companies        # GET /objects/companies/attributes
# → api_slug, title, type, is_required, is_unique, is_multiselect
```

Compare the `title` column (what you see on screen) against `api_slug` (what the API wants) and use only the latter in code. Valentine takes the defensive version of the same stance: its Attio connector relies only on standard built-in fields (`name`, `domains`, interaction signals) and treats any unknown field or object as "no match, never crash," because a workspace's custom setup cannot be assumed.

## Select and status fields: objects out, titles in, IDs to manage

Select fields (pick one option from a set) and status fields (pick one stage from a funnel) behave three different ways depending on the operation:

- **Reading** returns a full option object (`option.title` / `status.title` plus an ID), per the envelope table above.
- **Writing** accepts the option's name as plain text.
- **Managing** options (adding, renaming, mapping name to ID for anything long-lived) goes through dedicated endpoints: `…/attributes/{attribute}/options` for selects and `…/attributes/{attribute}/statuses` for statuses. If you store option references anywhere durable, store IDs and keep a name-to-ID map, because names are one rename away from breaking you.

Two management gotchas hit while building an LP-fundraising pipeline for a VC fund via the API: **creating a field requires a `config` object** (pass an empty `{}` if you have nothing to configure, or the request fails with a 400 error), and **the order of statuses cannot be set via the API**; a stage funnel created programmatically comes out in creation order and must be reordered by dragging in the app.

## Create, update, assert: POST vs PATCH vs PUT

Attio offers four ways to write a record, distinguished by their request verbs. PATCH means "update part of this record" and PUT means "replace this record's values." The difference matters most for multi-select fields, where one appends and the other overwrites:

| Call | Semantics | Multiselect behavior |
|---|---|---|
| `POST /objects/{o}/records` | Create, always | n/a |
| `PATCH /objects/{o}/records/{id}` | Update by ID | **Appends** values, keeps existing |
| `PUT /objects/{o}/records/{id}` | Update by ID | **Overwrites**, removes values you omit |
| `PUT /objects/{o}/records?matching_attribute={slug}` | **Assert** (upsert): update the record whose `{slug}` matches, else create | Appends, like assert generally |

The assert endpoint is the workhorse for safe re-runs: match on a unique field (an email, a `stripe_customer_id`, an external ID) and re-running a sync updates the same records instead of duplicating them. That property is called idempotency, and it is the core requirement of [automation safety](/reference/automation-safety/). The same PATCH-appends versus PUT-overwrites split applies to list entries at `/lists/{l}/entries/{id}`.

:::tip[Diagnosing a job that "keeps adding tags"]
If an automation keeps piling up values on a multi-select field, it is almost certainly PATCHing where it meant to PUT.
:::

## Historic values: the CRM remembers more than it shows

A status field's current value is only the surface; Attio keeps its full history, and you can retrieve it per record or list entry. The request below asks for every value one deal's stage field has ever held.

```text
GET /lists/{list}/entries/{entry_id}/attributes/deal_stage/values?show_historic=true
→ every value the attribute has held, each with active_from / active_until
```

The response lists each past stage with the dates it was active, which is what makes after-the-fact reconstruction possible. This is why reconciliation beats webhooks for stamping stage-transition dates: a scheduled job can reconstruct the true first-entry date for every stage a deal ever passed through, including transitions from before the job existed. The full pattern is in [CRM as database](/reference/crm-as-database/).

## Rate limits, retries, and spurious 401s

A rate limit is the ceiling on how many requests an API will accept from one key before it starts refusing them. Attio enforces one per key and answers over-limit requests with error code `429` plus a `Retry-After` header saying when to try again (sometimes a number of seconds, sometimes a date; parse both, as attio-cli's client does, otherwise backing off exponentially from 1 second over 3 retries).

The quirk that is not in the docs: **under sustained load, Attio occasionally returns error code `401` ("bad credentials") on a perfectly valid key.** For an interactive tool the right response to a 401 is to stop immediately, and attio-cli does, because it usually means a real key problem. For an unattended job the right response is different: a production Stripe-revenue sync treats 401 as temporary alongside 429 and 5xx (server errors), retrying with a wait, and has run daily on that policy (the retry helper is shown in [cron agents](/reference/cron-agents/)). Policy by context:

| Status | Interactive CLI | Unattended job |
|---|---|---|
| 429 | Retry, honor `Retry-After` | Retry, honor `Retry-After` |
| 5xx / connection / timeout | Fail | Retry with backoff |
| 401 | Fail fast (probably a real key problem) | Retry with backoff (probably load) |

:::caution[One request per record does not scale]
The cost of ignoring retries compounds with request count. A European VC fund's daily date-stamping sync originally made one request per company (roughly 3,600 of them) with no retry protection. It ran about 19 minutes against a 20-minute timeout and died to the first passing `502` error on the days it did not die to the clock. The fix was both halves at once: fetch the needed field for all records in bulk through the paginated query endpoint (about 8 requests instead of about 3,600) and wrap every remaining call in retry-with-backoff. Runtime fell to about a minute. Design for bulk fetching *and* retries; either alone still fails.
:::

## Views are read-only via the API

You can list a workspace's saved views, but you cannot create or modify them: views and dashboards are app-only. Anything that needs a programmatically produced "view" of the data should read the underlying list through the query endpoints and present it elsewhere, which is exactly the static-dashboard pattern in [CRM as database](/reference/crm-as-database/). Attio's in-app workflow automations are similarly invisible to the public API: you cannot list or inspect them, which matters when you are trying to work out what is writing to a field.

## Notes: backdatable at creation, frozen after

The notes API can create, fetch, list, and delete notes, but it has **no way to edit one**. Two consequences:

- A note's creation date **can be set when it is created** ("backdating," explicitly supported for migrations) but never changed afterward. Redating an existing note means deleting it and recreating it with the desired date.
- Any fix to a note's content or title is also delete-and-recreate. Read `content_plaintext` off the note when you need its body; titles are plain text only.

The failure this enables at scale: a VC fund's Affinity migration was partially re-imported, and because the re-import *created* notes, every copy got a fresh creation date. The result was thousands of duplicates distinguishable from their originals only by date and by which account created them, on a resource where nothing can be edited in place. The cleanup had to identify each redated pair and delete one side, backup taken first. Notes also record which API key authored them, which turned out to be the only reliable way to tell the two import waves apart, and is a good reason to give each automation its own key.

## See also

- [CRM as database](/reference/crm-as-database/), the architecture these endpoints serve: derived fields, reconcile loops, dashboards
- [attio-cli](/projects/attio-cli/), the open-source CLI whose source grounds this page ([GitHub](https://github.com/80x-djh/attio-cli))
- [The one-file cron sync](/guides/one-file-cron-sync/): a complete production job that handles the envelope, retries, and idempotency
- [Automation safety](/reference/automation-safety/), what to check before any of these write calls runs unattended
- [Agents that write to your CRM](/reference/writing-agents-safely/), containment patterns for AI writers on this API
