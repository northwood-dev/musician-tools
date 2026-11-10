import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { playlistService, type Playlist } from '../services/playlistService';

/** A copy of `set` with `uid` in it, or not. */
export const withMember = (set: Set<string>, uid: string, isIn: boolean): Set<string> => {
  const next = new Set(set);
  if (isIn) next.add(uid); else next.delete(uid);
  return next;
};

// A song's membership of one playlist while it is being saved.
type Saving = {
  wantedIn: boolean; // the user's last click
  savedIn: boolean; // what the server last said
  slow: boolean; // in flight for more than 300 ms (#92)
  slowTimer: number;
};

const SLOW_AFTER_MS = 300;

/**
 * Saves the open song's playlist ticks as they are clicked (story 13.1).
 *
 * #60: the last click wins. Per song and playlist, at most one request is in flight; when it
 * answers, one more is sent only if the user clicked meanwhile and their last choice differs
 * from what the server saved. A failure puts the playlist back as the server has it and drops
 * the clicks made meanwhile. The selection shows the last choice; the page's playlist list
 * holds the server's, through `onSaved`.
 *
 * #92: the playlists being saved keep their chip (unticked meanwhile: being removed), and the
 * ones saving for more than 300 ms show a spinner. Answers landing while their song is closed
 * don't touch the chips: they are rebuilt from what is still in flight when a song opens.
 */
export function usePlaylistMembership({
  openSongUid,
  openSongUidRef,
  selectedPlaylistUids,
  setSelectedPlaylistUids,
  onSaved,
  onFailed,
}: {
  openSongUid: string | null;
  openSongUidRef: MutableRefObject<string | null>;
  selectedPlaylistUids: Set<string>;
  setSelectedPlaylistUids: Dispatch<SetStateAction<Set<string>>>;
  onSaved: (playlist: Playlist) => void;
  onFailed: () => void;
}) {
  // songUid → playlistUid → membership being saved.
  const savingRef = useRef(new Map<string, Map<string, Saving>>());
  const [savingPlaylistUids, setSavingPlaylistUids] = useState<Set<string>>(new Set());
  const [slowPlaylistUids, setSlowPlaylistUids] = useState<Set<string>>(new Set());

  const savingFor = (songUid: string) => savingRef.current.get(songUid) ?? new Map<string, Saving>();

  // Chips and selection belong to the open song only.
  const forOpenSong = (songUid: string, update: () => void) => {
    if (openSongUidRef.current === songUid) update();
  };
  const setChipFlag = (
    setter: Dispatch<SetStateAction<Set<string>>>,
    songUid: string,
    playlistUid: string,
    on: boolean,
  ) => forOpenSong(songUid, () => setter(prev => withMember(prev, playlistUid, on)));

  useEffect(() => {
    const saving = openSongUid ? [...savingFor(openSongUid).entries()] : [];
    setSavingPlaylistUids(new Set(saving.map(([playlistUid]) => playlistUid)));
    setSlowPlaylistUids(new Set(saving.filter(([, s]) => s.slow).map(([playlistUid]) => playlistUid)));
  }, [openSongUid]);

  const end = (songUid: string, playlistUid: string) => {
    const songSaving = savingFor(songUid);
    window.clearTimeout(songSaving.get(playlistUid)?.slowTimer);
    songSaving.delete(playlistUid);
    if (songSaving.size === 0) savingRef.current.delete(songUid);
    setChipFlag(setSlowPlaylistUids, songUid, playlistUid, false);
    setChipFlag(setSavingPlaylistUids, songUid, playlistUid, false);
  };

  const sync = async (songUid: string, playlistUid: string, saving: Saving) => {
    const showSaved = () =>
      forOpenSong(songUid, () => setSelectedPlaylistUids(prev => withMember(prev, playlistUid, saving.savedIn)));
    const sent = saving.wantedIn;
    try {
      const updated = sent
        ? await playlistService.addSongToPlaylist(playlistUid, songUid)
        : await playlistService.removeSongFromPlaylist(playlistUid, songUid);
      onSaved(updated);
      saving.savedIn = !!updated.songUids?.includes(songUid);
      // Only a click made meanwhile sends another request: an answer that doesn't reflect the
      // request is shown as is, never retried in a loop.
      if (saving.wantedIn !== sent && saving.wantedIn !== saving.savedIn) {
        await sync(songUid, playlistUid, saving);
        return;
      }
      end(songUid, playlistUid);
      showSaved();
    } catch (err) {
      console.error(err);
      end(songUid, playlistUid); // clicks made meanwhile go with the failed request
      showSaved(); // back to what the server has
      onFailed();
    }
  };

  /** Ticks or unticks a playlist for the open song, and saves it. */
  const togglePlaylist = (playlistUid: string) => {
    const songUid = openSongUid;
    if (songUid === null) return; // the picker only exists on an open song
    const wasIn = selectedPlaylistUids.has(playlistUid);
    setSelectedPlaylistUids(prev => withMember(prev, playlistUid, !wasIn));
    const inFlight = savingFor(songUid).get(playlistUid);
    if (inFlight) {
      inFlight.wantedIn = !wasIn; // the request in flight picks it up
      return;
    }
    const saving: Saving = {
      wantedIn: !wasIn,
      savedIn: wasIn,
      slow: false,
      slowTimer: window.setTimeout(() => {
        saving.slow = true; // remembered for when the song is reopened
        setChipFlag(setSlowPlaylistUids, songUid, playlistUid, true);
      }, SLOW_AFTER_MS),
    };
    savingRef.current.set(songUid, savingFor(songUid).set(playlistUid, saving));
    setChipFlag(setSavingPlaylistUids, songUid, playlistUid, true);
    void sync(songUid, playlistUid, saving);
  };

  /** A song's selection as the server has it, corrected by its clicks still being saved. */
  // Stable: it only reads the ref, so the page's seeding effect can depend on it.
  const withClicksBeingSaved = useCallback((songUid: string, serverSelection: Set<string>): Set<string> => {
    const selection = new Set(serverSelection);
    savingRef.current.get(songUid)?.forEach((saving, playlistUid) => {
      if (saving.wantedIn) selection.add(playlistUid); else selection.delete(playlistUid);
    });
    return selection;
  }, []);

  return { togglePlaylist, savingPlaylistUids, slowPlaylistUids, withClicksBeingSaved };
}
