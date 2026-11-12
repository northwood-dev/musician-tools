// Streaming links of a song (#35). A Songlist song holds a free list of personal links,
// plus the ones copied from the Catalog (marked source: "catalog"). null or absent means
// none. Each check returns a message naming the first problem, or null when valid.
const MAX_SONGLIST_LINKS = 10;
const MAX_URL_LENGTH = 2048;
const MAX_LABEL_LENGTH = 100;

function linkError(link) {
  if (typeof link !== 'object' || link === null || Array.isArray(link)) return 'Each streaming link must be an object';
  if (typeof link.url !== 'string' || !/^https?:\/\//i.test(link.url)) return 'A streaming link must start with http:// or https://';
  if (link.url.length > MAX_URL_LENGTH) return `A streaming link must be at most ${MAX_URL_LENGTH} characters`;
  if (link.label !== undefined && link.label !== null) {
    if (typeof link.label !== 'string') return 'A streaming link label must be text';
    if (link.label.length > MAX_LABEL_LENGTH) return `A streaming link label must be at most ${MAX_LABEL_LENGTH} characters`;
  }
  if (link.source !== undefined && link.source !== 'catalog') return 'Unknown streaming link source';
  return null;
}

function songlistLinksError(links) {
  if (links === undefined || links === null) return null;
  if (!Array.isArray(links)) return 'Streaming links must be a list';
  for (const link of links) {
    const error = linkError(link);
    if (error) return error;
  }
  // The cap is on the user's own links: the Catalog's (at most one per platform) come on top,
  // so a refresh adding them can never push a song over a limit its owner can't save.
  const marked = links.filter(link => link.source === 'catalog').length;
  if (links.length - marked > MAX_SONGLIST_LINKS) return `A song can have at most ${MAX_SONGLIST_LINKS} streaming links of your own`;
  if (marked > Object.keys(CATALOG_PLATFORMS).length) return 'Too many links from the Catalog';
  return null;
}

// The Catalog's official links (#109): at most one per platform, each pointing at a track or
// video of that platform (never a search page). Stored as { label: <platform>, url }.
const CATALOG_PLATFORMS = {
  YouTube: (u) => (/^((www|m|music)\.)?youtube\.com$/.test(u.hostname) && u.pathname === '/watch' && !!u.searchParams.get('v'))
    || (u.hostname === 'youtu.be' && /^\/[\w-]+$/.test(u.pathname)),
  Spotify: (u) => u.hostname === 'open.spotify.com' && /^(\/intl-[a-z-]+)?\/track\/[A-Za-z0-9]+$/.test(u.pathname),
  Deezer: (u) => (/^(www\.)?deezer\.com$/.test(u.hostname) && /^(\/[a-z]{2}(-[a-z]{2})?)?\/track\/\d+$/.test(u.pathname))
    || (u.hostname === 'link.deezer.com' && /^\/s\/[A-Za-z0-9]+$/.test(u.pathname)),
};

function isPlatformLink(platform, url) {
  const matches = CATALOG_PLATFORMS[platform];
  if (!matches || typeof url !== 'string' || url.length > MAX_URL_LENGTH) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === 'https:' && matches(parsed);
}

function catalogLinksError(links) {
  if (links === undefined || links === null) return null;
  if (!Array.isArray(links)) return 'Streaming links must be a list';
  const seen = new Set();
  for (const link of links) {
    if (typeof link !== 'object' || link === null) return 'Each streaming link must be an object';
    if (!Object.hasOwn(CATALOG_PLATFORMS, link.label)) return 'A Catalog link must be YouTube, Spotify or Deezer';
    if (seen.has(link.label)) return `A Catalog entry can have only one ${link.label} link`;
    seen.add(link.label);
    if (!isPlatformLink(link.label, link.url)) return `Not a ${link.label} track link`;
  }
  return null;
}

// A Songlist copy holds the Catalog's links marked source: "catalog" (#110), next to the
// user's own. The copy never shares a reference with the Catalog entry.
function markedCatalogLinks(catalogLinks) {
  return (catalogLinks ?? []).map(link => ({ ...structuredClone(link), source: 'catalog' }));
}

// The links of a copy after a refresh: the Catalog's current links (marked) replace the
// marked ones; the user's own links are kept, in their order, after them. null when none.
function refreshedLinks(copyLinks, catalogLinks) {
  const personal = (copyLinks ?? []).filter(link => link.source !== 'catalog');
  const links = [...markedCatalogLinks(catalogLinks), ...personal];
  return links.length > 0 ? links : null;
}

module.exports = { songlistLinksError, catalogLinksError, refreshedLinks };
