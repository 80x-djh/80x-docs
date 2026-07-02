---
title: Spec-first agentic engineering
description: When AI agents write the code, the written plan becomes the real engineering work. What that looks like across two real builds.
---

*2026-07-02*

For most of software history, the code was the thing that mattered. The spec, the written description of what the code should do, was scaffolding: half-written, quickly out of date, read by nobody after the first week. AI [agents](/reference/agents/), AI models that can take actions such as writing and running code, reverse that. When a capable model writes the implementation, code becomes cheap to produce and cheap to regenerate. The document that says what the code must do becomes the place where the real engineering happens. It is the thing you think in, the thing you review, and the thing that lasts. This note describes what that looks like in practice, from two real builds.

## A working tool generated from one 1,200-line document

[attio-cli](https://github.com/80x-djh/attio-cli) is a CLI, short for command-line interface: a program you operate by typing text commands instead of clicking buttons. It is the tool measured in [CLI vs MCP: real benchmarks](/notes/cli-vs-mcp-benchmarks/). A coding agent generated the whole tool from a single specification, committed in the repository as [`SPEC.md`](https://github.com/80x-djh/attio-cli/blob/main/SPEC.md). The file is about 1,200 lines, and its title literally describes it as a one-shot prompt, meaning it was written so an agent could build the entire tool from it in one pass. What is instructive is what those 1,200 lines contain, because almost none of it is code:

- **What the tool is, and what it is not, stated first.** The spec opens: "A developer tool designed for scripting, automation, and agentic workflows — NOT a replacement for the Attio UI. Think `gh` or `stripe` CLI in spirit." One sentence of intent plus one explicit non-goal settles hundreds of small decisions later. Whenever the agent hits an ambiguous choice, it resolves the choice against that opening.
- **Where the truth lives, stated plainly.** The spec's first hard instruction tells the agent to fetch Attio's OpenAPI document and treat that as the authority on request and response shapes. (An API is the interface programs use to talk to a service like Attio; an OpenAPI document is a machine-readable file, published by the service, that describes every request the API accepts.) The spec itself only adds what that file cannot say. Pointing the agent at the source of truth works better than copying the truth into the prompt, because copies drift out of date.
- **Behavior and constraints, not implementation.** The spec fixes what the tool must do: which commands and flags exist and what they print, the exit codes (the number a program returns to signal success or failure), how output changes when a script is reading it instead of a person, and the exact folder structure. How to write the code inside is left to the agent.

The human review then happened in the two places where it is most useful: on the document before generation, and on the tool's behavior after. A person can genuinely review 1,200 lines of intent. A person cannot genuinely review several thousand lines of generated TypeScript, the programming language the tool is written in. And when the design turns out to be wrong, fixing a paragraph and regenerating is cheaper than reworking finished code.

## A product built as a decision log

The second example is the 80x Mac app, a native WhatsApp-CRM client. Here the practice goes deeper than one-shot generation. The repository's center of gravity is three documents:

- `PRODUCT.md` states what the product is and, flagged in the file as the important part, what it is not: no unofficial APIs, no background automation, no sending messages on the user's behalf.
- `CRM_BACKEND_CONTRACT.md` is the written contract for the feature that reads and edits CRM records. It fixes every route (each web address the app calls), the exact shape of the data sent in each direction, and what each error means. It was written before either side of the code existed, and both the Mac app and the backend were built against it.
- `DECISIONS.md` is a numbered decision log, with twenty entries for this one feature. Every entry has the same three parts: the choice, the reason, and how to reverse it.

Three entries show why the log earns its keep:

- Decision D18 records that record updates use `PUT` (replace the whole value) rather than `PATCH` (change part of it). The reason is written down: the CRM's `PATCH` appends to fields that hold multiple values, so a naive edit duplicated email addresses, and sending an empty list never cleared a field.
- D17 explicitly reverses an earlier decision, D3, and records the failure that forced the change. Tying the fake-data switch to the demo switch meant that demos against a real workspace silently showed canned data, which made a broken backend look healthy.
- D15 records that when a critical review changed the policy for missing records (reads fail quietly, writes show the user an error), the contract's error tables were updated in the same change, so the document never fell behind the behavior.

None of this is documentation in the written-up-afterwards sense. The contract came before the code, and the decision log was written as the decisions were made. The documents are where the engineering happened.

## Why agents make this necessary

Good API teams have always worked this way, but agents turn the habit into a requirement, for one structural reason: agents get their context from documents, not from memory. A human teammate remembers yesterday's discussion. An agent session starts blank every time, and the "next session" might be five minutes later, on the same feature, after the model's context window (its limited working memory) fills up. Whatever is not written down does not exist for the next session.

The decision log is therefore the working memory of the project. When an agent, or a new human, asks "why is this a `PUT`?", the answer costs one file read. Without the log, the agent works the answer out again from scratch, and it may confidently reach a different answer, leaving the codebase inconsistent with itself.

The same logic explains the "how to reverse it" field on every decision. Agents make changing code cheap, so the expensive thing becomes changing your mind safely. A decision recorded with its undo path can be revisited in minutes. A decision buried in code with no recorded reason is one nobody dares touch. Non-goals matter for a related reason: an agent asked to "improve" a system will expand it in every direction the spec fails to fence off, so the fences have to be written down.

## The alternative, and why it fails on the second change

The common alternative looks like this: open a chat with a model, describe the feature in conversation, iterate on what comes back, and paste the winner into the codebase. It can work once. The problems arrive with the second change. There is no document to review, so review collapses to asking whether the code looks plausible. The constraints agreed in the chat disappear when the chat ends, so the next change either argues them all over again or silently breaks them. Six weeks later, nobody, human or agent, can say which behaviors are intentional and which are accidents of generation. The spec still gets written in the end. It just gets reconstructed slowly, from the code, after something breaks.

The working rules, condensed:

- Write behavior, constraints, and non-goals before implementation, and say where the source of truth lives.
- Make the document the review target. It is the highest-leverage thing a human will read.
- Let agents implement against the document, and judge the output by the contract, not by taste.
- Record every non-obvious decision as choice, reason, and reversal path.
- When behavior changes, change the document in the same commit. A spec that lags behind the system misleads every reader, and agents read it with full trust.

This is [context engineering](/reference/context-engineering/), the discipline of deciding what an agent gets to read, applied to the build process itself. It is also why this site is written to be [readable by LLMs](/start-here/for-llms/), the large language models that power agents: documents are now working infrastructure, read by the systems that do the work.

## See also

- [Context engineering](/reference/context-engineering/) — the discipline of deciding what an agent gets to read
- [Writing for LLMs](/start-here/for-llms/) — how this site applies the same principle to itself
- [CLI vs MCP: real benchmarks](/notes/cli-vs-mcp-benchmarks/) — measuring the tool that SPEC.md one-shotted
- [attio-cli](/projects/attio-cli/) — the project page, with the spec linked from the repo
