// Navigation model: project nav + expandable book nav + breadcrumbs.
import { nav } from '../data/nav';
import { contentsLabel, webBookToc } from '../data/works';
import { smartQuotes } from './smart-quotes';
import type { Language } from '../data/locales';
import { bookUrl, navFileUrl } from './site';
import { settings } from '../data/settings';

export interface NavLink {
  label: string;
  url: string;
  current: boolean;
}

export interface BookNavEntry extends NavLink {
  slug: string;
}

/** Project navigation links for a language, with the current page flagged.
 *  Nav labels bypass the markdown pipeline, so quotes are localised here to
 *  match the hast-transformed prose. (Book labels arrive via webBookToc,
 *  already localised in works.ts.) */
export function projectNav(lang: Language, currentUrl: string): NavLink[] {
  return nav[lang].map((item) => {
    const url = navFileUrl(lang, item.file, lang);
    return { label: smartQuotes(item.label, lang), url, current: url === currentUrl };
  });
}

/** Book chapter navigation (expandable on the landing page per settings). */
export function bookNav(lang: Language, currentUrl: string): BookNavEntry[] {
  return webBookToc(lang)
    .map((entry) => {
      const url = bookUrl(lang, entry.file);
      return { label: entry.label, url, current: url === currentUrl, slug: entry.file };
    });
}

/** Project + book navigation in the configured order. */
export function combinedNav(
  lang: Language,
  currentUrl: string,
): { project: NavLink[]; book: BookNavEntry[]; position: 'before' | 'after' } {
  return {
    project: projectNav(lang, currentUrl),
    book: settings.web.nav.expandBooks ? bookNav(lang, currentUrl) : [],
    position: settings.web.nav.projectNavPosition,
  };
}

/** Breadcrumb trail for a book page: home > contents > chapter. */
export function bookCrumbs(lang: Language, title: string): NavLink[] {
  const homeLabel = nav[lang][0]?.label ?? '';
  const label = contentsLabel(lang);
  return [
    { label: homeLabel, url: navFileUrl(lang, 'index', lang), current: false },
    { label, url: bookUrl(lang, 'contents'), current: false },
    { label: title, url: '', current: true },
  ];
}

/** Breadcrumb trail for a project page: home > page. */
export function pageCrumbs(lang: Language, title: string): NavLink[] {
  const homeLabel = nav[lang][0]?.label ?? '';
  return [
    { label: homeLabel, url: navFileUrl(lang, 'index', lang), current: false },
    { label: title, url: '', current: true },
  ];
}
