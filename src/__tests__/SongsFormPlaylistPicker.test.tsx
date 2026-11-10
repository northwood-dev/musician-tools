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
    addSongToPlaylist: jest.fn(),
    removeSongFromPlaylist: jest.fn(),
  },
}));

import { playlistService, type Playlist } from '../services/playlistService';

const mockedPlaylists = playlistService as jest.Mocked<typeof playlistService>;

const warmups: Playlist = { uid: 'p1', name: 'Warmups', songUids: ['song-a'] };
const gigSet: Playlist = { uid: 'p2', name: 'Gig set', songUids: [] };

const settle = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });

const openPickerWithPlaylists = async (playlists: Playlist[]) => {
  mockedPlaylists.getAllPlaylists.mockResolvedValue(playlists);
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
  const field = await openPickerWithPlaylists([warmups, gigSet]);

  fireEvent.change(field, { target: { value: 'Warmups' } });

  expect(await screen.findByText('Already selected')).toBeInTheDocument();
  expect(screen.queryByText('No playlists found')).not.toBeInTheDocument();
});

test('with every playlist selected, the empty field says so too', async () => {
  await openPickerWithPlaylists([warmups, { ...gigSet, songUids: ['song-a'] }]);

  expect(await screen.findByText('Already selected')).toBeInTheDocument();
});

test('with no playlist at all, the picker invites to create the first one', async () => {
  await openPickerWithPlaylists([]);

  expect(await screen.findByText('Type a name to create your first playlist')).toBeInTheDocument();
  expect(screen.queryByText('Already selected')).not.toBeInTheDocument();
});

test('the exact name in another case counts as the same playlist', async () => {
  const field = await openPickerWithPlaylists([warmups, gigSet]);

  fireEvent.change(field, { target: { value: 'WARMUPS' } });

  expect(await screen.findByText('Already selected')).toBeInTheDocument();
});

test('a name partly matching a selected playlist still offers the Create option', async () => {
  const field = await openPickerWithPlaylists([warmups, gigSet]);

  fireEvent.change(field, { target: { value: 'Warm' } });

  expect(await screen.findByText('Create playlist "Warm"')).toBeInTheDocument();
  expect(screen.queryByText('Already selected')).not.toBeInTheDocument();
});

test('a name matching nothing offers the Create option', async () => {
  const field = await openPickerWithPlaylists([warmups, gigSet]);

  fireEvent.change(field, { target: { value: 'Jazz' } });

  expect(await screen.findByText('Create playlist "Jazz"')).toBeInTheDocument();
  expect(screen.queryByText('Already selected')).not.toBeInTheDocument();
});

test('a search matching an available playlist lists it, with no message', async () => {
  const field = await openPickerWithPlaylists([warmups, gigSet]);

  fireEvent.change(field, { target: { value: 'Gig' } });

  expect(within(await screen.findByRole('listbox')).getByText('Gig set')).toBeInTheDocument();
  expect(screen.queryByText('Already selected')).not.toBeInTheDocument();
});

test('the exact name of a selected playlist that an available one contains lists that one', async () => {
  const rock: Playlist = { uid: 'p3', name: 'Rock', songUids: ['song-a'] };
  const rockBallads: Playlist = { uid: 'p4', name: 'Rock ballads', songUids: [] };
  const field = await openPickerWithPlaylists([rock, rockBallads]);

  fireEvent.change(field, { target: { value: 'Rock' } });

  expect(within(await screen.findByRole('listbox')).getByText('Rock ballads')).toBeInTheDocument();
  expect(screen.queryByText('Already selected')).not.toBeInTheDocument();
});

test('available playlists are listed and selected ones stay out of the list', async () => {
  await openPickerWithPlaylists([warmups, gigSet]);

  const list = await screen.findByRole('listbox');

  expect(within(list).getByText('Gig set')).toBeInTheDocument();
  expect(within(list).queryByText('Warmups')).not.toBeInTheDocument();
  expect(screen.queryByText('Already selected')).not.toBeInTheDocument();
});

