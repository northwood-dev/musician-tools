import type { StreamingLink } from '../utils/streamingLinks';
import { apiFetch } from './apiFetch';
import { SongConflictError } from './songService';
import type { Song } from './songService';

// A Catalog entry: the SHARED, canonical song record (story 19.1). Mirrors the
// INTRINSIC subset of Song columns — NO owner, NO instrument/personal fields.
export type CatalogSong = {
  uid: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  key?: string | null;
  bpm?: number | null;
  mode?: string | null;
  timeSignature?: string | null;
  durationSeconds?: number | null;
  language?: string[] | string | null;
  genre?: string[] | null;
  streamingLinks?: StreamingLink[] | null;
  pitchStandard?: number | null;
  publishedAt?: string | null; // null = draft (19.6) ; timestamp = published
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCatalogDTO = Omit<CatalogSong, 'uid' | 'createdAt' | 'updatedAt'>;
export type UpdateCatalogDTO = Partial<CreateCatalogDTO>;

// The list endpoint is the app's ONLY enveloped response (story 19.3): the client
// needs `total` to paginate. Unit endpoints (detail, add) stay raw.
export type CatalogListResponse = {
  items: CatalogSong[];
  total: number;
  page: number;
  limit: number;
};

// Distinct filterable values present in the whole Catalog, for the browse facet pills.
export type CatalogFacets = {
  genre: string[];
  key: string[];
  mode: string[];
  timeSignature: string[];
  artist?: string[]; // 19.6 — curator form autocomplete (browse pills ignore these)
  album?: string[];
};

export type CatalogListParams = {
  search?: string;
  key?: string;
  mode?: string;
  timeSignature?: string;
  genre?: string;
  sort?: string;
  page?: number;
  limit?: number;
  includeDrafts?: boolean; // curator hub only (19.6) — honoured server-side iff isCurator
};

// Thrown when a detail lookup 404s (deep-link to a removed/unknown entry). Lets the
// page show a calm not-found instead of a generic error.
export class CatalogNotFoundError extends Error {
  constructor() {
    super('Catalog entry not found');
    this.name = 'CatalogNotFoundError';
  }
}

// Thrown on a 409 from create/update (the GLOBAL unique index on title and
// artist, see utils/songDuplicate). Carries the existing entry so
// callers can point at it. Mirror of SongConflictError, but the backend body key
// is `entry` (not `song`). Detected by response.status — never by the body text.
export class CatalogConflictError extends Error {
  existingEntry?: CatalogSong;
  constructor(existingEntry?: CatalogSong) {
    super('Catalog entry already exists');
    this.name = 'CatalogConflictError';
    this.existingEntry = existingEntry;
  }
}

// A Collection = a curated, SHARED grouping of catalog entries (story 20.1). List
// shape carries a member count; detail carries the member entries themselves.
export type CatalogCollection = {
  uid: string;
  name: string;
  description?: string | null;
  songCount: number;
};

export type CatalogCollectionDetail = {
  uid: string;
  name: string;
  description?: string | null;
  songs: CatalogSong[];
};

// Recap of a whole-collection import into the user's Songlist (story 20.3):
// `added` newly copied, `skipped` already owned, `failed` errored, plus the mirror
// playlist's uid (created or reused).
export type ImportCollectionResult = {
  added: number;
  skipped: number;
  failed: number;
  playlistUid: string;
};

// Thrown on a 404 from a Collection detail/mutation (deep-link or concurrent delete),
// so a page can show a calm not-found. Mirror of CatalogNotFoundError.
export class CollectionNotFoundError extends Error {
  constructor() {
    super('Collection not found');
    this.name = 'CollectionNotFoundError';
  }
}

const API_BASE = '/api';

// #212: a line of the curators' Suggestions queue: identical songs (case, accents and a
// leading article ignored) suggested by `suggestedBy` users, shown with the latest one's
// Catalog fields. `id` is the handle the queue's actions send back. `catalog`: an entry with
// the same identity already exists (published, or a draft).
export type CatalogSuggestionLine = {
  id: string;
  suggestedBy: number;
  song: Pick<CatalogSong, 'title' | 'artist' | 'album' | 'key' | 'mode' | 'bpm' | 'timeSignature' | 'durationSeconds' | 'language' | 'genre' | 'streamingLinks' | 'pitchStandard'>;
  // A published entry also says where the group differs from it (#236): the entry's value and
  // each value suggested, with how many users suggested it.
  catalog: { uid: string; published: boolean; differences?: SuggestionDifference[] } | null;
};
export type SuggestionDifference = {
  field: 'key' | 'mode' | 'bpm' | 'timeSignature' | 'durationSeconds' | 'language' | 'genre' | 'pitchStandard';
  catalog: string | number | string[] | null;
  suggested: { value: string | number | string[]; users: number }[];
};
export type CatalogSuggestions = { pending: number; suggestions: CatalogSuggestionLine[] };

// #237: a curator's decision on one differing field — keep the entry's value, or accept ONE
// suggested value. One per differing field.
export type MergeDecision = 'reject' | { accept: SuggestionDifference['suggested'][number]['value'] };
export type MergeDecisions = Partial<Record<SuggestionDifference['field'], MergeDecision>>;

// #215: Accept found an entry with the same identity (published, or a draft in progress).
export class SuggestionInCatalogError extends Error {
  catalogUid?: string;
  constructor(catalogUid?: string) {
    super('This song is already in the Catalog');
    this.name = 'SuggestionInCatalogError';
    this.catalogUid = catalogUid;
  }
}

// #236: Merge found values that differ from the entry — or, with decisions, the group changed
// since the dialog showed it. Carries the differences as they are now, to decide again.
export class SuggestionDifferencesError extends Error {
  differences: SuggestionDifference[];
  constructor(differences: SuggestionDifference[] = []) {
    super('Some values differ from the Catalog entry');
    this.name = 'SuggestionDifferencesError';
    this.differences = differences;
  }
}

// Merge: the Catalog entry the line matches is no longer published (spec #234 story 20).
export class SuggestionNotPublishedError extends Error {
  constructor() {
    super('The Catalog entry is no longer published');
    this.name = 'SuggestionNotPublishedError';
  }
}

// #213: the line's songs are no longer waiting (their owner opted out, or a curator acted).
export class SuggestionGoneError extends Error {
  constructor() {
    super('This suggestion is no longer waiting');
    this.name = 'SuggestionGoneError';
  }
}

// An entry's uid, as the server checks it (backend utils/uuid).
const UID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const catalogService = {
  // Browse the shared Catalog (any logged-in user). Returns the {items,total,page,limit}
  // envelope. `signal` lets the caller abort a superseded request (debounced search).
  async listCatalog(params: CatalogListParams = {}, signal?: AbortSignal): Promise<CatalogListResponse> {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.key) qs.set('key', params.key);
    if (params.mode) qs.set('mode', params.mode);
    if (params.timeSignature) qs.set('timeSignature', params.timeSignature);
    if (params.genre) qs.set('genre', params.genre);
    if (params.sort) qs.set('sort', params.sort);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.includeDrafts) qs.set('includeDrafts', '1');
    const query = qs.toString();
    const response = await apiFetch(`${API_BASE}/catalog${query ? `?${query}` : ''}`, {
      credentials: 'include',
      signal,
    });
    if (!response.ok) {
      throw new Error('Failed to load the catalog');
    }
    return response.json();
  },

  // The distinct filterable values across the whole Catalog (for the facet pills).
  async getFacets(signal?: AbortSignal, includeDrafts = false): Promise<CatalogFacets> {
    const qs = includeDrafts ? '?includeDrafts=1' : '';
    const response = await apiFetch(`${API_BASE}/catalog/facets${qs}`, { credentials: 'include', signal });
    if (!response.ok) {
      throw new Error('Failed to load catalog facets');
    }
    return response.json();
  },

  // EXACT (title, artist) duplicate check (curator only, story 19.12). Reuses the
  // server's folded lookup (drafts AND published) — replaces the old best-effort
  // list+substring+client-fold. Returns { exists, entry }. `excludeUid` skips the row
  // being edited (rename). `signal` aborts a superseded debounced check.
  async checkCatalogExists(
    title: string,
    artist?: string,
    excludeUid?: string,
    signal?: AbortSignal,
  ): Promise<{ exists: boolean; entry?: CatalogSong | null }> {
    const qs = new URLSearchParams();
    qs.set('title', title);
    if (artist) qs.set('artist', artist);
    if (excludeUid) qs.set('excludeUid', excludeUid);
    const response = await apiFetch(`${API_BASE}/catalog/exists?${qs.toString()}`, {
      credentials: 'include',
      signal,
    });
    if (!response.ok) {
      throw new Error('Failed to check catalog existence');
    }
    return response.json();
  },

  // Fetch one entry (detail). 404 -> CatalogNotFoundError so the page shows a calm
  // not-found (deep-link to a removed entry).
  async getCatalogEntry(uid: string, signal?: AbortSignal): Promise<CatalogSong> {
    // #240: what is not an entry's uid is "not found", as the server says — without asking
    // it: /catalog/suggestions would reach the curators' suggestions API, not an entry.
    if (!UID.test(uid)) throw new CatalogNotFoundError();
    const response = await apiFetch(`${API_BASE}/catalog/${uid}`, {
      credentials: 'include',
      signal,
    });
    if (response.status === 404) {
      throw new CatalogNotFoundError();
    }
    if (!response.ok) {
      throw new Error('Failed to load the catalog entry');
    }
    return response.json();
  },

  // Add a catalog entry to the user's Songlist (snapshot + provenance, story 19.4).
  // 201 -> the created Song. 409 (already in the songlist, Epic 17 guard) ->
  // SongConflictError carrying the existing Song (reused from songService).
  // `instrument` (#34): the song's instrument; absent = a song with no instrument.
  async addToSonglist(uid: string, instrument?: string): Promise<Song> {
    const response = await apiFetch(`${API_BASE}/catalog/${uid}/add-to-songlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...(instrument ? { body: JSON.stringify({ instrument }) } : {}),
    });
    if (response.status === 409) {
      const body = await response.json().catch(() => ({} as { song?: Song }));
      throw new SongConflictError(body.song ?? undefined);
    }
    if (response.status === 404) {
      // The entry was removed from the Catalog (e.g. curator deleted it) — a
      // permanent failure, not a retryable one.
      throw new CatalogNotFoundError();
    }
    if (!response.ok) {
      throw new Error('Failed to add to songlist');
    }
    return response.json();
  },

  // Create a catalog entry (curator only; the route is gated server-side by
  // requireCurator -> 403). apiFetch attaches the CSRF token.
  async createCatalogEntry(entry: CreateCatalogDTO): Promise<CatalogSong> {
    const response = await apiFetch(`${API_BASE}/catalog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
      credentials: 'include',
    });
    if (response.status === 409) {
      const body = await response.json().catch(() => ({} as { entry?: CatalogSong }));
      throw new CatalogConflictError(body.entry ?? undefined);
    }
    if (!response.ok) {
      throw new Error('Failed to create catalog entry');
    }
    return response.json();
  },

  // Edit a catalog entry in place (curator only). Ready for the edit flow that
  // the browse list (story 19.3) will wire up.
  async updateCatalogEntry(uid: string, entry: UpdateCatalogDTO): Promise<CatalogSong> {
    const response = await apiFetch(`${API_BASE}/catalog/${uid}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
      credentials: 'include',
    });
    if (response.status === 409) {
      const body = await response.json().catch(() => ({} as { entry?: CatalogSong }));
      throw new CatalogConflictError(body.entry ?? undefined);
    }
    if (!response.ok) {
      throw new Error('Failed to update catalog entry');
    }
    return response.json();
  },

  // Delete a catalog entry (curator only). A 404 (already removed elsewhere) is
  // surfaced as CatalogNotFoundError so the manage list can drop the row calmly.
  // Deleting a fiche does NOT touch Songs users already copied from it — there is
  // no FK on Song.sourceCatalogUid (soft reference, §4.7), so it just goes dangling.
  async deleteCatalogEntry(uid: string): Promise<void> {
    const response = await apiFetch(`${API_BASE}/catalog/${uid}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (response.status === 404) {
      throw new CatalogNotFoundError();
    }
    if (!response.ok) {
      throw new Error('Failed to delete catalog entry');
    }
  },

  // Publish a draft (curator, 19.6). 409 = a PUBLISHED entry owns the canonical key
  // (CatalogConflictError carries it) ; 404 = gone ; 400 = missing title.
  // #215: `suggestionId` = the Suggestions line this draft was accepted from, so publishing
  // links its songs even if the curator corrected the title or artist.
  async publishCatalogEntry(uid: string, suggestionId?: string): Promise<CatalogSong> {
    const response = await apiFetch(`${API_BASE}/catalog/${uid}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...(suggestionId ? { body: JSON.stringify({ suggestionId }) } : {}),
    });
    if (response.status === 409) {
      const body = await response.json().catch(() => ({} as { entry?: CatalogSong }));
      throw new CatalogConflictError(body.entry ?? undefined);
    }
    if (response.status === 404) {
      throw new CatalogNotFoundError();
    }
    if (!response.ok) {
      throw new Error('Failed to publish catalog entry');
    }
    return response.json();
  },

  // ---- Story 20.2: Collections (curator) ----

  // List all Collections (name + member count). Any logged-in user; the curator hub
  // uses it. `signal` aborts a superseded request.
  async listCollections(signal?: AbortSignal): Promise<CatalogCollection[]> {
    const response = await apiFetch(`${API_BASE}/catalog/collections`, { credentials: 'include', signal });
    if (!response.ok) {
      throw new Error('Failed to load collections');
    }
    return response.json();
  },

  // Create a Collection (curator; requireCurator -> 403). 400 if name is empty. The
  // API returns the created row (no `songs` / `songCount`) — callers use uid/name only.
  async createCollection(name: string, description?: string | null): Promise<{ uid: string; name: string; description?: string | null }> {
    const response = await apiFetch(`${API_BASE}/catalog/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description ?? null }),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to create collection');
    }
    return response.json();
  },

  // Fetch one Collection with its member entries. The curator sees draft members
  // (20.1 draft-safety gates on isCurator). 404 -> CollectionNotFoundError.
  async getCollection(uid: string, signal?: AbortSignal): Promise<CatalogCollectionDetail> {
    const response = await apiFetch(`${API_BASE}/catalog/collections/${uid}`, { credentials: 'include', signal });
    if (response.status === 404) {
      throw new CollectionNotFoundError();
    }
    if (!response.ok) {
      throw new Error('Failed to load the collection');
    }
    return response.json();
  },

  // Rename / re-describe a Collection (curator). 404 -> CollectionNotFoundError. Returns
  // the updated row (no `songs`); callers use name only.
  async updateCollection(uid: string, changes: { name?: string; description?: string | null }): Promise<{ uid: string; name: string; description?: string | null }> {
    const response = await apiFetch(`${API_BASE}/catalog/collections/${uid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
      credentials: 'include',
    });
    if (response.status === 404) {
      throw new CollectionNotFoundError();
    }
    if (!response.ok) {
      throw new Error('Failed to update the collection');
    }
    return response.json();
  },

  // Delete a Collection (curator). Cascades its join rows; the entries survive.
  async deleteCollection(uid: string): Promise<void> {
    const response = await apiFetch(`${API_BASE}/catalog/collections/${uid}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (response.status === 404) {
      throw new CollectionNotFoundError();
    }
    if (!response.ok) {
      throw new Error('Failed to delete the collection');
    }
  },

  // Add a catalog entry to a Collection (curator). Idempotent server-side: the
  // controller's findOrCreate on the composite unique answers 201 when it created the
  // link and 200 when it was already there. We SURFACE that (story 22.2): the bulk
  // "Add to collection" recap has to count an already-member entry as "already in",
  // never as a failure, and no other signal distinguishes the two.
  // 404 -> the collection or the entry is gone.
  async addSongToCollection(uid: string, catalogSongUid: string): Promise<'added' | 'already-in'> {
    const response = await apiFetch(`${API_BASE}/catalog/collections/${uid}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catalogSongUid }),
      credentials: 'include',
    });
    if (response.status === 404) {
      throw new CollectionNotFoundError();
    }
    if (!response.ok) {
      throw new Error('Failed to add to the collection');
    }
    return response.status === 201 ? 'added' : 'already-in';
  },

  // Remove a catalog entry from a Collection (curator). Idempotent.
  async removeSongFromCollection(uid: string, catalogSongUid: string): Promise<void> {
    const response = await apiFetch(`${API_BASE}/catalog/collections/${uid}/songs/${catalogSongUid}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to remove from the collection');
    }
  },

  // Import a whole Collection into the user's Songlist (story 20.3, any logged-in user):
  // copies every published member (best-effort) + creates/reuses a mirror Playlist named
  // after the Collection. Returns the {added,skipped,failed,playlistUid} recap. 404 -> gone.
  async importCollection(uid: string, instrument?: string, signal?: AbortSignal): Promise<ImportCollectionResult> {
    const response = await apiFetch(`${API_BASE}/catalog/collections/${uid}/add-to-songlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal,
      ...(instrument ? { body: JSON.stringify({ instrument }) } : {}),
    });
    if (response.status === 404) {
      throw new CollectionNotFoundError();
    }
    if (!response.ok) {
      throw new Error('Failed to import the collection');
    }
    return response.json();
  },

  // #213: the line's songs leave the queue for good (their owners aren't told). 404 → the
  // suggestion is no longer waiting (opted out, linked or already rejected meanwhile).
  async rejectSuggestion(id: string): Promise<{ rejected: number }> {
    const response = await apiFetch(`${API_BASE}/catalog/suggestions/${id}/reject`, { method: 'POST', credentials: 'include' });
    if (response.status === 404) {
      throw new SuggestionGoneError();
    }
    if (!response.ok) {
      throw new Error('Failed to reject the suggestion');
    }
    return response.json();
  },

  // #214 / #236: tie the line's songs to the PUBLISHED Catalog entry they match. 404 → no longer
  // waiting; 409 "differences" → values to decide (or decide again) first; 409 "not_published"
  // → the entry is no longer published.
  // #237: `decisions` — one per differing field: 'reject', or { accept: <a suggested value> }.
  async mergeSuggestion(id: string, decisions?: MergeDecisions): Promise<{ linked: number; catalogUid: string }> {
    const response = await apiFetch(`${API_BASE}/catalog/suggestions/${id}/merge`, {
      method: 'POST',
      credentials: 'include',
      ...(decisions ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisions }) } : {}),
    });
    if (response.status === 409) {
      const body = await response.json().catch(() => ({} as { error?: string; differences?: SuggestionDifference[] }));
      if (body.error === 'differences') throw new SuggestionDifferencesError(body.differences ?? []);
      if (body.error === 'not_published') throw new SuggestionNotPublishedError();
      throw new SuggestionGoneError();
    }
    if (response.status === 404) {
      throw new SuggestionGoneError();
    }
    if (!response.ok) {
      throw new Error('Failed to merge the suggestion');
    }
    return response.json();
  },

  // #215: a Catalog draft pre-filled from the line's song, for the curator to review and
  // publish (publishing links the songs). 409 → an entry with that identity exists already.
  async acceptSuggestion(id: string): Promise<{ catalogUid: string }> {
    const response = await apiFetch(`${API_BASE}/catalog/suggestions/${id}/accept`, { method: 'POST', credentials: 'include' });
    if (response.status === 409) {
      const body = await response.json().catch(() => ({} as { catalogUid?: string }));
      throw new SuggestionInCatalogError(body.catalogUid);
    }
    if (response.status === 404) {
      throw new SuggestionGoneError();
    }
    if (!response.ok) {
      throw new Error('Failed to accept the suggestion');
    }
    return response.json();
  },

  // #212: the curators' queue of songs suggested to the Catalog (curator only → 403). One line
  // per song; `pending` counts the lines a curator has something to do on (not the drafts in
  // progress). No user, nothing personal, only official links.
  async getSuggestions(signal?: AbortSignal): Promise<CatalogSuggestions> {
    const response = await apiFetch(`${API_BASE}/catalog/suggestions`, { credentials: 'include', signal });
    if (!response.ok) {
      throw new Error('Failed to load the suggestions');
    }
    return response.json();
  },
};
