import type { AstroIntegration } from 'astro';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Dev-only downloads builder. The PDF/EPUB files live in dist/downloads/,
// which the dev server does not serve directly (see
// src/pages/downloads/[...file].ts), so without them the download links
// 404 in dev. This integration builds any missing files once when the dev
// server starts (~seconds for all languages) and rebuilds affected
// languages in the background when handbook content changes. The served
// files are read from disk per request, so they appear without a restart.
// Production builds run the same scripts explicitly via
// `npm run build:downloads`, so this never interferes with `astro build`.
const LANGS = ['de', 'en', 'sl'] as const;
type Lang = (typeof LANGS)[number];

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, 'dist', 'downloads');
const EXPECTED = LANGS.flatMap((lang) => [
  `toolbox-city-changer-${lang}.pdf`,
  `toolbox-city-changer-${lang}.epub`,
]);

// Source trees whose changes invalidate the generated files.
const WATCH = [
  'src/content',
  'src/assets',
  'src/data',
  'src/styles/print.css',
  'src/pages',
  'scripts/build-pdf.py',
  'scripts/build-epub.py',
];

function runBuilder(script: string, lang: Lang): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('python3', [script, '--lang', lang], { stdio: 'inherit', cwd: ROOT });
    child.on('close', (code) => {
      if (code !== 0) console.warn(`[downloads] ${script} --lang ${lang} failed; dev continues`);
      resolve(code === 0);
    });
    child.on('error', (error) => {
      console.warn(`[downloads] could not start ${script}: ${error.message}; dev continues`);
      resolve(false);
    });
  });
}

let building = false;
let queued: Set<Lang> | null = null;

async function rebuild(langs: Set<Lang>): Promise<void> {
  for (const lang of LANGS) {
    if (langs.has(lang)) {
      await runBuilder('scripts/build-pdf.py', lang);
      await runBuilder('scripts/build-epub.py', lang);
    }
  }
}

async function schedule(langs: Set<Lang>): Promise<void> {
  if (building) {
    queued = new Set([...(queued ?? []), ...langs]);
    return;
  }
  building = true;
  await rebuild(langs);
  building = false;
  if (queued) {
    const next = queued;
    queued = null;
    await schedule(next);
  }
}

/** Languages affected by a changed repo-relative path (all if shared). */
function affectedLangs(repoPath: string): Set<Lang> {
  const match = repoPath.match(/(?:^|\/)(?:book|pages)\/(de|en|sl)\//);
  return new Set(match ? [match[1] as Lang] : [...LANGS]);
}

export function downloads(): AstroIntegration {
  return {
    name: 'toolbox-downloads',
    hooks: {
      'astro:server:setup': async ({ server }) => {
        if (EXPECTED.some((name) => !existsSync(path.join(OUT_DIR, name)))) {
          console.log('[downloads] building missing PDF/EPUB files (one-time, a few seconds)…');
          await schedule(new Set([...LANGS]));
          console.log('[downloads] done');
        }
        for (const entry of WATCH) server.watcher.add(path.join(ROOT, entry));
        let timer: ReturnType<typeof setTimeout> | undefined;
        let pending = new Set<Lang>();
        server.watcher.on('all', (event, changed) => {
          if (event !== 'add' && event !== 'change' && event !== 'unlink') return;
          const repoPath = typeof changed === 'string' ? path.relative(ROOT, changed) : '';
          if (!repoPath || repoPath.startsWith('..')) return;
          for (const lang of affectedLangs(repoPath)) pending.add(lang);
          clearTimeout(timer);
          timer = setTimeout(() => {
            const langs = pending;
            pending = new Set();
            void schedule(langs);
          }, 1500);
        });
      },
    },
  };
}
