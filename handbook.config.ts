// Handbook site configuration — the single source of truth.
//
// site, base, slug, languages and defaultLang are defined exactly once here.
// Everything else derives from them:
// - astro.config.mjs (site, base, legacy default-lang redirects)
// - src/lib/site.ts (SITE_URL, BASE_PATH, DEFAULT_LANG, URL helpers)
// - src/data/locales.ts (languages, Language)
// - src/content.config.ts (content language enum)
// - Python builders (argparse choices, download stem)
// - scripts/bin/check-site.mjs, scripts/bin/fix-dist.mjs
// - scripts/bin/sync-config.mjs -> .pages.yml, public/robots.txt, public/site.webmanifest
//
// To ship a two-language handbook, shrink `languages` (keeping defaultLang
// inside it) and run `npm run sync:config`, then rebuild.

/** Canonical origin the site is published at. */
export const site = 'https://wirmachenwien.github.io';

/** Project subpath (Astro form, with leading and trailing slash). */
export const base = '/toolbox-city-changer/';

/** Filename stem for the generated PDF/EPUB downloads: `<slug>-<lang>.pdf`. */
export const slug = 'toolbox-city-changer';

/** Every handbook language. The first entry is only a display default;
 *  URL treatment is decided by `defaultLang` below. */
export const languages = ['de', 'en', 'sl'] as const;

/** Display names for the CMS config generator (scripts/bin/sync-config.mjs). */
export const languageNames = { de: 'German', en: 'English', sl: 'Slovene' } as const;

export type Language = (typeof languages)[number];

/** Language served without a URL prefix (/ and /book/); the rest live
 *  under /<lang>/ and /book/<lang>/. Must be a member of `languages`. */
export const defaultLang: Language = 'en';
