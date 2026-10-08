// Click-to-load video facades.
import { languages, type Language } from '../data/locales';
import { t } from '../lib/i18n';

function currentLanguage(): Language {
  const lang = document.documentElement.lang as Language;
  return languages.includes(lang) ? lang : 'en';
}

export function initVideos(): void {
  const lang = currentLanguage();
  for (const figure of document.querySelectorAll<HTMLElement>('[data-video]')) {
    const button = figure.querySelector('[data-play]');
    const embed = figure.getAttribute('data-embed');
    if (!button || !embed || figure.dataset.loaded) continue;
    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = embed;
      frame.title = button.getAttribute('aria-label') ?? t(lang, 'video.video-title', 'Video');
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      frame.allowFullscreen = true;
      button.replaceWith(frame);
      figure.dataset.loaded = 'true';
    }, { once: true });
  }
}
