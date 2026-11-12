import { StrictMode } from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CatalogAdmin from '../pages/CatalogAdmin';
import { useAuth } from '../contexts/AuthContext';
import { songService } from '../services/songService';
import { catalogService, CatalogConflictError, CatalogNotFoundError } from '../services/catalogService';

jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
// Keep the real error classes (needed for `instanceof`), mock the methods.
jest.mock('../services/catalogService', () => {
  const actual = jest.requireActual('../services/catalogService');
  const { makeCatalogServiceMock } = jest.requireActual('../test/catalogServiceMock');
  return { ...actual, catalogService: makeCatalogServiceMock() };
});
jest.mock('../services/songService', () => ({
  songService: { lookupMetadata: jest.fn() },
}));

const mockedUseAuth = useAuth as jest.Mock;
const cat = catalogService as jest.Mocked<typeof catalogService>;

const renderAdmin = () => render(<MemoryRouter><CatalogAdmin /></MemoryRouter>);

const routeTree = (
  <Routes>
    <Route path="/catalog/admin" element={<CatalogAdmin />} />
    <Route path="/catalog/admin/:uid" element={<CatalogAdmin />} />
    <Route path="/catalog/manage" element={<div>manage-marker</div>} />
    <Route path="/" element={<div>home-marker</div>} />
  </Routes>
);
const renderAt = (path: string) => render(
  <StrictMode>
    <MemoryRouter initialEntries={[path]}>{routeTree}</MemoryRouter>
  </StrictMode>
);

beforeEach(() => {
  jest.clearAllMocks();
  cat.listCatalog.mockResolvedValue({ items: [], total: 0, page: 1, limit: 24 });
  cat.checkCatalogExists.mockResolvedValue({ exists: false });
  cat.getFacets.mockResolvedValue({ genre: [], key: [], mode: [], timeSignature: [], artist: ['Oasis'], album: [] });
});

test('a curator sees the entry form (Artist + Title, no Save button)', () => {
  mockedUseAuth.mockReturnValue({ user: { uid: 'u1', isCurator: true } });
  renderAdmin();
  expect(screen.getByLabelText('Artist')).toBeInTheDocument();
  expect(screen.getByLabelText('Title')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Save/ })).toBeNull();
});

test('a non-curator is redirected to home — no form rendered', () => {
  mockedUseAuth.mockReturnValue({ user: { uid: 'u2', isCurator: false } });
  render(
    <MemoryRouter initialEntries={['/catalog/admin']}>
      <Routes>
        <Route path="/catalog/admin" element={<CatalogAdmin />} />
        <Route path="/" element={<div>home-marker</div>} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByText('home-marker')).toBeInTheDocument();
  expect(screen.queryByLabelText('Title')).toBeNull();
});

test('the form does NOT render instrument/personal fields (DL-17)', () => {
  mockedUseAuth.mockReturnValue({ user: { isCurator: true } });
  renderAdmin();
  expect(screen.queryByLabelText(/instrument/i)).toBeNull();
  expect(screen.queryByLabelText(/tuning/i)).toBeNull();
});

