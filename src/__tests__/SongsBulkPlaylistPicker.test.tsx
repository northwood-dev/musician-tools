import { act, screen, fireEvent, waitFor } from '@testing-library/react';
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
import { songService } from '../services/songService';

const mockedPlaylists = playlistService as jest.Mocked<typeof playlistService>;
const mockedSongs = songService as jest.Mocked<typeof songService>;
const songs = [
  { uid: 'song-a', title: 'Alpha', artist: 'A', instrument: ['Guitar'] },
  { uid: 'song-b', title: 'Beta', artist: 'B', instrument: ['Guitar'] },
];

const selectSong = async (label: string) => {
  fireEvent.click(await screen.findByRole('checkbox', { name: new RegExp(label) }));
};

const openPicker = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Add to playlist' }));
  await screen.findByText('Select playlists');
};

const playlistBox = (name: string) => screen.getByRole('checkbox', { name: new RegExp(name) });

const pickWarmups = async () => {
  renderSongs();
  await selectSong('Alpha');
  await openPicker();
  fireEvent.click(playlistBox('Warmups'));
};

const expectPickerClosedAndBlank = async () => {
  expect(screen.queryByText('Select playlists')).not.toBeInTheDocument();
  await openPicker();
  expect(playlistBox('Warmups')).not.toBeChecked();
};

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockedPlaylists.getAllPlaylists.mockResolvedValue([
    { uid: 'p1', name: 'Warmups', songUids: [] },
    { uid: 'p2', name: 'Gig set', songUids: [] },
  ] as never);
  mockedPlaylists.addSongToPlaylist.mockResolvedValue(undefined as never);
  mockedSongs.getAllSongs.mockResolvedValue(songs as never);
});

describe('#46: the picker resets when the selection becomes empty', () => {
  test('deselecting every song closes the picker and clears its checkmarks', async () => {
    await pickWarmups();

    await selectSong('Alpha');
    await selectSong('Beta');

    await screen.findByRole('button', { name: 'Add to playlist' });
    await expectPickerClosedAndBlank();
  });

  test('clearing the selection with select-all does the same', async () => {
    renderSongs();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select all' }));
    await openPicker();
    fireEvent.click(playlistBox('Warmups'));

    fireEvent.click(screen.getByRole('checkbox', { name: 'Deselect all' }));
    await selectSong('Beta');

    await screen.findByRole('button', { name: 'Add to playlist' });
    await expectPickerClosedAndBlank();
  });

  test('deleting the selected songs does the same', async () => {
    await pickWarmups();

    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
    fireEvent.click(await screen.findByText('Delete', { selector: 'div[role="dialog"] button' }));
    await waitFor(() => expect(screen.queryByText('Alpha')).not.toBeInTheDocument());
    await selectSong('Beta');

    await screen.findByRole('button', { name: 'Add to playlist' });
    await expectPickerClosedAndBlank();
  });

  test('Mark as played on the selected songs does the same', async () => {
    localStorage.setItem('songsInstrumentFilter', 'Guitar');
    await pickWarmups();

    fireEvent.click(screen.getByRole('button', { name: 'Mark as played on Guitar' }));
    await waitFor(() => expect(screen.queryByText('1 song(s) selected')).not.toBeInTheDocument());
    await selectSong('Beta');

    await screen.findByRole('button', { name: 'Add to playlist' });
    await expectPickerClosedAndBlank();
  });

  test('deleting the only selected song from its form does the same', async () => {
    await pickWarmups();

    fireEvent.click(screen.getByText('Alpha'));
    fireEvent.click(await screen.findByRole('button', { name: /^Delete/ }));
    fireEvent.click(await screen.findByText('Delete', { selector: 'div[role="dialog"] button' }));
    await waitFor(() => expect(screen.queryByText('Alpha')).not.toBeInTheDocument());
    await selectSong('Beta');

    await screen.findByRole('button', { name: 'Add to playlist' });
    await expectPickerClosedAndBlank();
  });
});

