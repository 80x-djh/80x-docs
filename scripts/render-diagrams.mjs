// Batch driver for the branded-diagram pipeline.
//
// Scans every doc under src/content/docs for ```mermaid fenced blocks, renders
// each one to a content-hashed, brand-themed SVG under src/diagrams/, and prunes
// any committed SVG that is no longer referenced by a fence. The low-level render
// (system Chrome via puppeteer-core, inlined Geist fonts, SVG normalisation) lives
// in scripts/mermaid-render.mjs; this file only orchestrates it.
//
// The filename is a hash of the fence body ALONE, so the remark plugin
// (remark-diagrams.mjs), which only ever sees that body, can compute the same
// name and find the committed SVG at build time. Import this module for
// `diagramId` cheaply: the heavy renderer is only imported when the batch runs.
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
  unlinkSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DOCS_DIR = path.join(ROOT, 'src', 'content', 'docs');
const OUT_DIR = path.join(ROOT, 'src', 'diagrams');

// ```mermaid  [optional meta]\n  <definition>  \n```
const FENCE = /```mermaid[^\n]*\n([\s\S]*?)```/g;

/** Stable id for a diagram: hash of its (trimmed) definition text. */
export function diagramId(def) {
  return createHash('sha256').update(def.trim(), 'utf8').digest('hex').slice(0, 16);
}

/** Pull every ```mermaid fence body out of a markdown/MDX source string. */
export function extractDefs(src) {
  const defs = [];
  let m;
  FENCE.lastIndex = 0;
  while ((m = FENCE.exec(src))) defs.push(m[1].trim());
  return defs;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.mdx?$/.test(entry.name)) out.push(p);
  }
  return out;
}

async function main() {
  const files = walk(DOCS_DIR);

  // id -> definition (dedupes identical diagrams across pages automatically).
  const wanted = new Map();
  for (const file of files) {
    for (const def of extractDefs(readFileSync(file, 'utf8'))) {
      wanted.set(diagramId(def), def);
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });

  if (wanted.size === 0) {
    console.log('[diagrams] no ```mermaid blocks found, nothing to render.');
  } else {
    const toRender = [...wanted].filter(([id]) => !existsSync(path.join(OUT_DIR, `${id}.svg`)));
    console.log(
      `[diagrams] ${wanted.size} diagram(s) referenced, ${toRender.length} to render, ` +
        `${wanted.size - toRender.length} already committed.`
    );
    if (toRender.length) {
      const { withRenderer } = await import('./mermaid-render.mjs');
      let rendered = 0;
      let failed = 0;
      await withRenderer(async (render) => {
        for (const [id, def] of toRender) {
          try {
            const svg = await render(def, `d-${id}`);
            writeFileSync(path.join(OUT_DIR, `${id}.svg`), svg + '\n');
            rendered++;
            console.log(`[diagrams] rendered ${id}.svg`);
          } catch (err) {
            failed++;
            console.warn(`[diagrams] FAILED ${id}: ${err?.message ?? err}`);
          }
        }
      });
      console.log(`[diagrams] ${rendered} rendered, ${failed} failed.`);
      if (failed) process.exitCode = 1;
    }
  }

  // Prune committed SVGs no longer referenced by any fence.
  let pruned = 0;
  for (const name of readdirSync(OUT_DIR)) {
    if (!name.endsWith('.svg')) continue;
    if (!wanted.has(name.slice(0, -4))) {
      unlinkSync(path.join(OUT_DIR, name));
      pruned++;
      console.log(`[diagrams] pruned stale ${name}`);
    }
  }
  if (pruned) console.log(`[diagrams] pruned ${pruned} stale SVG(s).`);
}

// Run the batch only when invoked directly (`node scripts/render-diagrams.mjs`).
// Importing this module for `diagramId` must stay side-effect free.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
