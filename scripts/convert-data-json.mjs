// One-off: emit CMS-editable JSON data files from the legacy YAML sources.
// Run with: node scripts/convert-data-json.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';

const legacy = (p) => `legacy/${p}`;

const project = parse(readFileSync(legacy('_data/project.yml'), 'utf8'));
writeFileSync('src/data/project.json', JSON.stringify(project, null, 2) + '\n');

const nav = parse(readFileSync(legacy('_data/nav.yml'), 'utf8'));
writeFileSync('src/data/nav.json', JSON.stringify(nav, null, 2) + '\n');

const locales = parse(readFileSync(legacy('_data/locales.yml'), 'utf8'));
const picked = {};
for (const lang of ['de', 'en', 'sl']) {
  picked[lang] = { direction: 'ltr', ...locales[lang] };
}
writeFileSync('src/data/locales.json', JSON.stringify(picked, null, 2) + '\n');
console.log('wrote project.json, nav.json, locales.json');
