// Post-build fix for GitHub Pages hosting: Astro's file format flattens
// `<lang>/index` routes to `<lang>.html`; move those back to directory
// indexes so /de/, /sl/, /<default>/ (legacy redirect), /book/,
// /book/<lang>/ and /book/<default>/ (legacy redirect) resolve.
// (The sitemap needs no fixups: src/pages/sitemap.xml.ts already emits
// canonical URLs.)
import { mkdirSync, renameSync, existsSync } from 'node:fs';
import path from 'node:path';
import { defaultLang, languages } from '../handbook.config.ts';

const DIST = 'dist';

const nonDefault = languages.filter((lang) => lang !== defaultLang);

const INDEX_MOVES = [
  // Language homes: <lang>.html -> <lang>/index.html (plus the legacy
  // default-language prefix, emitted by the astro.config.mjs redirects).
  ...nonDefault.map((lang) => [`${lang}.html`, `${lang}/index.html`]),
  [`${defaultLang}.html`, `${defaultLang}/index.html`],
  // Book landings: book.html -> book/index.html, same per language.
  ['book.html', 'book/index.html'],
  ...nonDefault.map((lang) => [`book/${lang}.html`, `book/${lang}/index.html`]),
  [`book/${defaultLang}.html`, `book/${defaultLang}/index.html`],
];

for (const [from, to] of INDEX_MOVES) {
  const src = path.join(DIST, from);
  const dest = path.join(DIST, to);
  if (existsSync(src)) {
    mkdirSync(path.dirname(dest), { recursive: true });
    renameSync(src, dest);
    console.log(`moved ${from} -> ${to}`);
  }
}
