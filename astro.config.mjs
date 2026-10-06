// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://wirmachenwien.github.io',
  base: '/toolbox-city-changer/',
  output: 'static',
  build: {
    // Keep the historic URL scheme: about.astro -> about.html,
    // book/01 -> book/01.html (no trailing-slash directories).
    format: 'file',
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) =>
        !page.includes('/preview/') && !page.includes('404'),
    }),
  ],
});
