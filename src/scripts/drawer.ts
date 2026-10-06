// Navigation drawer (native <dialog>).
export function initDrawer(): void {
  const drawer = document.querySelector<HTMLDialogElement>('[data-drawer]');
  const openers = document.querySelectorAll('[data-open-drawer]');
  if (!drawer || openers.length === 0) return;
  const closer = drawer.querySelector('[data-close-drawer]');
  for (const opener of openers) {
    opener.addEventListener('click', () => drawer.showModal());
  }
  closer?.addEventListener('click', () => drawer.close());
  drawer.addEventListener('click', (event) => {
    if (event.target === drawer) drawer.close();
  });
}
