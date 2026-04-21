/**
 * Produce a stable, URL-safe ID for a Markdown heading.
 * Preserves meaning by transliterating Polish diacritics (ą→a, ś→s, ż→z…)
 * via NFD decomposition + combining-mark strip, then collapses whitespace
 * to `-` and drops any remaining non-alphanumeric characters.
 */
export function slugifyHeading(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
