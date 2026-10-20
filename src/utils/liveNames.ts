import type { Song } from '../services/songService';
import type { Topic } from '../services/topicService';

// The live names behind session entries (#13 songs, #16 topics): an entry shows
// these over its snapshot label while its song or topic still exists.
export type SongNames = Pick<Song, 'title' | 'artist'>;
export interface LiveNames {
  songs: ReadonlyMap<string, SongNames>;
  // topicUid -> name
  topics: ReadonlyMap<string, string>;
}

export function toLiveNames(songs: readonly Song[], topics: readonly Topic[]): LiveNames {
  return {
    songs: new Map(songs.map(song => [song.uid, song])),
    topics: new Map(topics.map(topic => [topic.uid, topic.name])),
  };
}
