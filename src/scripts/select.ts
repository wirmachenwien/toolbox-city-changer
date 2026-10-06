// Select lists navigate to the chosen option.
export function initSelect(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-select-list]')) {
    const select = root.querySelector<HTMLSelectElement>('[data-select]');
    if (!select || root.dataset.wired) continue;
    root.dataset.wired = 'true';
    select.addEventListener('change', () => {
      if (select.value) location.href = select.value;
    });
  }
}
