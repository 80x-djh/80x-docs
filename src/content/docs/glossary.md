---
title: Glossary
description: Every technical and fund-operations term used on 80x Docs, defined in one plain-English paragraph each and alphabetized.
---

This page defines every term of art used on this site, in one plain-English paragraph each, so you never have to leave a page confused by a word. It covers both the engineering vocabulary (agents, tools, safety patterns) and the fund-operations vocabulary the playbooks rely on. Definitions are deliberately short; where a full page exists, the definition links to it. Come here whenever a term on another page needs more than its inline definition.

## Agent

A program that runs an AI language model in a loop and lets it use tools to get a job done. On each pass, the model looks at everything that has happened so far and decides the next step: call a tool, or finish. The surrounding program actually runs the tools and feeds the results back to the model. An agent needs four parts: a model, tools, a loop, and a defined way to stop. A system missing any of the four is a script, a chatbot, or a chain rather than an agent. [Full page](/reference/agents/).

## Agent loop

The repeating cycle at the core of every agent: call the model, run the tool it asked for, add the result to the conversation, and repeat until the run ends. The growing conversation is the agent's memory for that run. The loop can be surprisingly small, just a plain loop in ordinary code around calls to the model's API; valentine, an open-source tool documented on this site, ships one that is about 60 lines with no framework. [Full page](/reference/agents/).

## Agent-owned namespace

A set of CRM fields that only automated systems write to, kept strictly separate from the fields humans edit. A common convention is a shared prefix, for example fields named `scout_*`. The separation means an agent can never overwrite data a human entered, and a human never has to maintain a machine-updated field by hand. Suggestion fields are the most common use: the agent files its proposals there, and a person reviews them. [Full page](/reference/writing-agents-safely/).

## Batch processing

Sending AI work to a provider in a queue to be handled later, instead of waiting for an answer immediately, in exchange for a large discount, commonly 50% off the standard token price. Most batches finish within an hour, and providers allow up to a day. It suits any job no person is waiting on: overnight pipeline re-scoring, bulk enrichment, or drafting reports. The only trade is immediacy, so it is the wrong tool for live meeting prep. [Full lesson](/learn/ai-spend/batch-non-urgent-work/).

## Chain

A fixed pipeline of steps that always run in the same order, for example search, then fetch, then summarize. In a chain, you decide the steps in advance; in an agent, the model decides each next step based on what it just learned. A practical test: if you can write down the exact sequence of steps before running anything, write a script (a chain), not an agent. [Full page](/reference/agents/).

## Citation-required extraction

A rule for AI extraction work: every value the model produces must carry a citation, meaning a word-for-word snippet of the source text (or the record IDs) it relied on, and the required output format enforces this. The model cannot file a claim it cannot point at. Citations let a human check each finding in seconds and cut down hallucination, the model's tendency to invent plausible-sounding facts. [Full page](/reference/writing-agents-safely/).

## Context engineering

The practice of deciding what information goes into a model's context window (defined below) and what stays out. Standing rules go in the system prompt, data for a specific run is fetched through tools, size limits are enforced in code, and content is ordered so that caching keeps costs down. It matters because everything you send the model costs money on every request, slows the response, and competes for the model's attention. [Full page](/reference/context-engineering/).

## Context window

Everything a language model can see on a single request: the instructions, the conversation so far, the tool definitions, and the tool results. It is measured in tokens, the small chunks of text models read, each roughly three-quarters of a word. The window is the scarcest resource in an agentic system, not because it is small but because you pay for every token on every request. A model reasoning over a few thousand relevant tokens gives better answers than the same model buried in far more irrelevant ones. [Full page](/reference/context-engineering/).

## Cost per workflow

A way to read an AI bill by translating raw spend into the cost of one unit of a job the fund recognizes: cost per deal screened, per meeting note captured, per portfolio update assembled. It is computed as (input tokens times input price) plus (output tokens times output price) per run, multiplied by runs per period. Expressing spend this way turns the question "is our AI bill too high" into "does screening a deal for four cents return more than four cents of attention," which a partner can actually answer. [Full lesson](/learn/ai-spend/what-ai-actually-costs/).

## CRM as database

The pattern of treating your CRM (Attio, Affinity, or similar) as your fund's one operational database: the single place every automation, agent, dashboard, and sync reads from and writes to. The alternative, a separate database standing beside the CRM, immediately creates two competing versions of the truth. Under this pattern, programs read the CRM through its API (the interface software uses to talk to other software), compute what they need, and write results back onto the records your team already looks at. [Full page](/reference/crm-as-database/).

## Cron agent

