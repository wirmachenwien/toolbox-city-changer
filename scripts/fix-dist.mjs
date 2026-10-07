// Post-build fix for GitHub Pages hosting: Astro's file format flattens
// `de/index` routes to `de.html`; move those back to directory indexes so
// /de/, /sl/, /en/ (legacy redirect), /book/, /book/de/, /book/en/
// (legacy redirect) and /book/sl/ resolve.
// (The sitemap needs no fixups: src/pages/sitemap.xml.ts already emits
// canonical URLs.)
import { mkdirSync, renameSync, existsSync } from 'node:fs';
import path from 'node:path';

const DIST = 'dist';

const INDEX_MOVES = [
  ['de.html', 'de/index.html'],
  ['en.html', 'en/index.html'],
  ['sl.html', 'sl/index.html'],
  ['book.html', 'book/index.html'],
  ['book/de.html', 'book/de/index.html'],
  ['book/en.html', 'book/en/index.html'],
  ['book/sl.html', 'book/sl/index.html'],
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
