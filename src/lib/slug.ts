// Anchor slugs for glossary terms (<dt id> permalinks). Uses github-slugger,
// the same slugging Astro's markdown pipeline applies to heading ids, so
// glossary anchors behave like heading anchors. The Python print builders
// (scripts/handbook/mdx.py) mirror this scheme; terms only contain letters,
// spaces and hyphens, so both implementations agree exactly.
import GithubSlugger from 'github-slugger';

/** Slug for each value, deduplicated within the list ("term", "term-1"). */
export function slugifyTerms(terms: string[]): string[] {
  const slugger = new GithubSlugger();
  return terms.map((term) => slugger.slug(term));
}
