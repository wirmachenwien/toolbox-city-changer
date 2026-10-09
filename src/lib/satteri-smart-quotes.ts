// Sätteri hast plugin: locale-aware straight-to-typographic quotes.
//
// Source MDX keeps `"` / `'`; the rendered web HTML gets „ “ (de/sl) or
// “ ” (en). Only hast `text` nodes are rewritten, so component props,
// `{...}` expressions, code and math are never touched. Language comes
// from the document frontmatter (`ctx.data.astro.frontmatter.lang`;
// content collections always set it — see src/content.config.ts).
//
// `smartQuotesHastPlugin` is the original Sätteri plugin. The unified export
// below keeps the same behaviour for the Markdown/MDX processor used now.
import type { HastPluginEntry } from 'satteri';
import {
  createQuoteState,
  normalizeLang,
  smartQuotesChunk,
  type QuoteLang,
  type QuoteState,
} from './smart-quotes.ts';

// Elements whose text must never be re-quoted.
const SKIP_TAGS = new Set([
  'pre',
  'code',
  'kbd',
  'samp',
  'var',
  'tt',
  'math',
  'script',
  'style',
  'textarea',
  'noscript',
  'annotation',
  'annotation-xml',
]);

function readFrontmatterLang(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const astro = (data as Record<string, unknown>)['astro'];
  if (!astro || typeof astro !== 'object') return undefined;
  const frontmatter = (astro as Record<string, unknown>)['frontmatter'];
  if (!frontmatter || typeof frontmatter !== 'object') return undefined;
  const lang = (frontmatter as Record<string, unknown>)['lang'];
  return typeof lang === 'string' ? lang : undefined;
}

/**
 * Hast plugin entry factory. Called once per compiled document, so the
 * open/close toggle state starts fresh for every page.
 */
export function smartQuotesHastPlugin(defaultLang: QuoteLang = 'en'): HastPluginEntry {
  return () => {
    let lang: QuoteLang = defaultLang;
    let state: QuoteState = createQuoteState();

    return {
      name: 'smart-quotes',
      before(_root, ctx) {
        lang = normalizeLang(readFrontmatterLang(ctx.data), defaultLang);
        state = createQuoteState();
      },
      text(node, ctx) {
        if (!node.value.includes('"') && !node.value.includes("'")) return;
        // Skip text inside code-like elements by walking up the ancestors.
        let ancestor: ReturnType<typeof ctx.parent> = ctx.parent(node);
        while (ancestor !== undefined) {
          if (ancestor.type === 'element' && SKIP_TAGS.has(ancestor.tagName.toLowerCase())) return;
          ancestor = ctx.parent(ancestor);
        }
        const next = smartQuotesChunk(node.value, lang, state);
        if (next !== node.value) ctx.replaceNode(node, { ...node, value: next });
      },
    };
  };
}

export function smartQuotesRehypePlugin(defaultLang: QuoteLang = 'en') {
  return () => {
    return (tree: unknown, file: unknown) => {
      let lang = normalizeLang(readFrontmatterLang((file as { data?: unknown }).data), defaultLang);
      let state = createQuoteState();

      function walk(node: any, skip = false): void {
        const nextSkip = skip || (node?.type === 'element' && SKIP_TAGS.has(String(node.tagName).toLowerCase()));
        if (node?.type === 'text' && !nextSkip && (node.value.includes('"') || node.value.includes("'"))) {
          node.value = smartQuotesChunk(node.value, lang, state);
        }
        if (Array.isArray(node?.children)) {
          for (const child of node.children) walk(child, nextSkip);
        }
      }

      walk(tree);
    };
  };
}
