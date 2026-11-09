import { apiFetch } from './apiFetch';

// #76: "RHCP" also searches for "Red Hot Chili Peppers". Only used by search.
export interface ArtistAlias {
  uid: string;
  alias: string;
  artist: string;
}

const API_BASE = '/api';

export const artistAliasService = {
  async list(): Promise<ArtistAlias[]> {
    const res = await apiFetch(`${API_BASE}/artist-aliases`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch artist aliases');
    return res.json();
  },
};
