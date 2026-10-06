// Click-to-load video facades.
export function initVideos(): void {
  for (const figure of document.querySelectorAll<HTMLElement>('[data-video]')) {
    const button = figure.querySelector('[data-play]');
    const embed = figure.getAttribute('data-embed');
    if (!button || !embed || figure.dataset.loaded) continue;
    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = embed;
      frame.title = button.getAttribute('aria-label') ?? 'Video';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      frame.allowFullscreen = true;
      button.replaceWith(frame);
      figure.dataset.loaded = 'true';
    }, { once: true });
  }
}
