// Builds a schema.org @graph for a docs page. One JSON-LD block per page so
// search engines AND answer engines read every page as typed data, not just
// prose. The article node is typed by section. HowTo for step-structured
// guides, APIReference for the API field guide, and section-specific nodes are
// added alongside it: a BreadcrumbList everywhere, a SoftwareApplication for the
// shipped CLI tools, a DefinedTermSet for the glossary, and a FAQPage whenever a
// page opts in with `faq` frontmatter.
//
// Everything degrades safely: if a page's markdown body is unavailable at head
// render time, the derived nodes (HowTo, glossary) are simply omitted and the
// base article + breadcrumb still ship.

const SECTION_LABELS = {
  reference: 'Reference',
  guides: 'Guides',
  playbooks: 'VC playbooks',
  projects: 'Open-source projects',
  notes: 'Field notes',
  learn: 'Learn · The 80x Method',
  'start-here': 'Start here',
};

// The entries under projects/ that are actually installable tools. The rest of
// the section is the studio page, a handbook, and a curated link list, not
// applications, so we do not emit SoftwareApplication for those.
const SOFTWARE_PROJECTS = new Set(['projects/valentine', 'projects/attio-cli']);

// Pages whose article node is an APIReference rather than a generic TechArticle.
const API_REFERENCE = new Set(['reference/attio-api-field-guide']);

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripMarkdown(s) {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url) -> text
    .replace(/[*_`>#]/g, '') // emphasis / code / quote / heading marks
    .replace(/\s+/g, ' ')
    .trim();
}

// Pull "## Step …" headings out of a guide body, in document order.
function howToSteps(body) {
  const steps = [];
  const re = /^##\s+(.+?)\s*$/gm;
  let m;
  while ((m = re.exec(body))) {
    const heading = m[1].trim();
    if (/^step\b/i.test(heading)) steps.push(heading);
  }
  return steps;
}

// Parse "## Term\n\nfirst paragraph" pairs out of the glossary body.
function glossaryTerms(body) {
  const terms = [];
  const parts = body.split(/\n##\s+/); // first chunk is the page intro
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const nl = chunk.indexOf('\n');
    const name = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    const rest = nl === -1 ? '' : chunk.slice(nl + 1);
    const firstPara =
      rest
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .find(Boolean) || '';
    const description = stripMarkdown(firstPara).slice(0, 320);
    if (name) terms.push({ name, description });
  }
  return terms;
}

/**
 * @param {object} args
 * @param {{ id: string, data: { title: string, description?: string, pageType?: string, faq?: {q:string,a:string}[] } }} args.entry
 * @param {string} args.body   Raw markdown body of the page ('' if unavailable).
 * @param {string} args.url    Absolute canonical URL of the page.
 * @param {object} args.SITE   The site config object.
 */
export function buildGraph({ entry, body, url, SITE }) {
  const org = {
    '@type': 'Organization',
    '@id': `${SITE.url}/#org`,
    name: SITE.title,
    url: SITE.url, // the org lives at the apex, not /docs
    email: SITE.contactEmail,
    sameAs: Object.values(SITE.social).filter(Boolean), // drop null socials
  };

  const id = entry.id;
  const isArticle = id && id !== 'index';

  if (!isArticle) {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        org,
        {
          '@type': 'WebSite',
          '@id': `${SITE.docsUrl}/#website`,
          name: SITE.name,
          description: SITE.description,
          url: SITE.docsUrl,
          publisher: { '@id': org['@id'] },
        },
      ],
    };
  }

  const section = id.includes('/') ? id.split('/')[0] : '';
  const title = entry.data.title;
  const description = entry.data.description ?? SITE.description;
  const articleType =
    entry.data.pageType || (API_REFERENCE.has(id) ? 'APIReference' : 'TechArticle');

  const graph = [
    org,
    {
      '@type': articleType,
      '@id': `${url}#article`,
      headline: title,
      description,
      url,
      isAccessibleForFree: true,
      license: 'https://creativecommons.org/licenses/by-sa/4.0/',
      inLanguage: 'en',
      author: { '@type': 'Person', name: SITE.author.name },
      publisher: { '@id': org['@id'] },
      mainEntityOfPage: url,
    },
  ];

  // Breadcrumbs: Docs › Section › Page
  const crumbs = [{ name: 'Docs', item: `${SITE.docsUrl}/` }];
  if (section) {
    crumbs.push({
      name: SECTION_LABELS[section] || section,
      item: `${SITE.docsUrl}/${section}/`,
    });
  }
  crumbs.push({ name: title, item: url });
  graph.push({
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumbs`,
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  });

  // HowTo for step-structured guides.
  if (section === 'guides' && body) {
    const steps = howToSteps(body);
    if (steps.length >= 2) {
      graph.push({
        '@type': 'HowTo',
        '@id': `${url}#howto`,
        name: title,
        description,
        step: steps.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s,
          text: s,
        })),
      });
    }
  }

  // SoftwareApplication for the shipped, installable CLI tools.
  if (SOFTWARE_PROJECTS.has(id)) {
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': `${url}#software`,
      name: title.split(':')[0].trim(),
      description,
      url,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'macOS, Linux, Windows',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@id': org['@id'] },
    });
  }

  // DefinedTermSet for the glossary, every term as typed data.
  if (id === 'glossary' && body) {
    const terms = glossaryTerms(body);
    if (terms.length) {
      graph.push({
        '@type': 'DefinedTermSet',
        '@id': `${url}#glossary`,
        name: '80x Docs glossary',
        url,
        hasDefinedTerm: terms.map((t) => ({
          '@type': 'DefinedTerm',
          name: t.name,
          description: t.description,
          url: `${url}#${slugify(t.name)}`,
          inDefinedTermSet: { '@id': `${url}#glossary` },
        })),
      });
    }
  }

  // FAQPage when a page opts in with `faq` frontmatter.
  const faq = entry.data.faq;
  if (Array.isArray(faq) && faq.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}
