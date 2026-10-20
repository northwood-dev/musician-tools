import type { SessionItem } from '../services/practiceSessionService';
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

// #16: My topics opens ?edit=<uid> in edit mode.
export const TOPIC_EDIT_PARAM = 'edit';

export interface ResolvedEntry {
  // Where the entry links to; null for an orphan (its song or topic was deleted).
  to: string | null;
  artist?: string;
  name: string;
  isOrphan: boolean;
}

// The one place a session entry is told apart (song / topic / orphan): its link
// and its live names, the snapshot label standing in when they are not loaded.
export function resolveEntry(item: SessionItem, liveNames: LiveNames): ResolvedEntry {
  if (item.songUid) {
    const song = liveNames.songs.get(item.songUid);
    return { to: `/songs/${item.songUid}`, artist: song?.artist || undefined, name: song?.title || item.label, isOrphan: false };
  }
  if (item.topicUid) {
    return {
      to: `/my-topics?${TOPIC_EDIT_PARAM}=${item.topicUid}`,
      name: liveNames.topics.get(item.topicUid) || item.label,
      isOrphan: false,
    };
  }
  return { to: null, name: item.label, isOrphan: true };
}
