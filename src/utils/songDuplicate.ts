import type { Song } from '../services/songService';

// Normalize for comparison: fold case and accents, and collapse internal whitespace.
// So "Rage  Against" === "Rage Against" and "Beyoncé" === "Beyonce" (#36). Two different
// songs by one artist whose titles differ only by an accent can't coexist: a rare case,
// accepted over a copy each time someone types without accents.
const norm = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// A leading article doesn't make another artist: "The Beatles" === "Beatles" (#36). An artist
// that is only the article keeps it. Mirrors the database's f_artist_key, which the unique
// index uses: if they differ on a rare character, the server's 409 decides.
const artistKey = (artist: string | null | undefined): string =>
  norm(artist).replace(/^(?:(?:the|le|la|les) |l['’] ?)(?=\S)/, '');

/** What makes two songs the same song, as one comparable value. */
export const songIdentityKey = (title: string | null | undefined, artist: string | null | undefined): string =>
  `${norm(title)}\u0000${artistKey(artist)}`;

/**
 * Finds an existing song matching the given title + artist (see `norm` and `artistKey`),
 * or null.
 *
 * Single source of truth for "does this song already exist", shared by the
 * live hint shown while adding a song and the submit-time guard. Keeping one
 * rule means the warning the user sees can never disagree with the block that
 * actually fires — the previous bug was that this check scanned the full
 * songlist while the visible list was filtered, so a song hidden by an active
 * filter looked absent yet still blocked creation.
 *
 * `excludeUid` lets edit mode ignore the song currently being edited.
 */
export function findDuplicateSong(
  songs: Song[],
  candidate: { title?: string | null; artist?: string | null },
  excludeUid?: string | null,
): Song | null {
  if (!norm(candidate.title)) return null; // title is the required field — empty matches nothing useful
  const key = songIdentityKey(candidate.title, candidate.artist);
  return (
    songs.find(song => song.uid !== excludeUid && songIdentityKey(song.title, song.artist) === key) ?? null
  );
}
