// Spoiler toggles ([data-spoiler]): flip aria-expanded, the tooltip and
// the screen-reader hint so mouse, touch and keyboard users all get the
// current state. Masking itself is pure CSS on [aria-expanded].
import { languages, type Language } from '../data/locales';
import { t } from '../lib/i18n';

function currentLanguage(): Language {
  const lang = document.documentElement.lang as Language;
  return languages.includes(lang) ? lang : 'en';
}

export function initSpoiler(): void {
  const lang = currentLanguage();
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-spoiler]')) {
    if (button.dataset.wired) continue;
    button.dataset.wired = 'true';
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      const show = button.dataset.showLabel ?? t(lang, 'spoiler.show', 'Show hidden content');
      const hide = button.dataset.hideLabel ?? t(lang, 'spoiler.hide', 'Hide content again');
      button.setAttribute('aria-expanded', String(!expanded));
      button.title = expanded ? show : hide;
      const hint = button.querySelector('[data-spoiler-hint]');
      if (hint) hint.textContent = expanded ? show : hide;
    });
  }
}
