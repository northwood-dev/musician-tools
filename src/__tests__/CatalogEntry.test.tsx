import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CatalogEntry from '../pages/CatalogEntry';
import { catalogService, CatalogNotFoundError } from '../services/catalogService';
import type { Song } from '../services/songService';

jest.mock('../services/catalogService', () => {
  const actual = jest.requireActual('../services/catalogService');
  const { makeCatalogServiceMock } = jest.requireActual('../test/catalogServiceMock');
  return { ...actual, catalogService: makeCatalogServiceMock() };
});
const svc = catalogService as jest.Mocked<typeof catalogService>;

const renderAt = (uid: string) => render(
  <MemoryRouter initialEntries={[`/catalog/${uid}`]}>
    <Routes>
      <Route path="/catalog/:uid" element={<CatalogEntry />} />
      <Route path="/catalog" element={<div>browse-marker</div>} />
    </Routes>
  </MemoryRouter>
);

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });

// ---- #34: "Add as" instrument ----

const ZOMBIE = { uid: 'a', title: 'Zombie', artist: 'The Cranberries' };
const SONG = { uid: 'song-1', title: 'Zombie' } as Song;

const addButton = () => screen.findByRole('button', { name: 'Add "Zombie" to my songlist' });
const choose = (value: string) => fireEvent.change(screen.getByLabelText('Add as'), { target: { value } });

describe('Add as instrument', () => {
  beforeEach(() => {
    svc.getCatalogEntry.mockResolvedValue(ZOMBIE);
    svc.addToSonglist.mockResolvedValue(SONG);
  });

  test('adding sends the chosen instrument', async () => {
    renderAt('a');
    await addButton();
    choose('Bass');
    fireEvent.click(await addButton());
    await waitFor(() => expect(svc.addToSonglist).toHaveBeenCalledWith('a', 'Bass'));
  });

  test('offers the song form instruments plus No instrument, and asks to choose at first', async () => {
    renderAt('a');
    await addButton();
    const select = screen.getByLabelText<HTMLSelectElement>('Add as');
    expect(select).toHaveDisplayValue('Choose an instrument');
    const options = within(select).getAllByRole('option').map(o => o.textContent);
    expect(options).toEqual(expect.arrayContaining(['No instrument', 'Bass', 'Guitar', 'Other']));
  });

  test('adding with nothing chosen sends nothing, and points to the selector with a message', async () => {
    renderAt('a');
    fireEvent.click(await addButton());
    expect(svc.addToSonglist).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose an instrument first.');
    expect(screen.getByLabelText('Add as')).toHaveFocus();

    choose('Bass');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('No instrument is a valid choice: the song is added without an instrument', async () => {
    renderAt('a');
    await addButton();
    choose('__none__');
    fireEvent.click(await addButton());
    await waitFor(() => expect(svc.addToSonglist).toHaveBeenCalledWith('a', undefined));
  });

  test.each([['Bass', 'Bass'], ['__none__', 'No instrument']])('the choice %s survives a reload', async (value, shown) => {
    const first = renderAt('a');
    await addButton();
    choose(value);
    first.unmount();

    renderAt('a');
    await addButton();
    expect(screen.getByLabelText('Add as')).toHaveDisplayValue(shown);
  });

  test('a remembered value no longer in the list counts as nothing remembered', async () => {
    localStorage.setItem('catalogAddAsInstrument', 'Kazoo');
    renderAt('a');
    await addButton();
    expect(screen.getByLabelText('Add as')).toHaveDisplayValue('Choose an instrument');
  });

  test('blocked browser storage does not break the page: the choice just is not kept', async () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
      renderAt('a');
      await addButton();
      choose('Bass');
      fireEvent.click(await addButton());
      await waitFor(() => expect(svc.addToSonglist).toHaveBeenCalledWith('a', 'Bass'));
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });
});

test('renders the entry detail with intrinsic fields and clickable streaming links', async () => {
  svc.getCatalogEntry.mockResolvedValue({
    uid: 'a', title: 'Zombie', artist: 'The Cranberries', key: 'Em', bpm: 84,
    streamingLinks: [{ label: 'YouTube', url: 'https://youtu.be/x' }],
  });
  renderAt('a');
  await screen.findByText('Zombie');
  expect(screen.getByText('The Cranberries')).toBeInTheDocument();
  expect(screen.getByText('Em')).toBeInTheDocument();
  const link = screen.getByRole('link', { name: 'YouTube' });
  expect(link).toHaveAttribute('href', 'https://youtu.be/x');
  expect(link).toHaveAttribute('target', '_blank');
});

test('a 404 shows a calm not-found + Browse link (deep-link to a removed entry)', async () => {
  svc.getCatalogEntry.mockRejectedValue(new CatalogNotFoundError());
  renderAt('gone');
  await screen.findByText('This song is no longer in the Catalog.');
  expect(screen.getByRole('link', { name: /Browse the Catalog/i })).toBeInTheDocument();
});
