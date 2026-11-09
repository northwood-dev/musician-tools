import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CatalogArtistAliases from '../pages/CatalogArtistAliases';
import { useAuth } from '../contexts/AuthContext';
import { artistAliasService, ArtistAliasConflictError } from '../services/artistAliasService';

jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../services/artistAliasService', () => {
  const actual = jest.requireActual('../services/artistAliasService');
  return {
    ...actual,
    artistAliasService: { list: jest.fn(), listWithCounts: jest.fn(), create: jest.fn(), remove: jest.fn() },
  };
});

const svc = artistAliasService as jest.Mocked<typeof artistAliasService>;
const auth = useAuth as jest.Mock;

const RHCP = { uid: 'a', alias: 'RHCP', artist: 'Red Hot Chili Peppers', entryCount: 19 };
const BROKEN = { uid: 'b', alias: 'XYZ', artist: 'Renamed Band', entryCount: 0 };

const renderPage = () => render(
  <StrictMode>
    <MemoryRouter initialEntries={['/catalog/manage/aliases']}>
      <Routes>
        <Route path="/catalog/manage/aliases" element={<CatalogArtistAliases />} />
        <Route path="/" element={<div>home-marker</div>} />
      </Routes>
    </MemoryRouter>
  </StrictMode>
);

const add = (alias: string, artist: string) => {
  fireEvent.change(screen.getByLabelText('Alias'), { target: { value: alias } });
  fireEvent.change(screen.getByLabelText('Artist'), { target: { value: artist } });
  fireEvent.click(screen.getByRole('button', { name: 'Add alias' }));
};

beforeEach(() => {
  jest.clearAllMocks();
  auth.mockReturnValue({ user: { isCurator: true } });
  svc.listWithCounts.mockResolvedValue([RHCP, BROKEN]);
});

test('a non-curator is sent away, and nothing loads', async () => {
  auth.mockReturnValue({ user: { isCurator: false } });
  renderPage();
  await screen.findByText('home-marker');
  expect(svc.listWithCounts).not.toHaveBeenCalled();
});

test('lists each alias with its artist and the number of Catalog entries found', async () => {
  renderPage();
  const row = (await screen.findByText('RHCP')).closest('tr')!;
  expect(within(row).getByText('Red Hot Chili Peppers')).toBeInTheDocument();
  expect(within(row).getByText('19 entries')).toBeInTheDocument();
});

test('an alias finding 0 entries is flagged in words, not only by color', async () => {
  renderPage();
  const row = (await screen.findByText('XYZ')).closest('tr')!;
  expect(within(row).getByText(/No Catalog entry found/)).toBeInTheDocument();
});

test('adding sends the values, reloads the list and announces it', async () => {
  svc.create.mockResolvedValue({ uid: 'c', alias: 'QN', artist: 'Queen' });
  renderPage();
  await screen.findByText('RHCP');
  svc.listWithCounts.mockResolvedValue([RHCP, BROKEN, { uid: 'c', alias: 'QN', artist: 'Queen', entryCount: 3 }]);

  add('QN', 'Queen');

  await waitFor(() => expect(svc.create).toHaveBeenCalledWith({ alias: 'QN', artist: 'Queen' }));
  await screen.findByText('QN');
  expect(screen.getByRole('status')).toHaveTextContent('Alias "QN" added.');
  expect(screen.getByLabelText('Alias')).toHaveValue('');
  expect(screen.getByLabelText('Artist')).toHaveValue('');
});

test('a duplicate names the existing alias and keeps what was typed', async () => {
  svc.create.mockRejectedValue(new ArtistAliasConflictError(RHCP));
  renderPage();
  await screen.findByText('RHCP');

  add('r.h.c.p', 'Someone');

  expect(await screen.findByRole('alert')).toHaveTextContent('"RHCP" already exists, for Red Hot Chili Peppers.');
  expect(screen.getByLabelText('Alias')).toHaveValue('r.h.c.p');
});

test('an empty value sends nothing and says why', async () => {
  renderPage();
  await screen.findByText('RHCP');

  add('  ', 'Queen');

  expect(await screen.findByRole('alert')).toHaveTextContent('Enter an alias and an artist.');
  expect(svc.create).not.toHaveBeenCalled();
});

test('a failed add says so and keeps what was typed', async () => {
  svc.create.mockRejectedValue(new Error('boom'));
  renderPage();
  await screen.findByText('RHCP');

  add('QN', 'Queen');

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not add this alias.');
  expect(screen.getByLabelText('Alias')).toHaveValue('QN');
});

test('removing asks for confirmation first', async () => {
  svc.remove.mockResolvedValue(undefined);
  renderPage();
  await screen.findByText('RHCP');

  fireEvent.click(screen.getByRole('button', { name: 'Remove alias RHCP' }));
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent('RHCP');
  expect(svc.remove).not.toHaveBeenCalled();

  svc.listWithCounts.mockResolvedValue([BROKEN]);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));

  await waitFor(() => expect(svc.remove).toHaveBeenCalledWith('a'));
  await waitFor(() => expect(screen.queryByText('RHCP')).toBeNull());
  expect(screen.getByRole('status')).toHaveTextContent('Alias "RHCP" removed.');
});

test('cancelling a removal removes nothing', async () => {
  renderPage();
  await screen.findByText('RHCP');

  fireEvent.click(screen.getByRole('button', { name: 'Remove alias RHCP' }));
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(svc.remove).not.toHaveBeenCalled();
});

test('a failing list says so and offers a retry that works', async () => {
  svc.listWithCounts.mockRejectedValue(new Error('boom'));
  renderPage();
  await screen.findByText('Something went wrong.');

  svc.listWithCounts.mockResolvedValue([RHCP]);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

  await screen.findByText('RHCP');
});
