# Toolbox fuer City Changer

Electric-Book-Handbuch fuer die WirMachenWien-Workshopreihe mit Changing Cities und Prostorož.

## Arbeiten

- Inhalt liegt in `book/*.md`.
- Metadaten liegen in `_data/works/book/default.yml` und `_data/project.yml`.
- Landing Page: `index.md`.

## Build

Nach Installation der Abhaengigkeiten:

```sh
npm run eb -- output --book book
```

Fuer einen nicht-servierenden Web-Build:

```sh
npm run eb -- output --book book --dontserve true
```

## Sprachen / Languages

German remains at `/` and `/book/`. English is at `/en/` and `/book/en/`;
Slovene is at `/sl/` and `/book/sl/`. The language control links to the same
page in the other languages, including the landing, about, contact and search pages.

- Translated content: `book/en/*.md`, `book/sl/*.md`, `en/*.md`, `sl/*.md`.
- Book metadata: `_data/works/book/{en,sl}/default.yml`.
- Interface labels and project metadata: `_data/locales.yml`.
- Project navigation: `_data/nav.yml`.

The English and Slovene texts were automatically translated from the German
source. Source placeholders remain placeholders. External source documents,
videos and text embedded in existing images retain their original language.
When editing the German source, update both translated versions as well.

For a language-specific Electric Book output, use `--language en` or
`--language sl`. Omit that option for the multilingual website.

### Validation

```sh
npm ci --ignore-scripts
node node_modules/@electricbookworks/electric-book-modules/install.js
bundle install
output=web npx webpack --config _webpack/webpack.config.js --mode production
bundle exec jekyll build
python3 _tests/check-translations.py
node _tests/search-languages.cjs
```

The committed web search indexes include all three languages. After content
changes, refresh them with `npm run eb -- index --format web`, then rebuild
the JavaScript so search includes the updated text.
