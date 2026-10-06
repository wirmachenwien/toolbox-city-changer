// Inline SVG injection: images flagged with data-inject-svg are replaced
// by their inline <svg> so page CSS can style them.
export function initSvgInject(): void {
  if (document.body.dataset.svgInject === 'false') return;
  for (const img of document.querySelectorAll<HTMLImageElement>('img[data-inject-svg]')) {
    if (img.dataset.wired) continue;
    img.dataset.wired = 'true';
    void fetch(img.src)
      .then((response) => (response.ok ? response.text() : ''))
      .then((markup) => {
        if (!markup.includes('<svg')) return;
        const template = document.createElement('template');
        template.innerHTML = markup;
        const svg = template.content.querySelector('svg');
        if (!svg) return;
        svg.setAttribute('role', 'img');
        if (img.alt) svg.setAttribute('aria-label', img.alt);
        img.replaceWith(svg);
      })
      .catch(() => undefined);
  }
}
