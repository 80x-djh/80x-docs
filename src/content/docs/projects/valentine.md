---
title: "Valentine: the read-only pre-call CRM agent"
description: A free, open-source tool that checks your CRM before a founder call and tells you if anyone at the fund has met them before. It can read, never write.
---

[Valentine](https://github.com/80x-djh/valentine) answers one question in the minutes before a founder call: has anyone at the fund touched this company or founder before, and if so who, when, and what happened? Give it a company domain or a name, and it searches your CRM (Attio or Affinity) and returns a single verdict line instead of a pile of search results. It is an [agent](/reference/agents/), meaning a small program that uses an AI model to decide what to search next. And it is read-only by construction: nowhere in its code is there any ability to write, so it cannot change, send, or delete anything. That is why you can point it at your live CRM on day one without risk.

This page is written so you can follow it yourself, hand it to your engineer, or paste it into an AI assistant.

## Install and run

You run valentine from a terminal: on a Mac, that is the built-in Terminal app, where you type commands instead of clicking. You need Node 18 or newer installed first (Node is a free program from [nodejs.org](https://nodejs.org) that runs JavaScript tools like this one). Valentine is published as the package [`valentine-agent`](https://www.npmjs.com/package/valentine-agent) on npm, the public library Node installs tools from, so there is nothing to download by hand.

Type these two commands, one at a time, and press enter after each:

```bash
npx valentine-agent init        # connect your CRM (read-only token)
npx valentine-agent acme.com    # one verdict before the call
```

`npx` fetches and runs the tool in one step. The first command, `init`, is a guided setup: it asks you to pick Attio or Affinity, paste a CRM API key (a password-like code your CRM issues so software can access your data; a read-only key is encouraged), choose an AI model (the default is `claude-haiku-4-5`), and it tests the connection right away, so you know immediately whether it worked. Your answers are saved to a file at `~/.valentine/config.json` so you only do this once. Everything can also be supplied through environment variables (named settings your computer passes to programs: `VALENTINE_ATTIO_KEY` or `VALENTINE_AFFINITY_KEY`, plus `ANTHROPIC_API_KEY`), which is how you run it with no human present.

:::tip
Create a dedicated read-only API key for valentine in your CRM if your plan supports it. The tool cannot write either way, but a read-only key means even the credential you paste cannot be misused.
:::

The second command is the everyday one. Run it with a domain or a name, and after a few seconds it prints one verdict line. Every run ends in exactly one of three outcomes, and the exit code (a number a program hands back when it finishes, which scripts can check without reading any text) encodes the verdict:

| Verdict | Meaning | Exit code |
|---|---|---|
| Prior contact | A matching record has an owner and history | `10` |
| Clean | No matching record or no history | `0` |
| Ambiguous | Multiple weak matches, or no verdict reached | `20` |

## Using it from agents and MCP hosts

Valentine is built to be driven by other software, not just typed by hand. There are two ways in, both wrapping the same core.

**Headless CLI.** Run `npx valentine-agent --json acme.com` and it prints one JSON object (JSON is a plain-text format programs use to exchange structured data) with the fields `verdict`, `summary`, `owner`, `lastTouch`, `status`, and `citations`. In this mode it never stops to ask a question: under `--json`, or whenever no person is at the keyboard, it fails with instructions rather than waiting for input that will never come. `init --non-interactive` accepts a flag for every setup question, and switches on automatically when no person is present.

**MCP server.** [MCP](/reference/mcp/) (Model Context Protocol) is the standard that lets AI assistants such as Claude call outside tools. Running `valentine mcp` starts an MCP server that offers exactly one read-only tool, `valentine_verdict(target)`, returning the same JSON. To add it to Claude Desktop, put this into `claude_desktop_config.json`, Claude Desktop's settings file:

```json
{
  "mcpServers": {
    "valentine": { "command": "npx", "args": ["-y", "valentine-agent", "mcp"] }
  }
}
```

After you restart Claude Desktop, Claude can check prior contact itself: ask "have we met anyone at acme.com before?" and it calls the tool and cites the verdict. The repo's [`AGENTS.md`](https://github.com/80x-djh/valentine/blob/main/AGENTS.md) is the machine-readable version of this section, with the environment variables, output format, and MCP setup for Cursor, Claude Code, and other hosts.

## How it works: three moving parts

The flow, left to right:

```
TRIGGER ───► AGENT ───► CONNECTOR ───► your CRM (read-only)
(cli/mcp)   (loop +      (Attio,
             tools +      Affinity)
             prompt)
```

1. **A connector** (`src/connectors/`) is the piece that talks to your CRM. Every connector implements the same small `CRMConnector` interface with three methods, all of them reads: `whoami()`, `search()`, and `getContext()`. Attio and Affinity ship in the box, and because the rest of the code only ever sees the interface, adding HubSpot or Salesforce is one new file with zero changes elsewhere.
2. **An agent** (`src/agent.ts`) is a hand-written loop on the Anthropic Messages API: the model thinks, calls a read tool, sees the result, repeats, and finishes by calling `submit_verdict`. It is deliberately small enough to read in one sitting. [What is an agent?](/reference/agents/) walks this exact loop line by line, including its three ways of stopping and the 10-turn cap that guarantees it always stops.
3. **A trigger** (`src/cli.ts`, `src/mcp.ts`) is how a check gets started: the command line and MCP today. `valentine watch`, a calendar trigger that would run a check before each external meeting, exists in the code as a clearly labeled placeholder for the roadmap.

The rules the agent follows live in `src/prompt.ts`; the full design document is [`SPEC.md`](https://github.com/80x-djh/valentine/blob/main/SPEC.md).

## Design decisions

**Read-only by construction, not by policy.** The `CRMConnector` contract in `src/connectors/types.ts` contains no method that changes anything. So no turn of the agent loop, however confused or deliberately misled, has any code it could call to write, send, or move data. There is a difference between telling an AI "do not write" and giving it no pen, and valentine takes the second approach. [Read-only agents](/reference/read-only-agents/) covers this safety model in depth.

**A verdict, not a search result.** The final tool, `submit_verdict`, forces the answer into a fixed shape: the verdict must be one of the three values above, and `citations` (the CRM record IDs the agent relied on) is a required field, so every verdict can be checked against the records it names. The worst cases (the model stalls, or hits the 10-turn cap) come out as an honest `ambiguous` verdict rather than a crash or an invented answer.

**Local and bring-your-own-key.** There are no valentine servers. Your keys stay on your machine, and data flows only between your CRM and the AI model provider you chose. Combined with the small codebase, the trust argument is simple: your engineer can read every line before granting a token.

**Output built for automation.** JSON mode, exit codes, and the no-questions guarantee mean valentine slots into scripts, scheduled jobs, and other agents' toolkits like any standard command-line tool. The MCP server is a thin wrapper over the same core, so both surfaces carry the same read-only guarantee.

## Source

Valentine is MIT-licensed (free to use, modify, and redistribute) at [github.com/80x-djh/valentine](https://github.com/80x-djh/valentine), with full documentation at [tryvalentine.com/docs](https://tryvalentine.com/docs/). You can read every line before you run it.

## See also

- [What is an agent?](/reference/agents/) — valentine's agent loop, reproduced and annotated
- [Read-only agents](/reference/read-only-agents/) — the safety model valentine is the grounding example for
- [Model Context Protocol](/reference/mcp/) — how the MCP surface works and why it wraps the existing core
- [Automation safety](/reference/automation-safety/) — step caps and guaranteed stopping, generalized
