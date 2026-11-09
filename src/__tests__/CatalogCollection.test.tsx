import { StrictMode } from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CatalogCollection from '../pages/CatalogCollection';
import { catalogService, CatalogNotFoundError, CollectionNotFoundError } from '../services/catalogService';
import type { Song } from '../services/songService';

// Story 20.4 — user-facing Collection detail + whole-collection import.
jest.mock('../services/catalogService', () => {
  const actual = jest.requireActual('../services/catalogService');
  const { makeCatalogServiceMock } = jest.requireActual('../test/catalogServiceMock');
  return { ...actual, catalogService: makeCatalogServiceMock() };
});
const cat = catalogService as jest.Mocked<typeof catalogService>;

const detail = {
  uid: 'col1',
  name: 'Rock 90s',
  description: 'The best of the 90s',
  songs: [
    { uid: 's1', title: 'Zombie', artist: 'The Cranberries', key: 'Em', bpm: 84, publishedAt: '2026-01-01' },
    { uid: 's2', title: 'Creep', artist: 'Radiohead', publishedAt: '2026-01-01' },
  ],
};

const renderDetail = () => render(
  <StrictMode>
    <MemoryRouter initialEntries={['/catalog/collections/col1']}>
      <Routes>
        <Route path="/catalog/collections/:uid" element={<CatalogCollection />} />
        <Route path="/catalog" element={<div>catalog-marker</div>} />
      </Routes>
    </MemoryRouter>
  </StrictMode>
);

beforeEach(() => {
  jest.clearAllMocks();
  cat.getCollection.mockResolvedValue(detail);
  cat.importCollection.mockResolvedValue({ added: 18, skipped: 2, failed: 0, playlistUid: 'p1' });
  localStorage.setItem('catalogAddAsInstrument', '__none__'); // #34: a choice is already made
});

test('#34: the "Add as" selector shows the choice remembered from another Catalog page', async () => {
  localStorage.setItem('catalogAddAsInstrument', 'Bass');
  renderDetail();
  await screen.findByText('Rock 90s');
  expect(screen.getByLabelText('Add as')).toHaveDisplayValue('Bass');
});

test('#34: adding a selection sends the chosen instrument, and the confirmation says so', async () => {
  localStorage.setItem('catalogAddAsInstrument', 'Bass');
  cat.addToSonglist.mockResolvedValue({ uid: 'song-1', title: 'Zombie' } as Song);
  renderDetail();
  await screen.findByText('Rock 90s');

  fireEvent.click(screen.getByLabelText('Select all'));
  fireEvent.click(screen.getByRole('button', { name: 'Add selected to my songlist' }));
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent('Added as Bass. Songs already in your songlist keep their instrument.');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add to my songlist' }));

  await waitFor(() => expect(cat.addToSonglist).toHaveBeenCalledWith('s1', 'Bass'));
  expect(cat.addToSonglist).toHaveBeenCalledWith('s2', 'Bass');
});

test('#34: adding a selection with nothing chosen keeps the confirmation closed and points to the selector', async () => {
  localStorage.removeItem('catalogAddAsInstrument');
  renderDetail();
  await screen.findByText('Rock 90s');

  fireEvent.click(screen.getByLabelText('Select all'));
  fireEvent.click(screen.getByRole('button', { name: 'Add selected to my songlist' }));

  expect(screen.queryByRole('dialog')).toBeNull();
  expect(cat.addToSonglist).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Choose an instrument first.');
  expect(screen.getByLabelText('Add as')).toHaveFocus();
});

test('renders the name, description, count and members', async () => {
  renderDetail();
  await screen.findByText('Rock 90s');
  expect(screen.getByText('The best of the 90s')).toBeInTheDocument();
  expect(screen.getByText('2 songs')).toBeInTheDocument();
  expect(screen.getByText(/Zombie/)).toBeInTheDocument();
});

test('a 404 shows a calm not-found panel', async () => {
  cat.getCollection.mockRejectedValue(new CollectionNotFoundError());
  renderDetail();
  await screen.findByText('This collection no longer exists.');
});

