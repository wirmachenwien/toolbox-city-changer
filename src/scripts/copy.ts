// Copy-to-clipboard buttons ([data-copy], incl. share-link buttons).
import { languages, type Language } from '../data/locales';
import { t } from '../lib/i18n';

function currentLanguage(): Language {
  const lang = document.documentElement.lang as Language;
  return languages.includes(lang) ? lang : 'en';
}

export function initCopy(): void {
  const lang = currentLanguage();
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    if (button.dataset.wired) continue;
    button.dataset.wired = 'true';
    button.addEventListener('click', async () => {
      const value = button.dataset.copy ?? '';
      try {
        await navigator.clipboard.writeText(value);
        flash(button, button.dataset.copiedLabel ?? t(lang, 'copy.copied', 'Copied'), true);
      } catch {
        flash(button, button.dataset.failedLabel ?? t(lang, 'copy.copy-failed', 'Sorry, try again'), false);
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
