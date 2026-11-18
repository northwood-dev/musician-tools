import { StrictMode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CatalogManage from '../pages/CatalogManage';
import { useAuth } from '../contexts/AuthContext';
import { catalogService } from '../services/catalogService';
import { ROUTER_FUTURE } from '../routerFuture';

// Story 20.2 — the Collections tab of the curator hub (/catalog/manage?tab=collections).
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../services/catalogService', () => {
  const actual = jest.requireActual('../services/catalogService');
  const { makeCatalogServiceMock } = jest.requireActual('../test/catalogServiceMock');
  return { ...actual, catalogService: makeCatalogServiceMock() };
});

const mockedUseAuth = useAuth as jest.Mock;
const cat = catalogService as jest.Mocked<typeof catalogService>;

// StrictMode so the fetch effect's double-mount can't regress (lesson from 19.4).
const renderCollectionsTab = () => render(
  <StrictMode>
    <MemoryRouter future={ROUTER_FUTURE} initialEntries={['/catalog/manage?tab=collections']}>
      <Routes>
        <Route path="/catalog/manage" element={<CatalogManage />} />
        <Route path="/catalog/manage/collections/:uid" element={<div>compose-marker</div>} />
        <Route path="/" element={<div>home-marker</div>} />
      </Routes>
    </MemoryRouter>
  </StrictMode>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({ user: { uid: 'u1', isCurator: true } });
  cat.listCatalog.mockResolvedValue({ items: [], total: 0, page: 1, limit: 24 });
  cat.deleteCatalogEntry.mockResolvedValue(undefined);
  cat.listCollections.mockResolvedValue([{ uid: 'col1', name: 'Rock 90s', description: null, songCount: 3 }]);
  cat.createCollection.mockResolvedValue({ uid: 'newcol', name: 'Jazz', description: null });
});

test('the Collections tab lists collections with their entry count', async () => {
  renderCollectionsTab();
  await screen.findByText('Rock 90s');
  expect(screen.getByText('3 entries')).toBeInTheDocument();
});

test('New collection creates it and navigates to the composer', async () => {
  renderCollectionsTab();
  await screen.findByText('Rock 90s');
  fireEvent.change(screen.getByLabelText('New collection name'), { target: { value: 'Jazz' } });
  fireEvent.click(screen.getByRole('button', { name: 'New collection' }));
  await screen.findByText('compose-marker');
  expect(cat.createCollection).toHaveBeenCalledWith('Jazz');
});

test('empty state when there are no collections', async () => {
  cat.listCollections.mockResolvedValue([]);
  renderCollectionsTab();
  await screen.findByText('No collections yet — create the first one.');
});

// #181: the Entries / Collections tabs follow the standard tabs pattern (shared <Tabs>).
test('the Curate tabs work from the keyboard and show the selected tab\'s panel', async () => {
  renderCollectionsTab();
  await screen.findByText('Rock 90s');
  expect(screen.getByRole('tablist', { name: 'Curate sections' })).toBeInTheDocument();
  const collections = screen.getByRole('tab', { name: 'Collections' });
  expect(collections).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel', { name: 'Collections' })).toHaveTextContent('Rock 90s');

  fireEvent.keyDown(collections, { key: 'ArrowLeft' });
  const entries = await screen.findByRole('tab', { name: 'Entries', selected: true });
  expect(entries).toHaveFocus();
  expect(await screen.findByRole('tabpanel', { name: 'Entries' })).toHaveTextContent(/All entries/);
  expect(screen.queryByText('Rock 90s')).not.toBeInTheDocument();
});

test('#216: a failed collections tab says so, announced, and Retry reloads it', async () => {
  cat.listCollections.mockRejectedValue(new Error('offline'));
  renderCollectionsTab();
  expect((await screen.findByText("Couldn't load the collections.")).closest('[role="alert"]')).not.toBeNull();
  cat.listCollections.mockResolvedValue([{ uid: 'col1', name: 'Rock 90s', description: null, songCount: 3 }]);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Rock 90s')).toBeInTheDocument();
});
