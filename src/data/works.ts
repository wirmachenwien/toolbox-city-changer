// Typed, Zod-validated access to the book metadata and product definitions.
// The canonical data lives in works.json (single source of truth, also read
// by the WeasyPrint PDF pipeline); this module validates it and exposes
// typed helpers for routes and navigation.
import { z } from 'zod';
import { languages } from '../../handbook.config.ts';
import { smartQuotes } from '../lib/smart-quotes.ts';
import raw from './works.json';
import type { Language } from './locales';

const tocEntrySchema = z.object({
  label: z.string(),
  file: z.string(),
  class: z.string().optional(),
});

const chapterSchema = z.object({
  file: z.string(),
  label: z.string(),
  /** Print-only chapters (cover/title sheets) have no web page. */
  web: z.boolean().optional().default(true),
});

const workSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional().default(''),
  creator: z.string().optional().default(''),
  contributor: z.string().optional().default(''),
  description: z.string().optional().default(''),
  image: z.string().optional().default(''),
  publisher: z.string().optional().default(''),
  rights: z.string().optional().default(''),
  language: z.string(),
  date: z.string().optional().default(''),
  modified: z.string().optional().default(''),
  type: z.string().optional().default(''),
  subject: z.string().optional().default(''),
  identifier: z.string().optional().default(''),
  products: z.object({
    pdf: z.object({ files: z.array(z.string()), toc: z.array(tocEntrySchema) }),
    web: z.object({ files: z.array(z.string()), nav: z.array(tocEntrySchema) }),
  }).optional(),
  /** Single ordered chapter list per language (single source of truth for
   *  reading order). `files`/`nav`/`toc` are derived from it below. Any
   *  legacy `products` block is ignored. */
  chapters: z.array(chapterSchema).min(1),
});

export type Work = z.infer<typeof workSchema>;
export type TocEntry = z.infer<typeof tocEntrySchema>;

const parsedWorks = z.record(z.string(), workSchema).parse(raw) as Record<string, Work>;
for (const lang of languages) {
  if (!parsedWorks[lang]) throw new Error(`works.json: missing work "${lang}" (see handbook.config.ts)`);
  const files = parsedWorks[lang].chapters.map((chapter) => chapter.file);
  const duplicates = files.filter((file, index) => files.indexOf(file) !== index);
  if (duplicates.length > 0) {
    throw new Error(`works.json: duplicate chapter(s) in "${lang}": ${[...new Set(duplicates)].join(', ')}`);
  }
  if (!files.includes('contents')) throw new Error(`works.json: "${lang}" chapters are missing "contents"`);
}
const works = parsedWorks as Record<Language, Work>;

// Chapter counters must consistently include a trailing dot, e.g. "2. Title".
// This keeps generated navigation, pagination, TOCs and any future metadata
// edits unified even if someone enters "2 Title" in works.json.
for (const work of Object.values(works)) {
  for (const entry of work.chapters) {
    if (/^\d+\s+/.test(entry.label)) {
      entry.label = entry.label.replace(/^(\d+)\s+/, '$1. ');
    }
  }
}

/** Chapter slugs styled as front matter (print sheets + about/contents). */
const FRONTMATTER_FILES = new Set(['0-0-cover', '0-1-titlepage', 'about', 'contents']);

function chapterTocEntry(chapter: Work['chapters'][number]): TocEntry {
  return FRONTMATTER_FILES.has(chapter.file)
    ? { label: chapter.label, file: chapter.file, class: 'frontmatter-entry' }
    : { label: chapter.label, file: chapter.file };
}

/** Full print order (PDF/EPUB): every chapter, including print-only sheets. */
export function pdfOrder(lang: Language): string[] {
  return pdfFiles(works[lang]);
}

/** Full print table of contents (PDF/EPUB). Mirrors the derivation in
 *  `scripts/bin/build-pdf.py` / `scripts/bin/build-epub.py`. */
export function pdfBookToc(lang: Language): TocEntry[] {
  return pdfToc(works[lang]);
}

/** Web reading order: print-only sheets (`web: false`) excluded. */
function webFiles(work: Work): string[] {
  return work.chapters.filter((chapter) => chapter.web !== false).map((chapter) => chapter.file);
}

/** Print order: every chapter, including print-only sheets. */
function pdfFiles(work: Work): string[] {
  return work.chapters.map((chapter) => chapter.file);
}

/** Print table of contents: every chapter. */
function pdfToc(work: Work): TocEntry[] {
  return work.chapters.map(chapterTocEntry);
}

/** Web navigation entries: print-only sheets excluded. */
function webNav(work: Work): TocEntry[] {
  return work.chapters.filter((chapter) => chapter.web !== false).map(chapterTocEntry);
}

export function getWork(lang: Language): Work {
  return works[lang];
}

/** Slugs with no MDX source file and no web page: the cover/title sheets are
 *  virtual (generated for PDF/EPUB from works.json). The book landings
 *  (/book/, /book/de/, /book/sl/) are redirect stubs, not content pages. */
export const WEB_EXCLUDED_FILES = ['0-0-cover', '0-1-titlepage'];

/** Ordered chapter slugs for the web navigation of a language. */
export function bookOrder(lang: Language): string[] {
  return webFiles(works[lang]);
}

/** Table of contents entries (label + file) for a language. Catalogue labels
 *  bypass the markdown pipeline, so quotes are localised here to match the
 *  hast-transformed prose. Copies are returned; the validated store is
 *  never mutated. */
export function bookToc(lang: Language): TocEntry[] {
  return webNav(works[lang]).map((entry) => ({
    ...entry,
    label: smartQuotes(entry.label, lang),
  }));
}

/** Web table of contents without the print-only front matter entries. */
export function webBookToc(lang: Language): TocEntry[] {
  return bookToc(lang).filter((entry) => !WEB_EXCLUDED_FILES.includes(entry.file));
}

/** Label of the contents page. The contents sheet has no MDX source file;
 *  its title comes from the book catalogue (single source of truth). */
export function contentsLabel(lang: Language): string {
  return bookToc(lang).find((entry) => entry.file === 'contents')?.label ?? 'Contents';
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

/** Page kinds that can paginate. Mirrors the `kind` prop of `BaseLayout`. */
export type PageKind = 'book' | 'page';

/** Single source of truth for "which pages paginate": book pages follow the
 *  reading order, project home pages (`page` + `index`) lead into the front
 *  of the book. Returns `null` when the page has no pagination. */
export function paginationNeighbours(
  lang: Language,
  kind: PageKind,
  file: string,
): { prev: TocEntry | null; next: TocEntry | null } | null {
  if (kind === 'page') {
    if (file !== 'index') return null;
    const next = webBookToc(lang)[0] ?? null;
    return next ? { prev: null, next } : null;
  }
  const { prev, next } = chapterNeighbours(lang, file);
  if (!prev && !next) return null;
  return { prev, next };
}
