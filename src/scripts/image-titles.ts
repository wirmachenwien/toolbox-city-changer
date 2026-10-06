// Mirror meaningful image alt text into title attributes so browsers show
// the same text as a native tooltip. Decorative images (alt="") are skipped.
export function initImageTitles(): void {
  for (const image of document.querySelectorAll<HTMLImageElement>('img[alt]:not([title])')) {
    const alt = image.alt.trim();
    if (alt) image.title = alt;
  }
}
