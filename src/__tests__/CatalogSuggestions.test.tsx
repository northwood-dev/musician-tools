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
        <Route path="/" element={<div>home-marker</div>} />
      </Routes>
    </MemoryRouter>
  </StrictMode>
);

beforeEach(() => {
  jest.clearAllMocks();
  auth.mockReturnValue({ user: { uid: 'u1', isCurator: true } });
});

test('lists one line per suggested song, with how many users suggested it', async () => {
  cat.getSuggestions.mockResolvedValue({ pending: 2, suggestions: [line({ suggestedBy: 3 }), line({ title: 'Zombie', artist: 'The Cranberries' })] });
  renderPage();
  const row = (await screen.findByText('Wonderwall')).closest('tr')!;
  expect(within(row).getByText('Oasis')).toBeInTheDocument();
  expect(within(row).getByText('suggested by 3 users')).toBeInTheDocument();
  const other = screen.getByText('Zombie').closest('tr')!;
  expect(within(other).getByText('suggested by 1 user')).toBeInTheDocument();
});

test('marks a song already in the Catalog', async () => {
  cat.getSuggestions.mockResolvedValue({ pending: 1, suggestions: [line({ catalog: { uid: 'c1', published: true } })] });
  renderPage();
  const row = (await screen.findByText('Wonderwall')).closest('tr')!;
  expect(within(row).getByText('Already in the Catalog')).toBeInTheDocument();
});

test('an empty queue says so', async () => {
  cat.getSuggestions.mockResolvedValue({ pending: 0, suggestions: [] });
  renderPage();
  expect(await screen.findByText('No suggestions waiting.')).toBeInTheDocument();
});

test('a failed load offers Retry', async () => {
  cat.getSuggestions.mockRejectedValueOnce(new Error('down')).mockResolvedValue({ pending: 0, suggestions: [] });
  renderPage();
  fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
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
    fireEvent.click(within((await screen.findByText('Wonderwall')).closest('tr')!).getByRole('button', { name: 'Reject Wonderwall' }));
    // act: a failed reject settles in the same tick as the click.
    await act(async () => { fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reject' })); });
  };

  test('asks first, then removes the line and says it is done', async () => {
    cat.rejectSuggestion.mockImplementation(async () => { waiting = []; return { rejected: 1 }; });
    renderPage();
    fireEvent.click(within((await screen.findByText('Wonderwall')).closest('tr')!).getByRole('button', { name: 'Reject Wonderwall' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/aren't told/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(await screen.findByText('"Wonderwall" rejected.')).toBeInTheDocument();
    expect(cat.rejectSuggestion).toHaveBeenCalledWith('id-Wonderwall');
    expect(await screen.findByText('No suggestions waiting.')).toBeInTheDocument();
    await dialogClosed();
  });

  test('Cancel rejects nothing', async () => {
    renderPage();
    fireEvent.click(within((await screen.findByText('Wonderwall')).closest('tr')!).getByRole('button', { name: 'Reject Wonderwall' }));
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
    expect(await screen.findByText('Could not reject "Wonderwall".')).toBeInTheDocument();
    expect(screen.getByText('Wonderwall')).toBeInTheDocument();
    await dialogClosed();
  });
});
