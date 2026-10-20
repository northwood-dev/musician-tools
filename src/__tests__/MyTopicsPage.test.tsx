import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import MyTopicsPage from '../pages/MyTopicsPage';
import { topicService, type Topic } from '../services/topicService';

jest.mock('../services/topicService', () => ({
  topicService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

const mockedService = topicService as jest.Mocked<typeof topicService>;

const existingTopic: Topic = { uid: 't1', name: 'Pentatonic scale', category: 'Technique' };

function LocationProbe() {
  const { search } = useLocation();
  return <output aria-label="search">{search}</output>;
}

// #16: the page reads ?edit=<uid>, so it renders under a router.
function renderPage(path = '/my-topics') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MyTopicsPage />
      <LocationProbe />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedService.getAll.mockResolvedValue([existingTopic]);
});

test('loads and displays existing topics', async () => {
  renderPage();

  expect(await screen.findByText('Pentatonic scale')).toBeInTheDocument();
  expect(screen.getByText('Technique')).toBeInTheDocument();
});

test('shows empty state when no topics exist', async () => {
  mockedService.getAll.mockResolvedValue([]);
  renderPage();

  expect(await screen.findByText('No topics saved yet.')).toBeInTheDocument();
});

test('submitting the form creates a topic and shows it immediately', async () => {
  const created: Topic = { uid: 't2', name: 'Walking bass', category: 'Technique' };
  mockedService.create.mockResolvedValue(created);

  renderPage();
  await screen.findByText('Pentatonic scale');

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Walking bass' } });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Technique' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));

  await waitFor(() => {
    expect(mockedService.create).toHaveBeenCalledWith({ name: 'Walking bass', category: 'Technique' });
  });
  expect(await screen.findByText('Walking bass')).toBeInTheDocument();
});

test('Add button is disabled while the name is empty', async () => {
  renderPage();
  await screen.findByText('Pentatonic scale');

  const addButton = screen.getByRole('button', { name: 'Add' });
  expect(addButton).toBeDisabled();

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Chord tones' } });
  expect(addButton).not.toBeDisabled();

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: '   ' } });
  expect(addButton).toBeDisabled();
});

test('shows an error banner when creation fails', async () => {
  mockedService.create.mockRejectedValue(new Error('Failed to create topic'));

  renderPage();
  await screen.findByText('Pentatonic scale');

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Modes' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));

  expect(await screen.findByText('Failed to add topic')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toBeInTheDocument();
});

test('clears the error banner when a retry succeeds', async () => {
  mockedService.create.mockRejectedValueOnce(new Error('Failed to create topic'));
  mockedService.create.mockResolvedValueOnce({ uid: 't3', name: 'Modes' });

  renderPage();
  await screen.findByText('Pentatonic scale');

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Modes' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(await screen.findByText('Failed to add topic')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Modes' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));

  expect(await screen.findByText('Modes')).toBeInTheDocument();
  expect(screen.queryByText('Failed to add topic')).not.toBeInTheDocument();
});

test('shows a duplicate-specific message on 409', async () => {
  mockedService.create.mockRejectedValue(new Error('Topic already exists'));

  renderPage();
  await screen.findByText('Pentatonic scale');

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Pentatonic scale' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));

  expect(await screen.findByText('Topic already exists')).toBeInTheDocument();
});

test('failed load does not pretend the library is empty', async () => {
  mockedService.getAll.mockRejectedValue(new Error('Failed to fetch topics'));

  renderPage();

  expect(await screen.findByText('Failed to load topics')).toBeInTheDocument();
  expect(screen.getByText('Topics could not be loaded.')).toBeInTheDocument();
  expect(screen.queryByText('No topics saved yet.')).not.toBeInTheDocument();
});

test('Edit opens an inline editor pre-filled with the topic values', async () => {
  renderPage();
  await screen.findByText('Pentatonic scale');

  fireEvent.click(screen.getByRole('button', { name: 'Edit Pentatonic scale' }));

  expect(screen.getByLabelText('Edit name')).toHaveValue('Pentatonic scale');
  expect(screen.getByLabelText('Edit category')).toHaveValue('Technique');
});

