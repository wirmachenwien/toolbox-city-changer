// Copy-to-clipboard buttons ([data-copy], incl. share-link buttons).
export function initCopy(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    if (button.dataset.wired) continue;
    button.dataset.wired = 'true';
    button.addEventListener('click', async () => {
      const value = button.dataset.copy ?? '';
      try {
        await navigator.clipboard.writeText(value);
        flash(button, button.dataset.copiedLabel ?? 'Copied', true);
      } catch {
        flash(button, button.dataset.failedLabel ?? 'Sorry, try again', false);
      }
    });
  }
}

const timers = new Map<HTMLButtonElement, number>();

function flash(button: HTMLButtonElement, message: string, done: boolean): void {
  // Swap the label span when present so leading icons survive the flash;
  // buttons without one (plain text) swap their whole content as before.
  const label = button.querySelector('[data-copy-text]');
  if (label) label.textContent = message;
  else button.textContent = message;
  const copyIcon = button.querySelector('[data-copy-icon]');
  const doneIcon = button.querySelector('[data-copied-icon]');
  if (copyIcon && doneIcon) {
    copyIcon.toggleAttribute('hidden', done);
    doneIcon.toggleAttribute('hidden', !done);
  }
  window.clearTimeout(timers.get(button));
  timers.set(
    button,
    window.setTimeout(() => {
      timers.delete(button);
      const original = button.dataset.copyLabel ?? '';
      if (label) label.textContent = original;
      else button.textContent = original;
      if (copyIcon && doneIcon) {
        copyIcon.removeAttribute('hidden');
        doneIcon.setAttribute('hidden', '');
      }
    }, 1600),
  );
}
