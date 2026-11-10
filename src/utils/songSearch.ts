import type { ArtistAlias } from '../services/artistAliasService';
import type { Song } from '../services/songService';
import { artistKey, foldText } from './songDuplicate';
import { searchKey } from './searchKey';

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

  return song => {
    const songArtist = searchKey(song.artist);
    return (
      searchKey(song.title).includes(query) ||
      songArtist.includes(query) ||
      // Nothing left once the article is gone ("the ...") must not match everything.
      (artistQuery !== '' && songArtist.includes(artistQuery)) ||
      (aliasArtist !== '' && songArtist.includes(aliasArtist)) ||
      searchKey(song.album).includes(query) ||
      searchKey(`${song.artist ?? ''}${song.title ?? ''}`).includes(query)
    );
  };
}
