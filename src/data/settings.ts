// Site feature toggles. Every toggle is typed and validated with Zod;
// client islands read them from data attributes rendered by the layouts.
// Full list of supported toggles:
// - web.pagination / web.paginationType
// - web.collapsibleSections ("none" | "h2" | "h3" | "h4" | "h5")
// - web.bookmarks.enabled
// - web.nav.expandBooks / web.nav.projectNavPosition ("before" | "after")
// - web.titleDivider
// - web.indexing
// - downloads.pdf / downloads.epub
// - pdf.notes ("footnotes" | "chapter-footnotes" | "book-footnotes")
// - pdf.page.size / pdf.page.margin
import { z } from 'zod';
import raw from './settings.json';

const toggleSchema = z.object({
  downloads: z
    .object({
      pdf: z.boolean().default(true),
      epub: z.boolean().default(true),
    })
    .default({ pdf: true, epub: true }),
  web: z
    .object({
      pagination: z.boolean().default(true),
      paginationType: z
        .enum(['previous-next', 'titles', 'title-arrows', 'arrows'])
        .default('title-arrows'),
      collapsibleSections: z.enum(['none', 'h2', 'h3', 'h4', 'h5']).default('none'),
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
      indexing: z.boolean().default(true),
    })
    .default({
      pagination: true,
      paginationType: 'title-arrows',
      collapsibleSections: 'none',
      bookmarks: { enabled: true },
      nav: { expandBooks: true, projectNavPosition: 'before' },
      search: { param: 'query' },
      titleDivider: ' – ',
      indexing: true,
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
