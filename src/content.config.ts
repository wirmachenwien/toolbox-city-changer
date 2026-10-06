import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const lang = z.enum(['de', 'en', 'sl']);

const book = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/book' }),
  schema: z.object({
    title: z.string(),
    lang,
    // Render variant for the book page. Front/back matter get dedicated
    // layouts; regular chapters use "chapter".
    // (Named "template": Astro reserves frontmatter `layout` for MDX layouts.)
    template: z
      .enum(['chapter', 'cover', 'title', 'copyright', 'contents'])
      .default('chapter'),
    description: z.string().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    lang,
    template: z.enum(['home', 'page', 'search']).default('page'),
    description: z.string().optional(),
    openerImage: z.string().optional(),
    openerImageAlt: z.string().optional(),
  }),
});

export const collections = { book, pages };
