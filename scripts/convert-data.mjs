// One-off migration helper: converts legacy YAML data into the new typed
// src/data files. Run with: node scripts/convert-data.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from 'yaml';

const legacy = (p) => `legacy/${p}`;
const out = (p) => `src/data/${p}`;

// ---------- works.json ----------
const works = {};
for (const lang of ['de', 'en', 'sl']) {
  const file = lang === 'de' ? '_data/works/book/default.yml' : `_data/works/book/${lang}/default.yml`;
  const raw = parse(readFileSync(legacy(file), 'utf8'));
  const { products } = raw;
  works[lang] = {
    ...raw,
    products: {
      pdf: { files: products['print-pdf'].files, toc: products['print-pdf'].toc },
      web: { files: products.web.files, nav: products.web.nav },
    },
  };
}
mkdirSync('src/data', { recursive: true });
writeFileSync(out('works.json'), JSON.stringify(works, null, 2) + '\n');

// ---------- locales.ts ----------
const locales = parse(readFileSync(legacy('_data/locales.yml'), 'utf8'));
const wanted = ['de', 'en', 'sl'];
const picked = {};
for (const lang of wanted) {
  picked[lang] = { direction: 'ltr', ...locales[lang] };
}
const ts = `// Localised UI strings. Generated from the legacy locales file and
// hand-maintained since. Only shipped languages are kept here.
// "direction" drives <html dir> and mirrors the layout via logical properties.
import { z } from 'zod';

export const localeSchema = z.object({ direction: z.enum(['ltr', 'rtl']).default('ltr') }).passthrough();
export type AppLocale = z.infer<typeof localeSchema> & Record<string, unknown>;

export const locales = ${JSON.stringify(picked, null, 2)} as Record<'de' | 'en' | 'sl', AppLocale>;
export const languages = ['de', 'en', 'sl'] as const;
export type Language = (typeof languages)[number];
`;
writeFileSync(out('locales.ts'), ts);
console.log('wrote src/data/works.json and src/data/locales.ts');
