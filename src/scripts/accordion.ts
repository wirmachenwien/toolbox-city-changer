// Exclusive collapsibles: opening one closes its siblings in the same
// group (same parent); accordions elsewhere on the page stay untouched.
// Always wired, no feature flag. When enabled via settings, sections under
// the configured heading level additionally collapse into <details> elements.
export function initAccordion(): void {
  const prose = document.querySelector('[data-prose]');
  if (!prose) return;
  if (document.body.dataset.accordion === 'true') {
    const level = document.body.dataset.accordionLevel === 'h2' ? 'H2' : 'H3';
    const headings = [...prose.querySelectorAll(level)].filter(
      (heading) => !heading.closest('details'),
    );
    for (const heading of headings) {
      const details = document.createElement('details');
      details.className = 'accordion';
      const summary = document.createElement('summary');
      summary.textContent = heading.textContent;
      details.append(summary);
      let node: Node | null = heading.nextSibling;
      const body = document.createElement('div');
      body.className = 'accordion-body';
      const content = document.createElement('div');
      content.className = 'accordion-content';
      while (node && !(node instanceof Element && node.tagName === level)) {
        const next: Node | null = node.nextSibling;
        content.append(node);
        node = next;
      }
      body.append(content);
      details.append(body);
      heading.replaceWith(details);
    }
  }
  prose.addEventListener('toggle', (event) => {
    const opened = event.target;
    if (!(opened instanceof HTMLDetailsElement) || !opened.open) return;
    const siblings = [...(opened.parentElement?.children ?? [])].filter(
      (el): el is HTMLDetailsElement =>
        el instanceof HTMLDetailsElement && el.classList.contains('accordion'),
    );
    for (const details of siblings) {
      if (details !== opened) details.open = false;
    }
  }, true);
}
