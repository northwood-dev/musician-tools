import { StrictMode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