describe('#56: the picker tells loading, failed and loaded apart', () => {
  // Opens the picker of song Alpha, with getAllPlaylists answered as the test chooses.
  const openPicker = async () => {
    renderSongs();
    fireEvent.click(await screen.findByText('Alpha'));
    const field = await screen.findByPlaceholderText('Search, select or create a playlist');
    await settle();
    fireEvent.focus(field);
    return field;
  };

  test('while the playlists load, it says so and does not invite to create a first one', async () => {
    mockedPlaylists.getAllPlaylists.mockReturnValue(new Promise(() => {}));

    await openPicker();

    expect(await screen.findByText('Loading playlists…')).toBeInTheDocument();
    expect(screen.queryByText('Type a name to create your first playlist')).not.toBeInTheDocument();
  });

  test('when they fail to load, it says so with Retry, and Retry shows them', async () => {
    mockedPlaylists.getAllPlaylists.mockRejectedValue(new Error('network'));

    await openPicker();

    expect(await screen.findByText("Couldn't load your playlists")).toBeInTheDocument();
    expect(screen.queryByText('Type a name to create your first playlist')).not.toBeInTheDocument();

    mockedPlaylists.getAllPlaylists.mockResolvedValue([warmups, gigSet]);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    fireEvent.focus(screen.getByPlaceholderText('Search, select or create a playlist'));

    expect(await screen.findByText('Gig set')).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load your playlists")).not.toBeInTheDocument();
  });

  test.each([
    ['loading', () => mockedPlaylists.getAllPlaylists.mockReturnValue(new Promise(() => {}))],
    ['failed', () => mockedPlaylists.getAllPlaylists.mockRejectedValue(new Error('network'))],
  ])('while %s, typing a name still offers to create it', async (_state, answer) => {
    answer();
    const field = await openPicker();

    fireEvent.change(field, { target: { value: 'Jazz' } });

    expect(await screen.findByText('Create playlist "Jazz"')).toBeInTheDocument();
  });

  // The chips under the field are the song's selected playlists.
  const chip = (name: string) => screen.queryByTitle(name);

  test('a successful Retry ticks the playlists the song is in', async () => {
    mockedPlaylists.getAllPlaylists.mockRejectedValue(new Error('network'));
    await openPicker();
    await screen.findByText("Couldn't load your playlists");

    mockedPlaylists.getAllPlaylists.mockResolvedValue([warmups, gigSet]);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByTitle('Warmups')).toBeInTheDocument();
    expect(chip('Gig set')).not.toBeInTheDocument();
  });

  test('with no playlist at all, creating one later does not re-tick another the user unticked', async () => {
    mockedPlaylists.getAllPlaylists.mockResolvedValue([]);
    const field = await openPicker();
    await screen.findByText('Type a name to create your first playlist');

    mockedPlaylists.createPlaylist.mockResolvedValueOnce({ uid: 'p-jazz', name: 'Jazz', songUids: ['song-a'] });
    fireEvent.change(field, { target: { value: 'Jazz' } });
    fireEvent.click(await screen.findByText('Create playlist "Jazz"'));
    mockedPlaylists.removeSongFromPlaylist.mockReturnValue(new Promise(() => {}));
    fireEvent.click(await screen.findByTitle('Jazz')); // untick: the server hasn't answered yet
    expect(chip('Jazz')).not.toBeInTheDocument();

    mockedPlaylists.createPlaylist.mockResolvedValueOnce({ uid: 'p-rock', name: 'Rock', songUids: ['song-a'] });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'Rock' } });
    fireEvent.click(await screen.findByText('Create playlist "Rock"'));

    expect(await screen.findByTitle('Rock')).toBeInTheDocument();
    expect(chip('Jazz')).not.toBeInTheDocument();
  });

  test('after a failed load, creating a playlist then a successful Retry still ticks the song\'s other playlists', async () => {
    mockedPlaylists.getAllPlaylists.mockRejectedValue(new Error('network'));
    const field = await openPicker();
    await screen.findByText("Couldn't load your playlists");

    const jazz: Playlist = { uid: 'p-jazz', name: 'Jazz', songUids: ['song-a'] };
    mockedPlaylists.createPlaylist.mockResolvedValueOnce(jazz);
    fireEvent.change(field, { target: { value: 'Jazz' } });
    fireEvent.click(await screen.findByText('Create playlist "Jazz"'));
    expect(await screen.findByTitle('Jazz')).toBeInTheDocument();

    mockedPlaylists.getAllPlaylists.mockResolvedValue([warmups, gigSet, jazz]);
    fireEvent.focus(field);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));

    expect(await screen.findByTitle('Warmups')).toBeInTheDocument();
    expect(chip('Jazz')).toBeInTheDocument();
    expect(chip('Gig set')).not.toBeInTheDocument();
  });
});

