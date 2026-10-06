// Slideshow prev/next controls. Slides are <figure> children of .slide-stage.
export function initSlides(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-slides]')) {
    if (root.dataset.wired) continue;
    root.dataset.wired = 'true';
    const slides = [...root.querySelectorAll<HTMLElement>('.slide-stage > *')];
    if (slides.length === 0) continue;
    const counter = root.querySelector('[data-slide-count]');
    let index = 0;
    const show = (next: number): void => {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, position) => {
        slide.classList.toggle('slide', true);
        slide.setAttribute('data-active', String(position === index));
      });
      if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
    };
    root.querySelector('[data-slide-prev]')?.addEventListener('click', () => show(index - 1));
    root.querySelector('[data-slide-next]')?.addEventListener('click', () => show(index + 1));
    show(0);
  }
}
