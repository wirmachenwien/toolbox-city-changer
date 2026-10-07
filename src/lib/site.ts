// Site-wide URL helpers. All internal links go through these so the
// project subpath (base) and the trilingual scheme stay consistent.
// English is the default language: it lives at the root (no prefix),
// German and Slovene live under /de/ and /sl/.
import type { Language } from '../data/locales';

export const SITE_URL = 'https://wirmachenwien.github.io';
export const BASE_PATH = '/toolbox-city-changer';

/** Default language, served without a URL prefix. */
export const DEFAULT_LANG: Language = 'en';

/** Prefix a root-relative path with the project subpath. */
export function withBase(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${clean === '/' ? '/' : clean}`;
}

function langPrefix(lang: Language): string {
  return lang === DEFAULT_LANG ? '' : `/${lang}`;
}

/** URL of a project page ("index" | "search"). */
export function pageUrl(lang: Language, file: string): string {
  if (file === 'index') return withBase(`${langPrefix(lang)}/`);
  return withBase(`${langPrefix(lang)}/${file}.html`);
}

/** URL of a book file ("01", "0-3-contents", ...). The cover entry resolves
 *  to the book directory itself. */
export function bookUrl(lang: Language, file: string): string {
  const folder = lang === DEFAULT_LANG ? 'book' : `book/${lang}`;
  if (file === 'index') return withBase(`/${folder}/`);
  return withBase(`/${folder}/${file}.html`);
}

/** Resolve a nav "file" value (e.g. "index" or "book/0-3-contents") to a URL. */
export function navFileUrl(lang: Language, file: string, fallbackLang: Language = DEFAULT_LANG): string {
  if (file.startsWith('book/')) {
    const slug = file.replace(/^book\//, '').replace(/^(de|sl)\//, '');
    const target = file.startsWith('book/de/') ? 'de' : file.startsWith('book/sl/') ? 'sl' : fallbackLang;
    return bookUrl(target, slug);
  }
  return pageUrl(lang, file);
}

/** Absolute canonical URL for a site-relative URL. */
export function canonical(url: string): string {
  return `${SITE_URL}${url}`;
}

/** Same-page URLs in every language (for the language switcher + hreflang). */
export function alternates(kind: 'page' | 'book', file: string): { lang: Language; url: string }[] {
  const langs: Language[] = ['en', 'de', 'sl'];
  return langs.map((lang) => ({
    lang,
    url: kind === 'book' ? bookUrl(lang, file) : pageUrl(lang, file),
  }));
}
