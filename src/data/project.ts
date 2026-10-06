// Project metadata. Canonical data lives in project.json (editable via
// PagesCMS); this module validates it and exposes typed access.
import { z } from 'zod';
import raw from './project.json';

const projectSchema = z.object({
  organisation: z.string(),
  url: z.string().url(),
  email: z.string().email(),
  name: z.string(),
  description: z.string(),
  logo: z.string(),
  image: z.string(),
  credit: z.string(),
  language: z.string(),
  version: z.string(),
});

export type Project = z.infer<typeof projectSchema>;

export const project: Project = projectSchema.parse(raw);
