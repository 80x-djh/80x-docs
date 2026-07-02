---
title: "CLI vs MCP: when agents should get a command line"
description: MCP tool schemas cost tokens on every single request. Learn when a plain command-line tool is cheaper and faster, and when MCP still wins.
---

An agent needs a way to act on outside systems, and two patterns dominate. **MCP** (the [Model Context Protocol](/reference/mcp/), a standard where a small server advertises typed tools that the model calls directly) is one. The other is a **CLI**, short for command-line interface: an ordinary program you control by typing commands into a terminal (the text window used to talk to a computer), which an agent can drive through its shell tool. The industry default has become "build an MCP server." But for a large class of agent work (coding agents, scripts, scheduled jobs, repeated workflows against the CRM API your pipeline lives behind) a well-designed CLI is cheaper, faster, and more reliable. This page explains why, with measured numbers, and when each pattern wins.

## Why this matters for your fund

If your fund runs agents against your CRM daily (screening checks, meeting-prep lookups, pipeline syncs), the interface choice changes your monthly AI bill by a meaningful multiple and your automation speed by more. That makes this a cost and ROI decision, not a matter of taste, and it comes down to one mechanical fact about how MCP works, explained next. Knowing it lets you ask one sharp question of any vendor or engineer proposing an MCP integration: "what does the tool schema cost us per request?"

