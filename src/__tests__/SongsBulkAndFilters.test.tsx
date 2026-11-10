import { screen, fireEvent, within } from '@testing-library/react';
import { renderSongs } from '../test/renderSongs';

jest.mock('../services/songService', () => ({
  SongsGoneError: class extends Error {},
  songService: {
    getAllSongs: jest.fn(),
    getSong: jest.fn().mockResolvedValue({}),
    updateSong: jest.fn().mockResolvedValue({}),
    createSong: jest.fn().mockResolvedValue({}),
    deleteSong: jest.fn().mockResolvedValue(undefined),
    addInstrumentToSongs: jest.fn(),
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
  playlistService: { getAllPlaylists: jest.fn().mockResolvedValue([]), addSongToPlaylist: jest.fn() },
}));

import { songService, SongsGoneError } from '../services/songService';

const mockedSongs = songService as jest.Mocked<typeof songService>;

// Imported from the Catalog before #34: no instrument.
const alpha = { uid: 'song-a', title: 'Alpha', artist: 'A', instrument: null };
const beta = { uid: 'song-b', title: 'Beta', artist: 'B', instrument: null };

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockedSongs.getAllSongs.mockResolvedValue([alpha, beta] as never);
});

const selectSong = async (label: string) => {
  fireEvent.click(await screen.findByRole('checkbox', { name: new RegExp(label) }));
};
// The Song's instrument filter: its select is the one holding the No instrument option.
const filterOnInstrument = async (value: string) => {
  const option = await screen.findByRole('option', { name: 'No instrument' });
  fireEvent.change(option.closest('select')!, { target: { value } });
};
const filterOnNoInstrument = async () => {
  const option = await screen.findByRole('option', { name: 'No instrument' });
  await filterOnInstrument((option as HTMLOptionElement).value);
};
const search = (text: string) =>
  fireEvent.change(screen.getByPlaceholderText('Search by title, artist, or album...'), { target: { value: text } });
