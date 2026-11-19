import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CatalogSuggestions from '../pages/CatalogSuggestions';
import { useAuth } from '../contexts/AuthContext';
import { catalogService } from '../services/catalogService';
import type { CatalogSuggestionLine } from '../services/catalogService';
import { ROUTER_FUTURE } from '../routerFuture';

jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../services/catalogService', () => {
  const actual = jest.requireActual('../services/catalogService');
  const { makeCatalogServiceMock } = jest.requireActual('../test/catalogServiceMock');
  return { ...actual, catalogService: makeCatalogServiceMock() };
});

const cat = catalogService as jest.Mocked<typeof catalogService>;
const auth = useAuth as jest.Mock;

const line = (overrides: Partial<CatalogSuggestionLine> & { title?: string; artist?: string } = {}): CatalogSuggestionLine => {
  const { title = 'Wonderwall', artist = 'Oasis', ...rest } = overrides;
  return {
    id: `id-${title}`,
    suggestedBy: 1,
    song: { title, artist, key: 'F#', mode: 'Minor', bpm: 87, timeSignature: '4/4' },
    catalog: null,
    ...rest,
  };
};

const renderPage = () => render(
  <StrictMode>
    <MemoryRouter future={ROUTER_FUTURE} initialEntries={['/catalog/manage/suggestions']}>
      <Routes>
        <Route path="/catalog/manage/suggestions" element={<CatalogSuggestions />} />
        <Route path="/catalog/admin/:uid" element={<div>admin-marker</div>} />
        <Route path="/" element={<div>home-marker</div>} />
      </Routes>
    </MemoryRouter>
  </StrictMode>
);

beforeEach(() => {
  jest.clearAllMocks();
  auth.mockReturnValue({ user: { uid: 'u1', isCurator: true } });
});

// #230: headers that say what the columns hold.
test('the columns are Song, Key · BPM · Time, Suggested by and Status', async () => {
  cat.getSuggestions.mockResolvedValue({ pending: 1, suggestions: [line()] });
  renderPage();
  await screen.findByText('Wonderwall');
  expect(screen.getAllByRole('columnheader').map(h => h.textContent)).toEqual(['Song', 'Key · BPM · Time', 'Suggested by', 'Status', 'Actions']);
});

test('lists one line per suggested song, with how many users suggested it', async () => {
  cat.getSuggestions.mockResolvedValue({ pending: 2, suggestions: [line({ suggestedBy: 3 }), line({ title: 'Zombie', artist: 'The Cranberries' })] });
  renderPage();
  const row = (await screen.findByText('Wonderwall')).closest('tr')!;
  expect(within(row).getByText('Oasis')).toBeInTheDocument();
  expect(within(row).getByText('3 users')).toBeInTheDocument();
  const other = screen.getByText('Zombie').closest('tr')!;
  expect(within(other).getByText('1 user')).toBeInTheDocument();
});

test.each([
  ['nothing in the Catalog yet', null, 'New'],
  ['a draft in progress', { uid: 'd1', published: false }, 'Draft in progress'],
  ['a published entry', { uid: 'c1', published: true }, 'Already in the Catalog'],
])('Status of a song with %s', async (_name, catalog, status) => {
  cat.getSuggestions.mockResolvedValue({ pending: 1, suggestions: [line({ catalog })] });
  renderPage();
  const row = (await screen.findByText('Wonderwall')).closest('tr')!;
  expect(within(row).getByText(status)).toBeInTheDocument();
});

test('an empty queue says so', async () => {
  cat.getSuggestions.mockResolvedValue({ pending: 0, suggestions: [] });
  renderPage();
  expect(await screen.findByText('No suggestions waiting.')).toBeInTheDocument();
});

test('a failed load offers Retry', async () => {
  cat.getSuggestions.mockRejectedValueOnce(new Error('down')).mockResolvedValue({ pending: 0, suggestions: [] });
  renderPage();
  // #216: says what didn't load, announced
  expect((await screen.findByText("Couldn't load the suggestions.")).closest('[role="alert"]')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('No suggestions waiting.')).toBeInTheDocument();
});

