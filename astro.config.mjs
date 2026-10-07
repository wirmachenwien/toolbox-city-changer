// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { satteri } from '@astrojs/markdown-satteri';

export default defineConfig({
  site: 'https://wirmachenwien.github.io',
  base: '/toolbox-city-changer/',
  output: 'static',
  build: {
    // Keep the historic URL scheme: about.astro -> about.html,
    // book/01 -> book/01.html (no trailing-slash directories).
    format: 'file',
  },
  integrations: [mdx()],
});
