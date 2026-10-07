// Keeps anchored scrolling (footnotes, endnote backlinks, heading
// permalinks, bookmark targets) clear of the sticky masthead. The header
// wraps to multiple rows on narrow screens, so its height is measured at
// runtime and exposed as --scroll-offset, which the global
// scroll-padding-block-start consumes.
export function initScrollOffset(): void {
  const header = document.querySelector<HTMLElement>('.site-head');
  if (!header) return;
  // Non-nullable alias: narrowing of the query result above is not
  // preserved inside the nested closures below.
  const headerEl: HTMLElement = header;
  const root = document.documentElement;
  const EXTRA = 16;

  function update(): void {
    const height = Math.ceil(headerEl.getBoundingClientRect().height);
    root.style.setProperty('--scroll-offset', `${height + EXTRA}px`);
    // Exact height for the modeless nav drawer, whose full-height sheet
    // covers the sticky masthead (only the toggle floats above it).
    root.style.setProperty('--site-head-height', `${height}px`);
  }

  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  window.addEventListener('load', update);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(update).observe(headerEl);
  }
  if (document.fonts?.ready) {
    void document.fonts.ready.then(update);
  }
}
