---
title: What is an agent?
description: An agent is an AI model run in a loop with tools, a goal, and a stopping rule. See the whole idea in a real 60-line example you can read.
---

An **agent** is a large language model (an LLM, the kind of AI behind Claude or ChatGPT) run in a loop, with tools it can use, a goal, and a rule for when to stop. On each pass through the loop, the model looks at everything that has happened so far and decides what to do next: call a tool, or finish. Your program runs the tool call, adds the result to the conversation, and hands control back to the model. Everything else you will hear about (planning, memory, multi-agent orchestration) is built on top of this loop. The worked example on this page is a piece of fund meeting prep: an agent that checks a founder for prior contact before a call.

## Why this matters for your fund

"Agent" is the most overloaded word in AI sales. It gets applied to chatbots, to fixed automations, and to almost anything with a model inside. If you hold the precise definition, you can question any pitch that uses the word, and you can tell when a plain script would do the same job for less money. Agents are also the machinery behind the fund workflows documented on this site, each an analyst-shaped unit of work: meeting prep (checking prior contact before a founder call), screening and qualification (pulling deal signals out of meeting notes), pipeline hygiene (keeping CRM fields current). Every other page in this reference builds on the loop described here.

## The loop, drawn

The diagram below shows one full cycle: the model decides, your program executes, the result feeds back in, and the loop repeats until the model finishes.

```text
   ┌───────────────────────────────────────────────────┐
   │                                                   │
   ▼                                                   │
┌───────────────┐  tool call  ┌──────────────────┐     │
│ model decides │────────────▶│ program executes │     │
└──────┬────────┘             └────────┬─────────┘     │
       │                               │ result        │
       │ verdict / no tool call        │ appended      │
       ▼                               └───────────────┘
┌───────────┐
│ terminate │
└───────────┘
```

The thing to notice: the model never touches the world directly. It only asks. Your program does the doing, which is why you stay in control of what an agent can and cannot do.

## The four parts, and what breaks without them

An agent needs all four parts below. A system missing any one of them is something else, and often something cheaper, which may be exactly what you want.

| Part | What it is | What breaks without it |
|---|---|---|
| **A model** | An LLM capable of tool use (deciding *which* tool, with *what* arguments) | You have a script, not an agent |
| **Tools** | Functions the program runs on the model's behalf — the model's only way to touch the world | You have a chatbot: it can talk, not act |
| **A loop** | Feed each tool result back; let the model decide the next step from the new state | You have a chain: one fixed sequence, no adaptation |
| **A termination condition** | A defined way for the run to end — ideally several | You have a bill and a hung process |

A quick word on tools, which have [their own page](/reference/tool-use/). A tool is a name, a description, and a list of allowed inputs, written as a JSON Schema. JSON is a simple text format for structured data that programs can read; a schema is a machine-readable rulebook saying which fields are allowed and which are required. The model emits a request to use a tool, then *your code* runs the real function and returns the result. The model never executes anything itself. So an agent's abilities are defined entirely by the tool list you hand it, and that is what makes [read-only agents](/reference/read-only-agents/) a real safety guarantee rather than a polite request.

## Why a loop and not a chain

A chain is a fixed pipeline: search, then fetch notes, then summarize, in that order, every time. Chains are fine when you know the path through the problem in advance. They fail when the path depends on what you find.