describe('#47: closing the picker without adding clears its checkmarks', () => {
  test('Cancel clears the checkmarks', async () => {
    await pickWarmups();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await expectPickerClosedAndBlank();
  });

  test('✕ clears the checkmarks', async () => {
    await pickWarmups();

    fireEvent.click(screen.getByRole('button', { name: '✕' }));

    await expectPickerClosedAndBlank();
  });

  test('a second click on Add to playlist clears the checkmarks', async () => {
    await pickWarmups();

    fireEvent.click(screen.getByRole('button', { name: 'Add to playlist' }));

    await expectPickerClosedAndBlank();
  });

  test('changing the selection keeps the picker and Add applies to the current songs', async () => {
    await pickWarmups();

    await selectSong('Beta');

    expect(playlistBox('Warmups')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(mockedPlaylists.addSongToPlaylist).toHaveBeenCalledTimes(2));
    expect(mockedPlaylists.addSongToPlaylist).toHaveBeenCalledWith('p1', 'song-a');
    expect(mockedPlaylists.addSongToPlaylist).toHaveBeenCalledWith('p1', 'song-b');
  });

  test('a successful Add closes the picker, clears its checkmarks and keeps the songs selected', async () => {
    await pickWarmups();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(screen.queryByText('Select playlists')).not.toBeInTheDocument());
    expect(screen.getByRole('checkbox', { name: /Alpha/ })).toBeChecked();
    await expectPickerClosedAndBlank();
  });

  test('a failed Add keeps the picker open with its checkmarks and shows the error', async () => {
    mockedPlaylists.addSongToPlaylist.mockRejectedValue(new Error('boom'));
    await pickWarmups();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Error while adding to playlists')).toBeInTheDocument();
    expect(screen.getByText('Select playlists')).toBeInTheDocument();
    expect(playlistBox('Warmups')).toBeChecked();
  });
});

describe('#33: a selection restored by the browser', () => {
  const restoreSelection = (uids: string[]) => localStorage.setItem('songsSelectedUids', JSON.stringify(uids));

  test('after a reload the songs stay selected and the picker is closed and blank', async () => {
    restoreSelection(['song-a']);
    renderSongs();

    expect(await screen.findByText('1 song(s) selected')).toBeInTheDocument();
    await expectPickerClosedAndBlank();
  });

  test('a song that no longer exists leaves the selection', async () => {
    restoreSelection(['song-a', 'ghost']);
    renderSongs();

    expect(await screen.findByText('1 song(s) selected')).toBeInTheDocument();
    await openPicker();
    fireEvent.click(playlistBox('Warmups'));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(mockedPlaylists.addSongToPlaylist).toHaveBeenCalled());
    expect(mockedPlaylists.addSongToPlaylist).toHaveBeenCalledTimes(1);
    expect(mockedPlaylists.addSongToPlaylist).toHaveBeenCalledWith('p1', 'song-a');
  });

  test('deselecting the last real song resets the picker even with a stale uid restored', async () => {
    restoreSelection(['song-a', 'ghost']);
    renderSongs();
    await openPicker();
    fireEvent.click(playlistBox('Warmups'));

    await selectSong('Alpha');
    await selectSong('Beta');

    await screen.findByRole('button', { name: 'Add to playlist' });
    await expectPickerClosedAndBlank();
  });

  test('a failed load of the songlist keeps the restored selection', async () => {
    restoreSelection(['song-a']);
    mockedSongs.getAllSongs.mockRejectedValue(new Error('boom'));
    renderSongs();

    await waitFor(() => expect(mockedSongs.getAllSongs).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });

    expect(JSON.parse(localStorage.getItem('songsSelectedUids') as string)).toEqual(['song-a']);
  });
});

test('Cancel and ✕ are disabled while Add is running', async () => {
  let finishAdd: (value?: never) => void = () => {};
  mockedPlaylists.addSongToPlaylist.mockReturnValue(new Promise<never>(resolve => { finishAdd = resolve as never; }));
  await pickWarmups();

  fireEvent.click(screen.getByRole('button', { name: 'Add' }));

  await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled());
  expect(screen.getByRole('button', { name: '✕' })).toBeDisabled();
  await act(async () => { finishAdd(); });
});
