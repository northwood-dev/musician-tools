// Streaming links of a song (#35). Mirrors the backend rules (backend/utils/streamingLinks.js):
// the API refuses what these refuse, the form only says it first.

export type StreamingLink = { url: string; label?: string | null; source?: 'catalog' };

export const MAX_SONGLIST_LINKS = 10;
export const MAX_URL_LENGTH = 2048;
export const MAX_LABEL_LENGTH = 100;

const KNOWN_SITES: Array<[RegExp, string]> = [
  [/(^|\.)youtube\.com$|^youtu\.be$/, 'YouTube'],
  [/(^|\.)spotify\.com$/, 'Spotify'],
  [/(^|\.)deezer\.com$/, 'Deezer'],
  [/^music\.apple\.com$/, 'Apple Music'],
  [/(^|\.)bandcamp\.com$/, 'Bandcamp'],
  [/(^|\.)soundcloud\.com$/, 'SoundCloud'],
];

/** The name a link shows when it has no label: the platform's usual name, else the bare host. */
export function siteName(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return url;
  }
  const known = KNOWN_SITES.find(([pattern]) => pattern.test(host));
  return known ? known[1] : host.replace(/^www\./, '');
}

export function linkName(link: StreamingLink): string {
  return link.label || siteName(link.url);
}

/** Why a link can't be added to a Songlist song that already has `count` links, or null. */
export function songlistLinkError(url: string, label: string, count: number): string | null {
  if (!/^https?:\/\//i.test(url)) return 'A link must start with http:// or https://';
  if (url.length > MAX_URL_LENGTH) return `A link must be at most ${MAX_URL_LENGTH} characters`;
  if (label.length > MAX_LABEL_LENGTH) return `A label must be at most ${MAX_LABEL_LENGTH} characters`;
  if (count >= MAX_SONGLIST_LINKS) return `A song can have at most ${MAX_SONGLIST_LINKS} links`;
  return null;
}
