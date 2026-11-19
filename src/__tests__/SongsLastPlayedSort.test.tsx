import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderSongs } from '../test/renderSongs';

// Two guitar songs whose most recent guitar play differs by a day
const SONGS = [
  { uid: 'song-a', title: 'Alpha', artist: 'A', instrument: ['Guitar'], lastPlayed: '2026-03-01T10:00:00.000Z' },
  { uid: 'song-b', title: 'Bravo', artist: 'B', instrument: ['Guitar'], lastPlayed: '2026-03-02T10:00:00.000Z' },
];

const PLAYS: Record<string, unknown[]> = {
  'song-a': [{ uid: 'pa', songUid: 'song-a', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-01T10:00:00.000Z' }],
  'song-b': [{ uid: 'pb', songUid: 'song-b', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-02T10:00:00.000Z' }],
};

jest.mock('../services/songService', () => ({
  songService: {
    getAllSongs: jest.fn().mockResolvedValue([
      { uid: 'song-a', title: 'Alpha', artist: 'A', instrument: ['Guitar'], lastPlayed: '2026-03-01T10:00:00.000Z' },
      { uid: 'song-b', title: 'Bravo', artist: 'B', instrument: ['Guitar'], lastPlayed: '2026-03-02T10:00:00.000Z' },
    ]),
    updateSong: jest.fn().mockResolvedValue({}),
    createSong: jest.fn().mockResolvedValue({}),
    deleteSong: jest.fn().mockResolvedValue(undefined),
    getSong: jest.fn().mockResolvedValue({ uid: 'song-a', title: 'Alpha', artist: 'A', instrument: ['Guitar'] }),
  },
}));

jest.mock('../services/instrumentService', () => ({
  instrumentService: { getAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../services/songPlayService', () => ({
  songPlayService: {
    getPlays: jest.fn((uid: string) => Promise.resolve(PLAYS[uid] ?? [])),
    markPlayed: jest.fn().mockResolvedValue({}),
    getLastPlayForInstrument: jest.fn(),
  },
}));

jest.mock('../services/playlistService', () => ({
  playlistService: { getAllPlaylists: jest.fn().mockResolvedValue([]) },
}));


function rowTitlesInOrder(): string[] {
  const rows = screen.getAllByRole('row').slice(1); // drop the header row
  return rows
    .map(row => {
      const cells = within(row).queryAllByRole('cell');
      return cells.length >= 3 ? cells[2].textContent?.trim() ?? '' : '';
    })
    .filter(Boolean);
}

describe('Songs — last played sort with an active instrument filter', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    // northwood's exact setup: filtering by Guitar, sorting by last played
    localStorage.setItem('songsInstrumentFilter', 'Guitar');
    localStorage.setItem('songsSortColumn', 'lastPlayed');
    localStorage.setItem('songsSortDirection', 'asc');
  });

  test('toggling the Last played header reorders the rows (per-instrument times)', async () => {
    renderSongs();

    // Wait for the rows to be present
    await screen.findByText('Alpha');
    await waitFor(() => expect(SONGS.length).toBe(2));

    // asc: the older guitar play (Alpha, Mar 1) comes before the newer (Bravo)
    expect(rowTitlesInOrder()).toEqual(['Alpha', 'Bravo']);

    // Toggle to desc via the header
    fireEvent.click(screen.getByText('Last played'));

    await waitFor(() => expect(rowTitlesInOrder()).toEqual(['Bravo', 'Alpha']));
  });

  test('4.2: a journal-entry play (noon UTC, session instrument) surfaces as the last played', async () => {
    // The frontend cannot distinguish a journal play from a mark-as-played one:
    // both are SongPlays carrying an instrumentType. A play minted by a session
    // entry (noon UTC of the session day) drives the per-instrument last played.
    PLAYS['song-a'] = [{ uid: 'pa', songUid: 'song-a', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-04-20T12:00:00.000Z' }];
    PLAYS['song-b'] = [{ uid: 'pb', songUid: 'song-b', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-04-21T12:00:00.000Z' }];

    renderSongs();
    await screen.findByText('Alpha');

    expect(rowTitlesInOrder()).toEqual(['Alpha', 'Bravo']); // asc by the journal-play day
    fireEvent.click(screen.getByText('Last played'));
    await waitFor(() => expect(rowTitlesInOrder()).toEqual(['Bravo', 'Alpha']));

    PLAYS['song-a'] = [{ uid: 'pa', songUid: 'song-a', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-01T10:00:00.000Z' }];
    PLAYS['song-b'] = [{ uid: 'pb', songUid: 'song-b', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-02T10:00:00.000Z' }];
  });

  test('4.2/AC2: an older journal play never pulls the per-instrument last played backward', async () => {
    // song-a has a recent Guitar play (Jan 15); song-b has a more recent one
    // (Jan 20) PLUS an older one (Dec 01) — the older play must not win. Plays
    // arrive newest-first (server order), so the derivation takes index 0.
    PLAYS['song-a'] = [{ uid: 'pa', songUid: 'song-a', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-01-15T12:00:00.000Z' }];
    PLAYS['song-b'] = [
      { uid: 'pb2', songUid: 'song-b', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-01-20T12:00:00.000Z' },
      { uid: 'pb1', songUid: 'song-b', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2025-12-01T12:00:00.000Z' },
    ];

    renderSongs();
    await screen.findByText('Alpha');

    // asc: song-a (Jan 15) before song-b (Jan 20) — Bravo's Dec play did NOT
    // make it sort as December (which would put it first)
    expect(rowTitlesInOrder()).toEqual(['Alpha', 'Bravo']);

    PLAYS['song-a'] = [{ uid: 'pa', songUid: 'song-a', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-01T10:00:00.000Z' }];
    PLAYS['song-b'] = [{ uid: 'pb', songUid: 'song-b', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-02T10:00:00.000Z' }];
  });

  test('stale identical per-instrument timestamps still reorder via the global lastPlayed tiebreak', async () => {
    // Both guitar plays collide on the exact same timestamp (the old noon-UTC
    // data), but the global lastPlayed differs — the sort must not look frozen
    PLAYS['song-a'] = [{ uid: 'pa', songUid: 'song-a', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-10T12:00:00.000Z' }];
    PLAYS['song-b'] = [{ uid: 'pb', songUid: 'song-b', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-10T12:00:00.000Z' }];

    renderSongs();
    await screen.findByText('Alpha');

    // asc by global lastPlayed: Alpha (Mar 1) before Bravo (Mar 2)
    expect(rowTitlesInOrder()).toEqual(['Alpha', 'Bravo']);

    fireEvent.click(screen.getByText('Last played'));
    await waitFor(() => expect(rowTitlesInOrder()).toEqual(['Bravo', 'Alpha']));

    // restore for other tests
    PLAYS['song-a'] = [{ uid: 'pa', songUid: 'song-a', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-01T10:00:00.000Z' }];
    PLAYS['song-b'] = [{ uid: 'pb', songUid: 'song-b', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-02T10:00:00.000Z' }];
  });
});

// #242: plays that didn't load are said once for the page, with a Retry that reloads only them;
// a song whose plays are unknown shows "?" (not "-", which means never played).
import { songPlayService } from '../services/songPlayService';
const getPlays = songPlayService.getPlays as jest.Mock;
const PLAYS_FAILED = "Couldn't load when your songs were last played.";
const lastPlayedCell = (title: string) => within(screen.getByText(title).closest('tr')!).getAllByRole('cell').at(-1)!;

describe('Songs — plays that did not load (#242)', () => {
  const plays = (uid: string) => Promise.resolve(PLAYS[uid] ?? []);
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    localStorage.setItem('songsInstrumentFilter', 'Guitar');
    PLAYS['song-a'] = [{ uid: 'pa', songUid: 'song-a', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-01T10:00:00.000Z' }];
    PLAYS['song-b'] = [{ uid: 'pb', songUid: 'song-b', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-02T10:00:00.000Z' }];
    getPlays.mockImplementation((uid: string) => (uid === 'song-a' ? Promise.reject(new Error('network')) : plays(uid)));
  });
  afterEach(() => { getPlays.mockImplementation(plays); });

  test('says so once, with Retry, and the song shows "?" instead of "-"', async () => {
    renderSongs();
    expect(await screen.findByText(PLAYS_FAILED)).toBeInTheDocument();
    expect(lastPlayedCell('Alpha')).toHaveTextContent('?');
    expect(lastPlayedCell('Bravo')).toHaveTextContent('Mar 2, 2026');
  });

  test('sorted by Last played, a song with unknown plays goes last, whichever the direction', async () => {
    // Alpha's plays fail: by date it would come first in asc (Mar 1 < Mar 2).
    localStorage.setItem('songsSortColumn', 'lastPlayed');
    localStorage.setItem('songsSortDirection', 'asc');
    renderSongs();
    await screen.findByText(PLAYS_FAILED);
    expect(rowTitlesInOrder()).toEqual(['Bravo', 'Alpha']);
    fireEvent.click(screen.getByText('Last played'));
    await waitFor(() => expect(rowTitlesInOrder()).toEqual(['Bravo', 'Alpha']));
  });

  test('the song page says "?" for an instrument whose plays are unknown, not "-"', async () => {
    renderSongs('/songs/song-a');
    await screen.findByDisplayValue('Alpha');
    await screen.findByText(PLAYS_FAILED);
    expect(screen.getByText(/Last played:/)).toHaveTextContent('Last played: ?');
  });

  test('Mark as played on the song page reloads its plays: no more "?"', async () => {
    renderSongs('/songs/song-a');
    await screen.findByDisplayValue('Alpha');
    await screen.findByText(PLAYS_FAILED);
    getPlays.mockImplementation(plays);
    fireEvent.click(screen.getByRole('button', { name: 'Mark as played' }));
    await waitFor(() => expect(screen.getByText(/Last played:/)).toHaveTextContent('Last played: Mar 1, 2026'));
    expect(screen.queryByText(PLAYS_FAILED)).toBeNull();
  });

  test('Retry reloads the plays: the date comes back and the notice goes', async () => {
    renderSongs();
    await screen.findByText(PLAYS_FAILED);
    getPlays.mockImplementation(plays);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(lastPlayedCell('Alpha')).toHaveTextContent('Mar 1, 2026'));
    expect(screen.queryByText(PLAYS_FAILED)).toBeNull();
  });
});

// #242: instruments that didn't load are said too, with the same Retry; the "My instrument"
// filter would otherwise just be empty.
import { instrumentService } from '../services/instrumentService';
const getInstruments = instrumentService.getAll as jest.Mock;
const STRAT = { uid: 'i1', userUid: 'u1', type: 'Guitar', name: 'My Strat', brand: null, model: null };

describe('Songs — instruments that did not load (#242)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    getPlays.mockImplementation((uid: string) => Promise.resolve(PLAYS[uid] ?? []));
    getInstruments.mockRejectedValue(new Error('network'));
  });
  afterEach(() => { getInstruments.mockResolvedValue([]); });

  test('says so, and Retry brings them into the My instrument filter', async () => {
    renderSongs();
    expect(await screen.findByText("Couldn't load your instruments.")).toBeInTheDocument();
    getInstruments.mockResolvedValue([STRAT]);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('option', { name: 'Guitar - My Strat' })).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load your instruments.")).toBeNull();
  });

  test('a song opened directly says so too (its pickers depend on them)', async () => {
    renderSongs('/songs/song-a');
    await screen.findByDisplayValue('Alpha');
    expect(await screen.findByText("Couldn't load your instruments.")).toBeInTheDocument();
  });

  test('plays and instruments both missing: one notice says both', async () => {
    getPlays.mockImplementation((uid: string) => (uid === 'song-a' ? Promise.reject(new Error('network')) : Promise.resolve(PLAYS[uid] ?? [])));
    renderSongs();
    expect(await screen.findByText("Couldn't load when your songs were last played, nor your instruments.")).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(1);
  });
});

