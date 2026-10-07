// Fails the build if legacy template/system names leak into the delivered
// codebase. Walks the working tree, excluding the frozen reference (legacy/),
// caches, build output and the exception files below.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = [
  'electric',
  'bookworks',
  'ebook-',
  'jekyll',
  'liquid',
  'kramdown',
  'prince',
  'mathjax-node-page',
  'gulp',
  '_layouts',
  '_includes',
  '_sass',
  '_site',
  'baseurl',
];
// "eb-" only counts as a legacy class prefix, not inside words like "web-".
const EB_PREFIX = /(^|[^a-z])eb-/i;

const EXCLUDE_DIRS = new Set(['legacy', 'node_modules', 'dist', 'dist-pdf', '.git', '.astro', '.vscode']);
const EXCLUDE_FILES = new Set([
  'docs/MIGRATION.md', // narrow provenance exception, documented in that file
  'README.md', // attribution exception: the Electric Book Works shout-out lives here
  'ASTRO_MIGRATION_PROMPT.md', // the task brief itself, not delivered code
  'package-lock.json',
  'scripts/check-baggage.mjs', // this scanner names the patterns it forbids
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = full.startsWith('./') ? full.slice(2) : full;
    const top = rel.split('/')[0];
    if (EXCLUDE_DIRS.has(top ?? '') || EXCLUDE_FILES.has(rel)) continue;
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walk(full, out);
    else if (stat.isFile()) out.push(rel);
  }
  return out;
}

let failures = 0;
for (const file of walk('.')) {
  if (!existsSync(file)) continue;
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue; // binary
  }
  if (text.includes('\0')) continue;
  // ".nojekyll" is required for GitHub Pages and is not a legacy reference.
  const lowered = text.toLowerCase().replaceAll('.nojekyll', '');
  for (const pattern of FORBIDDEN) {
    if (lowered.includes(pattern)) {
      console.error(`FAIL: ${file} contains forbidden "${pattern}"`);
      failures += 1;
    }
  }
  text.split('\n').forEach((line, index) => {
    if (EB_PREFIX.test(line)) {
      console.error(`FAIL: ${file}:${index + 1} contains forbidden "eb-" prefix`);
      failures += 1;
    }
  });
}

if (failures > 0) {
  console.error(`${failures} forbidden-string hit(s)`);
  process.exit(1);
}
console.log('baggage check passed: no legacy names outside legacy/ and docs/MIGRATION.md');
