// Every documentation page, served as raw markdown at its own URL + `.md`
// (e.g. /reference/agents/ -> /reference/agents.md). Purpose-built for LLMs:
// an agent (or a person piping into one) gets the clean source of any page
// without HTML chrome. Complements /llms.txt and /llms-full.txt.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../../site.config.mjs';

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await getCollection('docs');
  return docs
    .filter((doc) => doc.id && doc.id !== 'index' && typeof doc.body === 'string')
    .map((doc) => ({ params: { slug: doc.id }, props: { doc } }));
};

export const GET: APIRoute = ({ props }) => {
  const { doc } = props as { doc: { id: string; body: string; data: { title: string; description?: string } } };
  const canonical = `${SITE.docsUrl}/${doc.id}/`;
  const header = [
    `# ${doc.data.title}`,
    '',
    ...(doc.data.description ? [`> ${doc.data.description}`, ''] : []),
    `<!-- Source: ${canonical} · Part of ${SITE.name} (${SITE.docsUrl}) · License: CC BY-SA 4.0 -->`,
    '',
  ].join('\n');
  // Raw markdown bypasses the remark pipeline, so apply the base prefix to
  // root-relative links here too.
  const body = doc.body.replaceAll('](/', `](${SITE.base}/`);
  return new Response(header + body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
