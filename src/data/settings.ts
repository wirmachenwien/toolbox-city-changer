// Site feature toggles. Every toggle is typed and validated with Zod;
// client islands read them from data attributes rendered by the layouts.
// Full list of supported toggles:
// - math.enabled / math.source ("cdn" | "local")
// - web.pagination / web.paginationType

// - web.accordion / web.accordionLevel
// - web.svgInject, web.lazyload
// - web.bookmarks.enabled / web.bookmarks.noteMaxLength
// - web.nav.expandBooks / web.nav.projectNavPosition ("before" | "after")
// - web.search.jumpBoxLocation
// - web.titleDivider
// - web.indexing.development / web.indexing.live ("index" | "noindex")
// - pdf.notes ("endnotes" | "footnotes")
// - pdf.page.size / pdf.page.margin
import { z } from 'zod';

const toggleSchema = z.object({
  math: z
    .object({
      enabled: z.boolean().default(true),
      source: z.enum(['cdn', 'local']).default('cdn'),
    })
    .default({ enabled: true, source: 'cdn' }),
  web: z
    .object({
      pagination: z.boolean().default(true),
      paginationType: z
        .enum(['direction', 'titles', 'title-arrows', 'arrows'])
        .default('title-arrows'),
      accordion: z.boolean().default(false),
      accordionLevel: z.enum(['h2', 'h3']).default('h3'),
      svgInject: z.boolean().default(true),
      lazyload: z.boolean().default(true),
      bookmarks: z
        .object({
          enabled: z.boolean().default(true),
          noteMaxLength: z.number().default(5000),
        })
        .default({ enabled: true, noteMaxLength: 5000 }),
      nav: z
        .object({
          expandBooks: z.boolean().default(true),
          projectNavPosition: z.enum(['before', 'after']).default('before'),
        })
        .default({ expandBooks: true, projectNavPosition: 'before' }),
      search: z
        .object({
          jumpBoxLocation: z.string().default('mainHeading'),
          param: z.string().default('query'),
        })
        .default({ jumpBoxLocation: 'mainHeading', param: 'query' }),
      titleDivider: z.string().default(' – '),
      indexing: z
        .object({
          development: z.enum(['index', 'noindex']).default('index'),
          live: z.enum(['index', 'noindex']).default('index'),
        })
        .default({ development: 'index', live: 'index' }),
    })
    .default({
      pagination: true,
      paginationType: 'title-arrows',
      accordion: false,
      accordionLevel: 'h3',
      svgInject: true,
      lazyload: true,
      bookmarks: { enabled: true, noteMaxLength: 5000 },
      nav: { expandBooks: true, projectNavPosition: 'before' },
      search: { jumpBoxLocation: 'mainHeading', param: 'query' },
      titleDivider: ' – ',
      indexing: { development: 'index', live: 'index' },
    }),
  pdf: z
    .object({
      notes: z.enum(['endnotes', 'footnotes']).default('endnotes'),
      page: z
        .object({
          size: z.string().default('A4'),
          margin: z.string().default('20mm 16mm 22mm 16mm'),
        })
        .default({ size: 'A4', margin: '20mm 16mm 22mm 16mm' }),
    })
    .default({
      notes: 'endnotes',
      page: { size: 'A4', margin: '20mm 16mm 22mm 16mm' },
    }),
});

export type Settings = z.infer<typeof toggleSchema>;

export const settings: Settings = toggleSchema.parse({
  math: { enabled: true, source: 'cdn' },
    web: {
      pagination: true,
      paginationType: 'title-arrows',
      accordion: false,
    accordionLevel: 'h3',
    svgInject: true,
    lazyload: true,
    bookmarks: { enabled: true, noteMaxLength: 5000 },
    nav: { expandBooks: true, projectNavPosition: 'before' },
    search: { jumpBoxLocation: 'mainHeading', param: 'query' },
    titleDivider: ' – ',
    indexing: { development: 'index', live: 'index' },
  },
  pdf: {
    notes: 'endnotes',
    page: { size: 'A4', margin: '20mm 16mm 22mm 16mm' },
  },
});
