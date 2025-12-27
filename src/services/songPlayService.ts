const API_BASE = '/api/songs';

export interface SongPlay {
  uid: string;
  songUid: string;
  instrumentUid: string | null;
  instrumentType: string | null;
  playedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarkPlayedDTO {
  instrumentType?: string;
}

export const songPlayService = {
  async markPlayed(songUid: string, dto: MarkPlayedDTO): Promise<SongPlay> {
    const response = await fetch(`${API_BASE}/${songUid}/plays`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dto),
    });
    if (!response.ok) {
      throw new Error('Failed to mark song as played');
    }
    return response.json();
  },

  async getPlays(songUid: string): Promise<SongPlay[]> {
    const response = await fetch(`${API_BASE}/${songUid}/plays`);
    if (!response.ok) {
      throw new Error('Failed to fetch song plays');
    }
    return response.json();
  },

  getLastPlayForInstrument(plays: SongPlay[], instrumentUid?: string): SongPlay | undefined {
    const filtered = plays.filter(p => p.instrumentUid === (instrumentUid || null));
    return filtered.length > 0 ? filtered[0] : undefined;
  },
};
