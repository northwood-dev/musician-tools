import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyInstrumentsPage from '../pages/MyInstrumentsPage';
import { instrumentService, type Instrument } from '../services/instrumentService';

jest.mock('../services/instrumentService', () => ({
  instrumentService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

const mockedService = instrumentService as jest.Mocked<typeof instrumentService>;

const jazzBass: Instrument = { uid: 'i1', name: 'Jazz Bass', type: 'Bass', brand: 'Fender', model: 'Player' };

function renderPage() {
  return render(
    <MemoryRouter>
      <MyInstrumentsPage />
    </MemoryRouter>
  );
}

async function openRow(name: string) {
  const row = (await screen.findByText(name)).closest('tr') as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedService.getAll.mockResolvedValue([jazzBass]);
});

test('clearing a field and pressing Save really clears it', async () => {
  mockedService.update.mockResolvedValue({ ...jazzBass, brand: '' });
  renderPage();
  await openRow('Jazz Bass');

  fireEvent.change(screen.getByDisplayValue('Fender'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() => {
    expect(mockedService.update).toHaveBeenCalledWith('i1', { name: 'Jazz Bass', type: 'Bass', brand: '', model: 'Player' });
  });
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument());
  expect(screen.queryByText('Fender')).not.toBeInTheDocument();
});

test('during a save the table stays visible and the row being saved is disabled', async () => {
  mockedService.getAll.mockResolvedValue([jazzBass, { uid: 'i2', name: 'Telecaster' }]);
  let finishSave: (value: Instrument) => void = () => {};
  mockedService.update.mockReturnValue(new Promise(resolve => { finishSave = resolve; }));
  renderPage();
  await openRow('Jazz Bass');

  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() => expect(mockedService.update).toHaveBeenCalled());
  expect(screen.getByText('Telecaster')).toBeInTheDocument();
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('Fender')).toBeDisabled();

  finishSave(jazzBass);
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument());
});

test('a failed Save keeps the row open with what was typed and shows the error', async () => {
  mockedService.update.mockRejectedValue(new Error('Failed to update instrument'));
  renderPage();
  await openRow('Jazz Bass');

  fireEvent.change(screen.getByDisplayValue('Fender'), { target: { value: 'Squier' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('Failed to update instrument')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Squier')).toBeInTheDocument();
});

test('the initial load shows the loading state', async () => {
  renderPage();

  expect(screen.getByText('Loading...')).toBeInTheDocument();
  expect(await screen.findByText('Jazz Bass')).toBeInTheDocument();
});
