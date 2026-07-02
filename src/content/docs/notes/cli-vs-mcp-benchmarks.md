---
title: "CLI vs MCP: real benchmarks"
description: "The measured numbers behind the CLI vs MCP page: what each approach costs in tokens, seconds, and dollars, and the caveats that apply."
---

*2026-07-02*

There are two common ways to let an AI [agent](/reference/agents/) (an AI model that can take actions, not just answer questions) work with your CRM. One is an [MCP server](/reference/mcp/): a connector that describes the CRM's available actions to the model, so the model can call them directly. The other is a CLI, short for command-line interface: a small program the agent operates by typing text commands, the same way a person would in a terminal. The [CLI vs MCP](/reference/cli-vs-mcp/) reference page argues that for frequent, repetitive work against a system you already know well, the CLI approach is faster and much cheaper. This note is the measured evidence behind that claim.

The numbers come from a benchmark (a controlled test of speed and cost) of [attio-cli](https://github.com/80x-djh/attio-cli), a free command-line tool for the Attio CRM, compared against the pattern used by the Attio MCP server. The full report is published in the tool's repository as [`benchmarks/REPORT.md`](https://github.com/80x-djh/attio-cli/blob/main/benchmarks/REPORT.md) and was generated on 2026-02-14. Everything below is quoted from that report. The caveats come first, because you should know how much to trust each number before you read any of them.

## What was measured and what was modeled

Not every number in the report has the same reliability. Here is the status of each kind:

- **CLI timings are real measurements.** Each command was run against a live Attio workspace and timed by the clock.
- **MCP timings are modeled, not measured.** The report takes the same underlying request to Attio and adds an estimated 2–5 seconds per tool call for inference, which is the thinking work the AI model does to decide which action to call and with what inputs. The report uses 3.5 seconds as its midpoint. It also assumes the worst case, where the model makes its calls one at a time. Some MCP setups can make several calls at once, which would shrink the multi-step totals.
- **Token counts are estimates.** A token is the unit of text an AI model reads and is billed by; one token is roughly three to four characters. The report counted characters in each tool description and estimated tokens at about 3.5 characters each. In the report's own words, real tokenization may vary by 10–20%.
- **Prices are a snapshot.** Per million tokens, at the time of the report: Haiku 3.5 at $0.80 for input and $4.00 for output, Sonnet 4.5 at $3.00 and $15.00, Opus 4 at $15.00 and $75.00. Model prices change over time.

The direction of every result below, and the rough size of the gaps, survive these caveats. The exact figures do not. Quote them with the caveats attached.

## The schema tax, measured

An MCP server has to describe every action it offers. Each description is called a schema: the tool's name, what it does, and the exact shape of the inputs it accepts. The model needs all of these descriptions in front of it on every single request, whether or not it uses any of them, and it is billed for them every time. This recurring cost is called the [schema tax](/glossary/#schema-tax).

The Attio MCP server offers 30 tools. Their descriptions add up to **13,660 tokens, sent as input on every request**, before any useful work happens. Here is where those tokens go, by category:

| Category | Tools | Tokens |
|---|--:|--:|
| Record CRUD | 3 | 4,170 |
| Record queries | 4 | 3,200 |
| Email & calls | 6 | 1,720 |
| Notes | 4 | 1,200 |
| Comments | 4 | 1,125 |
| Tasks | 3 | 910 |
| Lists & workspace | 4 | 565 |
| Schema | 1 | 430 |
| Meetings | 1 | 340 |
| **Total** | **30** | **13,660** |

(The "Record CRUD" row covers creating, reading, updating, and deleting records, which is what CRUD stands for.)

An agent driving a CLI pays a much smaller fixed cost. It only needs the description of one tool, the tool that lets it type commands, which is about **200 tokens** no matter how many commands the CLI supports. The report's model for MCP also adds roughly 120 output tokens for choosing a tool, about 400 input tokens for feeding the result back to the model, and about 80 output tokens for interpreting that result. All of those are small next to the 13,660-token schema, which is by far the biggest cost in every scenario below.

## Results for single operations

Each row in this table is one everyday CRM task, with an agent doing the work either way. CLI times are measured; MCP times are modeled as described above. "Token reduction" means how many fewer tokens the CLI approach used for the same task.

| Scenario | CLI tokens | MCP tokens | CLI latency | MCP latency | Token reduction |
|---|--:|--:|--:|--:|--:|
| List companies | 680 | 14,310 | 713ms | 3.9s | 95% |
| Filtered search | 680 | 14,310 | 495ms | 3.9s | 95% |
| Get a record | 680 | 14,310 | 409ms | 3.9s | 95% |
| Create a record | 680 | 28,620 | 841ms | 7.7s | 98% |
| Create a note | 680 | 14,310 | 606ms | 3.9s | 95% |
| Bulk export | 680 | 57,240 | 1.5s | 15.4s | 99% |

Two rows deserve a closer look.

First, creating a record costs MCP twice as much as reading one (28,620 tokens instead of 14,310). That is because the model first calls a tool named `list-attribute-definitions` to learn what fields a record has before it can fill them in. That is one extra call, and every call sends the full 13,660-token schema again.

Second, the overall summary. A typical single CLI operation took roughly **350ms** (about a third of a second, measured). The modeled MCP figure is **about 3.9 seconds**. In money, MCP costs about **$0.05 per operation at Sonnet pricing**. A CLI call run from a script, with no AI model involved, costs $0.

## A five-step workflow, where the gap compounds

Single operations understate the difference, because real agent work takes several steps and MCP pays the schema tax on every step. The report's example workflow is onboarding a new company into the CRM: create the company, add a note, create a task, add a comment, then check the finished record. On the CLI side, that is five commands. On the MCP side, it is six tool calls, because the create step needs the extra schema lookup described above.

| Metric | CLI | MCP |
|---|--:|--:|
| Total input tokens | 3,400 | 85,860 |
| End-to-end latency | 1.6s (measured) | 23.1s (modeled) |
| Cost (Haiku 3.5) | <$0.01 | $0.07 |
| Cost (Sonnet 4.5) | $0.01 | $0.28 |
| Cost (Opus 4) | $0.06 | $1.38 |

Read the first row in plain terms: the same five steps cost 3,400 tokens through the CLI and 85,860 through MCP, a 96% reduction. In time, the CLI finished in 1.6 seconds while the model puts MCP at 23.1 seconds. In money, at Sonnet 4.5 prices, the workflow costs about a cent through the CLI and $0.28 through MCP. That is per run; the "Cost at scale" section below shows what it adds up to.

There is one more difference the table does not show. The CLI version is a script: a saved file of commands you can review, rerun, and track changes to. The MCP version is six separate model decisions, and a model is not guaranteed to make the same decisions twice.

## Cost at scale

The table below prices only the MCP schema overhead, meaning just the 13,660 tokens of tool descriptions re-sent on every operation, not the useful work itself. "Ops/day" means operations per day, and the totals cover 30 days.

| Ops/day | Haiku 3.5 | Sonnet 4.5 | Opus 4 | CLI |
|--:|--:|--:|--:|--:|
| 100 | $36.26 | $135.99 | $679.95 | $0* |
| 1,000 | $362.64 | $1,359.90 | $6,799.50 | $0* |
| 5,000 | $1,813.20 | $6,799.50 | $33,997.50 | $0* |

For scale: 1,000 operations a day is what a fund doing serious automated data work (nightly syncs, enrichment, cleanup) can easily reach, and at that volume the schema overhead alone costs $1,359.90 a month on Sonnet 4.5.

The asterisk matters. $0 assumes the CLI runs from a plain script with no AI model involved at all. When an agent drives the CLI, each operation costs about 680 tokens. That is still roughly a 95% saving, but it is not free.

The asterisk also points at the report's most useful finding. Many jobs that get called "agent workflows" (a nightly export, a bulk update, a cleanup sweep) are the same steps every time, so they do not need a model making decisions at all. A CLI lets you move those jobs into a plain script and pay nothing per run. An MCP server always needs a model in the loop, because the model is the only thing that can call its tools.

## What would change these numbers

Three things would move the numbers. None of them reverses the conclusion:

- **Parallel tool calls.** The report models calls made one at a time, the worst case. A setup that lets the model make several calls in one turn pays the schema tax fewer times and finishes faster. The five-step gap would narrow; the per-request tax would not change.
- **Prompt caching.** Model providers charge much less for input the model has already seen recently, a feature called prompt caching. Tool descriptions are identical on every request, so they cache well. Caching would cut the dollar figures substantially (the report does not model it). The tokens would still take up room in the model's context window, its limited working memory, on every request, and not every setup caches.
- **Fewer exposed tools.** The tax grows with the number of tools. A server offering five carefully chosen tools instead of 30 would shrink the overhead in proportion. The benchmark tested the Attio server as it actually ships.

One thing would not change the conclusion: exact token counting. A 10–20% swing in the character-based estimates moves 13,660 to somewhere between roughly eleven and sixteen thousand. The gap stays large either way.

## How to quote this

If you repeat these numbers, keep the caveats attached. Say "roughly 13,660 tokens of schema per request, by a character-based estimate." Say "23.1 seconds, modeled," never "measured." The gap is real and large; the exact final digit is a product of the method, not a fact about the world.

MCP is still the right choice in some situations: chat tools that cannot run command-line programs, rarely used integrations, and setups where you want the server to manage sign-in for you. Those cases are covered on the [reference page](/reference/cli-vs-mcp/).

## See also

- [CLI vs MCP: when agents should get a command line](/reference/cli-vs-mcp/) — the decision framework these numbers support
- [attio-cli](/projects/attio-cli/) — the CLI under test ([source and full report on GitHub](https://github.com/80x-djh/attio-cli))
- [Model Context Protocol](/reference/mcp/) — what MCP is and when it wins
- [Spec-first agentic engineering](/notes/spec-first-agentic-engineering/) — how the CLI itself was built
