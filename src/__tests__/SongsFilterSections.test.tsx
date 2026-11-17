import { screen, fireEvent, within, act } from '@testing-library/react';
import { renderSongs } from '../test/renderSongs';

// #185 / #198: the user adds and removes Songlist sidebar sections; the layout is saved on the account.
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
  songPlayService: {
    getPlays: jest.fn().mockResolvedValue([]),
    markPlayed: jest.fn().mockResolvedValue({}),
    getLastPlayForInstrument: jest.fn(),
  },
}));
jest.mock('../services/playlistService', () => ({
  playlistService: { getAllPlaylists: jest.fn().mockResolvedValue([]), addSongToPlaylist: jest.fn() },
}));
jest.mock('../services/profileService', () => ({
  profileService: { getProfile: jest.fn(), saveSonglistFilterSections: jest.fn() },
}));

import { songService } from '../services/songService';
import { profileService } from '../services/profileService';

const mockedSongs = songService as jest.Mocked<typeof songService>;
const profile = profileService as jest.Mocked<typeof profileService>;

const rock = { uid: 'song-a', title: 'Alpha', artist: 'A', genre: ['Rock'], instrument: null };
const jazz = { uid: 'song-b', title: 'Beta', artist: 'B', genre: ['Jazz'], instrument: null };

const accountLayout = (sections: string[] | null) =>
  profile.getProfile.mockResolvedValue({ songlistFilterSections: sections } as never);
const sidebar = () => document.getElementById('songs-sidebar')!;
// The shown sections, in sidebar order (a section waiting for an instrument renders nothing).
const shownSections = () =>
  Array.from(sidebar().querySelectorAll<HTMLElement>('[data-filter-section]')).map(el => el.dataset.filterSection);
const settle = () => act(() => new Promise(r => setTimeout(r, 0)));
const openAddMenu = () => fireEvent.click(screen.getByRole('button', { name: '+ Add filter' }));

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockedSongs.getAllSongs.mockResolvedValue([rock, jazz] as never);
  profile.saveSonglistFilterSections.mockResolvedValue(undefined as never);
  accountLayout(null);
});

test('never customised: the short default (instrument-dependent sections wait for an instrument)', async () => {
  renderSongs();
  await screen.findByText('Alpha');
  await settle();
  expect(shownSections()).toEqual(['instrument', 'playlist', 'genre', 'language']);
});

