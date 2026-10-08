// Project navigation. Canonical data lives in nav.json (editable via
// PagesCMS); this module validates it and exposes typed access.
import { z } from 'zod';
import { languages } from '../../handbook.config.ts';
import raw from './nav.json';
import type { Language } from './locales';

const navItemSchema = z.object({ label: z.string(), file: z.string() });
export type NavItem = z.infer<typeof navItemSchema>;

type Nav = Record<Language, NavItem[]>;

const parsedNav = z.record(z.string(), z.array(navItemSchema)).parse(raw) as Record<string, NavItem[]>;
for (const lang of languages) {
  if (!parsedNav[lang]) throw new Error(`nav.json: missing navigation "${lang}" (see handbook.config.ts)`);
}

export const nav: Nav = parsedNav as Nav;