An automated job that runs on a timer instead of in a chat window. Cron is the long-standing name for software that runs other software on a schedule. A cron agent wakes on schedule, gathers the data it needs with ordinary code, calls an AI model only for the steps that genuinely need judgment, writes its results, logs what it did, and exits. It is the workhorse pattern for fund CRM upkeep (field maintenance, revenue syncs, date stamping), and most runs never need to call the model at all. [Full page](/reference/cron-agents/).

## Dealflow

The stream of investment opportunities moving through a fund, and by extension the pipeline that tracks them. In a CRM this is typically a list in which each deal carries a stage (screening, first call, IC, closed, passed) plus its data. Dealflow is the dataset most of this site's automations maintain: recorded stage dates make your funnel measurable, and your pipeline history is part of your fund's proprietary data advantage.

## Derived field

A CRM field whose value is computed from other data rather than typed in by a person. Examples: a nicely formatted text copy of a currency amount, a stage-entry date reconstructed from the CRM's status history, or a customer's lifetime revenue pulled from a billing system. The CRM cannot compute these itself, so an external job maintains them, treats them as machine-owned, and compares the current value before writing a new one. [Full page](/reference/crm-as-database/).

## Dry run

A mode in which an automation prints every change it *would* make without making any of them. It is usually switched on by an environment variable (a named setting a program reads when it starts) such as `DRY_RUN=1`, or by leaving off an `--apply` flag. A preview that exactly matches what the live run would do is the strongest check available before letting a job touch production data, and every data-writing automation on this site ships with one. [Full page](/reference/automation-safety/).

## Due diligence

The evidence gathering a fund does on a live deal before investing: verifying the market, the metrics, the team, the legal facts, and the references. Diligence produces documents, notes, and findings that scatter easily across inboxes and folders, so the patterns on this site treat them like all other deal data: captured against the deal record in the CRM, so the eventual decision and the evidence behind it stay together.

## Embedding

A way of turning a chunk of text into a list of numbers that captures its meaning, so a computer can find passages similar in meaning to a question rather than ones that merely share the same words. Embeddings are what make retrieval work: you embed your documents once, then each question fetches only its relevant chunks. They are cheap and billed as input only, because you are storing text, not generating it. [Full lesson](/learn/ai-spend/shrink-the-input/).

## Forced tool use

A way to make a model answer in an exact structure. In the API call you pass `tool_choice: { type: "tool", name: "..." }`, which requires the model to respond with exactly one call to the tool you named. That tool's input schema (a formal description of the allowed fields and their types) then acts as a contract for the output: you get clean, parsed data with nothing to strip out. The model can still make mistakes inside the structure, so the output should be validated by real code before anything downstream uses it. [Full page](/reference/tool-use/).

## GP (general partner)

A partner who manages a venture fund: raising it, sourcing and selecting investments, sitting on boards, and carrying responsibility to the fund's investors. In fund-operations terms, GPs and their team are the users of the CRM, dashboards, and agents this site documents.

## Idempotency

The property that running an automation twice against the same data changes nothing the second time. It matters because every automation will eventually run twice: retries, manual re-runs, overlapping schedules, and repeated webhook deliveries guarantee it. So every write is designed around one question: what happens if this runs again immediately? The common answers are to update an existing record instead of creating a duplicate, to fill a field only if it is empty, or to compare the current value first and write only if it differs. [Full page](/reference/automation-safety/).

## Kill switch

A way to stop a misbehaving automation in under a minute: a workflow toggle, a schedule you can disable, an API key you can revoke, or a single setting that gates all writes. Knowing where the switch is before you need it is part of the design. When something is looping, disable first and diagnose second. [Full page](/reference/automation-safety/).

## List payload

The full contents of a CRM list fetched through the API, for example every deal in a pipeline with its fields resolved into plain values. A fund's pipeline is small by database standards (hundreds of entries, not millions), so a job can fetch the whole list, compute everything it needs in one pass, and skip business-intelligence tooling entirely. The self-updating KPI dashboards on this site are static pages generated from a single daily list payload. [Full page](/reference/crm-as-database/).

## llms.txt

A convention for making a website easy for AI models to read: a plain-text index file at the site's root that says what the site is and links every page with a one-line description. A companion file, `llms-full.txt`, contains the entire site's content in one file. It works because it hands a model a clean, curated version of the site instead of raw web-page code. This site publishes both, plus a raw-text `.md` version of every page. [Full page](/start-here/for-llms/).

## LP (limited partner)

An investor in a venture fund: an institution, family office, or individual who commits capital that the fund's general partners invest. LPs are the fund's own customers, and the relationship data around them (commitments, conversations, reporting) is pipeline data in its own right.

## LP fundraising ops

