// Project navigation. Canonical data lives in nav.json (editable via
// PagesCMS); this module validates it and exposes typed access.
import { z } from 'zod';
import raw from './nav.json';
import type { Language } from './locales';

const navItemSchema = z.object({ label: z.string(), file: z.string() });
export type NavItem = z.infer<typeof navItemSchema>;

const navSchema = z.object({
  de: z.array(navItemSchema),
  en: z.array(navItemSchema),
  sl: z.array(navItemSchema),
});

type Nav = Record<Language, NavItem[]>;

export const nav: Nav = navSchema.parse(raw);
