// Site feature toggles. Every toggle is typed and validated with Zod;
// client islands read them from data attributes rendered by the layouts.
// Full list of supported toggles:
// - web.pagination / web.paginationType
// - web.accordion / web.accordionLevel
// - web.svgInject
// - web.bookmarks.enabled
// - web.nav.expandBooks / web.nav.projectNavPosition ("before" | "after")
// - web.titleDivider
// - web.indexing.live ("index" | "noindex")
// - pdf.notes ("footnotes" | "chapter-footnotes" | "book-footnotes")
// - pdf.page.size / pdf.page.margin
import { z } from 'zod';
import raw from './settings.json';

const toggleSchema = z.object({
  web: z
    .object({
      pagination: z.boolean().default(true),
      paginationType: z
        .enum(['direction', 'titles', 'title-arrows', 'arrows'])
        .default('title-arrows'),
      accordion: z.boolean().default(false),
      accordionLevel: z.enum(['h2', 'h3']).default('h3'),
      svgInject: z.boolean().default(true),
      bookmarks: z
        .object({
          enabled: z.boolean().default(true),
        })
        .default({ enabled: true }),
      nav: z
        .object({
          expandBooks: z.boolean().default(true),
          projectNavPosition: z.enum(['before', 'after']).default('before'),
        })
        .default({ expandBooks: true, projectNavPosition: 'before' }),
      search: z
        .object({
          param: z.string().default('query'),
        })
        .default({ param: 'query' }),
      titleDivider: z.string().default(' – '),
      indexing: z
        .object({
          live: z.enum(['index', 'noindex']).default('index'),
        })
        .default({ live: 'index' }),
    })
    .default({
      pagination: true,
      paginationType: 'title-arrows',
      accordion: false,
      accordionLevel: 'h3',
      svgInject: true,
      bookmarks: { enabled: true },
      nav: { expandBooks: true, projectNavPosition: 'before' },
      search: { param: 'query' },
      titleDivider: ' – ',
      indexing: { live: 'index' },
    }),
  pdf: z
    .object({
      notes: z.enum(['footnotes', 'chapter-footnotes', 'book-footnotes']).default('footnotes'),
      page: z
        .object({
          size: z.string().default('A4'),
          margin: z.string().default('20mm 16mm 22mm 16mm'),
        })
        .default({ size: 'A4', margin: '20mm 16mm 22mm 16mm' }),
    })
    .default({
      notes: 'footnotes',
      page: { size: 'A4', margin: '20mm 16mm 22mm 16mm' },
    }),
});

export type Settings = z.infer<typeof toggleSchema>;

export const settings: Settings = toggleSchema.parse(raw);
