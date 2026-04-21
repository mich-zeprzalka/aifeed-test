/** Escape special characters for PostgREST ilike (%, _, \). */
export function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

/** Sanitize a query for use inside PostgREST .or() — strip chars with syntactic meaning. */
export function sanitizeOrQuery(input: string): string {
  return escapeIlike(input).replace(/[,()]/g, " ");
}

/** Polish plural form for a "wyniki" count (search results). */
export function pluralize(count: number): string {
  if (count === 1) return "wynik";
  if (count >= 2 && count <= 4) return "wyniki";
  return "wyników";
}

export const SEARCH_QUERY_MAX_LENGTH = 100;
