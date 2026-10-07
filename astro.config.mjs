// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { downloads } from './src/integrations/downloads';

export default defineConfig({
  site: 'https://wirmachenwien.github.io',
  base: '/toolbox-city-changer/',
  output: 'static',
  build: {
    // Keep the historic URL scheme: about.astro -> about.html,
    // book/01 -> book/01.html (no trailing-slash directories).
    format: 'file',
  },
  // The sitemap is generated from content by src/pages/sitemap.xml.ts,
  // not by an integration. The downloads integration only runs the dev
  // server hook (it never touches `astro build`).
  integrations: [mdx(), downloads()],
});
