// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { site, base, defaultLang } from './handbook.config.ts';

export default defineConfig({
  site,
  base,
  output: 'static',
  build: {
    // Keep the historic URL scheme: about.astro -> about.html,
    // book/01 -> book/01.html (no trailing-slash directories).
    format: 'file',
  },
  // Legacy default-language prefix: the default language lives at the root
  // (/ and /book/), so the old /<lang>/ and /book/<lang>/ URLs redirect to
  // their canonical equivalents (emitted as static redirect pages).
  redirects: {
    [`/${defaultLang}`]: '/',
    [`/${defaultLang}/search`]: '/search',
    [`/book/${defaultLang}`]: '/book',
    [`/book/${defaultLang}/[...slug]`]: '/book/[...slug]',
  },
  integrations: [mdx()],
});
