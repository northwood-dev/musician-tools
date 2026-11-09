import type { Song } from '../services/songService';

// Normalize for comparison: fold case and accents, and collapse internal whitespace.
// So "Rage  Against" === "Rage Against" and "Beyoncé" === "Beyonce" (#36). Two different
// songs by one artist whose titles differ only by an accent can't coexist: a rare case,
// accepted over a copy each time someone types without accents.
//
// Follows the database's f_unaccent, which the unique index uses, measured letter by letter:
// it drops accents on Latin and Greek only (й, kana and Indic vowel signs change the letter,
// so they stay), and spells out letters that have no separate accent (œ → oe). Rarer letters
// differ, and the server's refusal decides for them.
const SPELLED_OUT: Record<string, string> = { œ: 'oe', æ: 'ae', ø: 'o', ß: 'ss', ł: 'l', đ: 'd', ı: 'i', ð: 'd', þ: 'th' };

export const foldText = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/([\p{Script=Latin}\p{Script=Greek}])[̀-ͯ]+/gu, '$1')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[œæøßłđıðþ]/g, letter => SPELLED_OUT[letter])
    .replace(/\s+/g, ' ')
    .trim();

// A leading article doesn't make another artist: "The Beatles" === "Beatles" (#36). An artist
// that is only the article keeps it. Mirrors the database's f_artist_key, which the unique
// index uses: if they differ on a rare character, the server's 409 decides.
export const artistKey = (artist: string | null | undefined): string =>
  foldText(artist).replace(/^(?:(?:the|le|la|les) |l['’] ?)(?=\S)/, '');

/** What makes two songs the same song, as one comparable value. */
export const songIdentityKey = (title: string | null | undefined, artist: string | null | undefined): string =>
  `${foldText(title)}\u0000${artistKey(artist)}`;

/**
 * Finds an existing song matching the given title + artist (see `foldText` and `artistKey`),
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
  if (!foldText(candidate.title)) return null; // title is the required field — empty matches nothing useful
  const key = songIdentityKey(candidate.title, candidate.artist);
  return (
    songs.find(song => song.uid !== excludeUid && songIdentityKey(song.title, song.artist) === key) ?? null
  );
}
