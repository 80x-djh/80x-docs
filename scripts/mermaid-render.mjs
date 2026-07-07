// Local Mermaid → SVG renderer for 80x Docs.
// Drives the system Chrome via puppeteer-core (no bundled Chromium). Produces
// brand-neutral SVGs whose colours are re-themed by CSS (.diagram layer in
// custom.css) so a single render adapts to both light and dark. See
// scripts/render-diagrams.mjs for the batch driver that commits the SVGs.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const MERMAID_JS = require.resolve('mermaid/dist/mermaid.min.js');
const FONT_DIR = new URL('../public/fonts/', import.meta.url);
const b64 = (name) =>
  readFileSync(new URL(name, FONT_DIR)).toString('base64');
// Load the real brand fonts into the render page so Mermaid measures label
// widths with the SAME metrics used on the live site (otherwise boxes are
// sized for a fallback font and the text overflows once Geist Mono applies).
const FONT_CSS = `
@font-face{font-family:'Geist Sans';src:url(data:font/woff2;base64,${b64('Geist-Variable.woff2')}) format('woff2');font-weight:100 900}
@font-face{font-family:'Geist Mono';src:url(data:font/woff2;base64,${b64('GeistMono-Variable.woff2')}) format('woff2');font-weight:100 900}
body{font-family:'Geist Mono',monospace}`;

const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Mermaid theme. Colours are placeholders: the .diagram CSS layer overrides
// node/edge/label colours with --x-* tokens so light & dark both work. We keep
// them close to the dark palette so a bare SVG (e.g. opened directly) still reads.
export const MERMAID_CONFIG = {
  startOnLoad: false,
  theme: 'base',
  // SVG-native <text>/<tspan> labels, NOT foreignObject HTML. Baked-in em
  // positioning makes the label layout immune to the live page's CSS (Starlight
  // line-height / paragraph margins) and to rehype-raw duplicating self-closing
  // <br/> tags when the inlined SVG is re-parsed at build time.
  htmlLabels: false,
  themeVariables: {
    fontFamily: "'Geist Mono', ui-monospace, 'SF Mono', monospace",
    fontSize: '13px',
    primaryColor: '#101010',
    primaryBorderColor: '#333333',
    primaryTextColor: '#ededed',
    secondaryColor: '#101010',
    tertiaryColor: '#0a0a0a',
    lineColor: '#52a8ff',
    edgeLabelBackground: '#0a0a0a',
    clusterBkg: '#0a0a0a',
    clusterBorder: '#1f1f1f',
    titleColor: '#ededed',
    nodeTextColor: '#ededed',
    background: '#000000',
  },
  flowchart: {
    htmlLabels: false,
    curve: 'basis',
    nodeSpacing: 44,
    rankSpacing: 56,
    padding: 12,
    // Max label width before wrap. Mermaid bakes this as the foreignObject
    // width + a `max-width` on the label, and with htmlLabels it does NOT wrap
    // a single <br/> line, anything wider is clipped. 360px (~46 mono chars)
    // fits our multi-line node labels; keep authored lines under that.
    wrappingWidth: 360,
    // Intrinsic px sizing (NOT scaled-to-container) so text is the same size
    // across every diagram; CSS caps it with max-width for small screens.
    useMaxWidth: false,
  },
  sequence: { useMaxWidth: false },
  securityLevel: 'loose',
};

export async function withRenderer(fn) {
  const puppeteer = (await import('puppeteer-core')).default;
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body><div id="c"></div></body></html>');
    await page.addStyleTag({ content: FONT_CSS });
    await page.addScriptTag({ content: readFileSync(MERMAID_JS, 'utf8') });
    // Ensure the brand fonts are decoded before Mermaid measures any text.
    await page.evaluate(async () => {
      await document.fonts.load("13px 'Geist Mono'");
      await document.fonts.load("13px 'Geist Sans'");
      await document.fonts.ready;
    });
    const render = async (def, id) => {
      const svg = await page.evaluate(
        async (definition, cfg, gid) => {
          // eslint-disable-next-line no-undef
          window.mermaid.initialize(cfg);
          // eslint-disable-next-line no-undef
          const { svg } = await window.mermaid.render(gid, definition);
          return svg;
        },
        def,
        MERMAID_CONFIG,
        id
      );
      return cleanSvg(svg);
    };
    return await fn(render);
  } finally {
    await browser.close();
  }
}

// Normalise Mermaid's SVG for inlining. We KEEP Mermaid's scoped <style> and
// root id: the style is scoped to `#<gid>` and carries the foreignObject label
// layout, so stripping it clips multi-line labels. Each diagram uses a unique
// gid (content hash) so ids/markers never collide on a page. We only:
//   - fold a `mm` class onto the <svg> for our brand-colour overrides, and
//   - drop any fixed width/height + max-width style so the figure controls size
//     (viewBox is retained, giving proportional scaling).
function cleanSvg(svg) {
  let s = svg;
  // Drop any max-width style Mermaid may add; keep the intrinsic width/height
  // (they fix the font's px size), then add responsive scaling + our class.
  s = s.replace(/(<svg\b[^>]*?) style="[^"]*"/i, '$1');
  s = s.replace(
    /(<svg\b[^>]*?)class="([^"]*)"/i,
    '$1class="mm $2" style="max-width:100%;height:auto"'
  );
  return s.trim();
}

// CLI: `node scripts/mermaid-render.mjs <file.mmd>` → prints SVG (pilot use).
if (import.meta.url === `file://${process.argv[1]}`) {
  const def = readFileSync(process.argv[2], 'utf8');
  const out = await withRenderer((render) => render(def, 'pilot'));
  process.stdout.write(out);
}
