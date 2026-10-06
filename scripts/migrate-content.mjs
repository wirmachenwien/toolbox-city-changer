// One-off migration: legacy Markdown -> new MDX content collections.
// Run with: node scripts/migrate-content.mjs
// Converts legacy template tags into MDX components and normalises frontmatter.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

const legacyLocales = parse(readFileSync('legacy/_data/locales.yml', 'utf8'));
const locales = {
  de: legacyLocales.de,
  en: legacyLocales.en,
  sl: legacyLocales.sl,
};

const BOOK_FILES = ['0-0-cover', '0-1-titlepage', '0-2-about', '0-3-contents', '01', '02', '03', '04', '05', '06'];
const PAGE_FILES = ['index', 'about', 'contact', 'search'];

const TEMPLATE_MAP = {
  'cover-page': 'cover',
  'title-page': 'title',
  'copyright-page': 'copyright',
  'contents-page': 'contents',
  home: 'home',
};

const SEARCH_TITLES = {
  de: locales.de.search['search-title'],
  en: locales.en.search['search-title'],
  sl: locales.sl.search['search-title'],
};

const PROJECT_DESCRIPTIONS = {
  de: 'Ein Handbuch von Wir machen Wien, Changing Cities und Prostorož aus dem Erasmus+-Projekt Toolbox für City Changer.',
  en: locales.en.project.description,
  sl: locales.sl.project.description,
};

function splitFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return [{}, text];
  return [parse(match[1]) ?? {}, match[2]];
}

function transformBody(body, lang) {
  let out = body;
  // Videos -> component
  out = out.replace(
    /\{% include video id="([^"]+)" description="([^"]*)" %\}/g,
    (_, id, caption) => `<Video id="${id}" caption="${caption}" />`,
  );
  // Table of contents and other layout-owned includes are rendered by the
  // page layouts, never by the body copy.
  out = out.replace(/\{% include toc %\}\n?/g, '');
  // Layout-owned includes: cover / title / copyright / metadata / search
  out = out.replace(/\{% include (cover|title-page|copyright-page|metadata|search) %\}\n?/g, '');
  // Template variables
  out = out.replace(/\{\{ site\.data\.project\.description \}\}/g, PROJECT_DESCRIPTIONS[lang]);
  out = out.replace(/\{\{ project-description \}\}/g, PROJECT_DESCRIPTIONS[lang]);
  out = out.replace(/\{\{ site\.data\.project\.email \}\}/g, 'info@wirmachen.wien');
  out = out.replace(/\{\{ locale\.search\.search-title \}\}/g, SEARCH_TITLES[lang]);
  // Buttons
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)\{\:\.button\}/g, (_, text, href) => `<ButtonLink href="${href}">${text}</ButtonLink>`);
  // Copy-to-clipboard email links
  out = out.replace(
    /\[([^\]]+)\]\((mailto:[^)]+)\)\{\:\.copy-to-clipboard\}/g,
    (_, text, href) => `${text} <CopyText value="${href.replace(/^mailto:/, '')}" lang="${lang}" />`,
  );
  // Captioned figures: image paragraph followed by an italic caption paragraph
  out = out.replace(
    /!\[([^\]]*)\]\((\.\.\/)?((?:images|assets\/images)\/web\/([^)\s]+))\)\n\n\*([\s\S]*?)\*\n/g,
    (_, alt, _dotdot, _path, file, caption) =>
      `<Figure src="${file}" alt="${alt}">\n${caption.trim()}\n</Figure>\n`,
  );
  // Standalone images
  out = out.replace(
    /!\[([^\]]*)\]\((\.\.\/)?((?:images|assets\/images)\/web\/([^)\s]+))\)/g,
    (_, alt, _dotdot, _path, file) => `<Figure src="${file}" alt="${alt}" />`,
  );
  return out.trim() + '\n';
}

function bookFrontmatter(fm, lang, slug) {
  const template = TEMPLATE_MAP[fm.style] ?? 'chapter';
  return { title: String(fm.title ?? slug), lang, template };
}

function pageFrontmatter(fm, lang, name, legacyPath) {
  const data = { title: String(fm.title ?? name), lang };
  if (name === 'index') {
    data.template = 'home';
    if (fm['opener-image']) data.openerImage = fm['opener-image'];
    if (fm['opener-image-alt-text']) data.openerImageAlt = fm['opener-image-alt-text'];
  } else if (name === 'search') {
    data.template = 'search';
  } else {
    data.template = 'page';
  }
  return data;
}

function writeMdx(path, frontmatter, body) {
  mkdirSync(path.split('/').slice(0, -1).join('/'), { recursive: true });
  const dump = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n');
  writeFileSync(path, `---\n${dump}\n---\n\n${body}`);
  console.log('wrote', path);
}

// Book chapters (de at root, en/sl in subfolders)
for (const lang of ['de', 'en', 'sl']) {
  const dir = lang === 'de' ? 'legacy/book' : `legacy/book/${lang}`;
  for (const slug of BOOK_FILES) {
    const [fm, body] = splitFrontmatter(readFileSync(`${dir}/${slug}.md`, 'utf8'));
    let transformed = transformBody(body, lang);
    if (slug === '0-3-contents') {
      // The contents layout renders the title and TOC itself.
      transformed = transformed.replace(/^# .*\n+/, '');
    }
    writeMdx(
      `src/content/book/${lang}/${slug}.mdx`,
      bookFrontmatter(fm, lang, slug),
      transformed,
    );
  }
  // Cover entry (legacy book/index.md)
  const [, coverBody] = splitFrontmatter(readFileSync(`${dir}/index.md`, 'utf8'));
  const titles = { de: 'Toolbox für City Changer', en: 'Toolbox for City Changers', sl: 'Zbirka orodij za spreminjanje mest' };
  writeMdx(
    `src/content/book/${lang}/index.mdx`,
    { title: titles[lang], lang, template: 'cover' },
    transformBody(coverBody, lang),
  );
}

// Project pages
for (const lang of ['de', 'en', 'sl']) {
  const dir = lang === 'de' ? 'legacy' : `legacy/${lang}`;
  for (const name of PAGE_FILES) {
    const [fm, body] = splitFrontmatter(readFileSync(`${dir}/${name}.md`, 'utf8'));
    writeMdx(
      `src/content/pages/${lang}/${name}.mdx`,
      pageFrontmatter(fm, lang, name),
      transformBody(body, lang),
    );
  }
}
console.log('migration complete');