The operational side of raising a fund from limited partners: tracking prospective LPs through a pipeline of their own (introduced, in conversation, in diligence, committed), keeping the data each conversation generates, and keeping materials and follow-ups current. The same CRM patterns used for dealflow (stages, stage dates, derived fields, syncs) apply directly, with LPs as the records. See the [playbooks](/playbooks/).

## MCP (Model Context Protocol)

An open standard, introduced by Anthropic in November 2024, for connecting AI applications to external systems. An MCP server offers tools, resources, and prompts in a common message format (JSON-RPC), and any MCP-capable app (Claude Desktop, Claude Code, Cursor) can discover and use them without custom integration work. It is a way to distribute tools, not a requirement for building agents: if you control the agent's code, you can define tools directly in the API call. [Full page](/reference/mcp/).

## MEDIC

A deal-qualification framework (Metrics, Economic buyer, Decision criteria, Identify pain, Champion) for judging how real and how winnable an opportunity is; it is a lighter variant of the MEDDIC sales methodology. On this site it is the framework a production extraction agent applies: the agent reads meeting notes and files cited MEDIC findings into agent-owned suggestion fields for a human to review. [Full page](/guides/medic-qualification-agent/).

## Model routing

Sending each task to the cheapest model that can handle it, rather than running everything on one expensive model. A cascade is the automatic version: every item goes to a small, cheap model first, and only the items it is not confident about escalate to a larger one, so frontier-model money is spent only on the hard minority. It is usually the largest single saving in a model bill. [Full lesson](/learn/ai-spend/right-size-the-model/).

## Pipeline hygiene

The operating discipline of keeping a fund's pipeline data trustworthy: every deal has a stage, every stage change has a date, pass reasons are recorded, and derived fields are current, so that your conversion, speed, and volume numbers reflect reality. Most of it is best enforced by automation rather than by nagging, because a scheduled reconcile job never forgets to stamp a date. [Full page](/playbooks/pipeline-hygiene/).

## Prompt caching

A provider feature that remembers the fixed front of a prompt so it does not have to be reprocessed on every call. The first call pays to store the block; later calls that begin with the byte-for-byte identical block read it back at roughly a tenth of the normal input price. It rewards workflows that reuse a large fixed block, such as a scoring rubric read against many decks, and it breaks the moment anything inside the cached block changes, so variable content must go last. [Full lesson](/learn/ai-spend/cache-the-fixed-prefix/).

## Provenance

A durable record of where a piece of data came from and which run produced it. For agent writes, this is typically one log row per finding: the source note, the target field, and the timestamp, kept whether or not the write was applied. Provenance lets you audit agent output after the fact. It also doubles as a ledger of work already done, which is what lets a re-run safely skip what it has already processed. [Full page](/reference/writing-agents-safely/).

## Qualification

The process of assessing whether a deal is worth pursuing: is the pain real, is there a budget, who decides, and what would make the fund the winner. Frameworks like MEDIC make qualification explicit, and explicit criteria are extractable: an agent can read meeting notes and propose qualification signals for a human to confirm. [Full page](/guides/medic-qualification-agent/).

## Read-only agent

An agent that cannot change any data, because no write capability exists anywhere in its code, typically enforced by a connector layer that defines read functions only. A prompt telling the model not to write is a request; code with no write function is a guarantee. Because the safety lives in the code, the worst any run can do is read the wrong record, which is a quality bug rather than an incident. [Full page](/reference/read-only-agents/).

## Retrieval-augmented generation (RAG)

Fetching only the passages relevant to a question and sending just those to the model, instead of pasting a whole document into every prompt. The documents are stored once in a searchable index using embeddings (defined above); at question time, the few relevant chunks are retrieved and sent. It is the most common fix for the silent overspend of stuffing everything into context, and it cuts input tokens sharply, though poor retrieval can quietly lower answer quality. [Full lesson](/learn/ai-spend/shrink-the-input/).

## Schema tax

The token cost of tool definitions. Every tool's name, description, and input schema is sent to the model as part of every request, whether or not the tool gets used, and the cost repeats on every turn of an agent's run. A server exposing 30 tools can spend more tokens describing them than doing actual work. This is the core argument for giving terminal-capable agents a command line instead of a large tool catalog. [Full page](/reference/cli-vs-mcp/).

## Screening