test('import: confirm dialog then recap toast', async () => {
  renderDetail();
  await screen.findByText('Rock 90s');
  fireEvent.click(screen.getByRole('button', { name: 'Add collection to my songlist' }));
  // ConfirmDialog announces N + name
  expect(screen.getByText(/Add 2 songs to your Songlist\?/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add to my songlist' }));
  await waitFor(() => expect(cat.importCollection).toHaveBeenCalledWith('col1'));
  // Persistent inline result banner with the clarified copy.
  await screen.findByText('Added 18 songs · 2 already in your songlist');
});

test('re-import (all already owned) reads clearly, no "Added 0"', async () => {
  cat.importCollection.mockResolvedValue({ added: 0, skipped: 3, failed: 0, playlistUid: 'p1' });
  renderDetail();
  await screen.findByText('Rock 90s');
  fireEvent.click(screen.getByRole('button', { name: 'Add collection to my songlist' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add to my songlist' }));
  const banner = await screen.findByText('3 already in your songlist');
  expect(banner).toBeInTheDocument();
  expect(screen.queryByText(/Added 0/)).toBeNull();
});

test('import failure surfaces an assertive error toast (role=alert)', async () => {
  cat.importCollection.mockRejectedValue(new Error('network'));
  renderDetail();
  await screen.findByText('Rock 90s');
  fireEvent.click(screen.getByRole('button', { name: 'Add collection to my songlist' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add to my songlist' }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Could not import the collection.');
});

// ---------------------------------------------------------------------------
// Story 22.4 — selectable table + "Add selected to my songlist"
// ---------------------------------------------------------------------------

test('22.4: members are a table with checkboxes, and the whole-collection shortcut stays', async () => {
  renderDetail();
  await screen.findByText('Rock 90s');

  expect(screen.getByRole('table')).toBeInTheDocument();
  expect(screen.getByLabelText('Select all')).toBeInTheDocument();
  // The 20.3 import shortcut is untouched.
  expect(screen.getByRole('button', { name: 'Add collection to my songlist' })).toBeInTheDocument();
});

test('22.4: the subset dialog says no playlist is created, unlike the whole-collection one', async () => {
  renderDetail();
  await screen.findByText('Rock 90s');

  fireEvent.click(screen.getByLabelText('Select all'));
  fireEvent.click(screen.getByRole('button', { name: 'Add selected to my songlist' }));

  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent(/No playlist is created/i);
});

test('22.4: the whole-collection import stays frozen while a selection batch runs', async () => {
  const releases: Array<() => void> = [];
  cat.addToSonglist.mockImplementation(() => new Promise(res => { releases.push(() => res({ uid: 'x' } as never)); }));
  renderDetail();
  await screen.findByText('Rock 90s');

  fireEvent.click(screen.getByLabelText('Select all'));
  fireEvent.click(screen.getByRole('button', { name: 'Add selected to my songlist' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Add to my songlist' }));

  // The dialog closes only AFTER the batch settles, so asserting on the button alone
  // would pass on `confirmAddOpen` and never test `bulkAdd.running`. Go through the
  // handler instead: the two write paths must not interleave.
  await waitFor(() => expect(cat.addToSonglist).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Add collection to my songlist' }));
  expect(cat.importCollection).not.toHaveBeenCalled();

  await act(async () => { releases.forEach(r => r()); });
});

describe('#50: entries found to be gone are marked on their row', () => {
  const GONE_MESSAGE = 'This song is no longer in the Catalog.';
  const rowOf = (title: string) => screen.getByText(title).closest('tr') as HTMLElement;

  const addAll = async () => {
    fireEvent.click(await screen.findByLabelText('Select all'));
    fireEvent.click(screen.getByRole('button', { name: 'Add selected to my songlist' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add to my songlist' }));
  };

  beforeEach(() => {
    cat.addToSonglist.mockImplementation(async (uid: string) => {
      if (uid === 's2') throw new CatalogNotFoundError();
      return { uid: 'song-1', title: 'Zombie' } as never;
    });
  });

  test('after a bulk add, only the entry that is gone shows the message', async () => {
    renderDetail();

    await addAll();

    expect(await within(rowOf('Creep')).findByText(GONE_MESSAGE)).toBeInTheDocument();
    expect(within(rowOf('Zombie')).queryByText(GONE_MESSAGE)).not.toBeInTheDocument();
  });

  test('the checkbox of a marked row is disabled', async () => {
    renderDetail();

    await addAll();

    await screen.findByText(GONE_MESSAGE);
    await waitFor(() => expect(screen.getByLabelText('Select Zombie by The Cranberries')).not.toBeDisabled());
    expect(screen.getByLabelText('Select Creep by Radiohead')).toBeDisabled();
  });

  test('select-all skips marked rows and reads as fully selected without them', async () => {
    renderDetail();
    await addAll();
    await screen.findByText(GONE_MESSAGE);
    await waitFor(() => expect(screen.getByLabelText('Select all')).not.toBeDisabled());

    fireEvent.click(screen.getByLabelText('Select all'));

    expect(screen.getByLabelText('Select Zombie by The Cranberries')).toBeChecked();
    expect(screen.getByLabelText('Select Creep by Radiohead')).not.toBeChecked();
    expect(screen.getByLabelText('Deselect all')).toBeInTheDocument();
  });

  test('a row that failed for another reason is not marked and stays selected', async () => {
    cat.addToSonglist.mockRejectedValue(new Error('offline'));
    renderDetail();

    await addAll();

    await screen.findByRole('alert', { name: 'Bulk action result' });
    expect(screen.queryByText(GONE_MESSAGE)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Select Creep by Radiohead')).toBeChecked();
  });

  test('opening the page again shows no leftover mark', async () => {
    const { unmount } = renderDetail();
    await addAll();
    await screen.findByText(GONE_MESSAGE);

    unmount();
    renderDetail();

    await screen.findByText('Creep');
    expect(screen.queryByText(GONE_MESSAGE)).not.toBeInTheDocument();
  });
});
