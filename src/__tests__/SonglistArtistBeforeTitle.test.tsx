import { fireEvent, screen } from '@testing-library/react';
import { renderSongs } from '../test/renderSongs';

// #231: the Songlist shows the artist before the title (rule in CLAUDE.md, #229).
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
  songPlayService: { getPlays: jest.fn().mockResolvedValue([]), markPlayed: jest.fn(), getLastPlayForInstrument: jest.fn() },
}));
jest.mock('../services/playlistService', () => ({
  playlistService: { getAllPlaylists: jest.fn().mockResolvedValue([]), addSongToPlaylist: jest.fn() },
}));

import { songService } from '../services/songService';

const mockedSongs = songService as jest.Mocked<typeof songService>;
const wonderwall = { uid: 'song-w', title: 'Wonderwall', artist: 'Oasis', instrument: null };

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockedSongs.getAllSongs.mockResolvedValue([wonderwall] as never);
});

test("a row's checkbox is named artist first", async () => {
  renderSongs();
  expect(await screen.findByRole('checkbox', { name: 'Select Oasis — Wonderwall' })).toBeInTheDocument();
});

test('the duplicate warning names the existing song artist first', async () => {
  renderSongs('/songs/new');
  fireEvent.change(await screen.findByLabelText('Artist'), { target: { value: 'Oasis' } });
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Wonderwall' } });
  const warning = await screen.findByText(/already exists in your songlist/);
  expect(warning.textContent).toBe('"Oasis — Wonderwall" already exists in your songlist.');
});

test('auto-fill asks for the artist and the title, in the form order', async () => {
  renderSongs('/songs/new');
  expect(await screen.findByText('Artist + title required')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Artist'), { target: { value: 'Oasis' } });
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Auto-fill metadata' }));
  expect(await screen.findByRole('status', { name: 'Notification' })).toHaveTextContent('Add an artist and a title to auto-fill.');
});

// Guards: already true when #231 started, kept so they can't flip back.
test('the table puts the Artist column before Title', async () => {
  renderSongs();
  await screen.findByText('Wonderwall');
  const headers = screen.getAllByRole('columnheader').map(h => h.textContent?.trim());
  expect(headers.indexOf('Artist')).toBeGreaterThan(-1);
  expect(headers.indexOf('Artist')).toBeLessThan(headers.indexOf('Title'));
});

test('the song form puts the Artist field before Title', async () => {
  renderSongs('/songs/new');
  const artist = await screen.findByLabelText('Artist');
  const title = screen.getByLabelText('Title');
  expect(artist.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
