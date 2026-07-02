# Contributing to 80x Docs

Contributions are welcome — this site is an open reference, and it gets
better the way open references do: corrections, sharper explanations, and
new pages grounded in real systems.

## Quick paths

- **Fix an error**: every page has an "Edit page" link straight to the
  source file on GitHub. Open a PR.
- **Propose a page**: open an issue describing what the page covers and —
  this is the bar — what you built/ran that grounds it.
- **Add a term**: PRs to `src/content/docs/glossary.md` are the easiest
  first contribution.

## The editorial bar

Read [EDITORIAL.md](./EDITORIAL.md) before writing. The short version:

1. **Grounded**: every strong claim traces to something shipped, cited, or
   reproducible. No invented metrics, clients, or benchmarks.
2. **Self-contained**: each page makes sense pasted alone into a context
   window. No "as mentioned above".
3. **Calm**: no hype. Confidence lives in specificity.
4. **Confidential**: client names and identifying details never appear
   unless the underlying source is already public.

## Local development

```sh
npm install
npm run dev
```

Pages are markdown files under `src/content/docs/`. Frontmatter needs
`title` and `description`; the sidebar picks new files up automatically.
Run `npm run build` before submitting — it must pass clean.

## Licensing of contributions

By contributing you agree your prose is licensed CC BY-SA 4.0 and your code
MIT (see [LICENSE.md](./LICENSE.md)).
