// Copy-to-clipboard buttons ([data-copy], incl. share-link buttons).
export function initCopy(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    if (button.dataset.wired) continue;
    button.dataset.wired = 'true';
    button.addEventListener('click', async () => {
      const value = button.dataset.copy ?? '';
      try {
        await navigator.clipboard.writeText(value);
        flash(button, button.dataset.copiedLabel ?? 'Copied');
      } catch {
        flash(button, button.dataset.failedLabel ?? 'Sorry, try again');
      }
    });
  }
}

function flash(button: HTMLButtonElement, message: string): void {
  const original = button.textContent;
  button.textContent = message;
  window.setTimeout(() => {
    button.textContent = original;
  }, 1600);
}
