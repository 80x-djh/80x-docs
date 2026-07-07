---
title: Tool use
description: How tools connect an AI model to your systems, and how a tool schema can force the model to answer in a fixed, checkable shape.
---

A **tool** is a function you describe to a large language model (an LLM, the kind of AI behind Claude or ChatGPT) so the model can ask your program to run it. The model never executes anything itself. It emits a structured request, such as "call `search_crm` for the company acme.com," your code runs the real function, and you feed the result back for the model to read. Tool use is the entire interface between an [agent](/reference/agents/) and the world. Everything an agent can do, it does through the tools you hand it, and everything it *cannot* do is defined by the tools you withhold (see [read-only agents](/reference/read-only-agents/)). In fund terms, tools are how an agent reads your pipeline and how it writes a screening note back into it.

## Why this matters for your fund

Tools are how an AI reaches the systems your fund actually runs on: the CRM, the inbox, the meeting notes. When an agent preps a meeting by looking up prior contact, or files a screening note into your pipeline, each of those steps is one tool call. Two practical consequences follow. First, the tool list is your control surface. You decide what an agent can touch by deciding what functions to describe to it, which is the foundation of every safety pattern on this site. Second, tools are the reliable way to get structured data out of a model, such as action items pulled from a meeting note in a fixed shape your CRM can store, instead of a paragraph someone has to re-type. This page covers the anatomy of a tool, how the model chooses between tools, how results flow back, and then the most useful non-obvious pattern: forcing a tool call to get validated structured output.

## Anatomy of a tool definition

