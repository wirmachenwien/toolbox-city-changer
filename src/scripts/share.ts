// Share sheet: adds a native system-share button when the Web Share API
// is available; otherwise the rendered network links stand on their own.
export function initShare(): void {
  if (!('share' in navigator)) return;
  for (const root of document.querySelectorAll<HTMLElement>('[data-share]')) {
    if (root.dataset.wired) continue;
    root.dataset.wired = 'true';
    const list = root.querySelector('ul');
    if (!list) continue;
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'share-btn';
    button.textContent = '···';
    button.setAttribute('aria-label', 'Share');
    button.addEventListener('click', () => {
      void navigator.share({ title: document.title, url: location.href });
    });
    item.append(button);
    list.prepend(item);
  }
}