test('create autosave: the first typed content lazily creates a draft', async () => {
  jest.useFakeTimers();
  try {
    mockedUseAuth.mockReturnValue({ user: { isCurator: true } });
    cat.createCatalogEntry.mockResolvedValue({ uid: 'c-new', title: 'Zombie', publishedAt: null });
    renderAt('/catalog/admin');

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Zombie' } });
    await act(async () => { await jest.advanceTimersByTimeAsync(1300); });

    expect(cat.createCatalogEntry).toHaveBeenCalledTimes(1);
    expect(cat.createCatalogEntry.mock.calls[0][0].title).toBe('Zombie');
    // We created it ourselves → no refetch (would clobber typing).
    expect(cat.getCatalogEntry).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});

test('edit autosave: changing a field updates the entry (debounced PUT)', async () => {
  jest.useFakeTimers();
  try {
    mockedUseAuth.mockReturnValue({ user: { isCurator: true } });
    cat.getCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Zombie', artist: 'The Cranberries', bpm: 84, publishedAt: null });
    cat.updateCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Zombie' });
    renderAt('/catalog/admin/c1');

    await waitFor(() => expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Zombie'));
    fireEvent.change(screen.getByLabelText('BPM'), { target: { value: '90' } });
    await act(async () => { await jest.advanceTimersByTimeAsync(1300); });

    await waitFor(() => expect(cat.updateCatalogEntry).toHaveBeenCalled());
    expect(cat.updateCatalogEntry.mock.calls.at(-1)![0]).toBe('c1');
  } finally {
    jest.useRealTimers();
  }
});

test('a duplicate (title, artist) blocks autosave and hides Publish (19.6 revised)', async () => {
  jest.useFakeTimers();
  try {
    mockedUseAuth.mockReturnValue({ user: { isCurator: true } });
    cat.getCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Zombie', artist: 'A', publishedAt: null });
    // The EXACT server check (drafts + published) reports the key already exists (19.12).
    cat.checkCatalogExists.mockResolvedValue({ exists: true, entry: { uid: 'other', title: 'Zombie', artist: 'B' } });
    cat.updateCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Zombie' });
    renderAt('/catalog/admin/c1');
    await act(async () => { await jest.advanceTimersByTimeAsync(0); }); // flush prefill

    fireEvent.change(screen.getByLabelText('Artist'), { target: { value: 'B' } });
    await act(async () => { await jest.advanceTimersByTimeAsync(1300); });

    // Blocking message shown, NO save attempted, Publish removed.
    expect(screen.getByText(/already exists in the Catalog/i)).toBeInTheDocument();
    expect(cat.updateCatalogEntry).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
  } finally {
    jest.useRealTimers();
  }
});

test('a draft shows a Publish button; publishing flips it and returns to the hub', async () => {
  mockedUseAuth.mockReturnValue({ user: { isCurator: true } });
  cat.getCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Zombie', artist: 'X', publishedAt: null });
  cat.updateCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Zombie' });
  cat.publishCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Zombie', publishedAt: '2026-01-01' });
  renderAt('/catalog/admin/c1');

  await waitFor(() => expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Zombie'));
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

  await waitFor(() => expect(cat.publishCatalogEntry).toHaveBeenCalledWith('c1'));
  await screen.findByText('manage-marker');
});

test('publish 409 (a published entry owns the key) shows a calm banner, stays a draft', async () => {
  mockedUseAuth.mockReturnValue({ user: { isCurator: true } });
  cat.getCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Wonderwall', artist: 'Oasis', publishedAt: null });
  cat.updateCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Wonderwall' });
  cat.publishCatalogEntry.mockRejectedValue(new CatalogConflictError({ uid: 'other', title: 'Wonderwall' }));
  renderAt('/catalog/admin/c1');

  await waitFor(() => expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Wonderwall'));
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

  await screen.findByText(/already published in the Catalog/i);
  expect(screen.queryByText('manage-marker')).toBeNull();
});

test('a PUBLISHED entry has no Publish button (autosave edits it live)', async () => {
  mockedUseAuth.mockReturnValue({ user: { isCurator: true } });
  cat.getCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Zombie', publishedAt: '2026-01-01T00:00:00.000Z' });
  renderAt('/catalog/admin/c1');
  await waitFor(() => expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Zombie'));
  expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
});

test('edit mode shows a calm not-found for a missing entry', async () => {
  mockedUseAuth.mockReturnValue({ user: { isCurator: true } });
  cat.getCatalogEntry.mockRejectedValue(new CatalogNotFoundError());
  renderAt('/catalog/admin/gone');
  await screen.findByText(/not found/i);
  expect(screen.getByText(/Back to manage/i)).toBeInTheDocument();
});

test('edit mode can delete the entry (confirm → back to manage)', async () => {
  mockedUseAuth.mockReturnValue({ user: { isCurator: true } });
  cat.getCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Zombie', publishedAt: null });
  cat.deleteCatalogEntry.mockResolvedValue(undefined);
  renderAt('/catalog/admin/c1');

  await waitFor(() => expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Zombie'));
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

  await waitFor(() => expect(cat.deleteCatalogEntry).toHaveBeenCalledWith('c1'));
  await screen.findByText('manage-marker');
});

describe('#52: a failed duplicate check', () => {
  const BANNER = /already exists in the Catalog/i;
  const CONFLICT_BANNER = 'This title and artist already exist in the Catalog.';
  const DUPLICATE = { exists: true, entry: { uid: 'other', title: 'Zombie', artist: 'B' } };
  const PAST_CHECK_DEBOUNCE = 600; // the check fires 500ms after the last edit
  const PAST_AUTOSAVE = 1300; // the autosave fires 1200ms after the last edit
  const typeArtist = (value: string) => fireEvent.change(screen.getByLabelText('Artist'), { target: { value } });
  const wait = (ms: number) => act(async () => { await jest.advanceTimersByTimeAsync(ms); });
  const typeArtistAndCheck = async (value: string) => { typeArtist(value); await wait(PAST_CHECK_DEBOUNCE); };

  const openDraft = async () => {
    mockedUseAuth.mockReturnValue({ user: { isCurator: true } });
    cat.getCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Zombie', artist: 'A', publishedAt: null });
    cat.updateCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Zombie' });
    renderAt('/catalog/admin/c1');
    await wait(0);
  };

  // A draft whose duplicate check has just put the banner up.
  const openDraftWithBanner = async () => {
    cat.checkCatalogExists.mockResolvedValue(DUPLICATE);
    await openDraft();
    await typeArtistAndCheck('B');
    expect(screen.getByText(BANNER)).toBeInTheDocument();
  };

  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  test('removes the banner and brings Publish back', async () => {
    await openDraftWithBanner();
    cat.checkCatalogExists.mockRejectedValue(new Error('Failed to check catalog existence'));

    await typeArtistAndCheck('Bb');

    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
  });

  test('a timed-out check counts as a real failure', async () => {
    await openDraftWithBanner();
    cat.checkCatalogExists.mockRejectedValue(new DOMException('Timed out', 'AbortError'));

    await typeArtistAndCheck('Bb');

    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
  });

  test('a check cancelled by further typing leaves the banner as it is', async () => {
    await openDraftWithBanner();
    cat.checkCatalogExists.mockImplementation((_title, _artist, _uid, signal) => new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));

    await typeArtistAndCheck('Bb');
    typeArtist('Bbb');
    await wait(100);

    expect(screen.getByText(BANNER)).toBeInTheDocument();
  });

  test('a cancelled check that still answers is ignored', async () => {
    await openDraft();
    let finishOldCheck: (value: typeof DUPLICATE) => void = () => {};
    cat.checkCatalogExists.mockReturnValue(new Promise(resolve => { finishOldCheck = resolve; }));

    await typeArtistAndCheck('B');
    typeArtist('Bb');
    await act(async () => { finishOldCheck(DUPLICATE); });

    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
  });

  test('shows no message of its own, and a later check can flag a duplicate again', async () => {
    await openDraftWithBanner();
    cat.checkCatalogExists.mockRejectedValue(new Error('offline'));
    await typeArtistAndCheck('Bb');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/could ?n.t|could not|failed|unable|try again/i)).not.toBeInTheDocument();

    cat.checkCatalogExists.mockResolvedValue(DUPLICATE);
    await typeArtistAndCheck('B');

    expect(screen.getByText(BANNER)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
  });

  test('a 409 on save after a failed check brings the banner back', async () => {
    await openDraftWithBanner();
    cat.checkCatalogExists.mockRejectedValue(new Error('offline'));
    cat.updateCatalogEntry.mockRejectedValue(new CatalogConflictError());

    typeArtist('Bb');
    await wait(PAST_AUTOSAVE);

    expect(cat.updateCatalogEntry).toHaveBeenCalled();
    expect(screen.getByText(CONFLICT_BANNER)).toBeInTheDocument();
  });

  test('a 409 followed by a failed check leaves autosave working', async () => {
    await openDraft();
    let failCheck: (reason: Error) => void = () => {};
    cat.checkCatalogExists.mockReturnValue(new Promise((_resolve, reject) => { failCheck = reject; }));
    cat.updateCatalogEntry.mockRejectedValueOnce(new CatalogConflictError());

    typeArtist('B');
    await wait(PAST_AUTOSAVE);
    expect(screen.getByText(CONFLICT_BANNER)).toBeInTheDocument();
    await act(async () => { failCheck(new Error('offline')); });
    expect(screen.queryByText(CONFLICT_BANNER)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Album'), { target: { value: 'No Need to Argue' } });
    await wait(PAST_AUTOSAVE);

    expect(cat.updateCatalogEntry).toHaveBeenLastCalledWith('c1', expect.objectContaining({ album: 'No Need to Argue' }));
  });
});

test('auto-fill fills metadata but adds no streaming link (#107)', async () => {
  mockedUseAuth.mockReturnValue({ user: { isCurator: true } });
  cat.getCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Creep', artist: 'Radiohead', publishedAt: null, streamingLinks: [] });
  (songService.lookupMetadata as jest.Mock).mockResolvedValue({ source: 'lastfm', album: 'Pablo Honey' });
  renderAt('/catalog/admin/c1');

  fireEvent.click(await screen.findByRole('button', { name: /Auto-fill/ }));

  await waitFor(() => expect(screen.getByLabelText('Album')).toHaveValue('Pablo Honey'));
  expect(screen.queryByRole('button', { name: /^Remove .* link$/ })).toBeNull();
});

describe('the three official links of a Catalog entry (#109)', () => {
  const openEntry = async (streamingLinks: Array<{ label: string; url: string }> = []) => {
    mockedUseAuth.mockReturnValue({ user: { isCurator: true } });
    cat.getCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Creep', artist: 'Radiohead', publishedAt: null, streamingLinks });
    cat.updateCatalogEntry.mockResolvedValue({ uid: 'c1', title: 'Creep' });
    renderAt('/catalog/admin/c1');
    await waitFor(() => expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Creep'));
  };
  const savedLinks = async () => {
    await act(async () => { await jest.advanceTimersByTimeAsync(1300); });
    await waitFor(() => expect(cat.updateCatalogEntry).toHaveBeenCalled());
    return cat.updateCatalogEntry.mock.calls.at(-1)![1].streamingLinks;
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('pasting a track link in a platform field saves it under that platform', async () => {
    await openEntry();
    fireEvent.change(screen.getByLabelText('Spotify link'), { target: { value: 'https://open.spotify.com/track/70LcF31zb1H0PyJoS1Sx1r' } });
    expect(await savedLinks()).toEqual([{ label: 'Spotify', url: 'https://open.spotify.com/track/70LcF31zb1H0PyJoS1Sx1r' }]);
  });

  test.each([
    ['a search page', 'YouTube link', 'https://www.youtube.com/results?search_query=radiohead+creep'],
    ['another platform\'s link', 'YouTube link', 'https://open.spotify.com/track/70LcF31zb1H0PyJoS1Sx1r'],
  ])('%s is refused with a message and not saved', async (_name, field, url) => {
    await openEntry();
    fireEvent.change(screen.getByLabelText(field), { target: { value: url } });
    expect(screen.getByRole('alert')).toHaveTextContent('Not a YouTube track link');
    await act(async () => { await jest.advanceTimersByTimeAsync(1300); });
    expect(cat.updateCatalogEntry).not.toHaveBeenCalled();
  });

  test('the saved links fill their fields, and clearing a field removes its link', async () => {
    await openEntry([
      { label: 'YouTube', url: 'https://youtu.be/XFkzRNyygfk' },
      { label: 'Deezer', url: 'https://www.deezer.com/track/138547415' },
    ]);
    expect(screen.getByLabelText('YouTube link')).toHaveValue('https://youtu.be/XFkzRNyygfk');
    expect(screen.getByLabelText('Spotify link')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('YouTube link'), { target: { value: '' } });
    expect(await savedLinks()).toEqual([{ label: 'Deezer', url: 'https://www.deezer.com/track/138547415' }]);
  });
});
