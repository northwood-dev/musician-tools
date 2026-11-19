import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderSongs } from '../test/renderSongs';

// #187 / #201: / focuses the search, n opens Add a song, Esc goes back from a song.
jest.mock('../services/songService', () => ({
  ...jest.requireActual('../services/songService'),
  songService: {
    getAllSongs: jest.fn(),
    getSong: jest.fn(),
    updateSong: jest.fn().mockResolvedValue({ uid: 'song-a', title: 'Alpha', artist: 'A', instrument: ['Guitar'] }),
    createSong: jest.fn().mockResolvedValue({}),
    deleteSong: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../services/instrumentService', () => ({ instrumentService: { getAll: jest.fn().mockResolvedValue([]) } }));
jest.mock('../services/songPlayService', () => ({
  songPlayService: { getPlays: jest.fn().mockResolvedValue([]), getLastPlays: jest.fn().mockResolvedValue({}), markPlayed: jest.fn().mockResolvedValue({}), getLastPlayForInstrument: jest.fn() },
}));
jest.mock('../services/playlistService', () => ({
  playlistService: { getAllPlaylists: jest.fn().mockResolvedValue([]), addSongToPlaylist: jest.fn(), removeSongFromPlaylist: jest.fn(), updatePlaylist: jest.fn() },
}));
jest.mock('../services/profileService', () => ({
  profileService: { getProfile: jest.fn().mockResolvedValue({}), saveSonglistFilterSections: jest.fn() },
}));

import { songService } from '../services/songService';

const getAllSongs = songService.getAllSongs as jest.Mock;
const searchField = () => screen.getByPlaceholderText('Search by artist, title, or album…');
const press = (key: string, target: Element = document.body) => fireEvent.keyDown(target, { key });

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  getAllSongs.mockResolvedValue([{ uid: 'song-a', title: 'Alpha', artist: 'A', instrument: ['Guitar'] }]);
  (songService.getSong as jest.Mock).mockResolvedValue({ uid: 'song-a', title: 'Alpha', artist: 'A', instrument: ['Guitar'] });
});

test('/ puts the cursor in the Songlist search', async () => {
  renderSongs();
  await screen.findByText('Alpha');
  press('/');
  expect(searchField()).toHaveFocus();
});

test('n opens Add a song', async () => {
  const { router } = renderSongs();
  await screen.findByText('Alpha');
  press('n');
  await waitFor(() => expect(router.state.location.pathname).toBe('/songs/new'));
});

test('n and / typed in the search stay text', async () => {
  const { router } = renderSongs();
  await screen.findByText('Alpha');
  const field = searchField();
  field.focus();
  const typed = new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true });
  field.dispatchEvent(typed);
  expect(typed.defaultPrevented).toBe(false);
  expect(router.state.location.pathname).toBe('/songs');
});

test('the shortcuts are announced: aria-keyshortcuts and the "Add a song (N)" tooltip', async () => {
  renderSongs();
  await screen.findByText('Alpha');
  expect(searchField()).toHaveAttribute('aria-keyshortcuts', '/');
  const add = screen.getByRole('button', { name: 'Add a song' });
  expect(add).toHaveAttribute('aria-keyshortcuts', 'n');
  expect(add).toHaveAttribute('title', 'Add a song (N)');
});

test('Esc on a song goes back to the Songlist', async () => {
  const { router } = renderSongs();
  fireEvent.click(await screen.findByText('Alpha'));
  await waitFor(() => expect(router.state.location.pathname).toBe('/songs/song-a'));
  press('Escape');
  await waitFor(() => expect(router.state.location.pathname).toBe('/songs'));
});

test('Esc on a song whose title was emptied asks first, like the Back button', async () => {
  const { router } = renderSongs();
  fireEvent.click(await screen.findByText('Alpha'));
  fireEvent.change(await screen.findByLabelText('Title'), { target: { value: '' } });
  press('Escape');
  await screen.findByText(/no title anymore/i);
  expect(router.state.location.pathname).toBe('/songs/song-a');
});

test('n and / do nothing on a song; Esc does nothing on the list', async () => {
  const { router } = renderSongs();
  await screen.findByText('Alpha');
  press('Escape');
  expect(router.state.location.pathname).toBe('/songs');

  fireEvent.click(screen.getByText('Alpha'));
  await waitFor(() => expect(router.state.location.pathname).toBe('/songs/song-a'));
  press('n');
  expect(router.state.location.pathname).toBe('/songs/song-a');
});

// #187 review fixes.
test('Esc works with the cursor in a field, and saves the last edit first, like the Back button', async () => {
  const { router } = renderSongs();
  fireEvent.click(await screen.findByText('Alpha'));
  const artist = await screen.findByLabelText('Artist');
  artist.focus();
  fireEvent.change(artist, { target: { value: 'Just typed' } });
  press('Escape', artist);
  await waitFor(() => expect(router.state.location.pathname).toBe('/songs'));
  expect(songService.updateSong).toHaveBeenCalledWith('song-a', expect.objectContaining({ artist: 'Just typed' }));
});

test('n works with a row checkbox focused (a checkbox is not a text field)', async () => {
  const { router } = renderSongs();
  const row = await screen.findByRole('checkbox', { name: /Alpha/ });
  row.focus();
  press('n', row);
  await waitFor(() => expect(router.state.location.pathname).toBe('/songs/new'));
});
