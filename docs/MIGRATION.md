# Migration notes: legacy site → Astro

The previous handbook site was built with a legacy Jekyll template. What
follows is the complete old-path → new-path mapping for that migration; the
new codebase itself carries no trace of the old pipeline.

## Principles

- Clean re-platform: content (prose, data values, images) was carried over
  by hand; all code, layouts, styles and components were written from zero.
- The frozen original lives in `legacy/` (read-only reference + regression
  baseline, including `legacy/baseline-html/` with representative pages).
- `legacy/` is excluded from the build, the CMS, linting and the Pages
  deploy (`dist/` only).

## Path mapping

| Old path | New path |
|---|---|
| `book/*.md` | `src/content/book/de/*.mdx` |
| `book/en/*.md` | `src/content/book/en/*.mdx` |
| `book/sl/*.md` | `src/content/book/sl/*.mdx` |
| `index.md`, `about.md`, `contact.md`, `search.md` | `src/content/pages/de/*.mdx` |
| `en/{index,about,contact,search}.md` | `src/content/pages/en/*.mdx` |
| `sl/{index,about,contact,search}.md` | `src/content/pages/sl/*.mdx` |
| `book/images/web/*` (originals) | `src/assets/book/*` |
| `assets/images/web/*` (originals) | `src/assets/site/*` |
| `assets/images/web/{favicon.png,logo.svg}` | `public/{favicon.png,logo.svg}` |
| Responsive `-320/-640/-1024/-2048/-max` image variants | Deleted; regenerated at build time by `astro:assets` |
| `book/images/{print-pdf,screen-pdf,app,epub}/*` | Deleted; the PDF pipeline renders from the same web sources |
| `_data/project.yml` | `src/data/project.json` (+ validated `src/data/project.ts`) |
| `_data/nav.yml` | `src/data/nav.json` (+ validated `src/data/nav.ts`) |
| `_data/locales.yml` (de/en/sl only) | `src/data/locales.json` (+ validated `src/data/locales.ts`) |
| `_data/settings.yml` (web toggles) | `src/data/settings.ts` (typed + validated) |
| `_data/works/book/{default,en/sl/default}.yml` | `src/data/works.json` keyed by language (+ validated `src/data/works.ts`) |
| `_data/images.yml` | Dropped (no per-image overrides in use) |
| `_layouts/*.html`, `_includes/*.html` | `src/layouts/*.astro`, `src/components/*.astro` (rewritten, renamed) |
| `_sass/`, `assets/styles/*.scss` | `src/styles/global.css` (rewritten) + `src/styles/print.css` |
| `assets/js/main.js`, `assets/js/search.js`, `_webpack/` | `src/scripts/*.ts` islands (rewritten, no bundle) |
| `_indexes/search-index-web.json` + client search | Pagefind static index (`npm run build:search`) + `src/scripts/search-ui.ts` |
| Proprietary PDF pipeline + print styles | `scripts/build-pdf.py` + `requirements.txt` (WeasyPrint) |
| `_config.yml`, `_configs/`, `Gemfile`, `_prose.yml`, `netlify.toml` | Deleted (single static target; see `astro.config.mjs`) |
| `.pages.yml` (old `book/*.md`, `_data/*` paths) | `.pages.yml` (new `src/content/**`, `src/data/**`, `src/assets/**` paths) |
| `.github/workflows/build-checker.yml`, `deploy.yml` | `.github/workflows/` (Node-only Pages deploy + checks + PDF artifact) |
| `_tests/check-translations.py`, `search-languages.cjs` | `scripts/check-i18n.mjs` (`npm run check:i18n`) |
| `sitemap.xml`, `robots.txt` | `@astrojs/sitemap` + `public/robots.txt` + `scripts/fix-dist.mjs` |

## Content syntax changes

Authors now write MDX instead of template tags:

| Old | New |
|---|---|
| `{% include video id="…" description="…" %}` | `<Video id="…" caption="…" />` |
| `{% include toc %}` | Rendered by the contents layout (`<Toc lang="…" />` elsewhere) |
| `{% include cover/title-page/copyright-page/metadata/search %}` | Rendered by `BookLayout` / `PageLayout` |
| `[text](url){:.button}` | `<ButtonLink href="url">text</ButtonLink>` |
| `[label](mailto:…){:.copy-to-clipboard}` | `<CopyText value="…" lang="…" />` |
| `![alt](images/web/file.jpg)` + `*caption*` | `<Figure src="file.jpg" alt="…">caption</Figure>` |
| `{{ site.data.project.* }}` / `{{ locale.* }}` variables | Baked into content at migration; live values come from `src/lib/i18n.ts` |
| Front matter `style: …` | Front matter `template: chapter \| cover \| title \| copyright \| contents \| home \| page \| search` |
| Front matter `opener-image:` / `opener-image-alt-text:` | `openerImage:` / `openerImageAlt:` |

## Behavioural notes

- URL scheme is unchanged (`about.html`, `book/01.html`, `/en/`, `/book/en/…`).
- The `eb-`/`bookworks` component and class names are gone; see the
  kitchen-sink fixture at `/preview/kitchen-sink/` (excluded from sitemap).
- Unused locales (French, Spanish) and dead toggles (app builds,
  monetisation, annotation service, variants) were dropped, not ported.
- `legacy/` preserves the full history via `git mv`; never import from it.
