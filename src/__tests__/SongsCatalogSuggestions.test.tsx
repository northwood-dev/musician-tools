import { act, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { renderSongs } from '../test/renderSongs';
import { makeSong } from '../test/makeSong';
import { songService } from '../services/songService';
import { catalogService, type CatalogSong } from '../services/catalogService';

// #191: a Songlist search that finds nothing suggests Catalog entries, addable in place.
jest.mock('../services/songService', () => {
  const actual = jest.requireActual('../services/songService');
  return {
    ...actual,
    songService: {
      getAllSongs: jest.fn(),
      getSong: jest.fn().mockResolvedValue({}),
      updateSong: jest.fn().mockResolvedValue({}),
      createSong: jest.fn().mockResolvedValue({}),
      deleteSong: jest.fn().mockResolvedValue(undefined),
    },
  };
});
jest.mock('../services/instrumentService', () => ({
  instrumentService: { getAll: jest.fn().mockResolvedValue([]) },
}));
jest.mock('../services/songPlayService', () => ({
  songPlayService: { getPlays: jest.fn().mockResolvedValue([]), markPlayed: jest.fn().mockResolvedValue({}), getLastPlayForInstrument: jest.fn() },
}));
jest.mock('../services/playlistService', () => ({
  playlistService: { getAllPlaylists: jest.fn().mockResolvedValue([]), addSongToPlaylist: jest.fn() },
}));
jest.mock('../services/catalogService', () => {
  const actual = jest.requireActual('../services/catalogService');
  const { makeCatalogServiceMock } = jest.requireActual('../test/catalogServiceMock');
  return { ...actual, catalogService: makeCatalogServiceMock() };
});

const songs = songService as jest.Mocked<typeof songService>;
const cat = catalogService as jest.Mocked<typeof catalogService>;

const entry = (uid: string, title: string, artist: string) => ({ uid, title, artist } as CatalogSong);
const FIVE = [
  entry('c1', 'Wonderwall', 'Oasis'),
  entry('c2', 'Wonderful Tonight', 'Eric Clapton'),
  entry('c3', 'Wonderful World', 'Sam Cooke'),
  entry('c4', 'Wonder', 'Shawn Mendes'),
  entry('c5', 'Wonderland', 'Taylor Swift'),
];

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  songs.getAllSongs.mockResolvedValue([makeSong({ uid: 's1', title: 'Yesterday', artist: 'The Beatles' })]);
  cat.listCatalog.mockResolvedValue({ items: FIVE, total: 12, page: 1, limit: 5 });
});

const search = async (text: string) => {
  fireEvent.change(await screen.findByPlaceholderText(/Search by title, artist, or album/), { target: { value: text } });
};

test('a search with no Songlist match shows up to 5 Catalog entries and a link to see them all', async () => {
  renderSongs();
  await screen.findByText('Yesterday');
  await search('wonder');
  const block = await screen.findByRole('region', { name: 'From the Catalog' });
  expect(screen.getByText('No songs match your search.')).toBeInTheDocument();
  expect(await within(block).findAllByRole('listitem')).toHaveLength(5);
  expect(within(block).getByText('Wonderwall')).toBeInTheDocument();
  expect(within(block).getByText('Oasis')).toBeInTheDocument();
  expect(within(block).getByRole('link', { name: 'See all 12 in the Catalog' })).toHaveAttribute('href', '/catalog?search=wonder');
  expect(cat.listCatalog).toHaveBeenLastCalledWith({ search: 'wonder', limit: 5 }, expect.anything());
});

test('fewer than 2 characters asks the Catalog nothing', async () => {
  renderSongs();
  await screen.findByText('Yesterday');
  await search('w');
  await screen.findByText('No songs match your search.');
  await act(() => new Promise(r => setTimeout(r, 500)));
  expect(cat.listCatalog).not.toHaveBeenCalled();
  expect(screen.queryByRole('region', { name: 'From the Catalog' })).not.toBeInTheDocument();
});

test('with active filters, only the text is sent, the filters message stays, and the filtered instrument is the default "Add as"', async () => {
  localStorage.setItem('songsInstrumentFilter', 'Guitar');
  renderSongs();
  await search('wonder');
  const block = await screen.findByRole('region', { name: 'From the Catalog' });
  expect(screen.getByText('No songs match your filters.')).toBeInTheDocument();
  expect(await within(block).findByLabelText('Add as')).toHaveValue('Guitar');
  expect(cat.listCatalog).toHaveBeenLastCalledWith({ search: 'wonder', limit: 5 }, expect.anything());
});

test('"Add as" follows the instrument filter when it changes while the suggestions are shown', async () => {
  localStorage.setItem('songsInstrumentFilter', 'Guitar');
  renderSongs();
  await search('wonder');
  const block = await screen.findByRole('region', { name: 'From the Catalog' });
  expect(await within(block).findByLabelText('Add as')).toHaveValue('Guitar');
  const sidebarSelect = within(screen.getByRole('complementary')).getByDisplayValue('Guitar');
  fireEvent.change(sidebarSelect, { target: { value: 'Bass' } });
  await waitFor(() => expect(within(screen.getByRole('region', { name: 'From the Catalog' })).getByLabelText('Add as')).toHaveValue('Bass'));
});