describe('#60: the last click on a playlist wins', () => {
  // Each add/remove request waits until the test answers it.
  type Pending = { kind: 'add' | 'remove'; playlistUid: string; resolve: (p: Playlist) => void; reject: (e: Error) => void };
  let pending: Pending[];
  const answer = (kind: 'add' | 'remove', playlistUid: string): Pending => {
    const found = pending.find(p => p.kind === kind && p.playlistUid === playlistUid);
    if (!found) throw new Error(`no pending ${kind} for ${playlistUid}`);
    pending = pending.filter(p => p !== found);
    return found;
  };
  const inFlight = (playlistUid: string) => pending.filter(p => p.playlistUid === playlistUid).length;

  beforeEach(() => {
    pending = [];
    const track = (kind: 'add' | 'remove') => (playlistUid: string) =>
      new Promise<Playlist>((resolve, reject) => { pending.push({ kind, playlistUid, resolve, reject }); });
    mockedPlaylists.addSongToPlaylist.mockImplementation(track('add'));
    mockedPlaylists.removeSongFromPlaylist.mockImplementation(track('remove'));
  });

  const chip = (name: string) => screen.queryByTitle(name);
  const pick = async (name: string) => {
    fireEvent.focus(screen.getByPlaceholderText('Search, select or create a playlist'));
    fireEvent.click(within(await screen.findByRole('listbox')).getByText(name));
  };

  test('select then unselect fast: one request at a time, and the song ends out of the playlist', async () => {
    await openPickerWithPlaylists([warmups, gigSet]);

    await pick('Gig set');
    fireEvent.click(await screen.findByTitle('Gig set'));

    expect(chip('Gig set')).not.toBeInTheDocument();
    expect(inFlight('p2')).toBe(1); // the remove waits for the add

    await act(async () => { answer('add', 'p2').resolve({ ...gigSet, songUids: ['song-a'] }); });
    expect(chip('Gig set')).not.toBeInTheDocument();
    expect(inFlight('p2')).toBe(1); // now the remove

    await act(async () => { answer('remove', 'p2').resolve({ ...gigSet, songUids: [] }); });
    expect(chip('Gig set')).not.toBeInTheDocument();
    expect(inFlight('p2')).toBe(0);
    expect(mockedPlaylists.removeSongFromPlaylist).toHaveBeenCalledTimes(1);
  });

  test('unselect then select fast: the song ends in the playlist', async () => {
    await openPickerWithPlaylists([warmups, gigSet]);

    fireEvent.click(await screen.findByTitle('Warmups'));
    await pick('Warmups');
    expect(chip('Warmups')).toBeInTheDocument();
    expect(inFlight('p1')).toBe(1);

    await act(async () => { answer('remove', 'p1').resolve({ ...warmups, songUids: [] }); });
    await act(async () => { answer('add', 'p1').resolve(warmups); });

    expect(chip('Warmups')).toBeInTheDocument();
    expect(inFlight('p1')).toBe(0);
  });

  test('select, unselect, select fast: no extra request once the server already matches', async () => {
    await openPickerWithPlaylists([warmups, gigSet]);

    await pick('Gig set');
    fireEvent.click(await screen.findByTitle('Gig set'));
    await pick('Gig set');

    await act(async () => { answer('add', 'p2').resolve({ ...gigSet, songUids: ['song-a'] }); });

    expect(chip('Gig set')).toBeInTheDocument();
    expect(inFlight('p2')).toBe(0);
    expect(mockedPlaylists.addSongToPlaylist).toHaveBeenCalledTimes(1);
    expect(mockedPlaylists.removeSongFromPlaylist).not.toHaveBeenCalled();
  });

  test('two playlists are saved independently', async () => {
    await openPickerWithPlaylists([warmups, gigSet]);

    fireEvent.click(await screen.findByTitle('Warmups'));
    await pick('Gig set');

    expect(inFlight('p1')).toBe(1);
    expect(inFlight('p2')).toBe(1);
  });

  test('a failed request puts the playlist back as the server has it, drops the clicks made meanwhile, and says so', async () => {
    await openPickerWithPlaylists([warmups, gigSet]);

    await pick('Gig set');
    fireEvent.click(await screen.findByTitle('Gig set'));
    await pick('Gig set');
    expect(chip('Gig set')).toBeInTheDocument();

    await act(async () => { answer('add', 'p2').reject(new Error('network')); });

    expect(chip('Gig set')).not.toBeInTheDocument();
    expect(await screen.findByText('Could not update playlist')).toBeInTheDocument();
    expect(inFlight('p2')).toBe(0);
    expect(mockedPlaylists.addSongToPlaylist).toHaveBeenCalledTimes(1);
  });

  test('leaving the song mid-request still saves the last click', async () => {
    await openPickerWithPlaylists([warmups, gigSet]);

    await pick('Gig set');
    fireEvent.click(await screen.findByTitle('Gig set'));
    fireEvent.click(screen.getByRole('button', { name: /Back to songlist/ }));
    await settle();

    await act(async () => { answer('add', 'p2').resolve({ ...gigSet, songUids: ['song-a'] }); });

    expect(mockedPlaylists.removeSongFromPlaylist).toHaveBeenCalledWith('p2', 'song-a');
    await act(async () => { answer('remove', 'p2').resolve({ ...gigSet, songUids: [] }); });
    expect(inFlight('p2')).toBe(0);
    expect(screen.queryByText('Could not update playlist')).not.toBeInTheDocument();
  });

  test('an answer that does not reflect the request is shown as is, with no retry loop', async () => {
    await openPickerWithPlaylists([warmups, gigSet]);

    await pick('Gig set');
    await act(async () => { answer('add', 'p2').resolve({ ...gigSet, songUids: [] }); });

    expect(chip('Gig set')).not.toBeInTheDocument();
    expect(inFlight('p2')).toBe(0);
    expect(mockedPlaylists.addSongToPlaylist).toHaveBeenCalledTimes(1);
  }, 3000);
});
