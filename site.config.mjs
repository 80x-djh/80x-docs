// ============================================================================
// 80x Docs — single place for every site-level setting.
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
  // Monetisation surface #1 — book a call. The ONLY paid pathway on the site.
  // TODO: replace with your Cal.com / Calendly link when you have one, e.g.
  //   bookCall: 'https://cal.com/dan-80x/intro',
  // The mailto fallback below works today and loses zero leads.
  // ---------------------------------------------------------------------------
  bookCall:
    'mailto:dan@80x.ai?subject=80x%20%E2%80%94%20intro%20call&body=Hi%20Dan%2C%20I%20read%20the%2080x%20docs%20and%20want%20to%20talk%20about%20agentic%20engineering%20at%20our%20fund.',
  bookCallLabel: 'Book a call',

  // ---------------------------------------------------------------------------
  // Monetisation surface #2 — email capture. Provider-agnostic, zero-JS.
  // The form does a plain HTML POST to whatever endpoint is set here, so it
  // works with no client JavaScript and no CORS preflight.
  //
  //   • Buttondown:  'https://buttondown.com/api/emails/embed-subscribe/80x'
  //   • Your own endpoint (e.g. the 80x-landing /api/waitlist route once it
  //     accepts form posts / sets CORS): any URL that accepts a POSTed
  //     `email` field.
  //   • null: the form renders as a mailto capture instead — still works,
  //     still loses zero leads.
  // ---------------------------------------------------------------------------
  newsletterAction: null,
  newsletterName: 'The 80x Field Notes',
  newsletterPitch:
    'One email when new references, guides, or open-source tools ship. No spam, unsubscribe anytime.',

  contactEmail: 'dan@80x.ai',

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
