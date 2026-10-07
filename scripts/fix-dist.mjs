// Post-build fixes for GitHub Pages hosting:
/// 1. Astro's file format flattens `en/index` routes to `en.html`; move those
//    back to directory indexes so /en/, /sl/, /book/, /book/en/, /book/sl/
//    resolve.
// 2. The sitemap lists extensionless route paths; rewrite them to the real
//    .html files (directory indexes keep their trailing-slash form).
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync, globSync } from 'node:fs';
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

const DIRECTORY_URLS = new Set(['', '/', '/en', '/en/', '/sl', '/sl/', '/book', '/book/', '/book/en', '/book/en/', '/book/sl', '/book/sl/']);
const BASE = '/toolbox-city-changer';

for (const file of globSync(path.join(DIST, 'sitemap-*.xml'))) {
  let xml = readFileSync(file, 'utf8');
  xml = xml.replace(/<loc>([^<]+)<\/loc>/g, (match, url) => {
    const prefix = `https://wirmachenwien.github.io${BASE}`;
    if (!url.startsWith(prefix)) return match;
    let rest = url.slice(prefix.length);
    if (DIRECTORY_URLS.has(rest)) {
      if (!rest.endsWith('/')) rest += '/';
      return `<loc>${prefix}${rest}</loc>`;
    }
    if (rest.endsWith('.html')) return match;
    return `<loc>${prefix}${rest}.html</loc>`;
  });
  writeFileSync(file, xml);
  console.log(`rewrote ${file}`);
}