Where do the numbers on this page come from? A live benchmark of [attio-cli](https://github.com/80x-djh/attio-cli) against the Attio MCP server pattern, published in the repo's [`benchmarks/REPORT.md`](https://github.com/80x-djh/attio-cli/blob/main/benchmarks/REPORT.md) and written up in full in [CLI vs MCP: real benchmarks](/notes/cli-vs-mcp-benchmarks/). Some figures are estimates (token counts use roughly 3.5 characters per token; real tokenization varies 10–20%). The report says so, and so should you when you quote them.

## The schema tax: why MCP costs tokens before it does anything

First, two definitions. A **token** is the small chunk of text an AI model reads and writes; model usage is priced per token, so tokens are money. A **schema** is the machine-readable description of a tool: its name, what it does, and what inputs it accepts.

The core mechanical fact: **MCP tool schemas are sent to the model on every request.** When an agent is connected to an MCP server, every turn of the conversation includes the full schema of every exposed tool, whether or not any of them get called.

The Attio MCP server in the benchmark exposes 30 tools. Written out, those definitions come to roughly **13,660 tokens per request**. Calling a single tool, even the trivial `whoami`, pays for all 30. A CLI-based agent pays for its shell tool's schema instead: about **200 tokens**, regardless of how many commands the underlying program supports.

The tax multiplies, because agent work takes many turns. Each tool call is a full round trip: the model reads the schemas, asks for a call, waits for the result, then reads the schemas *again* on the next turn. In the benchmarked three-step CRM workflow (search a company, get its details, list the schema), the MCP path consumed **38,698 input tokens against the CLI's 22,307, 42% fewer for identical work**, with schema overhead accounting for 65% of the MCP total. In a five-step company-onboarding workflow, the gap compounded to **3,400 tokens (CLI) vs 85,860 (MCP)**, and 1.6s vs a modeled 23.1s end to end.

:::caution[At scale, this is real money]
The report models the schema overhead alone, at 1,000 operations per day, at roughly **$1,360/month at Sonnet pricing, vs $0 when the same operations run as direct scripts**, and about 680 tokens per operation when an agent drives the CLI through its shell tool.
:::

Two honest caveats from the report itself: the MCP latency figures model tool calls happening one at a time (calling tools in parallel narrows the turn-count gap), and the token figures are character-based estimates, not exact tokenizer output. The direction and rough size of the gap survive both caveats; the third decimal place does not.

## What a CLI gives an agent that MCP cannot

**Documentation on demand instead of always-on.** `attio --help` and `attio companies --help` document the tool when asked. The agent spends tokens on the help text only when it needs it, and often it does not, because models are heavily trained on terminal sessions and produce CLI commands reliably from a short cheat sheet. attio-cli ships `attio config claude-md >> CLAUDE.md`, which drops a roughly 2,000-token reference into the agent's standing instructions once, instead of re-sending 13,660 tokens of schemas every turn.

**Chaining.** A CLI participates in the whole Unix ecosystem, the standard set of small programs that pass text to each other. The one-line command below searches for a company and fetches the top result's full record, all in a single agent turn.

```bash
attio companies search "Acme" -q | head -1 | xargs -I{} attio companies get {} --json
```

The pieces between the pipes (`head`, `xargs`) are standard utilities that trim and hand along the output; the point is that three steps collapse into one turn. The equivalent MCP flow is three full model round trips, each adding 500–2,000ms of thinking time on top of the API calls. MCP tools are islands; CLI tools chain into filters, schedulers, and scripts.

**Output size control.** MCP tool results come back whole: every call returns everything, and the model must read all of it even when it only needed an ID. A CLI can offer modes. In the benchmark, the same company listing was 60,744 bytes as `--json`, 4,485 bytes as `--table`, and **185 bytes with `-q`** (IDs only, one per line): a 328x reduction, chosen per call by whoever is calling.

**Predictability and debuggability.** Same command, same output. Numeric exit codes (a program's standard way of reporting success or failure) instead of errors buried in prose. A `--debug` flag prints the exact web request so any call can be reproduced and inspected. Commands live in scripts as plain text you can review and compare; MCP schemas change on the server, invisibly.

## When MCP wins

None of this makes MCP wrong; it makes it wrong as a *default*. MCP is the right interface when:

- **The host has no terminal.** Claude Desktop, web-based chat clients, and most embedded assistants cannot run shell commands. MCP is how tools reach them at all. This is the decisive case.
- **The tool is novel or rarely used.** Self-describing schemas are exactly what a model needs for something it has never seen and will use once. The "browse servers, connect, explore" model genuinely shines for the long tail of integrations.
- **You need more than tool calls.** MCP also carries resources (documents the model can read), subscriptions to changing data, reusable prompts, and server-managed login flows. An interactive app that pushes updates to the client has no CLI equivalent.
- **The schema is your safety rail.** A typed parameter schema is a stronger guardrail than open-ended shell access. If you cannot sandbox the environment the agent runs in, constraining the interface matters; see [automation safety](/reference/automation-safety/).

The two patterns also combine well. The thin-server pattern described on the [MCP page](/reference/mcp/) wraps an existing engine so the MCP interface inherits its guarantees, and [valentine](/projects/valentine/) ships as both a CLI and an MCP server over one core for exactly this reason. MCP for the edges, CLI for the core.

## Designing a CLI for agents: choices from attio-cli

attio-cli was built for three consumers with one program: humans in terminals, scripts in automated pipelines, and agents via their shell tool. The design decisions that matter, from its [SPEC.md](https://github.com/80x-djh/attio-cli/blob/main/SPEC.md):

| Decision | Mechanism | Why agents care |
|---|---|---|
| TTY-aware output | Table when a human is watching, JSON when piped to a program | Piped output is machine-readable by default; no flag needed |
| Quiet mode | `-q` prints only IDs, one per line | Chaining: `ID=$(attio records create companies --set name="Acme" -q)` |
| Explicit formats | `--json`, `--table`, `--csv` override detection | The caller picks the token budget per call |
| Typed exit codes | 0 ok, 1 API error, 2 auth, 3 not found, 4 validation, 5 rate-limited | Scripts and agents branch on the failure type without parsing prose |
| Prompts to stderr | Interactive questions never pollute the main output | Chained commands stay clean even when the tool asks questions |
| Retries built in | Waits and retries automatically when rate-limited, then exit 5 | The agent never has to implement its own retry loop |
| Self-installing docs | `attio config claude-md >> CLAUDE.md` | Discovery costs ~2,000 tokens once, not 13,660 per turn |

None of these are AI features. They are classic good manners for command-line programs, which is the point: an interface designed for programs serves a script, a pipeline, and Claude equally well. The full build story, including how the CLI was generated in one pass from a written spec, is in [spec-first agentic engineering](/notes/spec-first-agentic-engineering/).

## The decision rule

- Agent runs somewhere it can type commands (coding agents, scheduled jobs, automated pipelines) **and** hits the same API repeatedly → **CLI**.
- Host has no shell, the tool is one-off or long-tail, or you need documents, subscriptions, or managed login → **MCP**.
- Production system with both kinds of consumers → one engine, both interfaces.

## See also

- [CLI vs MCP: real benchmarks](/notes/cli-vs-mcp-benchmarks/) — the full measured comparison behind the numbers on this page
- [Model Context Protocol](/reference/mcp/) — what MCP is and the thin-server pattern
- [Tool use](/reference/tool-use/) — tools as the agent/world interface
- [attio-cli](/projects/attio-cli/) — the project page for the CLI used in the benchmark
- [What is an agent?](/reference/agents/) — the loop these interfaces plug into