test('a non-curator is sent home', async () => {
  auth.mockReturnValue({ user: { uid: 'u2', isCurator: false } });
  renderPage();
  expect(await screen.findByText('home-marker')).toBeInTheDocument();
  expect(cat.getSuggestions).not.toHaveBeenCalled();
});

describe('Reject (#213)', () => {
  // The page closes the confirmation last: wait for it, so no update lands after the test.
  const dialogClosed = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  // A queue with state (StrictMode loads it twice on mount, so no "once" answers).
  let waiting: CatalogSuggestionLine[] = [];
  beforeEach(() => {
    waiting = [line()];
    cat.getSuggestions.mockImplementation(async () => ({ pending: waiting.length, suggestions: waiting }));
  });
  const reject = async () => {
    fireEvent.click(within((await screen.findByText('Wonderwall')).closest('tr')!).getByRole('button', { name: 'Reject Oasis — Wonderwall' }));
    // act: a failed reject settles in the same tick as the click.
    await act(async () => { fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reject' })); });
  };

  test('asks first, then removes the line and says it is done', async () => {
    cat.rejectSuggestion.mockImplementation(async () => { waiting = []; return { rejected: 1 }; });
    renderPage();
    fireEvent.click(within((await screen.findByText('Wonderwall')).closest('tr')!).getByRole('button', { name: 'Reject Oasis — Wonderwall' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/aren't told/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/^Reject "Oasis — Wonderwall"\?/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(await screen.findByText('"Oasis — Wonderwall" rejected.')).toBeInTheDocument();
    expect(cat.rejectSuggestion).toHaveBeenCalledWith('id-Wonderwall');
    expect(await screen.findByText('No suggestions waiting.')).toBeInTheDocument();
    await dialogClosed();
  });

  test('Cancel rejects nothing', async () => {
    renderPage();
    fireEvent.click(within((await screen.findByText('Wonderwall')).closest('tr')!).getByRole('button', { name: 'Reject Oasis — Wonderwall' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(cat.rejectSuggestion).not.toHaveBeenCalled();
    await dialogClosed();
  });

  test('a suggestion no longer waiting says so and reloads the queue', async () => {
    const { SuggestionGoneError } = jest.requireActual('../services/catalogService');
    cat.rejectSuggestion.mockImplementation(async () => { waiting = []; throw new SuggestionGoneError(); });
    renderPage();
    await reject();
    expect(await screen.findByText('This suggestion is no longer waiting.')).toBeInTheDocument();
    expect(await screen.findByText('No suggestions waiting.')).toBeInTheDocument();
    await dialogClosed();
  });

  test('a failure says so and keeps the line', async () => {
    cat.rejectSuggestion.mockRejectedValue(new Error('down'));
    renderPage();
    await reject();
    expect(await screen.findByText('Could not reject "Oasis — Wonderwall".')).toBeInTheDocument();
    expect(screen.getByText('Wonderwall')).toBeInTheDocument();
    await dialogClosed();
  });
});

describe('Merge (#214, #236)', () => {
  const dialogFree = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  let waiting: CatalogSuggestionLine[] = [];
  beforeEach(() => {
    waiting = [line({ suggestedBy: 2, catalog: { uid: 'cat-1', published: true, differences: [] } })];
    cat.getSuggestions.mockImplementation(async () => ({ pending: waiting.length, suggestions: waiting }));
  });
  const row = async () => (await screen.findByText('Wonderwall')).closest('tr')!;
  const mergeButton = async () => within(await row()).getByRole('button', { name: 'Merge Oasis — Wonderwall into the Catalog entry' });

  test('the page says what Merge does', async () => {
    renderPage();
    await row();
    expect(screen.getByText(/Merge combines a suggestion with the Catalog entry that already exists/)).toBeInTheDocument();
  });

  test('with no difference, Merge ties the songs to the entry, and the line leaves the queue', async () => {
    cat.mergeSuggestion.mockImplementation(async () => { waiting = []; return { linked: 2, catalogUid: 'cat-1' }; });
    renderPage();
    const button = await mergeButton();
    expect(button).toHaveTextContent('Merge');
    await act(async () => { fireEvent.click(button); });
    expect(cat.mergeSuggestion).toHaveBeenCalledWith('id-Wonderwall');
    expect(await screen.findByText('"Oasis — Wonderwall" merged into the Catalog entry (2 songs).')).toBeInTheDocument();
    expect(await screen.findByText('No suggestions waiting.')).toBeInTheDocument();
    await dialogFree();
  });

  test('values that differ show a tag, and Merge waits for the review of the differences', async () => {
    waiting = [line({ catalog: { uid: 'cat-1', published: true, differences: [
      { field: 'bpm', catalog: 94, suggested: [{ value: 120, users: 1 }] },
    ] } })];
    renderPage();
    const r = await row();
    expect(within(r).getByText('Differs from the Catalog')).toBeInTheDocument();
    expect(within(r).getByRole('button', { name: 'Merge Oasis — Wonderwall into the Catalog entry' })).toBeDisabled();
  });

  test('no difference, no tag', async () => {
    renderPage();
    expect(within(await row()).queryByText('Differs from the Catalog')).toBeNull();
  });

  test('only a published entry offers Merge', async () => {
    waiting = [line({ catalog: { uid: 'draft-1', published: false } }), line({ title: 'Zombie', catalog: null })];
    renderPage();
    await screen.findByText('Wonderwall');
    expect(screen.queryByRole('button', { name: /^Merge / })).not.toBeInTheDocument();
  });

  test('values that came to differ meanwhile say so and reload', async () => {
    const { SuggestionDifferencesError } = jest.requireActual('../services/catalogService');
    cat.mergeSuggestion.mockImplementation(async () => {
      waiting = [line({ catalog: { uid: 'cat-1', published: true, differences: [{ field: 'bpm', catalog: 94, suggested: [{ value: 120, users: 1 }] }] } })];
      throw new SuggestionDifferencesError();
    });
    renderPage();
    const button = await mergeButton();
    await act(async () => { fireEvent.click(button); });
    expect(await screen.findByText('Some values now differ from the Catalog entry: review them first.')).toBeInTheDocument();
    expect(await screen.findByText('Differs from the Catalog')).toBeInTheDocument();
  });

  test('a suggestion no longer waiting says so and reloads', async () => {
    const { SuggestionGoneError } = jest.requireActual('../services/catalogService');
    cat.mergeSuggestion.mockImplementation(async () => { waiting = []; throw new SuggestionGoneError(); });
    renderPage();
    const button = await mergeButton();
    await act(async () => { fireEvent.click(button); });
    expect(await screen.findByText('This suggestion is no longer waiting.')).toBeInTheDocument();
    expect(await screen.findByText('No suggestions waiting.')).toBeInTheDocument();
  });

  test('a failure says so and keeps the line', async () => {
    cat.mergeSuggestion.mockRejectedValue(new Error('down'));
    renderPage();
    const button = await mergeButton();
    await act(async () => { fireEvent.click(button); });
    expect(await screen.findByText('Could not merge "Oasis — Wonderwall".')).toBeInTheDocument();
    expect(screen.getByText('Wonderwall')).toBeInTheDocument();
  });
});

describe('Review and drafts (#215, #230)', () => {
  let waiting: CatalogSuggestionLine[] = [];
  beforeEach(() => {
    waiting = [line()];
    cat.getSuggestions.mockImplementation(async () => ({ pending: waiting.length, suggestions: waiting }));
  });
  const reviewButton = async () => within((await screen.findByText('Wonderwall')).closest('tr')!).getByRole('button', { name: 'Review Oasis — Wonderwall' });

  test('Review creates a pre-filled draft and opens it with the suggestion', async () => {
    cat.acceptSuggestion.mockResolvedValue({ catalogUid: 'draft-1' });
    renderPage();
    const button = await reviewButton();
    await act(async () => { fireEvent.click(button); });
    expect(cat.acceptSuggestion).toHaveBeenCalledWith('id-Wonderwall');
    expect(await screen.findByText('admin-marker')).toBeInTheDocument();
  });

  test('the page says nothing is published before Publish', async () => {
    renderPage();
    await screen.findByText('Wonderwall');
    expect(screen.getByText(/nothing is published until you click Publish/i)).toBeInTheDocument();
  });

  test('a draft in progress offers Review, which opens that draft, and not Merge', async () => {
    waiting = [line({ catalog: { uid: 'draft-1', published: false } })];
    renderPage();
    const row = (await screen.findByText('Wonderwall')).closest('tr')!;
    expect(within(row).getByRole('link', { name: 'Review Oasis — Wonderwall' })).toHaveAttribute('href', '/catalog/admin/draft-1?suggestion=id-Wonderwall');
    expect(within(row).queryByRole('link', { name: /^Open the draft/ })).toBeNull();
    expect(within(row).queryByRole('button', { name: /^Merge / })).toBeNull();
  });

  test('a song already published offers Merge, not Review', async () => {
    waiting = [line({ catalog: { uid: 'cat-1', published: true } })];
    renderPage();
    const row = (await screen.findByText('Wonderwall')).closest('tr')!;
    expect(within(row).getByRole('button', { name: /^Merge / })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /^Review / })).toBeNull();
    expect(within(row).queryByRole('link', { name: /^Review / })).toBeNull();
  });

  test("a failure says so with the button's own word, and keeps the line", async () => {
    cat.acceptSuggestion.mockRejectedValue(new Error('down'));
    renderPage();
    const button = await reviewButton();
    await act(async () => { fireEvent.click(button); });
    expect(await screen.findByText('Could not review "Oasis — Wonderwall".')).toBeInTheDocument();
    expect(screen.getByText('Wonderwall')).toBeInTheDocument();
  });

  test('a song that reached the Catalog meanwhile says so and reloads', async () => {
    const { SuggestionInCatalogError } = jest.requireActual('../services/catalogService');
    cat.acceptSuggestion.mockImplementation(async () => {
      waiting = [line({ catalog: { uid: 'cat-1', published: true } })];
      throw new SuggestionInCatalogError('cat-1');
    });
    renderPage();
    const button = await reviewButton();
    await act(async () => { fireEvent.click(button); });
    expect(await screen.findByText('This song is already in the Catalog.')).toBeInTheDocument();
    expect(await screen.findByText('Already in the Catalog')).toBeInTheDocument();
  });
});

describe('The song name (#230)', () => {
  let waiting: CatalogSuggestionLine[] = [];
  beforeEach(() => {
    waiting = [line()];
    cat.getSuggestions.mockImplementation(async () => ({ pending: waiting.length, suggestions: waiting }));
  });
  const songCell = async () => (await screen.findByText('Wonderwall')).closest('td')!;

  test('shows the artist before the title', async () => {
    renderPage();
    expect((await songCell()).textContent).toMatch(/^Oasis.*Wonderwall$/);
  });

  test('on a new song, opens a pre-filled draft as Review does', async () => {
    cat.acceptSuggestion.mockResolvedValue({ catalogUid: 'draft-1' });
    renderPage();
    const name = within(await songCell()).getByRole('button', { name: 'Open Oasis — Wonderwall' });
    await act(async () => { fireEvent.click(name); });
    expect(cat.acceptSuggestion).toHaveBeenCalledWith('id-Wonderwall');
    expect(await screen.findByText('admin-marker')).toBeInTheDocument();
  });

  test('on a draft in progress, opens that draft', async () => {
    waiting = [line({ catalog: { uid: 'draft-1', published: false } })];
    renderPage();
    expect(within(await songCell()).getByRole('link', { name: 'Open Oasis — Wonderwall' }))
      .toHaveAttribute('href', '/catalog/admin/draft-1?suggestion=id-Wonderwall');
  });

  test('on a song already in the Catalog, opens its published entry', async () => {
    waiting = [line({ catalog: { uid: 'cat-1', published: true } })];
    renderPage();
    expect(within(await songCell()).getByRole('link', { name: 'Open Oasis — Wonderwall' }))
      .toHaveAttribute('href', '/catalog/cat-1');
  });
});
