import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderSongs } from '../test/renderSongs';

jest.mock('../services/songService', () => ({
  songService: {
    getAllSongs: jest.fn().mockResolvedValue([
      { uid: 'song-a', title: 'Alpha', artist: 'A', instrument: ['Guitar'] },
      { uid: 'song-b', title: 'Beta', artist: 'B', instrument: ['Guitar'] },
    ]),
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
  playlistService: {
    getAllPlaylists: jest.fn(),
    addSongToPlaylist: jest.fn(),
  },
}));

import { playlistService } from '../services/playlistService';

const mockedPlaylists = playlistService as jest.Mocked<typeof playlistService>;

const selectSong = async (label: string) => {
  fireEvent.click(await screen.findByRole('checkbox', { name: new RegExp(label) }));
};

const openPicker = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Add to playlist' }));
  await screen.findByText('Select playlists');
};

const playlistBox = (name: string) => screen.getByRole('checkbox', { name: new RegExp(name) });

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockedPlaylists.getAllPlaylists.mockResolvedValue([
    { uid: 'p1', name: 'Warmups', songUids: [] },
    { uid: 'p2', name: 'Gig set', songUids: [] },
  ] as never);
  mockedPlaylists.addSongToPlaylist.mockResolvedValue(undefined as never);
});

describe('#46: the picker resets when the selection becomes empty', () => {
  test('deselecting every song closes the picker and clears its checkmarks', async () => {
    renderSongs();
    await selectSong('Alpha');
    await openPicker();
    fireEvent.click(playlistBox('Warmups'));

    await selectSong('Alpha');
    await selectSong('Beta');

    await screen.findByRole('button', { name: 'Add to playlist' });
    expect(screen.queryByText('Select playlists')).not.toBeInTheDocument();
    await openPicker();
    expect(playlistBox('Warmups')).not.toBeChecked();
  });

  test('clearing the selection with select-all does the same', async () => {
    renderSongs();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select all' }));
    await openPicker();
    fireEvent.click(playlistBox('Warmups'));

    fireEvent.click(screen.getByRole('checkbox', { name: 'Deselect all' }));
    await selectSong('Beta');

    await screen.findByRole('button', { name: 'Add to playlist' });
    expect(screen.queryByText('Select playlists')).not.toBeInTheDocument();
    await openPicker();
    expect(playlistBox('Warmups')).not.toBeChecked();
  });

  test('deleting the selected songs does the same', async () => {
    renderSongs();
    await selectSong('Alpha');
    await openPicker();
    fireEvent.click(playlistBox('Warmups'));

    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
    fireEvent.click(await screen.findByText('Delete', { selector: 'div[role="dialog"] button' }));
    await waitFor(() => expect(screen.queryByText('Alpha')).not.toBeInTheDocument());
    await selectSong('Beta');

    await screen.findByRole('button', { name: 'Add to playlist' });
    expect(screen.queryByText('Select playlists')).not.toBeInTheDocument();
    await openPicker();
    expect(playlistBox('Warmups')).not.toBeChecked();
  });
});
