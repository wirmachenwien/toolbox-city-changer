// Localised UI strings. Canonical data lives in locales.json (editable via
// PagesCMS); this module validates it and exposes typed access.
// "direction" drives <html dir> and mirrors the layout via logical properties.
import { z } from 'zod';
import raw from './locales.json';

export const localeSchema = z
  .object({ direction: z.enum(['ltr', 'rtl']).default('ltr') })
  .passthrough();
export type AppLocale = z.infer<typeof localeSchema> & Record<string, unknown>;

export const languages = ['de', 'en', 'sl'] as const;
export type Language = (typeof languages)[number];

const parsed = z
  .object({ de: localeSchema, en: localeSchema, sl: localeSchema })
  .parse(raw) as Record<Language, AppLocale>;

export const locales: Record<Language, AppLocale> = parsed;
