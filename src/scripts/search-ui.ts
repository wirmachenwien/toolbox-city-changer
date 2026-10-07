// Client search UI powered by the static Pagefind index.
// Reads the ?query= parameter, searches the prebuilt index, and renders
// locale-aware result counts. Results are filtered to the active language
// by URL prefix (de: no prefix, en: /en/, sl: /sl/).
import { t } from '../lib/i18n';
import { DEFAULT_LANG } from '../lib/site';
import type { Language } from '../data/locales';

interface PagefindResult {
  url: string;
  excerpt: string;
  meta: { title?: string };
  sub_results?: { title: string; url: string; excerpt: string }[];
}

interface Pagefind {
  search: (term: string) => Promise<{ results: { data: () => Promise<PagefindResult> }[] }>;
}

declare global {
  interface Window {
    pagefind?: Pagefind;
  }
}

function basePath(): string {
  const base = import.meta.env.BASE_URL as string;
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

function langPrefix(lang: Language): string {
  return lang === DEFAULT_LANG ? '/' : `/${lang}/`;
}

function inLanguage(url: string, lang: Language): boolean {
  const prefix = langPrefix(lang);
  if (!url.startsWith(prefix)) return false;
  if (lang !== DEFAULT_LANG) return true;
  const rest = url.slice(prefix.length);
  return !rest.startsWith('de/') && !rest.startsWith('sl/');
}

/** Pagefind records site-root-relative URLs; rebase them under the subpath. */
function publicUrl(url: string): string {
  return `${basePath()}${url}`;
}

export async function initSearchUI(lang: Language): Promise<void> {
  const params = new URLSearchParams(location.search);
  const query = (params.get('query') ?? '').trim();
  // The page form carries id="site-search"; the navbar mini form (which
  // comes first in the DOM) uses id="head-search" — a generic
  // [data-search-form] selector would hit the navbar input instead.
  const input =
    document.querySelector<HTMLInputElement>('#site-search') ??
    document.querySelector<HTMLInputElement>('[data-search-form] input[name="query"]');
  const status = document.querySelector('[data-search-status]');
  const list = document.querySelector('[data-search-results]');
  if (!input || !status || !list) return;
  if (query) input.value = query;
  if (!query) {
    status.textContent = '';
    return;
  }
  status.textContent = t(lang, 'search.placeholder-searching', 'Searching...');
  try {
    if (import.meta.env.DEV) {
      // The Pagefind index is generated into dist/ after the build, so it
      // never exists under `astro dev` — skip the request (it would 404
      // against the [...slug] catch-all) and render the empty state.
      render(lang, query, [], status, list);
      return;
    }
    if (!window.pagefind) {
      const module = (await import(
        /* @vite-ignore */ `${basePath()}/pagefind/pagefind.js`
      )) as Pagefind;
      window.pagefind = module;
    }
    const response = await window.pagefind.search(query);
    const items: PagefindResult[] = [];
    for (const result of response.results.slice(0, 30)) {
      const data = await result.data();
      if (inLanguage(data.url, lang)) items.push(data);
    }
    render(lang, query, items, status, list);
  } catch {
    status.textContent = t(lang, 'search.results-for-none', 'No results found for') + ` "${query}"`;
  }
}

function render(
  lang: Language,
  query: string,
  items: PagefindResult[],
  status: Element,
  list: Element,
): void {
  const count = t(lang, 'search.search-results', 'Search results');
  const heading =
    items.length === 0
      ? `${t(lang, 'search.results-for-none', 'No results found for')} "${query}"`
      : items.length === 1
        ? `1 ${t(lang, 'search.results-for-singular', 'result found for')} "${query}"`
        : `${items.length} ${t(lang, 'search.results-for-plural', 'results found for')} "${query}" — ${count}`;
  status.textContent = heading;
  list.innerHTML = '';
  for (const item of items) {
    const entry = document.createElement('li');
    const link = document.createElement('a');
    link.href = publicUrl(item.url);
    link.textContent = item.meta.title ?? item.url;
    entry.append(link);
    const excerpt = document.createElement('p');
    excerpt.innerHTML = item.excerpt;
    entry.append(excerpt);
    list.append(entry);
  }
}
