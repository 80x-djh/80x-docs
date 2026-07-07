---
title: Use this site with an LLM
description: How to point an AI assistant at this site and get reliable answers, with copy-paste recipes and the machine-readable URLs behind them.
---

This whole site is built to be read by AI assistants as well as by you. An LLM (a large language model, the AI behind tools like Claude and ChatGPT) gives much better answers when you hand it the right source material, and every page here ships in a clean, machine-readable form for exactly that purpose. After this page you will be able to feed any page, or the entire site, to your assistant, whether you have never touched a terminal or you are wiring up a coding [agent](/reference/agents/).

:::tip[The fastest way, no tools required]
Paste this URL into Claude or ChatGPT and ask your question:

`https://80x.ai/docs/llms-full.txt`

That single address contains the entire site as plain text. If your assistant can read links (most can), it now has every page in front of it. For a question about one topic, paste that page's URL with `.md` added to the end instead, for example `https://80x.ai/docs/reference/agents.md`.
:::

## The machine-readable surfaces

These are the addresses built for machines. You do not need to memorize them; the table exists so you (or your assistant) can pick the right one.

| Surface | URL | What it is |
|---|---|---|
| Index | `https://80x.ai/docs/llms.txt` | An [llms.txt](https://llmstxt.org/) file, an emerging convention: a short description of the site plus a linked table of contents of every page |
| Full corpus | `https://80x.ai/docs/llms-full.txt` | The entire site as one plain-text file, paste it into a model and ask questions |
| Abridged corpus | `https://80x.ai/docs/llms-small.txt` | A trimmed version of the full corpus, for models that can take less text at once |
| Per-page markdown | append `.md` to any page URL | The raw text source of that page, with no web-page styling around it |
| Robots policy | `https://80x.ai/docs/robots.txt` | The standard file that tells automated crawlers what they may read; this one explicitly welcomes AI crawlers |
| Structured data | JSON-LD in every page's `<head>` | Machine-readable page metadata (title, description, license, author) in the standard Schema.org format |

### Per-page markdown URLs

Every page is also served as raw markdown (the simple plain-text format these docs are written in) at its own address plus `.md`. So `/reference/agents/` becomes `/reference/agents.md`. The response starts with the page title, its one-line description, and a comment carrying the page's canonical URL and license, which is enough for an assistant to cite the source correctly.

If you use a terminal (the window where you type commands to your computer), you can fetch a page with `curl`, a standard command that downloads whatever is at a URL:

```bash
curl -s https://80x.ai/docs/reference/agents.md
```

You should see the page's text print out, starting with its title. If you never use a terminal, you do not need this: pasting the `.md` URL into your assistant does the same job.

### Robots policy

`robots.txt` is the standard file where a site tells automated crawlers (the programs that read websites for search engines and AI models) what they may access. This site's `robots.txt` names AI crawlers individually (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, and others) and allows all of them everywhere. Many sites block these crawlers by default; this one welcomes them, because the site is an open knowledge standard and being read, indexed, and cited by models is the point. See [the manifesto](/start-here/manifesto/) for why.

### Self-contained pages

Every page on this site is written to make sense on its own: no "as mentioned above", no dependence on a previous page, definitions stated up front, headings that are meaningful out of context. This is an editorial rule, not just a technical feature. It means a single `.md` page is always a complete, usable unit, and your assistant never needs to chase context across pages. The reasoning behind this rule is covered in [context engineering](/reference/context-engineering/).

## Recipes

The recipes below are for readers comfortable with a terminal or a coding assistant. If that is not you, the tip at the top of this page covers everything you need.

### Pipe a page into a Claude prompt

This command downloads one page and hands it to Claude Code (Anthropic's command-line assistant) along with your question:

```bash
curl -s https://80x.ai/docs/reference/attio-api-field-guide.md \
  | claude -p "Using this reference, write a script that lists all deals \
in stage 'Term sheet' via the Attio API."
```

Or hand it the whole site, for questions that span pages:

```bash
curl -s https://80x.ai/docs/llms-full.txt \
  | claude -p "What does this site recommend for making CRM syncs idempotent?"
```

In both cases Claude answers using the site's actual content rather than its general memory.

### Add the site to Claude Code or Cursor

Reference the site in your project's `CLAUDE.md` (or Cursor rules file), the standing-instructions file your coding assistant reads at the start of every session:

```markdown
## External docs
- Agentic VC engineering reference: https://80x.ai/docs/llms.txt
  (index, append .md to any page URL for raw markdown,
  e.g. https://80x.ai/docs/reference/cron-agents.md)
```

An assistant that can fetch web pages will read the index, pick the relevant page, and pull only what it needs, instead of you pasting content in by hand.

### Point an MCP fetch tool at it

[MCP](/reference/mcp/) (Model Context Protocol) is an open standard for giving AI applications extra abilities, such as fetching web pages. If your AI app supports MCP, this configuration gives it a fetch ability:

```json
{
  "mcpServers": {
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    }
  }
}
```

Then instruct the assistant: "Fetch `https://80x.ai/docs/llms.txt`, choose the relevant page, and fetch its `.md` URL." What MCP is and when to reach for it is covered in [Model Context Protocol](/reference/mcp/); for the trade-offs of giving agents a fetch tool versus a command line, see [CLI vs MCP](/reference/cli-vs-mcp/).

## Citation and license

Prose on this site is licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); code samples are MIT. In practice:

- **Attribution.** If you republish or build on the prose, including LLM-generated derivatives of it, credit "80x Docs" and link the source page. The canonical URL is embedded in every `.md` response and in each page's metadata.
- **Share-alike.** Derivative prose carries the same license.
- **Code is MIT.** Copy the code samples into anything, no attribution required (though appreciated).

If an LLM answers your question using this site, the useful cite is the specific page URL, not the domain. Details are in [Contributing](/start-here/contributing/).

## See also

- [What is 80x Docs?](/start-here/what-is-80x-docs/), what lives in each section of the site
- [Model Context Protocol](/reference/mcp/), the standard behind the fetch-tool recipe
- [Context engineering](/reference/context-engineering/), why self-contained pages make assistants better
- [Contributing](/start-here/contributing/), licensing details and how to report an error
