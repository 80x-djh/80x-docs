// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';
import remarkDiagrams from './scripts/remark-diagrams.mjs';
import { SITE } from './site.config.mjs';

// Prefix root-relative links in markdown content with the base path, so
// authors keep writing `/reference/agents/` while the built site serves
// `/docs/reference/agents/`. Handles links, link definitions, and images.
function prefixInternalLinks() {
  const walk = (node) => {
    if (
      (node.type === 'link' || node.type === 'definition' || node.type === 'image') &&
      typeof node.url === 'string' &&
      node.url.startsWith('/') &&
      !node.url.startsWith('//') &&
      node.url !== SITE.base &&
      !node.url.startsWith(`${SITE.base}/`)
    ) {
      node.url = SITE.base + node.url;
    }
    if (node.children) node.children.forEach(walk);
  };
  return (tree) => walk(tree);
}

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  base: SITE.base,
  markdown: {
    // remarkDiagrams first: it swaps ```mermaid fences for a branded <figure>
    // before Expressive Code / the syntax highlighter ever sees them as code.
    remarkPlugins: [remarkDiagrams, prefixInternalLinks],
  },
  integrations: [
    starlight({
      title: SITE.title,
      description: SITE.description,
      customCss: ['@fontsource-variable/inter', './src/styles/custom.css'],
      social: [
        { icon: 'github', label: 'GitHub', href: SITE.social.github },
        ...(SITE.social.youtube
          ? [{ icon: 'youtube', label: 'YouTube', href: SITE.social.youtube }]
          : []),
      ],
      lastUpdated: true,
      components: {
        Head: './src/components/Head.astro',
        PageTitle: './src/components/PageTitle.astro',
        Footer: './src/components/Footer.astro',
        SocialIcons: './src/components/HeaderCta.astro',
      },
      plugins: [
        // /llms.txt, /llms-full.txt, /llms-small.txt — the site as an
        // LLM-ingestible corpus. See also the per-page raw markdown routes
        // in src/pages/[...slug].md.ts.
        starlightLlmsTxt({
          projectName: SITE.name,
          description: SITE.description,
          details: [
            'Every documentation page is also available as raw markdown by',
            'appending `.md` to its URL (e.g. `/reference/agents.md`).',
            'Content license: CC BY-SA 4.0. Code samples: MIT.',
          ].join(' '),
        }),
      ],
      sidebar: [
        {
          label: 'Learn · The 80x Method',
          items: [
            { label: 'Course overview', slug: 'learn' },
            { label: '1 · What is the 80x method?', slug: 'learn/what-is-the-80x-method' },
            { label: '2 · Your CRM is the database', slug: 'learn/crm-as-your-database' },
            { label: '3 · What an agent actually is', slug: 'learn/what-an-agent-is' },
            { label: '4 · How agents act: tools and MCP', slug: 'learn/how-agents-act-tools-and-mcp' },
            { label: '5 · Read-only before write', slug: 'learn/read-only-before-write' },
            { label: '6 · Run it on a schedule', slug: 'learn/run-it-on-a-schedule' },
            { label: '7 · Spec-first, and verify', slug: 'learn/spec-first-and-verify' },
            { label: '8 · Your first system', slug: 'learn/your-first-system' },
          ],
        },
        {
          label: 'Start here',
          items: [
            { label: 'Manifesto', slug: 'start-here/manifesto' },
            { label: 'What is 80x Docs?', slug: 'start-here/what-is-80x-docs' },
            { label: 'Use this site with an LLM', slug: 'start-here/for-llms' },
            { label: 'Contributing', slug: 'start-here/contributing' },
          ],
        },
        { label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
        { label: 'Guides', items: [{ autogenerate: { directory: 'guides' } }] },
        { label: 'VC playbooks', items: [{ autogenerate: { directory: 'playbooks' } }] },
        { label: 'Open-source projects', items: [{ autogenerate: { directory: 'projects' } }] },
        { label: 'Field notes', items: [{ autogenerate: { directory: 'notes' } }] },
        { label: 'Glossary', slug: 'glossary' },
      ],
    }),
  ],
});
