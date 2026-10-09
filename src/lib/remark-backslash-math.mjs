import { visit } from 'unist-util-visit';

function inlineMathChildren(children) {
  const next = [];
  let changed = false;

  for (const child of children) {
    if (child.type !== 'text') {
      next.push(child);
      continue;
    }

    const pattern = /\\\(((?:.|\n)*?)\\\)/g;
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(child.value)) !== null) {
      changed = true;
      if (match.index > lastIndex) {
        next.push({ type: 'text', value: child.value.slice(lastIndex, match.index) });
      }
      next.push({ type: 'inlineMath', value: match[1].trim() });
      lastIndex = pattern.lastIndex;
    }

    if (lastIndex === 0) {
      next.push(child);
    } else if (lastIndex < child.value.length) {
      next.push({ type: 'text', value: child.value.slice(lastIndex) });
    }
  }

  return changed ? next : children;
}

export function remarkBackslashMath() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      const text = node.children.length === 1 && node.children[0].type === 'text'
        ? node.children[0].value.trim()
        : '';
      const display = text.match(/^\\\[((?:.|\n)*)\\\]$/);
      if (display && parent && typeof index === 'number') {
        parent.children[index] = { type: 'math', value: display[1].trim() };
        return;
      }
      node.children = inlineMathChildren(node.children);
    });
  };
}
