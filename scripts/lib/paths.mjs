// Shared path constants for the scripts/bin/ entry points (import-only).
//
// DIST_DIR is the Astro static-build output every checker reads.
// normalizeBase() strips the trailing slash from the handbook.config.ts
// `base` (Astro form has leading and trailing slash) so URL joining with
// `${BASE}/...` never produces `//`.
export const DIST_DIR = 'dist';

export function normalizeBase(base) {
  return base.endsWith('/') ? base.slice(0, -1) : base;
}
