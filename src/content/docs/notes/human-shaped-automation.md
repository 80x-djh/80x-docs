---
title: Human-shaped automation
description: Three shipped systems show why automations that keep a person in charge of the final decision are the ones that survive in production.
---

*2026-07-02*

Every automation pitch tells the same story. The software reads the calls, updates the CRM (the customer relationship management system, the shared database of companies, people, and deals your firm runs on; see [CRM as database](/reference/crm-as-database/)), cleans the data, and the humans get their time back. I have shipped enough of these systems into live fund and company workspaces to report what actually survives in production, meaning in daily use on real data.

The automations that last are not the ones that remove a human step. They are the ones designed around a human checkpoint: a specific point where a person reviews what the software proposes and decides what happens next. Full autonomy, where the software acts with no review at all, is something a system earns one task at a time, with evidence. It should not be granted on day one.

Three shipped systems, anonymized, show what this looks like.

## The extraction agent that suggests instead of overwriting

A legal-tech company runs a daily [agent](/reference/agents/), an AI model that can take actions such as reading and writing records rather than just answering questions. It reads the notes on every active deal (call summaries and manual notes) and pulls out sales-qualification details: which metrics were mentioned, who controls the budget, what the decision criteria are, and which competitors came up.

The obvious design writes those findings straight into the deal's qualification fields. That design was rejected before any code was written, for a reason any account executive will recognize: those fields belong to the salesperson. Their read on a deal is a judgment call, backed by relationship context that a call transcript does not carry. If an agent silently changes a field a person owns, that person stops trusting every field in the system the first time they notice.

So the agent gets its own lane. It signs in to the CRM under its own identity, and it writes only to a parallel set of [suggestion fields](/glossary/#suggestion-fields): clearly labeled fields that hold the agent's proposals, kept separate from the fields people own. The salesperson sees the suggestion next to their own field and can accept it with one click, edit it, or ignore it.

Several safeguards sit underneath. Every write is logged along with the note it came from, a record known as [provenance](/glossary/#provenance). The tool only writes when run with an explicit `--apply` instruction. There is a [kill switch](/glossary/#kill-switch), a single setting that turns all writes off at once. And the default mode is a [dry run](/glossary/#dry-run), where the tool reports what it would change without changing anything.

The checkpoint, a human reading the suggestion and deciding, is not a safety feature added at the end. It is the design. The agent's job is to make sure nothing said on a call gets lost. The human's job is to decide what is true.

## The cleanup that deleted 1,486 notes and still kept a review queue

A VC fund came out of a CRM migration with thousands of duplicated notes. At one point, 1,008 of them sat on the fund's own company record. The cleanup tool that fixed this deleted nearly 1,500 notes in its first live run (4,892 down to 3,407), with zero errors. Deleting that much data automatically sounds like exactly what this essay warns against. The design is why it was safe.

The tool acted on its own only where duplication could be proven. That meant notes whose text was identical character for character, or a copy verified as fully contained inside the note being kept. It re-fetched and re-checked each note immediately before deleting it. Everything was backed up first. Every deletion was logged to an audit file, a spreadsheet listing each change. Dry run was the default. And runs were [idempotent](/glossary/#idempotency), meaning a second run plans zero deletions instead of deleting more. Inside those limits, full autonomy was the right call: a person reviewing more than a thousand provably identical pairs adds no judgment, only fatigue and mistakes.

Everything ambiguous went the other way. There were sixty groups where the same note appeared on different companies. Sometimes that is duplication; sometimes it is a legitimate note about a deal involving several parties. Those went into a review queue for a person, not onto the delete list. A deliberately skeptical second review confirmed that none of them could be resolved safely by a machine, so none were deleted.

A later pass looked for notes that said the same thing in different words. It went even further in the careful direction. Instead of deleting anything, it created a list inside the CRM itself, one entry per affected company, each with a plain-language summary of what looked duplicated and why. The person who owns the data could then act on each case from the tool they already use every day. Finding the problems ran automatically; deleting waited for a human yes.

Same tool, two postures. It acted alone where it could prove it was right, and it asked where it could not.

## The dashboard built around one question

A European PE platform has a deal-flow dashboard that rebuilds itself every weekday morning from the live CRM. The tempting version of that project is a full analytics product: every metric, every filter, drill-downs everywhere. What shipped is close to the opposite. It is a single page built around the questions a partner actually asks on a Monday: how many deals came in, how far did they get, what closed, and what is moving.

The revealing moment came after launch, when the partner pushed back on the funnel chart. The first version showed each deal at its current stage, a snapshot of right now. That silently dropped every deal that had already been killed, so the pipeline looked thinner than the year really was. What the partner wanted was the cumulative funnel: every deal counted at every stage it ever reached, including the deals that later died. Those are two different questions. One asks "what is in flight right now?" and the other asks "how well does our top of funnel convert?" No amount of extra metrics would have surfaced that difference. It surfaced because the page was shaped around one person's real question, so that person could see it was answering the wrong one. The automation handles the daily rebuild that nobody should do by hand. Deciding which question the page answers stayed a conversation between people.

## The checkpoint is the design

Across all three systems, the key move is the same. Find the point where human judgment genuinely adds information: approving a suggestion, deciding an ambiguous duplicate, choosing the question a report answers. Build the automation all the way up to that point, and make the checkpoint a proper interface rather than an afterthought. Suggestion fields, review queues, and in-CRM action lists are not slow versions of autonomy. They are what makes the automatic parts trustworthy, because everyone can see exactly where the machine's authority ends.

The second lesson is that autonomy is earned task by task. The cleanup tool earned unattended deletion for provably identical notes by checking its proof on every single record. It never earned it for the notes that merely said the same thing in different words. The extraction agent may someday earn the right to write one specific human-owned field, after months of its suggestions being accepted without edits. Even then, it would earn that right for that one field and that one task, not as a general license.

"Human in the loop" is usually said as a disclaimer. In shipped systems, it is the actual engineering discipline. The mechanics that keep the loop honest (dry runs, kill switches, backups, and reruns that do not apply twice) are covered in [automation safety](/reference/automation-safety/), and the patterns for letting agents write safely are in [writing agents safely](/reference/writing-agents-safely/).

## See also

- [Writing agents safely](/reference/writing-agents-safely/) — suggestion fields, promotion gates, and other write-path patterns
- [Automation safety](/reference/automation-safety/) — dry runs, kill switches, backups, and idempotency for anything unattended
- [Read-only agents](/reference/read-only-agents/) — the strongest checkpoint of all: no write tools
- [Cron agents](/reference/cron-agents/) — agents that run on a schedule, the shape two of these systems take
