# Toolbox for City Changers

Trilingual handbook site (German, English, Slovene) for the Erasmus+
Toolbox for City Changers project. Built with Astro 7 as pure static files
and hosted on GitHub Pages.

The code for this site is inspired by [Electric Book Works](https://electricbookworks.com)
and its [Electric Book workflow](https://github.com/electricbookworks/electric-book)
— shout out, and thank you! — and is licensed under the
[AGPL-3.0](LICENSE) (see `LICENSE`).

Unless stated otherwise, the contents of this handbook are licensed under
[CC BY 4.0 Wir machen Wien, Changing Cities & Prostorož](https://creativecommons.org/licenses/by/4.0/).
You may share and adapt the contents as long as you give appropriate credit
to the authors.

## Development

```sh
npm ci
npm run dev
```

## Build & preview

```sh
npm run build    # astro build + index fixups + Pagefind search index
npm run preview
npm run check:i18n    # translation, link, search-index and sitemap checks on dist/
npm run check:baggage # fail on legacy template/system names in delivered code
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
- `scripts/build-pdf.py` — WeasyPrint PDF pipeline
- `.pages.yml` — PagesCMS configuration for the paths above
- `legacy/` — frozen pre-migration reference (not built or deployed)

See `docs/MIGRATION.md` for the old→new mapping.
