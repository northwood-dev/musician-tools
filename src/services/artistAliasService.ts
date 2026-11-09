import { apiFetch } from './apiFetch';

// #76: "RHCP" also searches for "Red Hot Chili Peppers". Only used by search.
export interface ArtistAlias {
  uid: string;
  alias: string;
  artist: string;
}

export interface ArtistAliasWithCount extends ArtistAlias {
  /** Catalog entries this alias finds, drafts included. */
  entryCount: number;
}

// Thrown on a 409: this alias exists, ignoring case, accents and punctuation. Carries the
// existing one, unless the server couldn't find it back.
export class ArtistAliasConflictError extends Error {
  existing: ArtistAlias | null;

  constructor(existing: ArtistAlias | null) {
    super('This alias already exists');
    this.name = 'ArtistAliasConflictError';
    this.existing = existing;
  }
}

const API_BASE = '/api';

export const artistAliasService = {
  async list(): Promise<ArtistAlias[]> {
    const res = await apiFetch(`${API_BASE}/artist-aliases`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch artist aliases');
    return res.json();
  },

  // Curators only (the route is gated server-side -> 403).
  async listWithCounts(): Promise<ArtistAliasWithCount[]> {
    const res = await apiFetch(`${API_BASE}/artist-aliases/manage`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch artist aliases');
    return res.json();
  },

  async create(payload: { alias: string; artist: string }): Promise<ArtistAlias> {
    const res = await apiFetch(`${API_BASE}/artist-aliases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (res.status === 409) {
      const body = await res.json().catch(() => ({} as { alias?: ArtistAlias | null }));
      throw new ArtistAliasConflictError(body.alias ?? null);
    }
    if (!res.ok) throw new Error('Failed to add the artist alias');
    return res.json();
  },

  async remove(uid: string): Promise<void> {
    const res = await apiFetch(`${API_BASE}/artist-aliases/${uid}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to remove the artist alias');
  },
};
