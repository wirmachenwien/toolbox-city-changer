// Localisation helpers: locale lookup, nested key access, <html> attrs.
import { locales, type Language } from '../data/locales';
import { project } from '../data/project';

export function getLocale(lang: Language) {
  return locales[lang];
}

/** Read a nested locale value ("search.placeholder") with a fallback. */
export function t(lang: Language, path: string, fallback = ''): string {
  let node: unknown = getLocale(lang);
  for (const part of path.split('.')) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return fallback;
    }
  }
  return typeof node === 'string' ? node : fallback;
}

export function htmlDir(lang: Language): 'ltr' | 'rtl' {
  return getLocale(lang).direction === 'rtl' ? 'rtl' : 'ltr';
}

/** Project name/description/credit for the active language.
 *  Languages without their own project block fall back to the German
 *  project metadata. */
export function projectText(lang: Language): { name: string; description: string; credit: string } {
  const locale = getLocale(lang) as {
    project?: { name?: string; description?: string; credit?: string };
  };
  return {
    name: locale.project?.name ?? project.name,
    description: locale.project?.description ?? project.description,
    credit: locale.project?.credit ?? project.credit,
  };
}
