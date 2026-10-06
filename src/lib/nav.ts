// Navigation model: project nav + expandable book nav + breadcrumbs.
import { nav } from '../data/nav';
import { webBookToc } from '../data/works';
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

/** Project navigation links for a language, with the current page flagged. */
export function projectNav(lang: Language, currentUrl: string): NavLink[] {
  return nav[lang].map((item) => {
    const url = navFileUrl(lang, item.file, lang);
    return { label: item.label, url, current: url === currentUrl };
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
  const contentsLabel =
    webBookToc(lang).find((entry) => entry.file === '0-3-contents')?.label ?? title;
  return [
    { label: homeLabel, url: navFileUrl(lang, 'index', lang), current: false },
    { label: contentsLabel, url: bookUrl(lang, '0-3-contents'), current: false },
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
