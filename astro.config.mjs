// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';
import { smartQuotesHastPlugin } from './src/lib/satteri-smart-quotes.ts';
import { site, base, defaultLang } from './handbook.config.ts';

const works = JSON.parse(readFileSync(new URL('./src/data/works.json', import.meta.url), 'utf8'));
const legacyDefaultBookRedirects = Object.fromEntries(
  [...new Set([...(works[defaultLang]?.chapters ?? [])
    .filter((chapter) => chapter.web !== false)
    .map((chapter) => chapter.file), 'contents'])]
    .map((file) => [`/book/${defaultLang}/${file}`, `/book/${file}`]),
);

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
    ...legacyDefaultBookRedirects,
  },
  integrations: [mdx()],
  markdown: {
    // Render-time typographic quotes: source keeps straight `"` / `'`,
    // output gets „ “ (de/sl) or “ ” (en) per frontmatter `lang`.
    // MDX inherits this processor (extendMarkdownConfig defaults to true).
    // Sätteri's built-in English quotes stay off so the plugin below has
    // straight quotes left to localise; dashes/ellipses are untouched.
    processor: satteri({
      features: { smartPunctuation: { quotes: false } },
      hastPlugins: [smartQuotesHastPlugin(defaultLang)],
    }),
  },
});