The first pass a fund makes on a new opportunity: deciding, from the deck, the first call, and quick research, whether a deal deserves more of the team's time. Screening produces the meeting notes and pass reasons that become part of your fund's proprietary data if they are captured, and evaporate if they are not. Explicit criteria (see [qualification](#qualification)) are what let an agent read those notes and propose screening signals for a human to confirm.

## Single source of truth

The principle that your fund keeps exactly one authoritative copy of its operational data, and every person, automation, and agent reads and writes that copy. On this site the single source of truth is the CRM: dashboards are generated from it, syncs write into it, and agents file suggestions onto its records, so there is never a second version of the pipeline to reconcile. [Full page](/reference/crm-as-database/).

## Sourcing

How a fund finds investment opportunities: referrals, outbound, events, inbound, and increasingly systematic signals drawn from public and owned data. This site's position is that the durable sourcing edge is the interaction data a fund captures and owns itself, because it is the one dataset no one else holds. [Full page](/playbooks/sourcing-and-signals/).

## Stage transition

The moment a deal (or LP prospect) moves from one pipeline stage to another. These are the events that funnel and speed metrics are built from, and recording *when* each one happened is the hard part. Webhooks miss events when they fail silently, so the more robust pattern reconstructs each stage's first-entry date from the history the CRM already stores, and fills only date fields that are still empty. [Full page](/reference/crm-as-database/).

## Structured output

Getting a model's answer as clean, typed data instead of prose. The most reliable techniques go through tool schemas: either force the model to call a single tool whose input schema is the shape you want, or give a free-roaming agent one final "submit" tool whose schema shapes the answer. Either way, the structure is enforced by the API's tool-use machinery, not by searching the model's prose for the answer afterward. [Full page](/reference/tool-use/).

## Suggestion fields

CRM fields in an agent-owned namespace where an agent files its proposed values (extracted qualification signals, drafted summaries) for a human to review, instead of editing the fields the team treats as authoritative. Suggestion fields let a fund get real leverage from agents while keeping human-owned data untouchable by machines. [Full page](/reference/writing-agents-safely/).

## System prompt

The standing instructions an agent receives on every run: its role, operating rules, decision criteria, and output format. It should be identical from run to run, with no timestamps and no per-run data, for two reasons: stable instructions behave more predictably, and identical text lets the API cache it, which cuts cost. Data that changes between runs belongs in retrieved context, not here. [Full page](/reference/context-engineering/).

## Termination condition

A defined way for an agent run to end, and ideally there are several: the normal path (the agent calls its final tool), an early stop when the model answers in plain text, and a hard cap on the number of steps so the worst case has a bounded cost and duration. The most common defect in homemade agents is a loop with exactly one exit, on the assumption that the model will always say when it is done. Well-built loops return the same typed result from every exit, so a bad run ends in an honest answer instead of a crash. [Full page](/reference/agents/).

## Token

The small chunk of text a language model reads and writes, and the unit every major AI provider bills by. One token is roughly three-quarters of a word, or about four characters. Providers charge separately for input tokens (everything you send) and output tokens (everything the model writes back), and output typically costs about five times more than input, which is why concise, structured answers are cheaper than long prose. [Full lesson](/learn/ai-spend/what-ai-actually-costs/).

## Tool use

The mechanism that lets a language model act on the world. You describe a function to the model (its name, what it does, and what inputs it accepts), the model replies with a structured request to call it, your code runs the real function, and the result goes back into the conversation. The model never executes anything itself. That is why an agent's capabilities, and its safety limits, are defined entirely by the list of tools you hand it. [Full page](/reference/tool-use/).

## Total cost of ownership (TCO)

The full cost of an AI capability, not just its token bill. It has four parts: building it, running it (tokens and seats), maintaining it as models and data change, and the human time to review its output before you trust it. The token bill is usually the smallest of the four; maintenance and review are the largest and the most often forgotten. Pricing an AI capability by its token cost alone underestimates it by multiples. [Full lesson](/learn/ai-spend/measure-the-roi/).

## Two-lock write

A gate on agent writes that requires two independent switches before anything changes production data: typically an explicit `--apply` flag on the command line *and* a separate live-writes environment variable. One switch can be flipped by accident. Requiring both means no single mistake turns a preview into a live run, and the environment variable doubles as a kill switch. [Full page](/reference/writing-agents-safely/).

## Webhook

A message one system automatically sends to another the moment something happens, for example when a record is updated or a deal changes stage. Technically it is a small web request the platform sends to an address you provide, which lets your system react in near real time. Webhooks look like the obvious tool for record-keeping but are fragile: they only see events that happen after you set them up, the same event can arrive twice (which makes idempotency non-optional), and a broken receiving endpoint fails silently. Scheduled reconcile jobs that read the CRM's stored history are often the more robust pattern. [Full page](/guides/attio-webhook-automation/).

## See also

- [What is 80x Docs?](/start-here/what-is-80x-docs/) — the site's sections and where each term gets used
- [What is an agent?](/reference/agents/) — the first reference page, where much of this vocabulary starts
- [Use this site with an LLM](/start-here/for-llms/) — hand this glossary (or any page) to your AI assistant
