// Exclusive collapsibles: opening any details in the content closes the
// other open ones. Always wired, no feature flag. When enabled via
// settings, sections under the configured heading level additionally
// collapse into <details> elements.
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
      while (node && !(node instanceof Element && node.tagName === level)) {
        const next: Node | null = node.nextSibling;
        body.append(node);
        node = next;
      }
      details.append(body);
      heading.replaceWith(details);
    }
  }
  prose.addEventListener('toggle', (event) => {
    const opened = event.target;
    if (!(opened instanceof HTMLDetailsElement) || !opened.open) return;
    for (const details of prose.querySelectorAll<HTMLDetailsElement>('details.accordion')) {
      if (details !== opened) details.open = false;
    }
  }, true);
}