test('a late answer to an older search never replaces the newer results', async () => {
  let answerOld: (v: unknown) => void = () => {};
  cat.listCatalog
    .mockImplementationOnce(() => new Promise(r => { answerOld = r; }) as never)
    .mockResolvedValueOnce({ items: [entry('c9', 'Wonderwall', 'Oasis')], total: 1, page: 1, limit: 5 });
  renderSongs();
  await screen.findByText('Yesterday');
  await search('wonde');
  await waitFor(() => expect(cat.listCatalog).toHaveBeenCalledTimes(1));
  await search('wonderwall');
  const block = await screen.findByRole('region', { name: 'From the Catalog' });
  expect(await within(block).findByText('Wonderwall')).toBeInTheDocument();
  await act(async () => { answerOld({ items: [entry('c8', 'Wonder', 'Shawn Mendes')], total: 1, page: 1, limit: 5 }); });
  expect(within(block).queryByText('Wonder')).not.toBeInTheDocument();
  expect(within(block).getByText('Wonderwall')).toBeInTheDocument();
});

test('a Catalog entry already in the songlist (hidden by a filter) says so and leads to the song', async () => {
  localStorage.setItem('songsInstrumentFilter', 'Guitar');
  songs.getAllSongs.mockResolvedValue([makeSong({ uid: 's9', title: 'Wonderwall', artist: 'Oasis' })]);
  renderSongs();
  await search('wonder');
  const block = await screen.findByRole('region', { name: 'From the Catalog' });
  expect(await within(block).findByRole('link', { name: '✓ Already in your songlist' })).toHaveAttribute('href', '/songs/s9');
});

test('adding an entry puts the song in the list, in place of the suggestions', async () => {
  cat.addToSonglist.mockResolvedValue(makeSong({ uid: 'n1', title: 'Wonderwall', artist: 'Oasis', instrument: ['Guitar'] }));
  const { router } = renderSongs();
  await screen.findByText('Yesterday');
  await search('wonder');
  const block = await screen.findByRole('region', { name: 'From the Catalog' });
  fireEvent.change(await within(block).findByLabelText('Add as'), { target: { value: 'Guitar' } });
  fireEvent.click(within(block).getByRole('button', { name: 'Add "Wonderwall" to my songlist' }));
  await waitFor(() => expect(screen.queryByRole('region', { name: 'From the Catalog' })).not.toBeInTheDocument());
  expect(cat.addToSonglist).toHaveBeenCalledWith('c1', 'Guitar');
  expect(screen.getByText('Wonderwall')).toBeInTheDocument();
  expect(screen.queryByText('No songs match your search.')).not.toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/songs'); // stays on the Songlist
  // The block unmounts with its own status, so the page's toast announces the add.
  expect(screen.getByRole('status', { name: 'Notification' })).toHaveTextContent('"Oasis — Wonderwall" added to your songlist');
});

test('nothing in the Catalog either is said plainly', async () => {
  cat.listCatalog.mockResolvedValue({ items: [], total: 0, page: 1, limit: 5 });
  renderSongs();
  await screen.findByText('Yesterday');
  await search('zzzz');
  const block = await screen.findByRole('region', { name: 'From the Catalog' });
  expect(await within(block).findByText('Nothing in the Catalog either.')).toBeInTheDocument();
  expect(within(block).queryByRole('link', { name: /See all/ })).not.toBeInTheDocument();
});

test('a failed Catalog search shows a calm line, and the Songlist still works', async () => {
  cat.listCatalog.mockRejectedValue(new Error('network'));
  renderSongs();
  await screen.findByText('Yesterday');
  await search('wonder');
  const block = await screen.findByRole('region', { name: 'From the Catalog' });
  expect(await within(block).findByText("Couldn't search the Catalog right now.")).toBeInTheDocument();
  await search('yes');
  expect(await screen.findByText('Yesterday')).toBeInTheDocument();
});

// #192: "Add "<text>" as a new song" — the title is prefilled, but nothing is created
// until the user changes something.
describe('Add "<text>" as a new song', () => {
  test('is offered whatever the Catalog returns, even when its search fails', async () => {
    cat.listCatalog.mockRejectedValue(new Error('network'));
    renderSongs();
    await screen.findByText('Yesterday');
    await search('My own tune');
    expect(await screen.findByRole('button', { name: 'Add "My own tune" as a new song' })).toBeInTheDocument();
  });

  test('opens the add form with the title prefilled', async () => {
    const { router } = renderSongs();
    await screen.findByText('Yesterday');
    await search('My own tune');
    fireEvent.click(await screen.findByRole('button', { name: 'Add "My own tune" as a new song' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/songs/new'));
    expect(await screen.findByLabelText('Title')).toHaveValue('My own tune');
  });

  test('leaving the prefilled form untouched creates nothing', async () => {
    const { router } = renderSongs();
    await screen.findByText('Yesterday');
    await search('My own tune');
    fireEvent.click(await screen.findByRole('button', { name: 'Add "My own tune" as a new song' }));
    expect(await screen.findByLabelText('Title')).toHaveValue('My own tune');
    await act(() => new Promise(r => setTimeout(r, 1500))); // longer than the auto-save delay
    expect(songs.createSong).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /back to songlist/i }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/songs'));
    await act(() => new Promise(r => setTimeout(r, 300)));
    expect(songs.createSong).not.toHaveBeenCalled();
  });

  test('the first change creates the song, keeping the prefilled title', async () => {
    songs.createSong.mockResolvedValue(makeSong({ uid: 'n2', title: 'My own tune', artist: 'Me' }));
    renderSongs();
    await screen.findByText('Yesterday');
    await search('My own tune');
    fireEvent.click(await screen.findByRole('button', { name: 'Add "My own tune" as a new song' }));
    expect(await screen.findByLabelText('Title')).toHaveValue('My own tune');
    fireEvent.change(screen.getByLabelText('Artist'), { target: { value: 'Me' } });
    await waitFor(() => expect(songs.createSong).toHaveBeenCalledTimes(1), { timeout: 2500 });
    expect(songs.createSong.mock.calls[0][0]).toEqual(expect.objectContaining({ title: 'My own tune', artist: 'Me' }));
    expect(await screen.findByText(/Saved/)).toBeInTheDocument();
  });
});
