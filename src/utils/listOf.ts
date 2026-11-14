// "A list, a single text or nothing" as a list (#118). Song fields such as genre, language and
// instrument are stored as lists, but older rows hold a single text and some hold nothing.
// Same rule as the backend's instrumentsOf. Not to be confused with CatalogEntry's local
// asList, which joins a list into text for display.
export function listOf(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}