Consider the task [valentine](/projects/valentine/) solves: "before this founder call, has anyone at the fund touched this company before?" The right sequence of lookups depends entirely on intermediate results. Search by domain (the company's web address, like acme.com) and get one clean match: pull its notes, and you are done in two steps. Get zero matches: retry by name, then maybe search people instead of companies. Get three near-matches: inspect each one before deciding anything. A chain would have to encode every one of those branches up front, which means its author is writing a decision tree by hand. In a loop, the model makes each branching decision as it goes, using what it has already found, and the code stays small.

:::tip[When you do not need an agent]
If you can write the exact sequence of steps down before running the job, write a script. An agent earns its extra cost (waiting time, token spend, less predictable behavior) only when the right next step genuinely depends on what the previous step found. Tokens are the small chunks of text a model reads and writes; model usage is priced per token.
:::

## A real agent loop in about 60 lines

Frameworks make agents look heavier than they are. The code below is the entire agent from [valentine](https://github.com/80x-djh/valentine) (`src/agent.ts`), a shipped tool published on npm (the public registry where JavaScript software is shared). It is lightly trimmed but structurally intact. It was written directly against the Anthropic Messages API, the web service your code calls to get a response from Claude, so that a fund's engineer can read every line before pointing it at a live CRM. You do not need to read the code to follow this page; the paragraph after it says what it does.

```typescript
// model thinks -> calls a read tool -> we run it -> feed result back ->
// repeat, until it calls submit_verdict.
export async function lookup(client, model, crm, target): Promise<Verdict> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        `Before a meeting. Target: "${target}". ` +
        "Has anyone at the fund touched this company or founder before? " +
        "Use your tools, then call submit_verdict.",
    },
  ];

  for (let turn = 0; turn < 10; turn++) {
    const res = await client.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: toolSchemas,
      messages,
    });
    messages.push({ role: "assistant", content: res.content });

    const toolUses = res.content.filter((b) => b.type === "tool_use");

    // The model finished early without a verdict — treat its text as ambiguous.
    if (toolUses.length === 0) {
      const text = res.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join(" ")
        .trim();
      return { verdict: "ambiguous", summary: text || "No verdict produced.", citations: [] };
    }

    // If the model submitted its verdict, capture and finish.
    const verdictCall = toolUses.find((t) => t.name === SUBMIT_VERDICT);
    if (verdictCall) return toVerdict(verdictCall.input);

    // Otherwise run the read tools and feed results back.
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const out = await runTool(tu.name, tu.input, crm);
      results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(out) });
    }
    messages.push({ role: "user", content: results });
  }

  return { verdict: "ambiguous", summary: "Couldn't reach a verdict within the step limit.", citations: [] };
}
```

Every part of the definition is visible in those lines. The **goal** is the first user message. The **tools** are three: `search_crm`, `get_context`, and `submit_verdict`. The **loop** is a plain `for` loop that keeps adding the model's turns and the tool results to a growing `messages` list; that list is the agent's entire memory. And the whole run is an ordinary function with a typed return value, so the rest of the program can call `lookup()` without knowing or caring that an AI made decisions inside.

It is also worth noticing what is absent: no framework, no graph abstraction, no planner module, no vector store (a special database for similarity search). For a task of this shape, a handful of lookups that depend on each other and end in one structured answer, the Messages API and a `for` loop are the whole runtime.

## How the run ends

The most common defect in homemade agents is a loop with exactly one exit: "the model will say when it is done." Models sometimes do not. They stall, they narrate instead of acting, or they keep calling tools. A production loop needs several exits, each with a defined meaning. Valentine's loop has three:

| Exit | Trigger | Result |
|---|---|---|
| **Verdict submitted** | Model calls `submit_verdict` | The structured verdict — the happy path |
| **Early text stop** | Model returns a turn with no tool calls | Its prose is wrapped as an `ambiguous` verdict rather than trusted as an answer |
| **Step cap** | 10 turns elapse without a verdict | An explicit `ambiguous` verdict: "Couldn't reach a verdict within the step limit." |

Two decisions here are worth copying. First, every exit returns the same type of answer. Whether the run succeeds, stalls, or hits the cap, the caller gets a `Verdict`: never a crash, never raw prose. A run that goes wrong degrades into the honest answer ("ambiguous") instead of a made-up success. Second, the step cap doubles as a budget. Ten turns puts a known ceiling on the worst-case cost and waiting time, and it also catches runaway loops. Pick the cap by asking how many round trips a competent run of this job should ever need, then add slack. This is the same "assume it will misbehave" posture covered in [automation safety](/reference/automation-safety/).

## Structured output as a terminal tool

How do you get a typed, machine-usable answer out of a system whose native output is prose? Valentine's pattern is to make the answer itself a tool. `submit_verdict` does nothing when "run" (the loop intercepts it), but its schema forces the model to hand over the answer in exactly the shape the program needs.

Here is that tool's definition. The schema is the part to read: it lists the fields every answer must contain.

```typescript
{
  name: "submit_verdict",
  description: "Submit the final verdict. Call this EXACTLY ONCE when done. Ends the run.",
  input_schema: {
    type: "object",
    properties: {
      verdict: { type: "string", enum: ["prior_contact", "clean", "ambiguous"] },
      summary: { type: "string", description: "One line a partner reads in 2 seconds" },
      owner: { type: "string" },
      last_touch: { type: "string" },
      citations: { type: "array", items: { type: "string" }, description: "Record IDs used" },
    },
    required: ["verdict", "summary", "citations"],
  },
}
```

The `enum` line means the verdict can only be one of three listed values, so there is no "well, it is complicated" prose for your program to interpret. The `required` list means every verdict must include `citations`, the CRM record IDs it relied on, so a human can check the answer against the source records in one click. And because calling this tool is the only sanctioned way to finish, "done" and "answered in the right shape" become the same event. This is more reliable than asking the model in the prompt to "respond only with JSON," because the shape is enforced by the API's tool machinery rather than by trust.

## What an agent is not

The word gets applied to almost anything with an LLM in it. Three boundaries worth keeping sharp:

- **Not a chatbot.** A chatbot's loop runs on human turns: you supply each next step, and the model only produces text. An agent's loop runs on tool results: it acts between your inputs, and its output is an action or a structured result, not just a reply. A chat window can sit in front of an agent, but the chat is the trigger, not the agent.
- **Not a workflow.** A workflow (a Zapier zap, a GitHub Actions job, a CRM automation) executes a fixed, human-authored sequence, sometimes with an LLM doing one step inside it. The path is decided when the workflow is written. In an agent, the path is decided while it runs, by the model. Both are legitimate. Workflows are usually cheaper, faster, and more predictable, and many products pitched as agents are workflows that should stay workflows. [Cron agents](/reference/cron-agents/) sit deliberately between the two: a scheduled, predictable wrapper around a small agentic core.
- **Not a framework.** Agent frameworks bundle loops, memory, and orchestration behind ready-made abstractions. They are useful at scale, but you should understand the loop before adopting one. If you cannot sketch your system as "model call, tool call, tool result, repeat, stop," a framework will hide the confusion rather than resolve it. Write the 60-line loop once and you will evaluate every framework more clearly afterward.

## See also

- [Tool use](/reference/tool-use/) — the tool interface in depth, including forcing tool calls for structured output.
- [Read-only agents](/reference/read-only-agents/) — safety by structural absence of write tools, valentine's core guarantee.
- [Model Context Protocol](/reference/mcp/) — exposing an agent (or its tools) to other AI applications.
- [Automation safety](/reference/automation-safety/) — step caps, idempotency, and kill switches for anything that runs unattended.
- [valentine](/projects/valentine/) — the full project this page's loop is taken from ([source on GitHub](https://github.com/80x-djh/valentine)).