const setInstrument = async (instrument: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Set instrument' }));
  fireEvent.change(await screen.findByRole('combobox', { name: 'Instrument to add' }), { target: { value: instrument } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
};

describe('#71: Set instrument adds an instrument to the selected songs', () => {
  test('catching up imported songs: filter, select, add Bass; they leave the No instrument view', async () => {
    mockedSongs.addInstrumentToSongs.mockResolvedValue({
      added: 2,
      alreadyHad: 0,
      songs: [{ ...alpha, instrument: ['Bass'] }, { ...beta, instrument: ['Bass'] }],
    } as never);
    renderSongs();
    await filterOnNoInstrument();
    await selectSong('Alpha');
    await selectSong('Beta');

    await setInstrument('Bass');

    expect(mockedSongs.addInstrumentToSongs).toHaveBeenCalledWith(['song-a', 'song-b'], 'Bass');
    expect(await screen.findByText('Bass added to 2 songs.')).toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    expect(screen.queryByText(/song\(s\) selected/)).not.toBeInTheDocument();
  });

  test('the message counts the songs that already had it', async () => {
    mockedSongs.addInstrumentToSongs.mockResolvedValue({
      added: 1,
      alreadyHad: 1,
      songs: [{ ...alpha, instrument: ['Bass'] }, { ...beta, instrument: ['Guitar', 'Bass'] }],
    } as never);
    renderSongs();
    await selectSong('Alpha');
    await selectSong('Beta');

    await setInstrument('Bass');

    expect(await screen.findByText('Bass added to 1 song. 1 already had it.')).toBeInTheDocument();
  });

  test('Cancel closes the panel and sends nothing', async () => {
    renderSongs();
    await selectSong('Alpha');

    fireEvent.click(screen.getByRole('button', { name: 'Set instrument' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('combobox', { name: 'Instrument to add' })).not.toBeInTheDocument();
    expect(mockedSongs.addInstrumentToSongs).not.toHaveBeenCalled();
    expect(screen.getByText(/1 song\(s\) selected/)).toBeInTheDocument();
  });
});

describe('#96: Set instrument refuses empty input and fails cleanly', () => {
  test('Add is disabled until an instrument is chosen', async () => {
    renderSongs();
    await selectSong('Alpha');

    fireEvent.click(screen.getByRole('button', { name: 'Set instrument' }));

    expect(await screen.findByRole('button', { name: 'Add' })).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Instrument to add' }), { target: { value: 'Bass' } });
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
  });

  test('a failure says so, keeps the panel open and the selection, and changes no row', async () => {
    mockedSongs.addInstrumentToSongs.mockRejectedValue(new Error('network'));
    renderSongs();
    await filterOnNoInstrument();
    await selectSong('Alpha');

    await setInstrument('Bass');

    expect(await screen.findByText('Could not set the instrument')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Instrument to add' })).toHaveValue('Bass');
    expect(screen.getByText(/1 song\(s\) selected/)).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument(); // still without an instrument
  });

  test('Add is disabled while the request runs', async () => {
    mockedSongs.addInstrumentToSongs.mockReturnValue(new Promise(() => {}));
    renderSongs();
    await selectSong('Alpha');

    await setInstrument('Bass');

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(mockedSongs.addInstrumentToSongs).toHaveBeenCalledTimes(1);
  });
});

describe('#71 review: Set instrument panel', () => {
  test('while the request runs, Cancel, ✕ and the instrument list are disabled', async () => {
    mockedSongs.addInstrumentToSongs.mockReturnValue(new Promise(() => {}));
    renderSongs();
    await selectSong('Alpha');

    await setInstrument('Bass');

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Instrument to add' })).toBeDisabled();
  });

  test('opening one bulk panel closes the other', async () => {
    renderSongs();
    await selectSong('Alpha');

    fireEvent.click(screen.getByRole('button', { name: 'Add to playlist' }));
    expect(await screen.findByText('Select playlists')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Set instrument' }));
    expect(screen.queryByText('Select playlists')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Instrument to add' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add to playlist' }));
    expect(screen.queryByRole('combobox', { name: 'Instrument to add' })).not.toBeInTheDocument();
  });

  test('songs gone meanwhile (deleted in another tab) get their own message', async () => {
    mockedSongs.addInstrumentToSongs.mockRejectedValue(new SongsGoneError());
    renderSongs();
    await selectSong('Alpha');

    await setInstrument('Bass');

    expect(await screen.findByText('Some selected songs no longer exist. Reload the songlist.')).toBeInTheDocument();
  });

  test('when every selected song already had it, the message says so', async () => {
    mockedSongs.addInstrumentToSongs.mockResolvedValue({
      added: 0,
      alreadyHad: 2,
      songs: [{ ...alpha, instrument: ['Bass'] }, { ...beta, instrument: ['Bass'] }],
    } as never);
    renderSongs();
    await selectSong('Alpha');
    await selectSong('Beta');

    await setInstrument('Bass');

    expect(await screen.findByText('Every selected song already had Bass.')).toBeInTheDocument();
  });
});

describe('#98: Songlist labels once filters are used', () => {
  test('no "Mark as played" button under No instrument', async () => {
    renderSongs();
    await filterOnNoInstrument();
    await selectSong('Alpha');

    expect(screen.queryByRole('button', { name: /Mark as played/ })).not.toBeInTheDocument();
  });

  test('"Mark as played on Guitar" stays under a real instrument', async () => {
    mockedSongs.getAllSongs.mockResolvedValue([{ ...alpha, instrument: ['Guitar'] }, beta] as never);
    renderSongs();
    await filterOnInstrument('Guitar');
    await selectSong('Alpha');

    expect(screen.getByRole('button', { name: 'Mark as played on Guitar' })).toBeInTheDocument();
  });

  test('filters leaving no song say so, and Clear filters brings the songs back', async () => {
    renderSongs();
    await screen.findByText('Alpha');
    await filterOnInstrument('Guitar');

    expect(await screen.findByText('No songs match your filters.')).toBeInTheDocument();
    expect(screen.queryByText('No songs saved.')).not.toBeInTheDocument();

    // The sidebar has its own per-section Clear filters: use the one under the message.
    const empty = screen.getByText('No songs match your filters.').closest('div')!;
    fireEvent.click(within(empty).getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  test('with no song at all, the empty songlist screen shows, not a filters message', async () => {
    mockedSongs.getAllSongs.mockResolvedValue([] as never);
    renderSongs();

    expect(await screen.findByText('Your songlist is empty')).toBeInTheDocument();
    expect(screen.queryByText('No songs match your filters.')).not.toBeInTheDocument();
  });

  test('a search alone giving nothing still says so', async () => {
    renderSongs();
    await screen.findByText('Alpha');

    search('zzz');

    expect(await screen.findByText('No songs match your search.')).toBeInTheDocument();
  });

  test('a search and filters giving nothing point to the filters; Clear filters keeps the search', async () => {
    renderSongs();
    await screen.findByText('Alpha');
    search('alpha');
    await filterOnInstrument('Guitar');

    const empty = (await screen.findByText('No songs match your filters.')).closest('div')!;
    fireEvent.click(within(empty).getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by title, artist, or album...')).toHaveValue('alpha');
  });
});
