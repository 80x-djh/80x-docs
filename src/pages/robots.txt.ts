// robots.txt that explicitly WELCOMES AI crawlers — the opposite of the
// default-deny posture. The whole point of this site is to be read by LLMs.
import type { APIRoute } from 'astro';
import { SITE } from '../../site.config.mjs';

const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'meta-externalagent',
  'Bytespider',
  'Amazonbot',
  'cohere-ai',
];

const body = [
  '# 80x Docs — free, open source, and built to be read by machines.',
  '# AI crawlers are explicitly welcome. See /llms.txt and append .md to any',
  '# page URL for its raw markdown source.',
  '',
  ...AI_CRAWLERS.flatMap((bot) => [`User-agent: ${bot}`, 'Allow: /', '']),
  'User-agent: *',
  'Allow: /',
  '',
  `Sitemap: ${SITE.docsUrl}/sitemap-index.xml`,
  '',
].join('\n');

export const GET: APIRoute = () =>
  new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
