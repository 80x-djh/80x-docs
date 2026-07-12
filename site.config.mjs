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
  // Points directly at the product site's demo page (80x.ai/demo, form-first
  // lead capture that hands off to Cal.com) so every path to a call runs
  // through one funnel; ?src=docs attributes the click. The old 80x.ai/book
  // route is retired (it 308-redirects to /demo), so link /demo directly.
  // ---------------------------------------------------------------------------
  bookCall: 'https://80x.ai/demo?src=docs',
  bookCallLabel: 'Book a call',
  // The primary conversion across 80x is a booked dealflow teardown. Same
  // funnel as bookCall (80x.ai/demo, ?src=docs attributes the click); this is
  // the label + URL the persistent header pill and the home-page CTA use.
  bookTeardown: 'https://80x.ai/demo?src=docs',
  bookTeardownLabel: 'Book a teardown',
  // Daniel's WhatsApp, for the floating "chat with the founder" button on every
  // docs page (src/components/WhatsAppButton.astro), matches the 80x.ai studio.
  whatsapp: 'https://wa.me/447960957063?text=Hi%20Daniel%2C%20',

  // The product site the docs belong to. The wordmark, the header "Contact"
  // pill, and the header nav links all point back into 80x.ai so the docs read
  // as one property with the landing site (they share the 80x.ai origin via a
  // rewrite).
  productUrl: 'https://80x.ai',
  contact: 'https://80x.ai/contact?src=docs',
  // The product IA, mirrored from the 80x.ai landing header, so a prospect on
  // any docs page can reach the product page, pricing, security, or a demo
  // without leaving the header. Keep in sync with the landing header groups.
  productNav: [
    { label: 'Product', href: 'https://80x.ai/' },
    { label: 'Pricing', href: 'https://80x.ai/pricing' },
    { label: 'Security', href: 'https://80x.ai/security' },
    { label: 'Demo', href: 'https://80x.ai/demo' },
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
