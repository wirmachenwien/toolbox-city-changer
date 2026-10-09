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
 *  Languages without their own project block fall back to the English
 *  project metadata. */
export function projectText(lang: Language): { name: string; description: string; credit: string } {
  return getWork(lang).project ?? getWork(ENGLISH_LANG).project;
}
