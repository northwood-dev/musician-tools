import type { Song } from '../services/songService';

// The live names of a song, for the "Artist - Title" label of a session entry (#13).
export type SongNames = Pick<Song, 'title' | 'artist'>;
export type SongNamesByUid = ReadonlyMap<string, SongNames>;

export function toSongNamesByUid(songs: readonly Song[]): SongNamesByUid {
  return new Map(songs.map(song => [song.uid, song]));
}
