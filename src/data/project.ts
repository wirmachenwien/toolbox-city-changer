// Project metadata. Canonical data lives in project.json (editable via
// PagesCMS); this module validates it and exposes typed access.
import { z } from 'zod';
import raw from './project.json';

const projectSchema = z.object({
  name: z.string(),
  description: z.string(),
  credit: z.string(),
});

export type Project = z.infer<typeof projectSchema>;

export const project: Project = projectSchema.parse(raw);
