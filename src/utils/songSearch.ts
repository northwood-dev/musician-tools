import type { ArtistAlias } from '../services/artistAliasService';
import type { Song } from '../services/songService';
import { artistKey, foldText } from './songDuplicate';
import { searchKey } from './searchKey';

/**
 * The same rule for a plain name, such as a topic: punctuation, spaces and accents don't count,
 * and "&" counts as "and". A search made only of punctuation looks for that text.
 */
export function textSearchMatcher(searchQuery: string): (text: string) => boolean {
  const query = searchKey(searchQuery);
  const literalQuery = foldText(searchQuery);
  return query
    ? text => searchKey(text).includes(query)
    : text => foldText(text).includes(literalQuery);
}

type SearchableSong = Pick<Song, 'title' | 'artist' | 'album'>;

/**
 * The one rule every song search follows (Songlist, My playlists, My sessions): returns whether
 * a song matches what was typed.
 *
 * Accents, punctuation and spaces don't count (#36, #76), and an artist can be typed with an
 * article it isn't stored with. Typing an alias in full also searches for its artist (#76). A
 * search can span the artist and the title, "beatles help" (#84). A search made only of
 * punctuation has no key: it looks for that text, rather than matching everything.
 */
export function songSearchMatcher(
  searchQuery: string,
  artistAliases: Pick<ArtistAlias, 'alias' | 'artist'>[] = [],
): (song: SearchableSong) => boolean {
  const query = searchKey(searchQuery);
  const artistQuery = searchKey(artistKey(searchQuery));
  const literalQuery = foldText(searchQuery);
  const alias = query ? artistAliases.find(a => searchKey(a.alias) === query) : undefined;
  const aliasArtist = alias ? searchKey(artistKey(alias.artist)) : '';

  if (!query) {
    return song =>
      foldText(song.title).includes(literalQuery) ||
      foldText(song.artist).includes(literalQuery) ||
      foldText(song.album).includes(literalQuery);
  }

  // "the doors light my fire" finds "Light My Fire" by Doors. The match must start in the artist:
  // the article is optional for the artist only, so "The Wall" doesn't find "Wall".
  const spansArtistWithoutArticle = (song: SearchableSong): boolean => {
    if (artistQuery === '') return false;
    const artist = searchKey(artistKey(song.artist));
    const at = `${artist}${searchKey(song.title)}`.indexOf(artistQuery);
    return at !== -1 && at < artist.length;
  };

  return song => {
    const songArtist = searchKey(song.artist);
    return (
      searchKey(song.title).includes(query) ||
      songArtist.includes(query) ||
      // Nothing left once the article is gone ("the ...") must not match everything.
      (artistQuery !== '' && songArtist.includes(artistQuery)) ||
      (aliasArtist !== '' && songArtist.includes(aliasArtist)) ||
      searchKey(song.album).includes(query) ||
      searchKey(`${song.artist ?? ''}${song.title ?? ''}`).includes(query) ||
      spansArtistWithoutArticle(song)
    );
  };
}
