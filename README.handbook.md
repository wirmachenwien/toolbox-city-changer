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
