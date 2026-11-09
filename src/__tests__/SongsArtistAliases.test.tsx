import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderSongs } from '../test/renderSongs';
import { artistAliasService } from '../services/artistAliasService';
import { songService } from '../services/songService';

// #76: the Songlist page loads the artist aliases once and searches with them.

jest.mock('../services/artistAliasService', () => ({
  artistAliasService: { list: jest.fn() },
}));
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

const aliases = artistAliasService.list as jest.Mock;
const songs = [
  { uid: 'a', title: 'Otherside', artist: 'Red Hot Chili Peppers', instrument: [] },
  { uid: 'b', title: 'Help!', artist: 'The Beatles', instrument: [] },
];

const search = (text: string) =>
  fireEvent.change(screen.getByPlaceholderText('Search by title, artist, or album...'), { target: { value: text } });

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (songService.getAllSongs as jest.Mock).mockResolvedValue(songs);
});

test('an alias typed in full finds its artist', async () => {
  aliases.mockResolvedValue([{ uid: '1', alias: 'RHCP', artist: 'Red Hot Chili Peppers' }]);
  renderSongs();
  await screen.findByText('Otherside');

  search('rhcp');

  await waitFor(() => expect(screen.getByText('Otherside')).toBeInTheDocument());
  await waitFor(() => expect(screen.queryByText('Help!')).toBeNull());
});

test('aliases failing to load leave the normal search working', async () => {
  aliases.mockRejectedValue(new Error('boom'));
  renderSongs();
  await screen.findByText('Otherside');

  search('beatles');
  await screen.findByText('Help!');
  await waitFor(() => expect(screen.queryByText('Otherside')).toBeNull());

  search('rhcp');
  await waitFor(() => expect(screen.queryByText('Help!')).toBeNull());
  expect(screen.queryByText('Otherside')).toBeNull();
});
