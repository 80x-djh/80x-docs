// Remark plugin: turn ```mermaid fences into a branded <figure>.
//
// It runs in Astro's remarkPlugins (see astro.config.mjs), i.e. BEFORE the code
// gets to Expressive Code / the syntax highlighter, so the fence is intercepted
// and never rendered as a code block. Each fence is matched to a pre-rendered,
// content-hashed SVG committed under src/diagrams/ (produced by
// scripts/render-diagrams.mjs — run `npm run diagrams`). The SVG is inlined into
// a figure with a top bar, a Copy button (copies the diagram source), and an
// optional caption (```mermaid caption="…").
//
// GRACEFUL FALLBACK: if the SVG for a fence is missing, we log a build-time
// warning and leave the fence as a plain preformatted block, so a page whose
// diagram has not been rendered yet still builds and reads fine.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { diagramId } from './render-diagrams.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIAGRAM_DIR = path.resolve(HERE, '..', 'src', 'diagrams');

/** Escape a string for use inside a double-quoted HTML attribute. */
function attr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escape text for HTML element content. */
function text(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Pull caption="…" (or caption='…') out of a fence's meta string. */
function parseCaption(meta) {
  if (!meta) return '';
  const m = /caption=(?:"([^"]*)"|'([^']*)')/.exec(meta);
  return m ? m[1] ?? m[2] ?? '' : '';
}

function buildFigure(def, svg, caption) {
  const bar =
    '<div class="diagram__bar" aria-hidden="true">' +
    '<span class="diagram__dot"></span><span class="diagram__dot"></span><span class="diagram__dot"></span>' +
    `<button type="button" class="diagram__copy" data-diagram-copy data-src="${attr(def)}">Copy</button>` +
    '</div>';
  const body = `<div class="diagram__body">${svg}</div>`;
  const cap = caption ? `<figcaption class="diagram__caption">${text(caption)}</figcaption>` : '';
  return `<figure class="diagram not-content">${bar}${body}${cap}</figure>`;
}

export default function remarkDiagrams() {
  return (tree, file) => {
    const where = file?.path ? path.relative(process.cwd(), file.path) : 'unknown file';

    const transform = (parent) => {
      const kids = parent && parent.children;
      if (!Array.isArray(kids)) return;
      for (let i = 0; i < kids.length; i++) {
        const node = kids[i];
        if (node.type === 'code' && node.lang === 'mermaid') {
          const def = (node.value || '').trim();
          const id = diagramId(def);
          const svgPath = path.join(DIAGRAM_DIR, `${id}.svg`);
          if (!existsSync(svgPath)) {
            console.warn(
              `[remark-diagrams] missing SVG for diagram ${id} in ${where} — ` +
                'run `npm run diagrams`. Falling back to source block.'
            );
            // Graceful fallback: render the source as a plain code block.
            node.lang = 'text';
            node.meta = null;
            continue;
          }
          const svg = readFileSync(svgPath, 'utf8').trim();
          kids[i] = {
            type: 'html',
            value: buildFigure(def, svg, parseCaption(node.meta)),
          };
        } else {
          transform(node);
        }
      }
    };

    transform(tree);
  };
}
