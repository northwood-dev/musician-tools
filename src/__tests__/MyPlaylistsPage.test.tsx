import { fireEvent, render, screen } from '@testing-library/react';
import MyPlaylistsPage from '../pages/MyPlaylistsPage';
import { playlistService } from '../services/playlistService';
import { songService } from '../services/songService';
import { artistAliasService } from '../services/artistAliasService';

jest.mock('../services/playlistService', () => ({
  playlistService: {
    getAllPlaylists: jest.fn(),
    createPlaylist: jest.fn(),
    updatePlaylist: jest.fn(),
    deletePlaylist: jest.fn(),
  },
}));

jest.mock('../services/songService', () => ({
  songService: {
    getAllSongs: jest.fn(),
  },
}));

jest.mock('../services/artistAliasService', () => ({
  artistAliasService: {
    list: jest.fn(),
  },
}));

// useAuth only keeps the auth context alive here; a no-op stub is enough
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({}) }));

const mockedPlaylist = playlistService as jest.Mocked<typeof playlistService>;
const mockedSong = songService as jest.Mocked<typeof songService>;
const mockedAlias = artistAliasService as jest.Mocked<typeof artistAliasService>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedPlaylist.getAllPlaylists.mockResolvedValue([]);
  mockedSong.getAllSongs.mockResolvedValue([]);
  mockedAlias.list.mockResolvedValue([]);
});

test('a playlist song renders as "Artist - Title"', async () => {
  mockedSong.getAllSongs.mockResolvedValue([
    { uid: 'known-uid', title: 'Sweet Child', artist: "Guns N' Roses" } as never,
  ]);
  mockedPlaylist.getAllPlaylists.mockResolvedValue([
    { uid: 'pl-1', name: 'My set', songUids: ['known-uid'] } as never,
  ]);

  render(<MyPlaylistsPage />);

  expect(await screen.findByText("Guns N' Roses - Sweet Child")).toBeInTheDocument();
});

test('a playlist song with an empty artist renders as just the title, with no leading dash', async () => {
  mockedSong.getAllSongs.mockResolvedValue([
    { uid: 'no-artist-uid', title: 'Untitled Jam', artist: '' } as never,
  ]);
  mockedPlaylist.getAllPlaylists.mockResolvedValue([
    { uid: 'pl-1', name: 'My set', songUids: ['no-artist-uid'] } as never,
  ]);

  render(<MyPlaylistsPage />);

  // The title shows on its own...
  expect(await screen.findByText('Untitled Jam')).toBeInTheDocument();
  // ...and never as the orphaned "- Title" the un-guarded concatenation produced.
  expect(screen.queryByText('- Untitled Jam')).not.toBeInTheDocument();
});

test('Story 5.6: an orphan song UID (deleted song) is hidden, never shown as a raw hash', async () => {
  mockedSong.getAllSongs.mockResolvedValue([
    { uid: 'known-uid', title: 'Sweet Child', artist: "Guns N' Roses" } as never,
  ]);
  mockedPlaylist.getAllPlaylists.mockResolvedValue([
    { uid: 'pl-1', name: 'My set', songUids: ['known-uid', 'orphan-uid-1234'] } as never,
  ]);

  render(<MyPlaylistsPage />);

  // The known song appears once the catalog loads...
  expect(await screen.findByText("Guns N' Roses - Sweet Child")).toBeInTheDocument();
  // ...but the orphan UID is never rendered as a raw hash
  expect(screen.queryByText('orphan-uid-1234')).not.toBeInTheDocument();
});

test('Story 5.6 (review): when the song catalog fails to load, playlist songs are NOT blanked out', async () => {
  // Catalog load fails → we cannot tell orphans from valid songs, so the list
  // must keep showing the reference (degraded), never hide real content.
  mockedSong.getAllSongs.mockRejectedValue(new Error('Failed to load songs'));
  mockedPlaylist.getAllPlaylists.mockResolvedValue([
    { uid: 'pl-1', name: 'My set', songUids: ['known-uid'] } as never,
  ]);

  render(<MyPlaylistsPage />);

  // The reference is still rendered (as its UID, unresolved) rather than vanishing
  expect(await screen.findByText('known-uid')).toBeInTheDocument();
});

describe('#84: the song search of the playlist form finds a song as the Songlist does', () => {
  const openFormAndSearch = async (query: string) => {
    render(<MyPlaylistsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /create playlist/i }));
    fireEvent.change(screen.getByPlaceholderText('Search songs...'), { target: { value: query } });
  };

  test('"acdc" finds AC/DC, and only it', async () => {
    mockedSong.getAllSongs.mockResolvedValue([
      { uid: 's1', title: 'Back in Black', artist: 'AC/DC' } as never,
      { uid: 's2', title: 'Wonderwall', artist: 'Oasis' } as never,
    ]);

    await openFormAndSearch('acdc');

    expect(await screen.findByText('AC/DC - Back in Black')).toBeInTheDocument();
    expect(screen.queryByText('Oasis - Wonderwall')).not.toBeInTheDocument();
  });

  test('an artist alias typed in full ("rhcp") finds its artist', async () => {
    mockedAlias.list.mockResolvedValue([{ uid: 'a1', alias: 'RHCP', artist: 'Red Hot Chili Peppers' }]);
    mockedSong.getAllSongs.mockResolvedValue([
      { uid: 's1', title: 'Otherside', artist: 'Red Hot Chili Peppers' } as never,
      { uid: 's2', title: 'Wonderwall', artist: 'Oasis' } as never,
    ]);

    await openFormAndSearch('rhcp');

    expect(await screen.findByText('Red Hot Chili Peppers - Otherside')).toBeInTheDocument();
    expect(screen.queryByText('Oasis - Wonderwall')).not.toBeInTheDocument();
  });

  test('when the aliases fail to load, search still works and no error shows', async () => {
    mockedAlias.list.mockRejectedValue(new Error('network'));
    mockedSong.getAllSongs.mockResolvedValue([
      { uid: 's1', title: 'Back in Black', artist: 'AC/DC' } as never,
      { uid: 's2', title: 'Wonderwall', artist: 'Oasis' } as never,
    ]);

    await openFormAndSearch('acdc');

    expect(await screen.findByText('AC/DC - Back in Black')).toBeInTheDocument();
    expect(screen.queryByText('Oasis - Wonderwall')).not.toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });
});
