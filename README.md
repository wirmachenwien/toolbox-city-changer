# Toolbox for City Changers

Trilingual handbook site (German, English, Slovene) for the Erasmus+
Toolbox for City Changers project. Built with Astro 7 as pure static files
and hosted on GitHub Pages.

The code for this site is inspired by [Electric Book Works](https://electricbookworks.com)
and its [Electric Book workflow](https://github.com/electricbookworks/electric-book)
— shout out! — and is licensed under the [AGPL-3.0](LICENSE) (see `LICENSE`).

Unless stated otherwise, the contents of this handbook are licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) Wir machen Wien, Changing Cities & Prostorož.
You may share and adapt the contents as long as you give appropriate credit
to the authors.

## Development

```sh
npm ci
npm run dev
```

The dev server builds any missing PDF/EPUB downloads on startup and
rebuilds them in the background whenever handbook content changes.

## Build & preview

```sh
npm run build    # site + PDF/EPUB downloads + index fixups + Pagefind index
npm run preview
npm run check:i18n    # translation, link, search-index and sitemap checks on dist/
```

## PDFs

```sh
pip install -r requirements.txt
npm run build:pdf   # one PDF per language (de/en/sl) into dist/downloads/ (served by the site)
```

## Project layout

- `src/content/book/{de,en,sl}/` — handbook chapters (MDX content collections)
- `src/content/pages/{de,en,sl}/` — home and search pages
- `src/components/` — content components (Figure, Video, Quiz, …)
- `src/layouts/` — `BaseLayout`, `BookLayout`, `PageLayout`
- `src/data/` — typed settings, project/nav/locale metadata, book catalogue
- `src/lib/` — URL, i18n and navigation helpers
- `src/scripts/` — progressive-enhancement client islands
- `src/assets/` — bundled images (optimised at build time)
- `public/` — favicon, logo, app icons, webmanifest, robots.txt, `.nojekyll`
- `scripts/` — WeasyPrint PDF and EPUB pipelines, build checks
- `.pages.yml` — PagesCMS configuration for the paths above

English is the default language at the root (`/`, `/book/…`); German and
Slovene live under `/de/`, `/sl/`, `/book/de/…`, `/book/sl/…` (legacy `/en/`
URLs redirect to the canonical locations).
