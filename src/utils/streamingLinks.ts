// Links of a song: streaming links (#35) and instrument links (#111). Mirrors the backend rules
// (backend/utils/streamingLinks.js):
// the API refuses what these refuse, the form only says it first.

export type StreamingLink = { url: string; label?: string | null; source?: 'catalog' };

export const MAX_SONGLIST_LINKS = 10;
export const MAX_URL_LENGTH = 2048;
export const MAX_LABEL_LENGTH = 100;
const MAX_INSTRUMENT_LINKS = 10;

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

// One link { url, label? } (#35, #111): the rules shared by streaming and instrument links.
function linkError(url: string, label: string): string | null {
  if (!/^https?:\/\//i.test(url)) return 'A link must start with http:// or https://';
  if (url.length > MAX_URL_LENGTH) return `A link must be at most ${MAX_URL_LENGTH} characters`;
  if (label.length > MAX_LABEL_LENGTH) return `A label must be at most ${MAX_LABEL_LENGTH} characters`;
  return null;
}

/**
 * Why a link can't be added to a Songlist song that already has `ownCount` links of the
 * user's own, or null. Catalog links don't count: they come on top (one per platform).
 */
export function songlistLinkError(url: string, label: string, ownCount: number): string | null {
  return linkError(url, label)
    ?? (ownCount >= MAX_SONGLIST_LINKS ? `A song can have at most ${MAX_SONGLIST_LINKS} links of your own` : null);
}

/** Why a resource link can't be added to an instrument that already has `count` links, or null. */
export function instrumentLinkError(url: string, label: string, count: number): string | null {
  return linkError(url, label)
    ?? (count >= MAX_INSTRUMENT_LINKS ? `An instrument can have at most ${MAX_INSTRUMENT_LINKS} links` : null);
}

// The Catalog's official links (#109): one per platform, each a track or video of that
// platform, never a search page. Mirrors CATALOG_PLATFORMS in backend/utils/streamingLinks.js.
export const CATALOG_PLATFORMS = ['YouTube', 'Spotify', 'Deezer'] as const;
export type CatalogPlatform = typeof CATALOG_PLATFORMS[number];

const PLATFORM_MATCHERS: Record<CatalogPlatform, (u: URL) => boolean> = {
  YouTube: (u) => (/^((www|m|music)\.)?youtube\.com$/.test(u.hostname) && u.pathname === '/watch' && !!u.searchParams.get('v'))
    || (u.hostname === 'youtu.be' && /^\/[\w-]+$/.test(u.pathname)),
  Spotify: (u) => u.hostname === 'open.spotify.com' && /^(\/intl-[a-z-]+)?\/track\/[A-Za-z0-9]+$/.test(u.pathname),
  Deezer: (u) => (/^(www\.)?deezer\.com$/.test(u.hostname) && /^(\/[a-z]{2}(-[a-z]{2})?)?\/track\/\d+$/.test(u.pathname))
    || (u.hostname === 'link.deezer.com' && /^\/s\/[A-Za-z0-9]+$/.test(u.pathname)),
};

export function isPlatformLink(platform: CatalogPlatform, url: string): boolean {
  if (url.length > MAX_URL_LENGTH) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === 'https:' && PLATFORM_MATCHERS[platform](parsed);
}
