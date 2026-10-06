// Heading anchors: every h2/h3 with an id gets an always-visible "#"
// permalink. Only the "#" itself is linked (no leading space inside the
// anchor); styling is handled in CSS via [data-heading-anchor].
export function initHeadings(): void {
  const prose = document.querySelector('[data-prose]');
  if (!prose) return;
  for (const heading of prose.querySelectorAll('h2[id], h3[id]')) {
    if (heading.querySelector('[data-heading-anchor]')) continue;
    const anchor = document.createElement('a');
    anchor.href = `#${heading.id}`;
    anchor.setAttribute('data-heading-anchor', '');
    anchor.setAttribute('aria-label', 'Link to this section');
    anchor.textContent = '#';
    heading.append(anchor);
  }
}
