// Localisation helpers: locale lookup, nested key access, <html> attrs.
import { locales, type Language } from '../data/locales';
import { getWork } from '../data/works';

const ENGLISH_LANG = 'en' as Language;

export function getLocale(lang: Language) {
  return locales[lang];
}

function lookup(lang: Language, path: string): string | undefined {
  let node: unknown = getLocale(lang);
  for (const part of path.split('.')) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === 'string' ? node : undefined;
}

/** Read a nested locale value ("search.placeholder") with English fallback. */
export function t(lang: Language, path: string, fallback = ''): string {
  return lookup(lang, path) ?? lookup(ENGLISH_LANG, path) ?? fallback;
}

export function htmlDir(lang: Language): 'ltr' | 'rtl' {
  return getLocale(lang).direction === 'rtl' ? 'rtl' : 'ltr';
}

/** Project name/description/credit for the active language.
 *  The single Title/Description/Credit fields in works.json serve both the
 *  site chrome and the book metadata. Languages without their own block fall
 *  back to English. */
export function projectText(lang: Language): { name: string; description: string; credit: string } {
  const work = getWork(lang) ?? getWork(ENGLISH_LANG);
  const fallback = getWork(ENGLISH_LANG);
  return {
    name: work.title || fallback.title,
    description: work.description || fallback.description,
    credit: work.credit || fallback.credit,
  };
}
