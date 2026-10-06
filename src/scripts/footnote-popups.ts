// Footnote popups: tapping a reference shows the note inline.
export function initFootnotePopups(closeLabel = 'Close'): void {
  for (const ref of document.querySelectorAll<HTMLAnchorElement>('[data-footnote-ref]')) {
    if (ref.dataset.wired) continue;
    ref.dataset.wired = 'true';
    ref.addEventListener('click', (event) => {
      const target = document.querySelector(ref.getAttribute('href') ?? '');
      if (!target) return;
      event.preventDefault();
      const existing = ref.parentElement?.querySelector('.footnote-popup[data-for-note]');
      existing?.remove();
      if (existing) return;
      const popup = document.createElement('div');
      popup.className = 'footnote-popup';
      popup.setAttribute('data-for-note', '');
      const closer = document.createElement('button');
      closer.type = 'button';
      closer.textContent = closeLabel;
      closer.addEventListener('click', () => popup.remove());
      popup.append(closer);
      popup.append(target.cloneNode(true));
      ref.after(popup);
    });
  }
}
