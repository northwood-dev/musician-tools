import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderSongs } from '../test/renderSongs';
import { songPlayService } from '../services/songPlayService';
import { instrumentService } from '../services/instrumentService';

// #242: what the Songlist loads besides the songs — each song's plays, the user's instruments.
// When some of it doesn't load, one notice says what is missing, with a Retry that asks again
// only for that; a song whose plays are unknown shows "?" (not "-", which means never played).

const PLAYS: Record<string, unknown[]> = {
  'song-a': [{ uid: 'pa', songUid: 'song-a', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-01T10:00:00.000Z' }],
  'song-b': [{ uid: 'pb', songUid: 'song-b', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-02T10:00:00.000Z' }],
};
// The songs whose plays requests fail, and whether the instruments request fails.
const failingPlays = new Set<string>();
let instrumentsFail = false;
const STRAT = { uid: 'i1', type: 'Guitar', name: 'My Strat' };

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
jest.mock('../services/instrumentService', () => ({ instrumentService: { getAll: jest.fn() } }));
jest.mock('../services/songPlayService', () => ({
  songPlayService: { getPlays: jest.fn(), markPlayed: jest.fn().mockResolvedValue({}), getLastPlayForInstrument: jest.fn() },
}));
jest.mock('../services/playlistService', () => ({
  playlistService: { getAllPlaylists: jest.fn().mockResolvedValue([]) },
}));

const getPlays = songPlayService.getPlays as jest.Mock;
const getInstruments = instrumentService.getAll as jest.Mock;

const PLAYS_FAILED = "Couldn't load when your songs were last played.";
const INSTRUMENTS_FAILED = "Couldn't load your instruments.";
const BOTH_FAILED = "Couldn't load when your songs were last played, nor your instruments.";
const retryButton = (name: RegExp | string) => screen.getByRole('button', { name });
const lastPlayedCell = (title: string) => within(screen.getByText(title).closest('tr')!).getAllByRole('cell').at(-1)!;
const formLastPlayed = () => screen.getByText(/Last played:/);
const rowTitlesInOrder = () => screen.getAllByRole('row').slice(1)
  .map(row => within(row).queryAllByRole('cell')[2]?.textContent?.trim() ?? '')
  .filter(Boolean);
const goTo = async (router: { navigate: (path: string) => Promise<void> }, path: string) => {
  await act(async () => { await router.navigate(path); });
};

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  localStorage.setItem('songsInstrumentFilter', 'Guitar');
  failingPlays.clear();
  instrumentsFail = false;
  getPlays.mockImplementation((uid: string) => (failingPlays.has(uid) ? Promise.reject(new Error('network')) : Promise.resolve(PLAYS[uid] ?? [])));
  getInstruments.mockImplementation(() => (instrumentsFail ? Promise.reject(new Error('network')) : Promise.resolve([STRAT])));
});

describe('plays that did not load', () => {
  beforeEach(() => { failingPlays.add('song-a'); });

  test('says so once, with Retry, and the song shows "?" instead of "-"', async () => {
    renderSongs();
    expect(await screen.findByText(PLAYS_FAILED)).toBeInTheDocument();
    expect(lastPlayedCell('Alpha')).toHaveTextContent('?');
    expect(lastPlayedCell('Bravo')).toHaveTextContent('Mar 2, 2026');
  });

  test('Retry asks again: the date comes back and the notice goes', async () => {
    renderSongs();
    await screen.findByText(PLAYS_FAILED);
    failingPlays.clear();
    fireEvent.click(retryButton('Retry loading when your songs were last played'));
    await waitFor(() => expect(lastPlayedCell('Alpha')).toHaveTextContent('Mar 1, 2026'));
    expect(screen.queryByText(PLAYS_FAILED)).toBeNull();
  });

  test('sorted by Last played with an instrument chosen, unknown plays go last, whichever the direction', async () => {
    // By date, Alpha (Mar 1) would come first in asc.
    localStorage.setItem('songsSortColumn', 'lastPlayed');
    localStorage.setItem('songsSortDirection', 'asc');
    renderSongs();
    await screen.findByText(PLAYS_FAILED);
    expect(rowTitlesInOrder()).toEqual(['Bravo', 'Alpha']);
    fireEvent.click(screen.getByText('Last played'));
    await waitFor(() => expect(rowTitlesInOrder()).toEqual(['Bravo', 'Alpha']));
  });

  test('without an instrument chosen (no dates shown), the sort is left as it was', async () => {
    localStorage.removeItem('songsInstrumentFilter');
    localStorage.setItem('songsSortColumn', 'lastPlayed');
    localStorage.setItem('songsSortDirection', 'asc');
    renderSongs();
    await screen.findByText(PLAYS_FAILED);
    expect(rowTitlesInOrder()).toEqual(['Alpha', 'Bravo']); // Alpha has no plays held: oldest
  });

  test('marking it as played in bulk loads its history: no more "?"', async () => {
    renderSongs();
    await screen.findByText(PLAYS_FAILED);
    failingPlays.clear();
    fireEvent.click(screen.getByRole('checkbox', { name: /Alpha/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark as played on Guitar' }));
    await waitFor(() => expect(lastPlayedCell('Alpha')).toHaveTextContent('Mar 1, 2026'));
    expect(screen.queryByText(PLAYS_FAILED)).toBeNull();
  });
});

describe("a song's page", () => {
  test('says "?" for an instrument whose plays are unknown, with the notice', async () => {
    failingPlays.add('song-a');
    renderSongs('/songs/song-a');
    await screen.findByDisplayValue('Alpha');
    expect(await screen.findByText(PLAYS_FAILED)).toBeInTheDocument();
    expect(formLastPlayed()).toHaveTextContent('Last played: ?');
  });

  test("its own plays loaded: their date, even if the list's request had failed", async () => {
    failingPlays.add('song-a');
    const { router } = renderSongs();
    await screen.findByText(PLAYS_FAILED);
    failingPlays.clear();
    await goTo(router, '/songs/song-a');
    await screen.findByDisplayValue('Alpha');
    await waitFor(() => expect(formLastPlayed()).toHaveTextContent('Last played: Mar 1, 2026'));
    expect(screen.queryByText(PLAYS_FAILED)).toBeNull();
  });

  test('its own plays failing: "?" and the notice, never "-"', async () => {
    const { router } = renderSongs();
    await screen.findByText('Alpha');
    failingPlays.add('song-a');
    await goTo(router, '/songs/song-a');
    await screen.findByDisplayValue('Alpha');
    expect(await screen.findByText(PLAYS_FAILED)).toBeInTheDocument();
    expect(formLastPlayed()).toHaveTextContent('Last played: ?');
  });

  test('Retry on the page brings back its date', async () => {
    failingPlays.add('song-a');
    renderSongs('/songs/song-a');
    await screen.findByText(PLAYS_FAILED);
    failingPlays.clear();
    fireEvent.click(retryButton('Retry loading when your songs were last played'));
    await waitFor(() => expect(formLastPlayed()).toHaveTextContent('Last played: Mar 1, 2026'));
  });

  test('Mark as played reloads its plays: no more "?"', async () => {
    failingPlays.add('song-a');
    renderSongs('/songs/song-a');
    await screen.findByText(PLAYS_FAILED);
    failingPlays.clear();
    fireEvent.click(screen.getByRole('button', { name: 'Mark as played' }));
    await waitFor(() => expect(formLastPlayed()).toHaveTextContent('Last played: Mar 1, 2026'));
    expect(screen.queryByText(PLAYS_FAILED)).toBeNull();
  });

  test('a new song says nothing about plays (it has none yet)', async () => {
    failingPlays.add('song-a');
    instrumentsFail = true;
    renderSongs('/songs/new');
    expect(await screen.findByText(INSTRUMENTS_FAILED)).toBeInTheDocument();
    expect(screen.queryByText(BOTH_FAILED)).toBeNull();
  });
});

describe('instruments that did not load', () => {
  beforeEach(() => { instrumentsFail = true; });

  test('says so, and Retry brings them into the My instrument filter', async () => {
    renderSongs();
    expect(await screen.findByText(INSTRUMENTS_FAILED)).toBeInTheDocument();
    instrumentsFail = false;
    fireEvent.click(retryButton('Retry loading your instruments'));
    expect(await screen.findByRole('option', { name: 'Guitar - My Strat' })).toBeInTheDocument();
    expect(screen.queryByText(INSTRUMENTS_FAILED)).toBeNull();
  });

  test("a song's page says so too (its pickers depend on them)", async () => {
    renderSongs('/songs/song-a');
    await screen.findByDisplayValue('Alpha');
    expect(await screen.findByText(INSTRUMENTS_FAILED)).toBeInTheDocument();
  });

  test('a failure answering after a success is ignored: only the latest request counts', async () => {
    instrumentsFail = false;
    let failLate!: (error: Error) => void;
    getInstruments
      .mockImplementationOnce(() => new Promise((_, reject) => { failLate = reject; }))
      .mockImplementation(() => Promise.resolve([STRAT]));
    renderSongs();
    expect(await screen.findByRole('option', { name: 'Guitar - My Strat' })).toBeInTheDocument();
    await act(async () => { failLate(new Error('network')); });
    expect(screen.queryByText(INSTRUMENTS_FAILED)).toBeNull();
  });
});

test('plays and instruments both missing: one notice says both, with one Retry', async () => {
  failingPlays.add('song-a');
  instrumentsFail = true;
  renderSongs();
  expect(await screen.findByText(BOTH_FAILED)).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^Retry/ })).toHaveLength(1);
  expect(retryButton('Retry loading when your songs were last played, and your instruments')).toBeInTheDocument();
});
