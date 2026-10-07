// Spoiler toggles ([data-spoiler]): flip aria-expanded, the tooltip and
// the screen-reader hint so mouse, touch and keyboard users all get the
// current state. Masking itself is pure CSS on [aria-expanded].
export function initSpoiler(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-spoiler]')) {
    if (button.dataset.wired) continue;
    button.dataset.wired = 'true';
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      const show = button.dataset.showLabel ?? 'Show hidden content';
      const hide = button.dataset.hideLabel ?? 'Hide content again';
      button.setAttribute('aria-expanded', String(!expanded));
      button.title = expanded ? show : hide;
      const hint = button.querySelector('[data-spoiler-hint]');
      if (hint) hint.textContent = expanded ? show : hide;
    });
  }
}
