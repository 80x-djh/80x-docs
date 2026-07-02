---
title: "awesome-attio: a curated list of Attio resources"
description: "A free, maintained list of Attio resources: official docs, developer tools, guides, and integrations, every link checked and described in one line."
---

[awesome-attio](https://github.com/80x-djh/awesome-attio) is a curated list of resources, tools, integrations, and guides for [Attio](https://attio.com), kept in the standard [awesome-list](https://awesome.re) format, a GitHub convention for community-maintained link collections. It exists because the Attio ecosystem is real but scattered: official docs in one place, several community tools on GitHub, guides on personal sites, integrations on a marketplace. A single maintained page beats re-running the same searches.

The list is one `README.md` file, which is a plain-text page you read directly on GitHub in your browser. There is no build step and nothing to install.

## What qualifies for the list

Three criteria, applied to every entry:

- **Live.** No dead links, no parked domains, no abandoned projects presented as current.
- **Attio-specific.** General CRM or sales content does not qualify, however good.
- **Useful.** It has to help someone building on or with Attio, and it is described in one factual line: no marketing copy, and no affiliate links, ever.

## How it's organized

| Section | What's in it |
|---|---|
| Official | Attio itself: help center, changelog, engineering blog, developer docs, the REST API reference, status page |
| Developer tools | Attio's hosted MCP server plus the community MCP server implementations |
| Guides & references | The [Attio Workflows Handbook](/projects/attio-workflows-handbook/), Attio's official Workflows course, and community-written guides |
| Community | The official forum, expert directory, and partner programs |
| Integrations & ecosystem | Notable marketplace listings (Clay, Cargo, Slack, Zapier, Linear, Segment, and others) with a pointer to the full marketplace |

The developer tools section is the part most useful to readers of this site. It tracks the [MCP](/reference/mcp/) servers (MCP is the standard that lets AI assistants call outside tools, and an MCP server is one such tool made available to them) that you would weigh against a command-line approach. That comparison is made concrete in [CLI vs MCP](/reference/cli-vs-mcp/) and measured in the [attio-cli](/projects/attio-cli/) repo.

## Contributing an entry

To add something, open a pull request (a proposed change you submit on GitHub for the maintainer to review) against [the repo](https://github.com/80x-djh/awesome-attio). The bar is the three criteria above; the mechanics, per [`CONTRIBUTING.md`](https://github.com/80x-djh/awesome-attio/blob/main/CONTRIBUTING.md):

1. Add the link to the most fitting section, in roughly alphabetical order.
2. Write a one-line factual description of what it is. Describe, don't sell.
3. Submitting your own project is fine; just say so in the pull request description.

Reporting a dead or drifted link is an equally valid contribution. A curated list's value is the curation, and pruning is half of that.

## License

The list is released under CC0, which places it in the public domain: the contributors have waived copyright to the extent the law allows. Copy it, embed it, republish it, no attribution required. This is deliberately the most permissive license in the [projects](/projects/) section, because a resource list's only job is to spread.

## Source

[github.com/80x-djh/awesome-attio](https://github.com/80x-djh/awesome-attio)

## See also

- [Attio Workflows Handbook](/projects/attio-workflows-handbook/) — the deepest single resource on the list
- [attio-cli](/projects/attio-cli/) — the terminal-side complement to the MCP servers the list tracks
- [CLI vs MCP](/reference/cli-vs-mcp/) — how to choose between the tool categories the list catalogs
