import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Catalog from '../pages/Catalog';
import { catalogService } from '../services/catalogService';
import type { CatalogSong } from '../services/catalogService';
import type { Song } from '../services/songService';

jest.mock('../services/catalogService', () => {
  const actual = jest.requireActual('../services/catalogService');
  const { makeCatalogServiceMock } = jest.requireActual('../test/catalogServiceMock');
  return { ...actual, catalogService: makeCatalogServiceMock() };
});
const svc = catalogService as jest.Mocked<typeof catalogService>;

const resp = (items: Partial<CatalogSong>[], total = items.length) => ({ items: items as CatalogSong[], total, page: 1, limit: 24 });

beforeEach(() => {
  jest.clearAllMocks();
  svc.getFacets.mockResolvedValue({ genre: [], key: [], mode: [], timeSignature: [] });
  svc.listCollections.mockResolvedValue([]); // no rail by default; rail tests override
  localStorage.setItem('catalogAddAsInstrument', '__none__'); // #34: a choice is already made
});

test('#34: the row Add button sends the instrument chosen at the top of the page, and the choice is kept', async () => {
  localStorage.removeItem('catalogAddAsInstrument');
  svc.listCatalog.mockResolvedValue(resp([{ uid: 'a', title: 'Zombie', artist: 'The Cranberries' }]));
  svc.addToSonglist.mockResolvedValue({ uid: 'song-1', title: 'Zombie' } as Song);
  render(<MemoryRouter initialEntries={['/catalog']}><Catalog /></MemoryRouter>);
  await screen.findByText('Zombie');

  fireEvent.change(screen.getByLabelText('Add as'), { target: { value: 'Bass' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add "Zombie" to my songlist' }));

  await waitFor(() => expect(svc.addToSonglist).toHaveBeenCalledWith('a', 'Bass'));
  expect(localStorage.getItem('catalogAddAsInstrument')).toBe('Bass');
});

test('#34: the row Add button with nothing chosen sends nothing, and does not open the row', async () => {
  localStorage.removeItem('catalogAddAsInstrument');
  svc.listCatalog.mockResolvedValue(resp([{ uid: 'a', title: 'Zombie', artist: 'The Cranberries' }]));
  render(<MemoryRouter initialEntries={['/catalog']}><Catalog /></MemoryRouter>);
  await screen.findByText('Zombie');

  fireEvent.click(screen.getByRole('button', { name: 'Add "Zombie" to my songlist' }));

  expect(svc.addToSonglist).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Choose an instrument first.');
  expect(screen.getByLabelText('Add as')).toHaveFocus();
});

test('renders the list with the "All songs" title (no query)', async () => {
  svc.listCatalog.mockResolvedValue(resp([{ uid: 'a', title: 'Zombie', artist: 'The Cranberries', key: 'Em', bpm: 84 }]));
  render(<MemoryRouter initialEntries={['/catalog']}><Catalog /></MemoryRouter>);
  await screen.findByText('Zombie');
  expect(screen.getByText('All songs')).toBeInTheDocument();
});

test('typing a search debounces into a fetch and switches the title to Results (n)', async () => {
  svc.listCatalog.mockResolvedValue(resp([]));
  render(<MemoryRouter initialEntries={['/catalog']}><Catalog /></MemoryRouter>);
  await waitFor(() => expect(svc.listCatalog).toHaveBeenCalled());

  svc.listCatalog.mockResolvedValue(resp([{ uid: 'a', title: 'Zombie', artist: 'The Cranberries' }], 1));
  fireEvent.change(screen.getByLabelText('Search the catalog'), { target: { value: 'zombie' } });

  await waitFor(() => expect(svc.listCatalog).toHaveBeenCalledWith(expect.objectContaining({ search: 'zombie' }), expect.anything()));
  await screen.findByText('Results (1)');
});

test('empty results show the no-match message when a query is active', async () => {
  svc.listCatalog.mockResolvedValue(resp([]));
  render(<MemoryRouter initialEntries={['/catalog?search=zzz']}><Catalog /></MemoryRouter>);
  await screen.findByText('No songs match your search.');
});

test('a fetch error shows Retry, and Retry actually refetches (not a no-op)', async () => {
  svc.listCatalog.mockRejectedValueOnce(new Error('boom'));
  render(<MemoryRouter initialEntries={['/catalog']}><Catalog /></MemoryRouter>);
  await screen.findByText('Something went wrong.');
  const callsAfterError = svc.listCatalog.mock.calls.length;

  svc.listCatalog.mockResolvedValue(resp([{ uid: 'a', title: 'Zombie', artist: 'The Cranberries' }], 1));
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

  await waitFor(() => expect(svc.listCatalog.mock.calls.length).toBeGreaterThan(callsAfterError));
  await screen.findByText('Zombie'); // recovered — Retry re-ran the fetch
});

// ---- Story 20.4: Collections rail ----

test('shows the Collections rail above the list when there is no query', async () => {
  svc.listCatalog.mockResolvedValue(resp([{ uid: 'a', title: 'Zombie', artist: 'The Cranberries' }], 1));
  svc.listCollections.mockResolvedValue([{ uid: 'col1', name: 'Rock 90s', description: null, songCount: 3 }]);
  render(<MemoryRouter initialEntries={['/catalog']}><Catalog /></MemoryRouter>);
  await screen.findByText('Zombie');
  expect(await screen.findByRole('link', { name: 'Open the Rock 90s collection' })).toBeInTheDocument();
});

test('the Collections rail folds away once a query is typed', async () => {
  svc.listCatalog.mockResolvedValue(resp([], 0));
  svc.listCollections.mockResolvedValue([{ uid: 'col1', name: 'Rock 90s', description: null, songCount: 3 }]);
  render(<MemoryRouter initialEntries={['/catalog?search=zombie']}><Catalog /></MemoryRouter>);
  await screen.findByText('Results (0)');
  expect(screen.queryByRole('link', { name: 'Open the Rock 90s collection' })).toBeNull();
});

test('a 0-song collection is not shown in the rail (no dead-end tile)', async () => {
  svc.listCatalog.mockResolvedValue(resp([{ uid: 'a', title: 'Zombie', artist: 'The Cranberries' }], 1));
  svc.listCollections.mockResolvedValue([
    { uid: 'col1', name: 'Rock 90s', description: null, songCount: 3 },
    { uid: 'empty', name: 'Empty Set', description: null, songCount: 0 },
  ]);
  render(<MemoryRouter initialEntries={['/catalog']}><Catalog /></MemoryRouter>);
  await screen.findByRole('link', { name: 'Open the Rock 90s collection' });
  expect(screen.queryByRole('link', { name: 'Open the Empty Set collection' })).toBeNull();
});

// ---------------------------------------------------------------------------
// Story 22.4 — reader-side selection + bulk "Add selected to my songlist"
// ---------------------------------------------------------------------------

import { SongConflictError } from '../services/songService';
import { CatalogNotFoundError } from '../services/catalogService';
import { songService } from '../services/songService';

jest.mock('../services/songService', () => {
  const actual = jest.requireActual('../services/songService');
  return { ...actual, songService: { getAllSongs: jest.fn().mockResolvedValue([]) } };
});

// Minimal Song shapes: the page only reads uid/title/artist from them.
const asSong = (o: Partial<import('../services/songService').Song>) =>
  o as import('../services/songService').Song;

const twoRows = [
  { uid: 'a', title: 'Zombie', artist: 'The Cranberries', key: 'Em' },
  { uid: 'b', title: 'Creep', artist: 'Radiohead', key: 'G' },
];

const renderCatalog = () => render(<MemoryRouter initialEntries={['/catalog']}><Catalog /></MemoryRouter>);

const addBoth = async () => {
  fireEvent.click(screen.getByLabelText('Select all'));
  fireEvent.click(screen.getByRole('button', { name: 'Add selected to my songlist' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Add to my songlist' }));
};

describe('#34: bulk add with the chosen instrument', () => {
  const openBulkAdd = () => {
    fireEvent.click(screen.getByLabelText('Select all'));
    fireEvent.click(screen.getByRole('button', { name: 'Add selected to my songlist' }));
  };

  beforeEach(() => {
    svc.listCatalog.mockResolvedValue(resp(twoRows));
    svc.addToSonglist.mockImplementation(async (uid: string) => asSong({ uid: `s-${uid}`, title: uid }));
  });

  test('every song is sent with the chosen instrument, and the confirmation says so', async () => {
    localStorage.setItem('catalogAddAsInstrument', 'Bass');
    renderCatalog();
    await screen.findByText('Zombie');

    openBulkAdd();
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Added as Bass. Songs already in your songlist keep their instrument.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to my songlist' }));

    await waitFor(() => expect(svc.addToSonglist).toHaveBeenCalledTimes(2));
    expect(svc.addToSonglist).toHaveBeenCalledWith('a', 'Bass');
    expect(svc.addToSonglist).toHaveBeenCalledWith('b', 'Bass');
  });

  test('No instrument adds the songs without one, and the confirmation says so', async () => {
    renderCatalog();
    await screen.findByText('Zombie');

    openBulkAdd();
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Added with no instrument. Songs already in your songlist keep their instrument.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to my songlist' }));

    await waitFor(() => expect(svc.addToSonglist).toHaveBeenCalledWith('a', undefined));
  });

  test('the selector is locked while a batch runs, so the confirmation keeps naming what is being sent', async () => {
    localStorage.setItem('catalogAddAsInstrument', 'Bass');
    let finish: (song: ReturnType<typeof asSong>) => void = () => {};
    svc.addToSonglist.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    renderCatalog();
    await screen.findByText('Zombie');

    openBulkAdd();
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Add to my songlist' }));

    await waitFor(() => expect(screen.getByLabelText('Add as')).toBeDisabled());
    await act(async () => { finish(asSong({ uid: 's', title: 's' })); });
  });

  test('with nothing chosen the confirmation stays closed, nothing is sent, and the selector is pointed out', async () => {
    localStorage.removeItem('catalogAddAsInstrument');
    renderCatalog();
    await screen.findByText('Zombie');

    openBulkAdd();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(svc.addToSonglist).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose an instrument first.');
    expect(screen.getByLabelText('Add as')).toHaveFocus();
  });

  test('retrying failed songs uses the instrument chosen at that moment, and the confirmation states it', async () => {
    localStorage.setItem('catalogAddAsInstrument', 'Bass');
    svc.addToSonglist.mockRejectedValueOnce(new Error('offline'));
    svc.addToSonglist.mockRejectedValueOnce(new Error('offline'));
    renderCatalog();
    await screen.findByText('Zombie');

    openBulkAdd();
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Add to my songlist' }));
    await screen.findByText(/2 failed/);

    svc.addToSonglist.mockClear();
    fireEvent.change(screen.getByLabelText('Add as'), { target: { value: 'Guitar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add selected to my songlist' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Added as Guitar.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to my songlist' }));

    await waitFor(() => expect(svc.addToSonglist).toHaveBeenCalledWith('a', 'Guitar'));
    expect(svc.addToSonglist).toHaveBeenCalledWith('b', 'Guitar');
  });
});

test('22.4: the rows gain a checkbox WITHOUT losing the row link or the per-row Add', async () => {
  svc.listCatalog.mockResolvedValue(resp(twoRows));
  renderCatalog();
  await screen.findByText('Zombie');

  expect(screen.getByLabelText('Select Zombie by The Cranberries')).toBeInTheDocument();
  expect(screen.getByLabelText('Select all')).toBeInTheDocument();
  // The per-row Add stays (decision D) and the title stays a real link.
  expect(screen.getAllByRole('button', { name: /^Add ".+" to my songlist$/ })).toHaveLength(2);
  expect(screen.getByRole('link', { name: 'Zombie' })).toHaveAttribute('href', '/catalog/a');
});

test('22.4: a mixed batch reports all four outcomes', async () => {
  svc.listCatalog.mockResolvedValue(resp([...twoRows,
    { uid: 'c', title: 'Gone', artist: 'Ghost' },
    { uid: 'd', title: 'Boom', artist: 'Crash' },
  ]));
  svc.addToSonglist.mockImplementation(async (uid: string) => {
    if (uid === 'a') return asSong({ uid: 's-a', title: 'Zombie' });
    if (uid === 'b') throw new SongConflictError(asSong({ uid: 's-b', title: 'Creep' }));
    if (uid === 'c') throw new CatalogNotFoundError();
    throw new Error('offline');
  });
  renderCatalog();
  await screen.findByText('Zombie');

  await addBoth();

  const recap = await screen.findByRole('alert', { name: 'Bulk action result' });
  expect(recap).toHaveTextContent(/1 added/);
  expect(recap).toHaveTextContent(/1 already in your songlist/);
  expect(recap).toHaveTextContent(/1 no longer in the catalog/);
  expect(recap).toHaveTextContent(/1 failed/);
});

test('22.4: a permanent 404 leaves the selection, a retryable error stays in it', async () => {
  svc.listCatalog.mockResolvedValue(resp([
    { uid: 'c', title: 'Gone', artist: 'Ghost' },
    { uid: 'd', title: 'Boom', artist: 'Crash' },
  ]));
  svc.addToSonglist.mockImplementation(async (uid: string) => {
    if (uid === 'c') throw new CatalogNotFoundError();
    throw new Error('offline');
  });
  renderCatalog();
  await screen.findByText('Gone');

  await addBoth();
  await screen.findByRole('alert', { name: 'Bulk action result' });

  // Retrying a deleted catalog entry can never work → it must not stay armed.
  expect(screen.getByLabelText('Select Gone by Ghost')).not.toBeChecked();
  expect(screen.getByLabelText('Select Boom by Crash')).toBeChecked();
  expect(screen.getByText('1 song selected')).toBeInTheDocument();
});

test('22.4: an all-already-in batch gets its own message, not a degraded "0 added"', async () => {
  svc.listCatalog.mockResolvedValue(resp(twoRows));
  svc.addToSonglist.mockImplementation(async () => { throw new SongConflictError(undefined); });
  renderCatalog();
  await screen.findByText('Zombie');

  await addBoth();

  const recap = await screen.findByRole('status', { name: 'Bulk action result' });
  expect(recap).toHaveTextContent(/All 2 songs were already in your songlist/);
  expect(recap).not.toHaveTextContent(/0 added/);
});

test('22.4: after the batch the rows show the duplicate flag, with no refetch', async () => {
  svc.listCatalog.mockResolvedValue(resp(twoRows));
  svc.addToSonglist.mockImplementation(async (uid: string) =>
    uid === 'a'
      ? asSong({ uid: 's-a', title: 'Zombie', artist: 'The Cranberries' })
      : Promise.reject(new SongConflictError(asSong({ uid: 's-b', title: 'Creep', artist: 'Radiohead' }))));
  renderCatalog();
  await screen.findByText('Zombie');
  const callsBefore = svc.listCatalog.mock.calls.length;

  await addBoth();
  await screen.findByRole('status', { name: 'Bulk action result' });

  // Both the 201 and the 409 feed the matcher cache → no row still offers Add, both
  // now read "Already in your songlist".
  await waitFor(() => expect(screen.queryAllByRole('button', { name: /^Add ".+" to my songlist$/ })).toHaveLength(0));
  expect(screen.getAllByText(/Already in your songlist/)).toHaveLength(2);
  expect(svc.listCatalog.mock.calls.length).toBe(callsBefore);
  expect(songService.getAllSongs).toHaveBeenCalledTimes(1);
});

// northwood, QA 2026-08-10: a "N selected" bar hanging over an empty table is
// confusing. A new query means a new working set, so the selection goes with it — which
// also makes the stranded-selection problem unreachable by construction.
test('22.4: a new search drops the selection instead of leaving a ghost bar', async () => {
  svc.listCatalog.mockResolvedValue(resp(twoRows));
  renderCatalog();
  await screen.findByText('Zombie');

  fireEvent.click(screen.getByLabelText('Select all'));
  expect(screen.getByText('2 songs selected')).toBeInTheDocument();

  svc.listCatalog.mockResolvedValue(resp([], 0));
  fireEvent.change(screen.getByLabelText('Search the catalog'), { target: { value: 'zzz' } });
  await screen.findByText('No songs match your search.');

  await waitFor(() => expect(screen.queryByText(/songs selected/)).toBeNull());
});

test('22.4: paging through the SAME result set keeps the selection', async () => {
  svc.listCatalog.mockResolvedValue({ items: twoRows as never, total: 30, page: 1, limit: 24 });
  renderCatalog();
  await screen.findByText('Zombie');

  fireEvent.click(screen.getByLabelText('Select all'));
  expect(screen.getByText('2 songs selected')).toBeInTheDocument();

  // Pagination is NOT a new working set (19.9 semantics) — the selection survives it.
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(svc.listCatalog).toHaveBeenCalledWith(
    expect.objectContaining({ page: 2 }), expect.anything()));
  expect(screen.getByText('2 songs selected')).toBeInTheDocument();
});

test('22.4: a batch that adds nothing never says "0 added", and is not styled as a success', async () => {
  svc.listCatalog.mockResolvedValue(resp(twoRows));
  svc.addToSonglist.mockImplementation(async () => { throw new CatalogNotFoundError(); });
  renderCatalog();
  await screen.findByText('Zombie');

  await addBoth();

  // Everything delisted: nothing was added, so this is NOT a neutral status banner.
  const recap = await screen.findByRole('alert', { name: 'Bulk action result' });
  expect(recap).toHaveTextContent(/2 no longer in the catalog/);
  expect(recap).not.toHaveTextContent(/0 added/);
});

test('22.4: a 409 that carries no song triggers a songlist reload so the row stops offering Add', async () => {
  svc.listCatalog.mockResolvedValue(resp(twoRows));
  svc.addToSonglist.mockImplementation(async () => { throw new SongConflictError(undefined); });
  renderCatalog();
  await screen.findByText('Zombie');
  expect(songService.getAllSongs).toHaveBeenCalledTimes(1);

  await addBoth();
  await screen.findByRole('status', { name: 'Bulk action result' });

  // The response could not tell us WHICH songs — the only way to stay honest is to
  // reload the songlist.
  await waitFor(() => expect(songService.getAllSongs).toHaveBeenCalledTimes(2));
});

describe('#49: entries found to be gone are marked on their row', () => {
  const GONE_MESSAGE = 'This song is no longer in the Catalog.';
  const rows = [
    { uid: 'a', title: 'Zombie', artist: 'The Cranberries' },
    { uid: 'c', title: 'Gone', artist: 'Ghost' },
  ];
  const rowOf = (title: string) => screen.getByText(title).closest('tr') as HTMLElement;

  beforeEach(() => {
    svc.listCatalog.mockResolvedValue(resp(rows));
    svc.addToSonglist.mockImplementation(async (uid: string) => {
      if (uid === 'c') throw new CatalogNotFoundError();
      return asSong({ uid: `s-${uid}`, title: 'Zombie' });
    });
  });

  test('after a bulk add, only the entry that is gone shows the message', async () => {
    renderCatalog();
    await screen.findByText('Zombie');

    await addBoth();

    await screen.findByRole('status', { name: 'Bulk action result' });
    expect(within(rowOf('Gone')).getByText(GONE_MESSAGE)).toBeInTheDocument();
    expect(within(rowOf('Zombie')).queryByText(GONE_MESSAGE)).not.toBeInTheDocument();
  });

  test('the checkbox of a marked row is disabled', async () => {
    renderCatalog();
    await screen.findByText('Zombie');

    await addBoth();

    await screen.findByText(GONE_MESSAGE);
    await waitFor(() => expect(screen.getByLabelText('Select Zombie by The Cranberries')).not.toBeDisabled());
    expect(screen.getByLabelText('Select Gone by Ghost')).toBeDisabled();
  });

  test('select-all skips marked rows and reads as fully selected without them', async () => {
    renderCatalog();
    await screen.findByText('Zombie');
    await addBoth();
    await screen.findByText(GONE_MESSAGE);

    fireEvent.click(screen.getByLabelText('Select all'));

    expect(screen.getByLabelText('Select Zombie by The Cranberries')).toBeChecked();
    expect(screen.getByLabelText('Select Gone by Ghost')).not.toBeChecked();
    expect(screen.getByText('1 song selected')).toBeInTheDocument();
    expect(screen.getByLabelText('Deselect all')).toBeInTheDocument();
  });

  test('a row whose own button finds the entry gone is marked the same way', async () => {
    renderCatalog();
    await screen.findByText('Zombie');
    fireEvent.click(screen.getByLabelText('Select Gone by Ghost'));

    fireEvent.click(screen.getByRole('button', { name: 'Add "Gone" to my songlist' }));

    expect(await within(rowOf('Gone')).findByText(GONE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByLabelText('Select Gone by Ghost')).toBeDisabled();
    expect(screen.getByLabelText('Select Gone by Ghost')).not.toBeChecked();
  });

  test('a gone entry whose song is in the songlist keeps the link', async () => {
    (songService.getAllSongs as jest.Mock).mockResolvedValueOnce([asSong({ uid: 's-c', title: 'Gone', artist: 'Ghost' })]);
    renderCatalog();
    await screen.findByRole('link', { name: '✓ Already in your songlist' });

    await addBoth();

    await screen.findByRole('status', { name: 'Bulk action result' });
    expect(screen.getByLabelText('Select Gone by Ghost')).toBeDisabled();
    expect(within(rowOf('Gone')).getByRole('link', { name: '✓ Already in your songlist' })).toBeInTheDocument();
    expect(within(rowOf('Gone')).queryByText(GONE_MESSAGE)).not.toBeInTheDocument();
  });

  test('a row that failed for another reason is not marked and stays selected', async () => {
    svc.addToSonglist.mockRejectedValue(new Error('offline'));
    renderCatalog();
    await screen.findByText('Zombie');

    await addBoth();

    await screen.findByRole('alert', { name: 'Bulk action result' });
    expect(screen.queryByText(GONE_MESSAGE)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Select Gone by Ghost')).toBeChecked();
  });

  test('loading the list again removes the marks', async () => {
    svc.listCatalog.mockResolvedValue(resp(rows, 48));
    renderCatalog();
    await screen.findByText('Zombie');
    await addBoth();
    await screen.findByText(GONE_MESSAGE);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(svc.listCatalog).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }), expect.anything()));
    await waitFor(() => expect(screen.queryByText(GONE_MESSAGE)).not.toBeInTheDocument());
  });

  test('a mark from a row button also goes when the list is loaded again', async () => {
    svc.listCatalog.mockResolvedValue(resp(rows, 48));
    renderCatalog();
    await screen.findByText('Zombie');
    fireEvent.click(screen.getByRole('button', { name: 'Add "Gone" to my songlist' }));
    await screen.findByText(GONE_MESSAGE);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(svc.listCatalog).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }), expect.anything()));
    expect(await screen.findByRole('button', { name: 'Add "Gone" to my songlist' })).toBeInTheDocument();
    expect(screen.queryByText(GONE_MESSAGE)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Select Gone by Ghost')).not.toBeDisabled();
  });

  test('changing the search loads the list without the marks', async () => {
    renderCatalog();
    await screen.findByText('Zombie');
    await addBoth();
    await screen.findByText(GONE_MESSAGE);

    fireEvent.change(screen.getByLabelText('Search the catalog'), { target: { value: 'ghost' } });

    await waitFor(() => expect(svc.listCatalog).toHaveBeenCalledWith(expect.objectContaining({ search: 'ghost' }), expect.anything()));
    await waitFor(() => expect(screen.queryByText(GONE_MESSAGE)).not.toBeInTheDocument());
  });

  test('a mark set while a load is running survives that load', async () => {
    svc.listCatalog.mockResolvedValue(resp(rows, 48));
    renderCatalog();
    await screen.findByText('Zombie');
    let finishLoad: (value: ReturnType<typeof resp>) => void = () => {};
    svc.listCatalog.mockReturnValue(new Promise(resolve => { finishLoad = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(svc.listCatalog).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }), expect.anything()));

    fireEvent.click(screen.getByRole('button', { name: 'Add "Gone" to my songlist' }));
    await screen.findByText(GONE_MESSAGE);
    await act(async () => { finishLoad(resp(rows, 48)); });

    expect(screen.getByText(GONE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByLabelText('Select Gone by Ghost')).toBeDisabled();
  });
});
