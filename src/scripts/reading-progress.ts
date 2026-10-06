// Thin scroll progress bar.
export function initReadingProgress(): void {
  const bar = document.querySelector<HTMLElement>('[data-reading-progress]');
  if (!bar) return;
  bar.hidden = false;
  const paint = (): void => {
    const total = document.documentElement.scrollHeight - innerHeight;
    const ratio = total > 0 ? Math.min(1, Math.max(0, scrollY / total)) : 0;
    bar.style.transform = `scaleX(${ratio})`;
  };
  addEventListener('scroll', paint, { passive: true });
  paint();
}
