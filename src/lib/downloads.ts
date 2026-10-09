import { settings } from '../data/settings';

type DownloadFormat = 'pdf' | 'epub';

export function downloadFormat(href: string): DownloadFormat | null {
  const path = href.split(/[?#]/)[0]?.toLowerCase() ?? '';
  if (path.endsWith('.pdf')) return 'pdf';
  if (path.endsWith('.epub')) return 'epub';
  return null;
}

export function downloadEnabled(href: string): boolean {
  const format = downloadFormat(href);
  return format ? settings.downloads[format] : true;
}
