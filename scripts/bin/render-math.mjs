#!/usr/bin/env node
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import katex from 'katex';

const input = await new Promise((resolve, reject) => {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    data += chunk;
  });
  process.stdin.on('end', () => resolve(data));
  process.stdin.on('error', reject);
});

const SKIP_TAGS = new Set(['code', 'pre', 'script', 'style', 'textarea']);

function renderMath(source, displayMode) {
  return katex.renderToString(source, {
    displayMode,
    output: 'html',
    throwOnError: false,
    strict: 'warn',
  });
}

function replaceMathText(value) {
  const parts = [];
  const pattern = /(\\\[((?:.|\n)*?)\\\]|\\\(((?:.|\n)*?)\\\)|\$\$((?:.|\n)*?)\$\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: value.slice(lastIndex, match.index) });
    }
    const isDisplay = match[2] !== undefined || match[4] !== undefined;
    const source = (match[2] ?? match[3] ?? match[4] ?? '').trim();
    parts.push({ type: 'raw', value: renderMath(source, isDisplay) });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex === 0) return null;
  if (lastIndex < value.length) {
    parts.push({ type: 'text', value: value.slice(lastIndex) });
  }
  return parts;
}

function mathTextPlugin() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof index !== 'number' || SKIP_TAGS.has(parent.tagName)) return;
      const replacement = replaceMathText(node.value);
      if (replacement) parent.children.splice(index, 1, ...replacement);
    });
  };
}

const output = await unified()
  .use(rehypeParse, { fragment: true })
  .use(mathTextPlugin)
  .use(rehypeStringify, { allowDangerousHtml: true })
  .process(input);

process.stdout.write(String(output));
