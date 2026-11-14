import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { leavePage, renderPageWithLeaveLink } from '../testUtils/renderPageWithLeaveLink';
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
  // Opening a row first saves the open one, so it lands after the click's async work.
  await act(async () => {
    fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));
  });
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

  fireEvent.change(screen.getByDisplayValue('Player'), { target: { value: 'Vintage' } });
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

describe('#43: moving to another row', () => {
  const telecaster: Instrument = { uid: 'i2', name: 'Telecaster', type: 'Guitar', brand: 'Fender', model: 'Standard' };

  beforeEach(() => {
    mockedService.getAll.mockResolvedValue([jazzBass, telecaster]);
  });

  test('Edit on another row saves the open row, then opens the other one', async () => {
    mockedService.update.mockResolvedValue({ ...jazzBass, model: 'Vintage' });
    renderPage();
    await openRow('Jazz Bass');

    fireEvent.change(screen.getByDisplayValue('Player'), { target: { value: 'Vintage' } });
    await openRow('Telecaster');

    await waitFor(() => expect(screen.getByDisplayValue('Standard')).toBeInTheDocument());
    expect(mockedService.update).toHaveBeenCalledTimes(1);
    expect(mockedService.update).toHaveBeenCalledWith('i1', { name: 'Jazz Bass', type: 'Bass', brand: 'Fender', model: 'Vintage' });
    expect(screen.getByText('Vintage')).toBeInTheDocument();
  });
  test('with nothing changed, moving rows sends no save', async () => {
    renderPage();
    await openRow('Jazz Bass');
    await openRow('Telecaster');

    await waitFor(() => expect(screen.getByDisplayValue('Standard')).toBeInTheDocument());
    expect(mockedService.update).not.toHaveBeenCalled();
  });

  test('an empty name stays on the row and says the name is required', async () => {
    renderPage();
    await openRow('Jazz Bass');

    fireEvent.change(screen.getByDisplayValue('Jazz Bass'), { target: { value: '  ' } });
    await openRow('Telecaster');

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Player')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Standard')).not.toBeInTheDocument();
    expect(mockedService.update).not.toHaveBeenCalled();
  });
  test('a failed save stays on the row, keeps what was typed and shows the error', async () => {
    mockedService.update.mockRejectedValue(new Error('Failed to update instrument'));
    renderPage();
    await openRow('Jazz Bass');

    fireEvent.change(screen.getByDisplayValue('Player'), { target: { value: 'Vintage' } });
    await openRow('Telecaster');

    expect(await screen.findByText('Failed to update instrument')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Vintage')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Standard')).not.toBeInTheDocument();
  });

  test('Edit on another row can not start a second save during a save', async () => {
    let finishSave: (value: Instrument) => void = () => {};
    mockedService.update.mockReturnValue(new Promise(resolve => { finishSave = resolve; }));
    renderPage();
    await openRow('Jazz Bass');

    fireEvent.change(screen.getByDisplayValue('Player'), { target: { value: 'Vintage' } });
    await openRow('Telecaster');
    await openRow('Telecaster');

    expect(mockedService.update).toHaveBeenCalledTimes(1);
    await act(async () => { finishSave({ ...jazzBass, model: 'Vintage' }); });
    await screen.findByDisplayValue('Standard');
  });

  test('Cancel discards the changes without saving', async () => {
    renderPage();
    await openRow('Jazz Bass');

    fireEvent.change(screen.getByDisplayValue('Player'), { target: { value: 'Vintage' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(mockedService.update).not.toHaveBeenCalled();
  });

  test('nothing is saved while typing', async () => {
    jest.useFakeTimers();
    try {
      renderPage();
      await act(async () => { await jest.advanceTimersByTimeAsync(0); });
      const row = screen.getByText('Jazz Bass').closest('tr') as HTMLElement;
      await act(async () => {
        fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));
      });

      fireEvent.change(screen.getByDisplayValue('Player'), { target: { value: 'Vintage' } });
      await act(async () => { await jest.advanceTimersByTimeAsync(5000); });

      expect(mockedService.update).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  test('a field cleared before moving rows stays cleared', async () => {
    mockedService.update.mockResolvedValue({ ...jazzBass, brand: '' });
    renderPage();
    await openRow('Jazz Bass');

    fireEvent.change(screen.getByDisplayValue('Player'), { target: { value: '' } });
    await openRow('Telecaster');

    await waitFor(() => expect(screen.getByDisplayValue('Standard')).toBeInTheDocument());
    expect(mockedService.update).toHaveBeenCalledWith('i1', { name: 'Jazz Bass', type: 'Bass', brand: 'Fender', model: '' });
  });

  test('Add is disabled during a row save', async () => {
    let finishSave: (value: Instrument) => void = () => {};
    mockedService.update.mockReturnValue(new Promise(resolve => { finishSave = resolve; }));
    renderPage();
    await openRow('Jazz Bass');

    fireEvent.change(screen.getByPlaceholderText('Name (ex. 5 strings bass)'), { target: { value: 'Upright' } });
    fireEvent.change(screen.getByDisplayValue('Player'), { target: { value: 'Vintage' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockedService.update).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    await act(async () => { finishSave({ ...jazzBass, model: 'Vintage' }); });
  });

  test('Cancel clears the error of the row', async () => {
    renderPage();
    await openRow('Jazz Bass');

    fireEvent.change(screen.getByDisplayValue('Jazz Bass'), { target: { value: '' } });
    await openRow('Telecaster');
    await screen.findByText('Name is required');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });
});

describe('#43: leaving the page', () => {
  test('saves the open row', async () => {
    mockedService.update.mockResolvedValue({ ...jazzBass, model: 'Vintage' });
    renderPageWithLeaveLink(<MyInstrumentsPage />);
    await openRow('Jazz Bass');

    fireEvent.change(screen.getByDisplayValue('Player'), { target: { value: 'Vintage' } });
    await leavePage();

    await waitFor(() => {
      expect(mockedService.update).toHaveBeenCalledWith('i1', { name: 'Jazz Bass', type: 'Bass', brand: 'Fender', model: 'Vintage' });
    });
  });

  test('sends no save when nothing changed', async () => {
    renderPageWithLeaveLink(<MyInstrumentsPage />);
    await openRow('Jazz Bass');

    await leavePage();

    expect(mockedService.update).not.toHaveBeenCalled();
  });

  test('with an empty name, saves the other fields and keeps the previous name', async () => {
    mockedService.update.mockResolvedValue({ ...jazzBass, brand: '' });
    renderPageWithLeaveLink(<MyInstrumentsPage />);
    await openRow('Jazz Bass');

    fireEvent.change(screen.getByDisplayValue('Jazz Bass'), { target: { value: '' } });
    fireEvent.change(screen.getByDisplayValue('Fender'), { target: { value: '' } });
    await leavePage();

    await waitFor(() => {
      expect(mockedService.update).toHaveBeenCalledWith('i1', { name: undefined, type: 'Bass', brand: '', model: 'Player' });
    });
  });

  test('a failed save shows a global toast', async () => {
    mockedService.update.mockRejectedValue(new Error('Failed to update instrument'));
    renderPageWithLeaveLink(<MyInstrumentsPage />);
    await openRow('Jazz Bass');

    fireEvent.change(screen.getByDisplayValue('Player'), { target: { value: 'Vintage' } });
    await leavePage();

    expect(await screen.findByText('Your instrument changes could not be saved.')).toBeInTheDocument();
  });
});

test('a failed load is announced at once (role="alert") (#128)', async () => {
  mockedService.getAll.mockRejectedValue(new Error('network'));
  renderPage();
  expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load instruments');
});
