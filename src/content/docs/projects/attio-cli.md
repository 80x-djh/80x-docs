---
title: "attio-cli: the Attio API from the terminal"
description: A free command-line tool for the Attio CRM, built for scripts, AI agents, and people who like terminals. Create, read, update, and delete anything.
---

[attio-cli](https://github.com/80x-djh/attio-cli) is a command-line interface (CLI) for the Attio CRM: a tool you use by typing commands into a terminal rather than clicking through screens. It talks to Attio through its API, the doorway that lets software read and write CRM data directly. It is built for three kinds of user: shell scripts, AI agents, and people who prefer terminals. If you are a partner or ops lead rather than an engineer, the most useful thing you can do with this page is hand it to your engineer or paste it into an AI assistant; the commands below are exact.

One tool covers the working surface of the Attio API (objects, attributes, records, lists, entries, tasks, notes, comments, threads, webhooks, workspace members, plus the beta meetings and call-recordings endpoints) with consistent flags, a small filter language, and output modes that let whoever is calling (a person, a script, or an AI model) pay only for the output they actually need.

## Install and run

You need a terminal, Node 18 or newer (Node is a free program from [nodejs.org](https://nodejs.org) that runs tools like this one), and an Attio API key, which is a password-like code you create in Attio's developer settings so software can access your workspace.

Install the tool once, connect it to your workspace, and run a first command:

```bash
npm install -g attio-cli

attio init          # guided setup — paste your API key, done
attio whoami        # verify connection
attio people list --limit 5
```

`npm install -g` puts the `attio` command on your machine. `attio init` asks for your API key and saves it. `attio whoami` should print your workspace details, which confirms the connection works, and the last command should print a small table of five people from your CRM. For environments where no person is present to answer questions (scheduled jobs, AI agent sandboxes), any of these works instead:

```bash
attio init --api-key <key>           # validates and saves
export ATTIO_API_KEY=<key>           # env var (takes precedence)
attio config set api-key <key>       # direct config write
```

A few representative commands, to give a feel for the shape:

```bash
# List companies, filter by name
attio companies list --filter 'name~Acme'

# Create a company and get back just the ID
attio companies create --set name="Acme" --set domains='["acme.com"]' -q

# Export all companies to CSV
attio companies list --all --csv > companies.csv

# Chain: create a record, then attach a note to it
ID=$(attio records create companies --set name="Acme" --set domains='["acme.com"]' -q)
attio notes create --object companies --record $ID --title "New lead" --content "From website"
```

The third command produces a spreadsheet file (`companies.csv`) you can open in Excel; the last pair shows how one command's output feeds the next. Filters use `attribute operator value` syntax (`=`, `!=`, `~` for contains, `^` for starts-with, numeric and date comparisons, and `?` for is-set), and multiple `--filter` flags combine with AND. `--sort attribute:direction` handles ordering, and `--all` fetches every page of results, not just the first. `records assert` and `upsert` create a record or update the existing one that matches, so a script that accidentally runs twice does not create duplicates; that property is called [idempotency](/glossary/#idempotency), and it is what you want in anything unattended.

## How it works

It is a thin, honest wrapper: TypeScript code over the Attio REST API (the repo includes a copy of Attio's own machine-readable API description, the OpenAPI spec), with small shared layers for login, paging, filter parsing, and output formatting (`src/client.ts`, `src/filters.ts`, `src/output.ts`, `src/pagination.ts`). The generic `records` commands work against any object, standard or custom, and `people`, `companies`, `deals`, `users`, and `workspaces` are convenient shortcuts over the same code path. Passing `--debug` prints the exact request and response for any call, so your engineer can reproduce it with standard web tools.

## Design decisions: built agent-first

The interesting choices are the ones that make a CLI a cheaper interface for AI agents than a resident tool server. Background, in one sentence: AI models read and are billed in tokens (small chunks of text), so every word a tool forces the model to read costs money on every request. The full argument, with benchmark data, is in [CLI vs MCP](/reference/cli-vs-mcp/) and [CLI vs MCP: real benchmarks](/notes/cli-vs-mcp-benchmarks/); here is how attio-cli implements it.

**Output modes, chosen per call.** The format is picked automatically (a table when a person is looking, JSON when another program is reading) and can be forced with `--json`, `--table`, `--csv`, or `-q` for IDs only, one per line. The repo's [benchmark report](https://github.com/80x-djh/attio-cli/blob/main/benchmarks/REPORT.md) measured the same company listing at 60,744 bytes as `--json`, 4,485 as `--table`, and 185 with `-q`. An [MCP](/reference/mcp/) tool result (MCP is the standard protocol AI assistants use to call tools) arrives as one fixed blob the model must read in full; a CLI lets the caller decide, on every call, how many tokens the answer costs.

**Help on demand instead of resident schemas.** An MCP server's tool descriptions are sent to the model as input on every single request. The benchmark puts the Attio MCP server's 30 tools at roughly 13,660 tokens per request (a character-based estimate, and the report says so), paid even for the simplest call. An agent driving attio-cli pays for its generic shell-tool description (~200 tokens) and reads `attio --help` or `attio companies --help` only when it actually needs to. Documentation becomes a cost the agent incurs on demand, not rent it pays every turn.

**`attio config claude-md`: a one-time cheat sheet.** For agents that work from a project context file, this command prints a compact command reference (discovery, create/read/update/delete, lists, tasks, notes) designed to be appended once. Run it like this:

```bash
attio config claude-md >> CLAUDE.md
```

This adds the cheat sheet to the end of the `CLAUDE.md` file, the standing instructions an AI coding assistant reads at the start of every session. It is the middle option between "full tool schemas every turn" and "no documentation at all": a short reference paid for once, with `--help` as the fallback for anything it leaves out. The cheat sheet also encodes conventions that keep agents unstuck, like always passing `--yes` on delete commands so nothing waits on a confirmation prompt.

**Composability as a feature.** Because the output modes are clean when piped, attio-cli works with the whole standard terminal toolkit: `jq` and `grep` for slicing text, `xargs` for looping over results, plus scheduled jobs and CI. A search-then-act task that would take an MCP-based agent three round trips through the model is one line:

```bash
attio records list companies --filter 'name^TEST_' --json -q | \
  xargs -I{} attio records delete companies {}
```

This finds every company whose name starts with `TEST_` and deletes each one; the first command emits the IDs, and `xargs` runs the delete once per ID.

**Determinism where it counts.** The same command produces the same output. Errors surface as exit codes (the numeric result a program hands back), not prose a model must interpret. Commands live in scripts as plain, reviewable text. For anything you intend to run unattended, that predictability is the point; see [automation safety](/reference/automation-safety/).

## Source

MIT-licensed (free to use, modify, and redistribute) at [github.com/80x-djh/attio-cli](https://github.com/80x-djh/attio-cli). The benchmark harness and raw results live in the repo's [`benchmarks/`](https://github.com/80x-djh/attio-cli/tree/main/benchmarks) directory, so the numbers above can be re-run, not just believed.

## See also

- [CLI vs MCP: when agents should get a command line](/reference/cli-vs-mcp/) — the cost trade-off, including when MCP genuinely wins
- [CLI vs MCP: real benchmarks](/notes/cli-vs-mcp-benchmarks/) — the full write-up of the numbers cited here
- [awesome-attio](/projects/awesome-attio/) — the wider Attio tooling ecosystem, including the MCP servers this CLI is benchmarked against
