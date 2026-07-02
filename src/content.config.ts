import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      // Optional, agent-facing frontmatter consumed by structured-data.mjs.
      extend: z.object({
        // Emit a schema.org FAQPage from these Q&A pairs.
        faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
        // Override the article's schema.org type (default: TechArticle).
        pageType: z
          .enum(['TechArticle', 'APIReference', 'HowTo', 'Article'])
          .optional(),
      }),
    }),
  }),
};
