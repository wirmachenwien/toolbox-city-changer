// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';
import { smartQuotesHastPlugin } from './src/lib/satteri-smart-quotes.ts';
import { site, base, defaultLang } from './handbook.config.ts';

/** @typedef {{ file: string, web?: boolean }} Chapter */
/** @typedef {{ chapters?: Chapter[] }} Work */

const works = /** @type {Record<string, Work>} */ (
  JSON.parse(readFileSync(new URL('./src/data/works.json', import.meta.url), 'utf8'))
);
const defaultLanguageBookRedirects = Object.fromEntries(
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
  // The default language is canonical at the root (/ and /book/), but the
  // prefixed form should still resolve and redirect consistently.
  redirects: {
    [`/${defaultLang}`]: '/',
    [`/${defaultLang}/search`]: '/search',
    [`/book/${defaultLang}`]: '/book',
    ...defaultLanguageBookRedirects,
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
