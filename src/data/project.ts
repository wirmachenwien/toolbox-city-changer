// Project metadata. Canonical data lives in project.json (editable via
// PagesCMS); this module validates it and exposes typed access.
import { z } from 'zod';
import raw from './project.json';

const projectSchema = z.object({
  creator: z.string().optional().default(''),
  contributor: z.string().optional().default(''),
  publisher: z.string().optional().default(''),
  rights: z.string().optional().default(''),
  date: z.string().optional().default(''),
  modified: z.string().optional().default(''),
  identifier: z.string().optional().default(''),
});

export type Project = z.infer<typeof projectSchema>;

export const project: Project = projectSchema.parse(raw);