test('Save calls update and refreshes the row', async () => {
  const updated: Topic = { uid: 't1', name: 'Minor pentatonic', category: 'Scales' };
  mockedService.update.mockResolvedValue(updated);

  renderPage();
  await screen.findByText('Pentatonic scale');

  fireEvent.click(screen.getByRole('button', { name: 'Edit Pentatonic scale' }));
  fireEvent.change(screen.getByLabelText('Edit name'), { target: { value: 'Minor pentatonic' } });
  fireEvent.change(screen.getByLabelText('Edit category'), { target: { value: 'Scales' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() => {
    expect(mockedService.update).toHaveBeenCalledWith('t1', { name: 'Minor pentatonic', category: 'Scales' });
  });
  expect(await screen.findByText('Minor pentatonic')).toBeInTheDocument();
  expect(screen.queryByText('Pentatonic scale')).not.toBeInTheDocument();
});

test('Cancel closes the editor without calling update', async () => {
  renderPage();
  await screen.findByText('Pentatonic scale');

  fireEvent.click(screen.getByRole('button', { name: 'Edit Pentatonic scale' }));
  fireEvent.change(screen.getByLabelText('Edit name'), { target: { value: 'Something else' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(mockedService.update).not.toHaveBeenCalled();
  expect(screen.getByText('Pentatonic scale')).toBeInTheDocument();
  expect(screen.queryByLabelText('Edit name')).not.toBeInTheDocument();
});

test('shows a duplicate-specific message when a rename hits 409', async () => {
  mockedService.update.mockRejectedValue(new Error('Topic already exists'));

  renderPage();
  await screen.findByText('Pentatonic scale');

  fireEvent.click(screen.getByRole('button', { name: 'Edit Pentatonic scale' }));
  fireEvent.change(screen.getByLabelText('Edit name'), { target: { value: 'Walking bass' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('Topic already exists')).toBeInTheDocument();
});

test('Delete asks for confirmation before removing', async () => {
  mockedService.remove.mockResolvedValue(undefined);

  renderPage();
  await screen.findByText('Pentatonic scale');

  fireEvent.click(screen.getByRole('button', { name: 'Delete Pentatonic scale' }));
  expect(screen.getByText('Are you sure you want to delete "Pentatonic scale"?')).toBeInTheDocument();
  expect(mockedService.remove).not.toHaveBeenCalled();

  fireEvent.click(screen.getByText('Delete', { selector: 'div[role="dialog"] button' }));

  // The dialog closes immediately: a second click cannot fire a duplicate DELETE
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  await waitFor(() => {
    expect(mockedService.remove).toHaveBeenCalledWith('t1');
  });
  expect(mockedService.remove).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Pentatonic scale')).not.toBeInTheDocument();
});

test('cancelling the confirmation dialog keeps the topic', async () => {
  renderPage();
  await screen.findByText('Pentatonic scale');

  fireEvent.click(screen.getByRole('button', { name: 'Delete Pentatonic scale' }));
  fireEvent.click(screen.getByText('Cancel', { selector: 'div[role="dialog"] button' }));

  expect(mockedService.remove).not.toHaveBeenCalled();
  expect(screen.getByText('Pentatonic scale')).toBeInTheDocument();
});

test('8.2: the system topic shows no Edit/Delete actions, just a System badge', async () => {
  mockedService.getAll.mockResolvedValue([
    { uid: 'sys', name: 'Free practice', category: null, isSystem: true },
    existingTopic,
  ]);

  renderPage();
  await screen.findByText('Free practice');

  // The system row exposes neither action...
  expect(screen.queryByRole('button', { name: 'Edit Free practice' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete Free practice' })).not.toBeInTheDocument();
  expect(screen.getByText('System')).toBeInTheDocument();

  // ...while a normal topic keeps both
  expect(screen.getByRole('button', { name: 'Edit Pentatonic scale' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete Pentatonic scale' })).toBeInTheDocument();
});

describe('#16: ?edit=<uid> deep link from the session history', () => {
  const scrollSpy = jest.fn();
  beforeEach(() => {
    (Element.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView = scrollSpy;
  });
  afterEach(() => {
    delete (Element.prototype as unknown as { scrollIntoView?: unknown }).scrollIntoView;
  });

  test('opens that topic in edit mode and scrolls to it', async () => {
    renderPage('/my-topics?edit=t1');

    expect(await screen.findByLabelText('Edit name')).toHaveValue('Pentatonic scale');
    expect(scrollSpy).toHaveBeenCalled();
  });

  test('Save and Cancel drop ?edit= so a reload does not reopen the editor', async () => {
    mockedService.update.mockResolvedValue({ ...existingTopic, name: 'Minor pentatonic' });
    renderPage('/my-topics?edit=t1');
    await screen.findByLabelText('Edit name');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('search')).toHaveTextContent(/^$/);

    // Reopened by hand, then saved: the URL stays clean.
    fireEvent.click(screen.getByRole('button', { name: 'Edit Pentatonic scale' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Minor pentatonic')).toBeInTheDocument();
    expect(screen.getByLabelText('search')).toHaveTextContent(/^$/);
  });

  test('an unknown uid or the system topic just shows the page', async () => {
    mockedService.getAll.mockResolvedValue([existingTopic, { uid: 'sys', name: 'Free practice', isSystem: true }]);
    const { unmount } = renderPage('/my-topics?edit=gone');
    expect(await screen.findByText('Pentatonic scale')).toBeInTheDocument();
    expect(screen.queryByLabelText('Edit name')).not.toBeInTheDocument();
    unmount();

    renderPage('/my-topics?edit=sys');
    expect(await screen.findByText('Free practice')).toBeInTheDocument();
    expect(screen.queryByLabelText('Edit name')).not.toBeInTheDocument();
  });
});