test('each section has its ⋮⋮ handle on the left of its name, its ✕ on the right', async () => {
  accountLayout(['genre']);
  renderSongs();
  await screen.findByText('Alpha');
  await settle();
  const handle = screen.getByRole('button', { name: 'Move Genre filters' });
  const name = screen.getByRole('button', { name: 'Genre filters' });
  const remove = screen.getByRole('button', { name: 'Remove Genre filters' });
  expect(handle.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(name.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('the layout saved on the account is shown, in its order', async () => {
  accountLayout(['key', 'genre']);
  renderSongs();
  await screen.findByText('Alpha');
  await settle();
  expect(shownSections()).toEqual(['key', 'genre']);
});

test('a hidden section whose filter is active is shown anyway', async () => {
  accountLayout(['genre']);
  localStorage.setItem('songsKeyFilter', 'C');
  renderSongs();
  await screen.findByRole('button', { name: 'Remove Key: C' });
  await settle();
  expect(shownSections()).toEqual(['genre', 'key']);
});

test('✕ removes a section, clears its active filter, and saves the layout', async () => {
  localStorage.setItem('songsGenreFilters', JSON.stringify(['Rock']));
  renderSongs();
  await screen.findByRole('button', { name: 'Remove Rock' });
  await settle();

  fireEvent.click(screen.getByRole('button', { name: 'Remove Genre filters' }));
  await settle();
  expect(shownSections()).toEqual(['instrument', 'playlist', 'language']);
  expect(screen.queryByRole('button', { name: 'Remove Rock' })).not.toBeInTheDocument();
  expect(screen.getByText('Beta')).toBeInTheDocument();
  expect(profile.saveSonglistFilterSections).toHaveBeenLastCalledWith([
    'instrument', 'playlist', 'difficulty', 'capo', 'tuning', 'technique', 'language',
  ]);
});

test('"+ Add filter" lists the hidden sections; picking one adds it at the end, open, and saves', async () => {
  accountLayout(['genre']);
  renderSongs();
  await screen.findByText('Alpha');
  await settle();

  openAddMenu();
  const menu = screen.getByRole('group', { name: 'Add a filter' });
  expect(within(menu).getByRole('button', { name: /Difficulty filter/ })).toHaveTextContent('needs a song instrument');
  expect(within(menu).queryByRole('button', { name: /Genre filters/ })).not.toBeInTheDocument();

  fireEvent.click(within(menu).getByRole('button', { name: 'Key filters' }));
  await settle();
  expect(shownSections()).toEqual(['genre', 'key']);
  expect(screen.getByRole('option', { name: 'All keys' })).toBeInTheDocument(); // opened
  expect(screen.queryByRole('group', { name: 'Add a filter' })).not.toBeInTheDocument();
  expect(profile.saveSonglistFilterSections).toHaveBeenLastCalledWith(['genre', 'key']);
});

test('the "+ Add filter" menu closes on Escape and on an outside click', async () => {
  renderSongs();
  await screen.findByText('Alpha');
  await settle();

  openAddMenu();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('group', { name: 'Add a filter' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '+ Add filter' })).toHaveFocus();

  openAddMenu();
  fireEvent.mouseDown(document.body);
  expect(screen.queryByRole('group', { name: 'Add a filter' })).not.toBeInTheDocument();
});

test('"Reset to default" brings the default back, keeping a section whose filter is active', async () => {
  accountLayout(['mode']);
  localStorage.setItem('songsKeyFilter', 'C');
  renderSongs();
  await screen.findByRole('button', { name: 'Remove Key: C' });
  await settle();

  openAddMenu();
  fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
  await settle();
  expect(shownSections()).toEqual(['instrument', 'playlist', 'genre', 'language', 'key']);
  expect(profile.saveSonglistFilterSections).toHaveBeenLastCalledWith(null);
});

test('removing every section leaves only "+ Add filter"', async () => {
  accountLayout(['genre']);
  renderSongs();
  await screen.findByText('Alpha');
  await settle();

  fireEvent.click(screen.getByRole('button', { name: 'Remove Genre filters' }));
  await settle();
  expect(shownSections()).toEqual([]);
  expect(screen.getByRole('button', { name: '+ Add filter' })).toBeInTheDocument();
});

test('a failed save says so and Retry sends the layout again', async () => {
  accountLayout(['genre', 'key']);
  profile.saveSonglistFilterSections.mockRejectedValueOnce(new Error('offline'));
  renderSongs();
  await screen.findByText('Alpha');
  await settle();

  fireEvent.click(screen.getByRole('button', { name: 'Remove Key filters' }));
  expect(await screen.findByText("Couldn't save your filter layout")).toBeInTheDocument();
  expect(shownSections()).toEqual(['genre']); // the screen keeps what the user did

  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await settle();
  expect(screen.queryByText("Couldn't save your filter layout")).not.toBeInTheDocument();
  expect(profile.saveSonglistFilterSections).toHaveBeenCalledTimes(2);
  expect(profile.saveSonglistFilterSections).toHaveBeenLastCalledWith(['genre']);
});

test('the last known layout is shown before the account answers (no flash of the default)', async () => {
  localStorage.setItem('songsFilterSections', JSON.stringify(['bpm']));
  profile.getProfile.mockReturnValue(new Promise(() => {}) as never); // never answers
  renderSongs();
  await screen.findByText('Alpha');
  expect(shownSections()).toEqual(['bpm']);
});

// jsdom lays nothing out (every box is 0×0), and dnd-kit's keyboard sensor moves by
// geometry: give each section a 60px-high box stacked in DOM order. Restore after use.
const stackSectionBoxes = () =>
  jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const section = this.closest('[data-filter-section]');
    const all = Array.from(sidebar().querySelectorAll('[data-filter-section]'));
    const top = section ? all.indexOf(section) * 60 : 0;
    const height = section ? 60 : 0;
    return { x: 0, y: top, top, left: 0, right: 300, bottom: top + height, width: 300, height, toJSON: () => ({}) } as DOMRect;
  });
const press = async (el: HTMLElement, key: string, code = key) => {
  fireEvent.keyDown(el, { key, code });
  await settle();
};

// #199: reorder from the keyboard (dnd-kit's keyboard sensor: Space, arrows, Space).
test('a section moves down from the keyboard with its handle, and the order is saved', async () => {
  accountLayout(['genre', 'key', 'mode']);
  renderSongs();
  await screen.findByText('Alpha');
  await settle();

  const rect = stackSectionBoxes();
  const handle = screen.getByRole('button', { name: 'Move Genre filters' });
  handle.focus();
  fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
  await settle();
  fireEvent.keyDown(handle, { key: 'ArrowDown', code: 'ArrowDown' });
  await settle();
  fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
  await settle();

  expect(shownSections()).toEqual(['key', 'genre', 'mode']);
  expect(profile.saveSonglistFilterSections).toHaveBeenLastCalledWith(['key', 'genre', 'mode']);
  rect.mockRestore();
});

test('Escape cancels a keyboard move: nothing changes, nothing is saved', async () => {
  accountLayout(['genre', 'key', 'mode']);
  renderSongs();
  await screen.findByText('Alpha');
  await settle();
  const rect = stackSectionBoxes();
  try {
    const handle = screen.getByRole('button', { name: 'Move Genre filters' });
    handle.focus();
    await press(handle, ' ', 'Space');
    await press(handle, 'ArrowDown');
    await press(handle, 'Escape');
    expect(shownSections()).toEqual(['genre', 'key', 'mode']);
    expect(profile.saveSonglistFilterSections).not.toHaveBeenCalled();
  } finally {
    rect.mockRestore();
  }
});

test('keyboard moves are announced by section title', async () => {
  accountLayout(['genre', 'key', 'mode']);
  renderSongs();
  await screen.findByText('Alpha');
  await settle();
  const rect = stackSectionBoxes();
  try {
    const handle = screen.getByRole('button', { name: 'Move Genre filters' });
    handle.focus();
    await press(handle, ' ', 'Space');
    expect(await screen.findByText('Picked up Genre filters, position 1 of 3.')).toBeInTheDocument();
    await press(handle, 'ArrowDown');
    expect(await screen.findByText('Genre filters moved to position 2 of 3.')).toBeInTheDocument();
    await press(handle, ' ', 'Space');
  } finally {
    rect.mockRestore();
  }
});

// #185 review fixes.
test('quick changes are saved one after the other, the last layout last (never out of order)', async () => {
  accountLayout(['genre', 'key', 'mode']);
  let finishFirst!: () => void;
  profile.saveSonglistFilterSections
    .mockImplementationOnce(() => new Promise<void>(resolve => { finishFirst = resolve; }) as never)
    .mockResolvedValue(undefined as never);
  renderSongs();
  await screen.findByText('Alpha');
  await settle();

  fireEvent.click(screen.getByRole('button', { name: 'Remove Key filters' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove Mode filters' }));
  await settle();
  expect(profile.saveSonglistFilterSections).toHaveBeenCalledTimes(1); // the second waits

  await act(async () => { finishFirst(); });
  await settle();
  expect(profile.saveSonglistFilterSections).toHaveBeenCalledTimes(2);
  expect(profile.saveSonglistFilterSections).toHaveBeenLastCalledWith(['genre']);
});

test('a section shown only because its filter is active is not saved into the layout', async () => {
  accountLayout(['genre', 'mode']);
  localStorage.setItem('songsKeyFilter', 'C');
  renderSongs();
  await screen.findByRole('button', { name: 'Remove Key: C' });
  await settle();
  expect(shownSections()).toEqual(['genre', 'mode', 'key']);

  fireEvent.click(screen.getByRole('button', { name: 'Remove Mode filters' }));
  await settle();
  expect(profile.saveSonglistFilterSections).toHaveBeenLastCalledWith(['genre']);
});

test('the layout from the account wins over the browser copy', async () => {
  localStorage.setItem('songsFilterSections', JSON.stringify(['bpm']));
  accountLayout(['key']);
  renderSongs();
  await screen.findByText('Alpha');
  await settle();
  expect(shownSections()).toEqual(['key']);
  expect(localStorage.getItem('songsFilterSections')).toBe(JSON.stringify(['key']));
});

test('Instrument filters can move too, and the drop is announced', async () => {
  accountLayout(['instrument', 'genre']);
  renderSongs();
  await screen.findByText('Alpha');
  await settle();
  const rect = stackSectionBoxes();
  try {
    const handle = screen.getByRole('button', { name: 'Move Instrument filters' });
    handle.focus();
    await press(handle, ' ', 'Space');
    await press(handle, 'ArrowDown');
    await press(handle, ' ', 'Space');
    expect(await screen.findByText('Instrument filters dropped at position 2 of 2.')).toBeInTheDocument();
    expect(shownSections()).toEqual(['genre', 'instrument']);
    expect(profile.saveSonglistFilterSections).toHaveBeenLastCalledWith(['genre', 'instrument']);
  } finally {
    rect.mockRestore();
  }
});

test('announced positions count only the sections on screen', async () => {
  renderSongs(); // default layout, no instrument: Difficulty, Capo, Tuning and Technique wait
  await screen.findByText('Alpha');
  await settle();
  const rect = stackSectionBoxes();
  try {
    const handle = screen.getByRole('button', { name: 'Move Genre filters' });
    handle.focus();
    await press(handle, ' ', 'Space');
    expect(await screen.findByText('Picked up Genre filters, position 3 of 4.')).toBeInTheDocument();
    await press(handle, 'Escape');
  } finally {
    rect.mockRestore();
  }
});

// #185 follow-up: the "+ Add filter" menu says why an instrument-dependent section won't show yet.
test('with Piano chosen, the menu says Capo needs Guitar; with Drums, Tuning needs an instrument with tunings', async () => {
  accountLayout(['instrument']);
  localStorage.setItem('songsInstrumentFilter', 'Piano');
  renderSongs();
  await screen.findByRole('button', { name: 'Remove Piano' });
  await settle();

  openAddMenu();
  let menu = screen.getByRole('group', { name: 'Add a filter' });
  expect(within(menu).getByRole('button', { name: /Capo filter/ })).toHaveTextContent('needs Guitar as the song instrument');
  expect(within(menu).getByRole('button', { name: /Difficulty filter/ })).not.toHaveTextContent('needs');
  fireEvent.keyDown(document, { key: 'Escape' });

  fireEvent.change(screen.getByRole('option', { name: 'No instrument' }).closest('select')!, { target: { value: 'Drums' } });
  await settle();
  openAddMenu();
  menu = screen.getByRole('group', { name: 'Add a filter' });
  expect(within(menu).getByRole('button', { name: /Tuning filters/ })).toHaveTextContent('needs an instrument with tunings');
});
