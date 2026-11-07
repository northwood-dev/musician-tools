import { screen, fireEvent, act, within } from '@testing-library/react';
import { renderSongs } from '../test/renderSongs';

jest.mock('../services/songService', () => ({
  songService: {
    getAllSongs: jest.fn().mockResolvedValue([
      { uid: 'song-a', title: 'Alpha', artist: 'A', instrument: ['Guitar'], durationSeconds: null },
    ]),
    getSong: jest.fn().mockResolvedValue({}),
    updateSong: jest.fn().mockResolvedValue({ uid: 'song-a', title: 'Alpha', artist: 'A', instrument: ['Guitar'] }),
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
  PlaylistConflictError: class extends Error {},
  playlistService: {
    getAllPlaylists: jest.fn(),
    createPlaylist: jest.fn(),
    updatePlaylist: jest.fn().mockResolvedValue({}),
  },
}));

import { playlistService } from '../services/playlistService';

const mockedPlaylists = playlistService as jest.Mocked<typeof playlistService>;

const warmups = { uid: 'p1', name: 'Warmups', songUids: ['song-a'] };
const gigSet = { uid: 'p2', name: 'Gig set', songUids: [] };

const settle = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });

const openPickerOfAlpha = async (playlists: unknown[]) => {
  mockedPlaylists.getAllPlaylists.mockResolvedValue(playlists as never);
  renderSongs();
  fireEvent.click(await screen.findByText('Alpha'));
  const field = await screen.findByPlaceholderText('Search, select or create a playlist');
  await settle();
  fireEvent.focus(field);
  return field;
};

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

test('searching the exact name of a selected playlist says it is already selected', async () => {
  const field = await openPickerOfAlpha([warmups, gigSet]);

  fireEvent.change(field, { target: { value: 'Warmups' } });

  expect(await screen.findByText('Already selected')).toBeInTheDocument();
  expect(screen.queryByText('No playlists found')).not.toBeInTheDocument();
});

test('with every playlist selected, the empty field says so too', async () => {
  await openPickerOfAlpha([warmups, { ...gigSet, songUids: ['song-a'] }]);

  expect(await screen.findByText('Already selected')).toBeInTheDocument();
});

test('with no playlist at all, the picker invites to create the first one', async () => {
  await openPickerOfAlpha([]);

  expect(await screen.findByText('Type a name to create your first playlist')).toBeInTheDocument();
  expect(screen.queryByText('Already selected')).not.toBeInTheDocument();
});

test('a new name still offers the Create option', async () => {
  const field = await openPickerOfAlpha([warmups, gigSet]);

  fireEvent.change(field, { target: { value: 'Warm' } });

  expect(await screen.findByText('Create playlist "Warm"')).toBeInTheDocument();
  expect(screen.queryByText('Already selected')).not.toBeInTheDocument();
});

test('available playlists are listed and selected ones stay out of the list', async () => {
  await openPickerOfAlpha([warmups, gigSet]);

  const list = await screen.findByRole('listbox');

  expect(within(list).getByText('Gig set')).toBeInTheDocument();
  expect(within(list).queryByText('Warmups')).not.toBeInTheDocument();
  expect(screen.queryByText('Already selected')).not.toBeInTheDocument();
});
