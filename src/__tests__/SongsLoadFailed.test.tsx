import { fireEvent, screen } from '@testing-library/react';
import { renderSongs } from '../test/renderSongs';
import { songService } from '../services/songService';

// #224: a Songlist that didn't load says so where the list goes, with Retry — never as an empty
// Songlist (the "Browse the Catalog" welcome), and not in the banner, which is for failed saves.

jest.mock('../services/songService', () => ({
  songService: {
    getAllSongs: jest.fn(),
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
  playlistService: { getAllPlaylists: jest.fn().mockResolvedValue([]) },
}));

const getAllSongs = songService.getAllSongs as jest.Mock;

beforeEach(() => { getAllSongs.mockReset(); });

test('says what did not load, with Retry — never the empty-Songlist welcome nor the banner', async () => {
  getAllSongs.mockRejectedValue(new Error('network'));
  renderSongs();
  expect(await screen.findByText("Couldn't load your songlist.")).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  expect(screen.queryByText('Your songlist is empty')).toBeNull();
  expect(screen.queryByText('Error while loading songs')).toBeNull();
});

test('Retry loads the songs', async () => {
  getAllSongs.mockRejectedValue(new Error('network'));
  renderSongs();
  const retry = await screen.findByRole('button', { name: 'Retry' });
  getAllSongs.mockResolvedValue([{ uid: 's1', title: 'Zombie', artist: 'The Cranberries' }]);
  fireEvent.click(retry);
  expect(await screen.findByText('Zombie')).toBeInTheDocument();
  expect(screen.queryByText("Couldn't load your songlist.")).toBeNull();
});
