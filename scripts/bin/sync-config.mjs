#!/usr/bin/env node
// Regenerates the files derived from handbook.config.ts (single source of
// truth) that cannot import it directly because an external tool owns them:
// - .pages.yml (PagesCMS content model: one chapters/home/metadata section
//   per language, previously 3x copy-paste)
// - public/robots.txt (absolute sitemap URL: site + base)
// - public/site.webmanifest (icon URLs carry the base subpath)
//
// Run `npm run sync:config` after changing handbook.config.ts; CI runs
// `npm run check:config` (--check) to make sure the committed files are
// in sync.
import { readFileSync, writeFileSync } from 'node:fs';
import { site, base, languages, languageNames } from '../../handbook.config.ts';
import { normalizeBase } from '../lib/paths.mjs';

const LANGS = [...languages];
const BASE_PATH = normalizeBase(base);

const displayName = (lang) => languageNames[lang] ?? lang;

function chaptersCollection(lang) {
  const display = displayName(lang);
  return `      - name: chapters_${lang}
        label: Chapters (${display})
        type: collection
        path: src/content/book/${lang}
        format: yaml-frontmatter
        filename:
          template: "{primary}.mdx"
          field: create
        operations:
          create: false
          rename: false
          delete: false
        fields:
          - name: title
            label: Chapter title
            type: string
            required: true
          - name: lang
            component: language
          - name: template
            component: book_template
          - name: description
            label: Description
            type: text
          - name: body
            component: markdown_body
            options:
              media: book_images
              path: src/assets/book
              rename: safe
        view:
          fields: [title, template]
          primary: title
          sort: [title]
          search: [title, body]
          default:
            sort: title
            order: asc
`;
}

function homePage(lang) {
  const display = displayName(lang);
  return `      - name: home_${lang}
        label: Home Page (${display})
        type: file
        path: src/content/pages/${lang}/index.mdx
        format: yaml-frontmatter
        operations:
          create: false
          delete: false
        fields:
          - name: title
            type: string
            required: true
          - name: lang
            component: language
          - name: template
            component: page_template
          - name: openerImage
            label: Opener image
            type: image
            options:
              media: book_images
              path: src/assets/book
          - name: openerImageAlt
            label: Opener image alt text
            type: text
          - name: body
            component: markdown_body
            options:
              media: site_images
              path: src/assets/site
              rename: safe
`;
}

function bookMetadata(lang) {
  const display = displayName(lang);
  return `          - name: ${lang}
            label: ${display} book metadata
            type: object
            fields:
              - name: title
                type: string
                required: true
              - name: subtitle
                type: string
              - name: creator
                type: string
              - name: contributor
                type: string
              - name: description
                type: text
              - name: publisher
                type: string
              - name: rights
                type: text
              - name: language
                type: string
`;
}

function navigation(lang) {
  const display = displayName(lang);
  return `          - name: ${lang}
            label: ${display} navigation
            type: object
            list: true
            fields:
              - name: label
                type: string
                required: true
              - name: file
                type: string
                required: true
`;
}

function glossary(lang) {
  const display = displayName(lang);
  return `          - name: ${lang}
            label: ${display} glossary
            type: object
            list: true
            fields:
              - name: term
                label: Term
                type: string
                required: true
              - name: definition
                label: Definition
                type: text
                required: true
              - name: forms
                label: Word forms
                description: Additional inflected forms found in the chapters (plurals, cases). Leave empty to match the term itself.
                type: string
                list: true
`;
}

function languageOptions() {
  return LANGS.map((lang) => {
    const display = displayName(lang);
    return `        - name: ${lang}
          label: ${display}
`;
  }).join('');
}

function pagesYml() {
  return `# GENERATED from handbook.config.ts — do not edit by hand.
# Run \`npm run sync:config\` to regenerate.
media:
  - name: book_images
    label: Book images
    input: src/assets/book
    output: src/assets/book
    categories: [image]
    rename: safe
  - name: site_images
    label: Site images
    input: src/assets/site
    output: src/assets/site
    categories: [image]
    rename: safe

settings:
  content:
    merge: true
  commit:
    identity: app
    templates:
      create: "content: create {path}"
      update: "content: update {path}"
      delete: "content: delete {path}"
      rename: "content: rename {oldPath} to {newPath}"

components:
  markdown_body:
    label: Body
    type: rich-text
    options:
      format: markdown
      switcher: true
  book_template:
    label: Template
    type: select
    options:
      values:
        - name: chapter
          label: Chapter
        - name: cover
          label: Cover
        - name: title
          label: Title page
        - name: about
          label: About page
        - name: contents
          label: Contents page
  page_template:
    label: Template
    type: select
    options:
      values:
        - name: home
          label: Home
        - name: page
          label: Content page
        - name: search
          label: Search page
  language:
    label: Language
    type: select
    options:
      values:
${languageOptions()}
content:
  - name: handbook
    label: Handbook
    type: group
    items:
${LANGS.map((lang) => chaptersCollection(lang)).join('\n')}
  - name: site_pages
    label: Site Pages
    type: group
    items:
${LANGS.map((lang) => homePage(lang)).join('\n')}
  - name: metadata
    label: Metadata
    type: group
    items:
      - name: project_metadata
        label: Project Metadata
        type: file
        path: src/data/project.json
        format: json
        operations:
          create: false
          delete: false
        fields:
          - name: name
            label: Project name
            type: string
            required: true
          - name: description
            type: text
          - name: credit
            type: text

      - name: book_metadata
        label: Book Metadata
        type: file
        path: src/data/works.json
        format: json
        operations:
          create: false
          delete: false
        fields:
${LANGS.map((lang) => bookMetadata(lang)).join('\n')}
      - name: navigation
        label: Navigation
        type: file
        path: src/data/nav.json
        format: json
        operations:
          create: false
          delete: false
        fields:
${LANGS.map((lang) => navigation(lang)).join('\n')}
      - name: glossary
        label: Glossary
        type: file
        path: src/data/glossary.json
        format: json
        operations:
          create: false
          delete: false
        fields:
${LANGS.map((lang) => glossary(lang)).join('\n')}`;
}

function robotsTxt() {
  return `Sitemap: ${site}${base}sitemap.xml\n`;
}

function webmanifest() {
  return `{
  "name": "Toolbox for City Changers",
  "short_name": "City Changers",
  "icons": [
    { "src": "${BASE_PATH}/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "${BASE_PATH}/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#fdfcf9",
  "background_color": "#fdfcf9",
  "display": "standalone"
}
`;
}

const targets = [
  { path: '.pages.yml', render: pagesYml },
  { path: 'public/robots.txt', render: robotsTxt },
  { path: 'public/site.webmanifest', render: webmanifest },
];

const checkOnly = process.argv.includes('--check');
let dirty = 0;
for (const { path, render } of targets) {
  const next = render();
  const current = readFileSync(path, 'utf8');
  if (current === next) {
    console.log(`${checkOnly ? 'in sync' : 'unchanged'}: ${path}`);
    continue;
  }
  dirty += 1;
  if (checkOnly) {
    console.error(`OUT OF SYNC: ${path} (run npm run sync:config)`);
  } else {
    writeFileSync(path, next);
    console.log(`wrote ${path}`);
  }
}
if (checkOnly && dirty > 0) process.exit(1);
