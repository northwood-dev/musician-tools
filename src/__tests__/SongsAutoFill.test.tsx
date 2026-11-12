import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderSongs } from '../test/renderSongs';
import { songService } from '../services/songService';

jest.mock('../services/songService', () => ({
  ...jest.requireActual('../services/songService'),
  songService: {
    getAllSongs: jest.fn().mockResolvedValue([{ uid: 'song-a', title: 'Creep', artist: 'Radiohead', instrument: ['Guitar'] }]),
    updateSong: jest.fn().mockResolvedValue({ uid: 'song-a', title: 'Creep', artist: 'Radiohead', instrument: ['Guitar'] }),
    createSong: jest.fn().mockResolvedValue({}),
    deleteSong: jest.fn().mockResolvedValue(undefined),
    getSong: jest.fn().mockResolvedValue({}),
    lookupMetadata: jest.fn().mockResolvedValue({ source: 'lastfm', album: 'Pablo Honey' }),
  },
}));
jest.mock('../services/instrumentService', () => ({ instrumentService: { getAll: jest.fn().mockResolvedValue([]) } }));
jest.mock('../services/songPlayService', () => ({
  songPlayService: { getPlays: jest.fn().mockResolvedValue([]), markPlayed: jest.fn().mockResolvedValue({}), getLastPlayForInstrument: jest.fn() },
}));
jest.mock('../services/playlistService', () => ({
  playlistService: { getAllPlaylists: jest.fn().mockResolvedValue([]), addSongToPlaylist: jest.fn(), removeSongFromPlaylist: jest.fn(), updatePlaylist: jest.fn() },
}));

test('auto-fill fills metadata but adds no streaming link (#107)', async () => {
  renderSongs();
  fireEvent.click(await screen.findByText('Creep'));

  fireEvent.click(screen.getByRole('button', { name: /Auto-fill/ }));

  // The auto-save sends what auto-fill put in the form.
  const updateSong = songService.updateSong as jest.Mock;
  await waitFor(() => expect(updateSong).toHaveBeenCalledWith('song-a', expect.objectContaining({ album: 'Pablo Honey' })), { timeout: 2500 });
  const saved = updateSong.mock.calls.at(-1)[1];
  expect(saved.streamingLinks ?? []).toEqual([]);
  expect(screen.queryByTitle('Remove link')).toBeNull();
});
