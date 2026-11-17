import { screen, fireEvent, within } from '@testing-library/react';
import { renderSongs } from '../test/renderSongs';

// #188 / #194: the active filters show as removable chips in the Search card.
jest.mock('../services/songService', () => ({
  SongsGoneError: class extends Error {},
  songService: {
    getAllSongs: jest.fn(),
    getSong: jest.fn().mockResolvedValue({}),
    updateSong: jest.fn().mockResolvedValue({}),
    createSong: jest.fn().mockResolvedValue({}),
    deleteSong: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../services/instrumentService', () => ({
  instrumentService: { getAll: jest.fn().mockResolvedValue([]) },
}));
jest.mock('../services/songPlayService', () => ({
  songPlayService: {
    getPlays: jest.fn().mockResolvedValue([]),
    markPlayed: jest.fn().mockResolvedValue({}),
    getLastPlayForInstrument: jest.fn(),
  },
}));
jest.mock('../services/playlistService', () => ({
  playlistService: { getAllPlaylists: jest.fn().mockResolvedValue([]), addSongToPlaylist: jest.fn() },
}));

import { songService } from '../services/songService';

const mockedSongs = songService as jest.Mocked<typeof songService>;

const rockFast = { uid: 'song-a', title: 'Alpha', artist: 'A', genre: ['Rock'], bpm: 120, instrument: ['Guitar'], capo: 2 };
const jazzSlow = { uid: 'song-b', title: 'Beta', artist: 'B', genre: ['Jazz'], bpm: 60, instrument: null };

const saved = (filters: Record<string, string>) =>
  Object.entries(filters).forEach(([key, value]) => localStorage.setItem(key, value));
const chipRow = () => screen.queryByRole('group', { name: 'Active filters' });
const chipLabels = () =>
  within(chipRow()!).queryAllByRole('button', { name: /^Remove / }).map(b => b.getAttribute('aria-label'));

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockedSongs.getAllSongs.mockResolvedValue([rockFast, jazzSlow] as never);
});

test('no chip row while no filter is active, nor for a search alone', async () => {
  saved({ songsSearchQuery: 'Al' });
  renderSongs();
  await screen.findByText('Alpha');
  expect(chipRow()).not.toBeInTheDocument();
});

test('the active filters show as chips inside the Search card, one per value, in sidebar order', async () => {
  saved({ songsGenreFilters: JSON.stringify(['Rock', 'Jazz']), songsGenreMatchMode: 'any', songsBpmMinFilter: '90', songsKeyFilter: '' });
  renderSongs();
  await screen.findByText('Alpha');
  const searchCard = screen.getByPlaceholderText('Search by title, artist, or album…').closest('.card-base')!;
  expect(within(searchCard as HTMLElement).getByRole('group', { name: 'Active filters' })).toBeInTheDocument();
  expect(chipLabels()).toEqual(['Remove Rock', 'Remove Jazz', 'Remove ≥ 90 BPM']);
  expect(screen.queryByText('Beta')).not.toBeInTheDocument();
});

test('a chip removes its filter, the list updates, and the match mode is kept', async () => {
  saved({ songsGenreFilters: JSON.stringify(['Rock', 'Jazz']), songsGenreMatchMode: 'any', songsBpmMinFilter: '90' });
  renderSongs();
  await screen.findByText('Alpha');

  fireEvent.click(screen.getByRole('button', { name: 'Remove ≥ 90 BPM' }));
  expect(await screen.findByText('Beta')).toBeInTheDocument();
  expect(chipLabels()).toEqual(['Remove Rock', 'Remove Jazz']);

  fireEvent.click(screen.getByRole('button', { name: 'Remove Jazz' }));
  expect(chipLabels()).toEqual(['Remove Rock']);
  expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Any', checked: true })).toHaveAttribute('name', 'genre-match-mode');
});

test('removing the song instrument also drops the chips that depend on it', async () => {
  saved({ songsInstrumentFilter: 'Guitar', songsCapoFilter: '2', songsInstrumentDifficultyFilter: '3', songsKeyFilter: 'C' });
  renderSongs();
  await screen.findByRole('group', { name: 'Active filters' });
  expect(chipLabels()).toEqual(['Remove Guitar', 'Remove Up to 3 ★', 'Remove Capo 2', 'Remove Key: C']);

  fireEvent.click(screen.getByRole('button', { name: 'Remove Guitar' }));
  expect(chipLabels()).toEqual(['Remove Key: C']);
});

test('"Clear all" at the end of the row clears every filter and the row goes away', async () => {
  saved({ songsGenreFilters: JSON.stringify(['Rock']), songsBpmMaxFilter: '100' });
  renderSongs();
  await screen.findByRole('group', { name: 'Active filters' });

  fireEvent.click(within(chipRow()!).getByRole('button', { name: 'Clear all' }));
  expect(await screen.findByText('Alpha')).toBeInTheDocument();
  expect(screen.getByText('Beta')).toBeInTheDocument();
  expect(chipRow()).not.toBeInTheDocument();
});

test('the chips stay visible when the desktop sidebar is collapsed', async () => {
  saved({ songsSidebarExpanded: 'false', songsKeyFilter: 'C' });
  renderSongs();
  expect(await screen.findByRole('button', { name: 'Remove Key: C' })).toBeInTheDocument();
});
