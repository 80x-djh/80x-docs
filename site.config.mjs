// ============================================================================
// 80x Docs, single place for every site-level setting.
// Everything the site links to or posts to is configured here, so forks and
// future-you never hunt through components for a hardcoded URL.
// ============================================================================

export const SITE = {
  title: '80x',
  name: '80x Docs',
  tagline:
    'The open standard for agentic engineering and frontier technology in venture capital',
  description:
    'The open standard for agentic engineering and frontier technology in venture capital: a free, open-source knowledge base of reference pages, guides, playbooks, and working tools.',

  // Production origin + base path. The docs are published as a sub-directory
  // of the main product domain (80x.ai/docs), served via a rewrite from the
  // landing project. The sitemap, robots.txt, llms.txt, canonical URLs, and
  // JSON-LD all derive from these.
  url: 'https://80x.ai',
  base: '/docs',
  docsUrl: 'https://80x.ai/docs',

  // Where the source lives (drives the "Edit this page" links + GitHub icon).
  repo: 'https://github.com/80x-djh/80x-docs',

  // ---------------------------------------------------------------------------
  // Monetisation surface #1, book a call. The ONLY paid pathway on the site.
  // Routed through the studio's booking page (80x.ai/book) so every path to a
  // call runs through one funnel; ?src=docs attributes the click. That page
  // hosts the mailto CTA today and the Cal.com embed slot later.
  // ---------------------------------------------------------------------------
  bookCall: 'https://80x.ai/book?src=docs',
  bookCallLabel: 'Book a call',
  // The primary conversion across 80x is now a booked dealflow teardown. Same
  // funnel as bookCall (80x.ai/book, ?src=docs attributes the click); this is
  // the label + URL the persistent header pill and the home-page CTA use.
  bookTeardown: 'https://80x.ai/book?src=docs',
  bookTeardownLabel: 'Book a teardown',
  // Daniel's WhatsApp, for the floating "chat with the founder" button on every
  // docs page (src/components/WhatsAppButton.astro), matches the 80x.ai studio.
  whatsapp: 'https://wa.me/447960957063?text=Hi%20Daniel%2C%20',

  // The studio the docs belong to. The wordmark, the header "Contact" pill, and
  // the studio nav links all point back into 80x.ai so the docs read as one
  // property with the landing site (they share the 80x.ai origin via a rewrite).
  studioUrl: 'https://80x.ai',
  contact: 'https://80x.ai/contact?src=docs',
  // Mirrored across 80x.ai, /docs, and /sentry so the header reads the same on
  // every property. Keep in sync with the Sentry topnav (skill-audit
  // public/sentry/index.html) and the landing header groups.
  studioNav: [
    { label: 'Services', href: 'https://80x.ai/services' },
    { label: 'Work', href: 'https://80x.ai/work' },
    { label: 'Tools', href: 'https://80x.ai/tools' },
    { label: 'Docs', href: 'https://80x.ai/docs' },
    { label: 'Writing', href: 'https://80x.ai/writing' },
    { label: 'About', href: 'https://80x.ai/about' },
  ],

  // ---------------------------------------------------------------------------
  // Monetisation surface #2, email capture. Provider-agnostic, zero-JS.
  // The form does a plain HTML POST to whatever endpoint is set here, so it
  // works with no client JavaScript and no CORS preflight.
  //
  //   • Buttondown:  'https://buttondown.com/api/emails/embed-subscribe/80x'
  //   • Your own endpoint (e.g. the 80x-landing /api/waitlist route once it
  //     accepts form posts / sets CORS): any URL that accepts a POSTed
  //     `email` field.
  //   • null: the form renders as a mailto capture instead, still works,
  //     still loses zero leads.
  // ---------------------------------------------------------------------------
  // The landing site's /api/waitlist accepts form-encoded posts (2026-07) and
  // 303s back to 80x.ai/newsletter?subscribed=1. The hidden source=docs field
  // in EmailCapture.astro keeps docs signups out of the product drip.
  newsletterAction: 'https://80x.ai/api/waitlist',
  newsletterName: 'The 80x Field Notes',
  newsletterPitch:
    'One email when new references, guides, or open-source tools ship. No spam, unsubscribe anytime.',

  contactEmail: 'daniel@80x.ai',

  social: {
    github: 'https://github.com/80x-djh',
    // No YouTube link yet: @80x-ai is unregistered and @80x belongs to an
    // unrelated channel (checked 2026-07-02). Add the real handle here and
    // re-enable the icon in astro.config.mjs once a channel exists.
    youtube: null,
  },

  author: {
    name: 'Daniel Hull',
    role: 'Founder, 80x',
  },
};
