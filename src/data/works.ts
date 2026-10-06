// Typed, Zod-validated access to the book metadata and product definitions.
// The canonical data lives in works.json (single source of truth, also read
// by the WeasyPrint PDF pipeline); this module validates it and exposes
// typed helpers for routes and navigation.
import { z } from 'zod';
import raw from './works.json';
import type { Language } from './locales';

const tocEntrySchema = z.object({
  label: z.string(),
  file: z.string(),
  class: z.string().optional(),
});

const workSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional().default(''),
  creator: z.string().optional().default(''),
  contributor: z.string().optional().default(''),
  description: z.string().optional().default(''),
  image: z.string().optional().default(''),
  publisher: z.string().optional().default(''),
  publisherUrl: z.string().optional().default(''),
  rightsholder: z.string().optional().default(''),
  rights: z.string().optional().default(''),
  language: z.string(),
  date: z.string().optional().default(''),
  modified: z.string().optional().default(''),
  type: z.string().optional().default(''),
  subject: z.string().optional().default(''),
  identifier: z.string().optional().default(''),
  coverage: z.string().optional().default(''),
  keywords: z.string().optional().default(''),
  products: z.object({
    pdf: z.object({ files: z.array(z.string()), toc: z.array(tocEntrySchema) }),
    web: z.object({ files: z.array(z.string()), nav: z.array(tocEntrySchema) }),
  }),
});

export type Work = z.infer<typeof workSchema>;
export type TocEntry = z.infer<typeof tocEntrySchema>;

// Normalise legacy hyphenated keys (publisher-url) to camelCase once.
function normalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalise);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k === 'publisher-url' ? 'publisherUrl' : k,
        normalise(v),
      ]),
    );
  }
  return value;
}

const works = z
  .object({ de: workSchema, en: workSchema, sl: workSchema })
  .parse(normalise(raw) as Record<Language, unknown>);

// Chapter counters must consistently include a trailing dot, e.g. "2. Title".
// This keeps generated navigation, pagination, TOCs and any future metadata
// edits unified even if someone enters "2 Title" in works.json.
for (const work of Object.values(works)) {
  for (const entry of [...work.products.pdf.toc, ...work.products.web.nav]) {
    if (/^\d+\s+/.test(entry.label)) {
      entry.label = entry.label.replace(/^(\d+)\s+/, '$1. ');
    }
  }
}

export function getWork(lang: Language): Work {
  return works[lang];
}

/** Front-matter files that exist for print/PDF but have no web page
 *  (the web version starts at the copyright/contents sheets). */
export const WEB_EXCLUDED_FILES = ['0-0-cover', '0-1-titlepage', 'index'];

/** Ordered chapter slugs for the web navigation of a language. */
export function bookOrder(lang: Language): string[] {
  return works[lang].products.web.files;
}

/** Table of contents entries (label + file) for a language. */
export function bookToc(lang: Language): TocEntry[] {
  return works[lang].products.web.nav;
}

/** Web table of contents without the print-only front matter entries. */
export function webBookToc(lang: Language): TocEntry[] {
  return bookToc(lang).filter((entry) => !WEB_EXCLUDED_FILES.includes(entry.file));
}

/** Previous/next chapter slugs around the given file, or null at the ends. */
export function chapterNeighbours(
  lang: Language,
  file: string,
): { prev: TocEntry | null; next: TocEntry | null } {
  const toc = webBookToc(lang);
  const index = toc.findIndex((entry) => entry.file === file);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? toc[index - 1] : null,
    next: index < toc.length - 1 ? toc[index + 1] : null,
  };
}
