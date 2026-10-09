// Localised UI strings. Canonical data lives in locales.json (editable via
// PagesCMS); this module validates it and exposes typed access.
// "direction" drives <html dir> and mirrors the layout via logical properties.
import { z } from 'zod';
import { languages } from '../../handbook.config.ts';
import type { Language } from '../../handbook.config.ts';
import raw from './locales.json';

export { languages };
export type { Language };

export const localeSchema = z
  .object({ direction: z.enum(['ltr', 'rtl']).default('ltr') })
  .loose();
export type AppLocale = z.infer<typeof localeSchema> & Record<string, unknown>;

const parsed = z.record(z.string(), localeSchema).parse(raw) as Record<string, AppLocale>;
for (const lang of languages) {
  if (!parsed[lang]) throw new Error(`locales.json: missing locale "${lang}" (see handbook.config.ts)`);
}

export const locales: Record<Language, AppLocale> = parsed as Record<Language, AppLocale>;
