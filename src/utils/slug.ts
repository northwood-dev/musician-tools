export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, '-') // Replace apostrophes with dashes
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-'); // Replace multiple dashes with single dash
}

export function fromSlug(slug: string): string {
  return slug.replace(/-/g, ' ');
}

export function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, '') // Remove apostrophes
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize spaces
}