A tool is three things: a name, a description, and a schema for its input. The schema is written as JSON Schema; JSON is a simple text format for structured data, and a schema is a machine-readable rulebook saying which fields are allowed and which are required. Here is a real tool from [valentine](https://github.com/80x-djh/valentine), the open-source pre-call prior-contact checker.

```typescript
{
  name: "search_crm",
  description:
    "Search the fund's CRM for a company or person by domain or name. Returns matching " +
    "records with owner and last-touch. Use this first to find prior contact.",
  input_schema: {
    type: "object",
    properties: {
      object: { type: "string", enum: ["companies", "people"] },
      domain: { type: "string", description: "Company domain, e.g. acme.com" },
      name: { type: "string", description: "Company or person name" },
    },
    required: ["object"],
  },
}
```

Notice that most of this definition is written for the model to read, not for a computer. Each part does distinct work:

| Part | What it does | Design pressure |
|---|---|---|
| `name` | Identifier the model emits in its `tool_use` block | Verb-first, unambiguous among siblings |
| `description` | Tells the model *when* to call it, not just what it does | This is prompt engineering, "Use this first to find prior contact" is an instruction |
| `input_schema` | JSON Schema constraining the arguments | Enums over free strings; per-property descriptions; only fields you actually need |

The description is the piece most people underinvest in. The model reads it the same way it reads its standing instructions, so sequencing hints ("call on a promising match from `search_crm`"), examples ("e.g. acme.com"), and frequency rules ("call this EXACTLY ONCE") all belong there.

## How the model chooses

On each turn the model sees its system prompt (the standing instructions it starts with), the conversation so far, and every tool definition. It then decides: respond with text, or ask for one or more tool calls. There is no separate routing system. Tool selection is ordinary text prediction over the names and descriptions you supplied. Two consequences follow:

1. **Selection quality tracks description quality.** Two tools whose descriptions overlap ("search records" vs. "find records") will be chosen roughly at random between.
2. **Every tool definition costs money on every turn.** Tool definitions are sent to the model as input tokens (the small chunks of text a model reads and writes; usage is priced per token) on every request, whether or not the tool gets called. A fat toolset taxes the whole conversation. This is the core argument in [CLI vs MCP](/reference/cli-vs-mcp/) for giving some agents a command line instead of dozens of tool schemas.

## Tool results are context

When your code runs the tool, the output goes back into the conversation as a `tool_result` message, and the loop continues. This snippet from valentine's agent loop runs each requested tool and appends the results to the conversation.

```typescript
const results: Anthropic.ToolResultBlockParam[] = [];
for (const tu of toolUses) {
  const out = await runTool(tu.name, tu.input, crm);
  results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(out) });
}
messages.push({ role: "user", content: results });
```

The point to take away: a tool result is just more text the model reads. The model has no privileged access to it. So the *shape* of results matters as much as the shape of tools. Return the fields the model needs to reason with, not a raw API payload with forty keys of wrapper noise. Trimming results is [context engineering](/reference/context-engineering/) applied at the tool boundary, and the savings compound because every result stays in the conversation for the rest of the run.

Errors travel the same channel. Returning `{ error: "unknown tool: X" }` as a tool result lets the model read the failure and adapt, which is usually better than crashing the whole run.

## Forced tool use: structured output through a tool schema

By default the model decides for itself whether to call a tool. But the API (the application programming interface, meaning the web service your code calls to talk to the model) also accepts `tool_choice: { type: "tool", name: "..." }`, which **forces** the model to respond with exactly one call to the tool you name. This flips the feature's purpose: you are no longer offering capabilities, you are demanding output in a fixed shape.

This is the most dependable way to get validated structured data out of a model, because the tool's `input_schema` becomes an output contract. The model must produce arguments matching the schema, and you receive them as already-parsed JSON, with no markdown fences to strip and no "Here is the JSON you asked for:" preamble to clean away.

[cereal-milk](https://github.com/80x-djh/cereal-milk), the tool behind the [meeting notes to CRM](/guides/meeting-notes-to-crm/) pattern, uses this to turn a raw meeting note (title, attendees, enhanced summary, transcript excerpt) into a typed "pour": summary, decisions, action items with owners and due dates, risks with severity. Here is the extraction call, simplified. It builds one tool, forces the model to call it, and validates what comes back.

```typescript
const tool = buildPourTool(flavour); // JSON Schema built from what this flavour extracts

const res = await client.messages.create({
  model,
  max_tokens: 1500,
  system: buildSystemPrompt(flavour),
  tools: [tool],
  tool_choice: { type: "tool", name: tool.name },   // forced: this tool, nothing else
  messages: [{ role: "user", content: renderNoteForPrompt(note) }],
});

const toolUse = res.content.find((b) => b.type === "tool_use" && b.name === tool.name);
if (!toolUse) throw new Error("Extractor: model did not return the emit_pour tool call");
const pour: Pour = parsePourInput(flavour, toolUse.input); // Zod validation into a typed object
```

What to notice: the `tool_choice` line does the forcing, and the last line double-checks the result with Zod, a validation library, before anything downstream trusts it. Three details make this production-grade rather than a demo:

**The schema is built dynamically, and only asks for what is wanted.** `buildPourTool` includes a `decisions` property only if this extraction config wants decisions, and an `actionItems` property only if it wants action items. If a field is not in the schema, the model structurally cannot invent that section. Here is the action-items part of that schema; read the `description` strings to see how much instruction lives inside it.

```typescript
properties.actionItems = {
  type: "array",
  description: "Action items with an owner and due date when stated.",
  items: {
    type: "object",
    properties: {
      text: { type: "string" },
      owner: { type: ["string", "null"], description: "Person responsible, or null." },
      due: { type: ["string", "null"], description: "Due date/timeframe, or null." },
      citation: { type: "string", description: "Short verbatim snippet of the note line this came from." },
    },
    required: ["text"],
    additionalProperties: false,
  },
};
```

The schema is the guardrail: everything the model can return is spelled out here, field by field.

**Nullable fields and required citations fight made-up answers.** `owner` accepts `null` so the model has a legitimate way to say "not stated" instead of guessing, and every item carries a `citation` (a word-for-word snippet of the source line) so a human previewing the extraction can check it in seconds. The same discipline appears in [agents that write to your CRM](/reference/writing-agents-safely/).

**Matching the schema is not the same as being correct.** Forced tool use guarantees *shape*, not *sense*, and under rare conditions (the model hitting its output length limit mid-answer) even the shape can arrive incomplete. So the output still goes through a Zod parse (`parsePourInput`) that fills defaults for disabled fields and rejects anything malformed before it touches a downstream system. Treat the model's output like data from an outside service: usually right, always checked.

## The terminal tool: forcing structure at the end of a free run

There is a hybrid between free tool choice and forced output: give an agent read tools *plus one "submit" tool that writes nothing*, and instruct it that calling submit ends the run. Valentine's agent roams `search_crm` and `get_context` freely, but its answer must arrive through `submit_verdict`. Here is that tool's definition; the schema fixes the shape of every possible answer.

```typescript
{
  name: "submit_verdict",
  description: "Submit the final verdict. Call this EXACTLY ONCE when done. Ends the run.",
  input_schema: {
    type: "object",
    properties: {
      verdict: { type: "string", enum: ["prior_contact", "clean", "ambiguous"] },
      summary: { type: "string", description: "One line a partner reads in 2 seconds" },
      citations: { type: "array", items: { type: "string" }, description: "Record IDs used" },
    },
    required: ["verdict", "summary", "citations"],
  },
}
```

The loop watches for that call and returns its input as the typed result. You get an open-ended investigation with a fixed-shape answer, which combines the best of both modes.

## Sharp edges

:::caution[Tool definitions cost money on every request]
Tool definitions are sent with every request, called or not. cereal-milk budgets about 400 tokens for its single tool's schema when estimating cost *before* each call, and enforces a per-extraction dollar ceiling. Ten verbose tools can quietly add thousands of tokens per turn.
:::

- **Ambiguous descriptions produce random routing.** If you cannot say in one sentence when tool A beats tool B, the model cannot either. Merge them or sharpen the descriptions.
- **Unbounded inputs blow the budget from the other side.** cereal-milk caps the transcript excerpt it sends at 8,000 characters. An unbounded transcript inflates waiting time and cost for little extraction gain, and trips the cost ceiling.
- **Forced calls can still fail.** Check that the expected `tool_use` block exists, validate the input with a real schema library, and on validation failure retry once with the validator's error message included as a tool result. Models are good at repairing their own output when shown the exact complaint. If the retry fails too, stop rather than guessing.
- **Fixed choices beat free text wherever you can afford them.** An `enum` like `verdict: prior_contact | clean | ambiguous` lets your program branch on the answer; a prose verdict does not.

## See also

- [What is an agent?](/reference/agents/), the loop these tools plug into
- [CLI vs MCP](/reference/cli-vs-mcp/): when a command line beats a toolset, and the token math
- [Model Context Protocol](/reference/mcp/), sharing tool definitions across hosts
- [Meeting notes to CRM, automatically](/guides/meeting-notes-to-crm/), the forced-extraction pattern end to end
- [valentine](/projects/valentine/), the terminal-tool pattern shipped as an open-source CLI
