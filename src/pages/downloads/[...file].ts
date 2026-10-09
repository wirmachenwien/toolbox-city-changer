import type { APIRoute } from 'astro';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { settings } from '../../data/settings';

export const prerender = true;

// Delivery for the generated PDF/EPUB handbook files. The builders
// (scripts/bin/build-pdf.py, scripts/bin/build-epub.py) write into dist/downloads/,
// which the static host serves directly in production. The dev server does
// not serve dist/, so this endpoint reads those files in dev; during
// `astro build` it prerenders them into the same location. Either way,
// dev, preview and production resolve the download links.
const DIST_DOWNLOADS = path.join(process.cwd(), 'dist', 'downloads');

const MEDIA_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.epub': 'application/epub+zip',
};

function enabled(file: string): boolean {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.pdf') return settings.downloads.pdf;
  if (ext === '.epub') return settings.downloads.epub;
  return false;
}

async function listDownloads(): Promise<string[]> {
  try {
    const entries = await fs.readdir(DIST_DOWNLOADS);
    return entries
      .filter((name) => path.extname(name).toLowerCase() in MEDIA_TYPES && enabled(name))
      .sort();
  } catch {
    console.warn('downloads: dist/downloads/ is missing, run npm run build:downloads first');
    return [];
  }
}

export async function getStaticPaths() {
  return (await listDownloads()).map((file) => ({ params: { file } }));
}

export const GET: APIRoute = async ({ params }) => {
  const file = typeof params.file === 'string' ? path.basename(params.file) : '';
  const type = MEDIA_TYPES[path.extname(file).toLowerCase()];
  if (!type || !enabled(file)) return new Response('Not found', { status: 404 });
  try {
    const body = await fs.readFile(path.join(DIST_DOWNLOADS, file));
    return new Response(new Uint8Array(body), {
      headers: { 'Content-Type': type, 'Content-Length': String(body.length) },
    });
  } catch {
    return new Response('Download not built yet (run npm run build:downloads)', {
      status: 404,
    });
  }
};
