// Definition popups for <dfn data-definition>.
export function initDefinitions(): void {
  for (const term of document.querySelectorAll<HTMLElement>('[data-definition]')) {
    if (term.dataset.wired) continue;
    term.dataset.wired = 'true';
    term.addEventListener('click', () => {
      const open = term.parentElement?.querySelector('.footnote-popup[data-for-definition]');
      open?.remove();
      if (open) return;
      const popup = document.createElement('div');
      popup.className = 'footnote-popup';
      popup.setAttribute('data-for-definition', '');
      popup.textContent = term.dataset.definition ?? '';
      term.after(popup);
    });
  }
}
