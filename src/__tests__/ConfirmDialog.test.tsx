import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../components/ConfirmDialog';

test('renders title/message and triggers confirm/cancel', async () => {
  const onConfirm = jest.fn().mockResolvedValue(undefined);
  const onCancel = jest.fn();

  render(
    <ConfirmDialog
      isOpen
      title="Delete"
      message="Are you sure?"
      confirmText="Yes"
      cancelText="No"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );

  expect(screen.getByText('Delete')).toBeInTheDocument();
  expect(screen.getByText('Are you sure?')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Yes'));
  expect(onConfirm).toHaveBeenCalled();

  fireEvent.click(screen.getByText('No'));
  expect(onCancel).toHaveBeenCalled();
});

test('clicking overlay or Escape triggers cancel', () => {
  const onCancel = jest.fn();
  render(
    <ConfirmDialog
      isOpen
      title="T"
      message="M"
      onConfirm={() => {}}
      onCancel={onCancel}
    />
  );

  fireEvent.click(screen.getByRole('dialog'));
  expect(onCancel).toHaveBeenCalledTimes(1);

  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(onCancel).toHaveBeenCalledTimes(2);
});
// #203: rebuilt on the Dialog block — named by its title, focus starts on the safe choice, ✕.
test('the confirmation is named by its title, starts on Cancel, and has a ✕ that cancels', () => {
  const onCancel = jest.fn();
  render(
    <ConfirmDialog isOpen title="Delete song(s)" message="Sure?" confirmText="Delete" onConfirm={() => {}} onCancel={onCancel} isDangerous />
  );
  const dialog = screen.getByRole('dialog', { name: 'Delete song(s)' });
  expect(dialog).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test('closed: nothing rendered', () => {
  render(<ConfirmDialog isOpen={false} title="T" message="M" onConfirm={() => {}} onCancel={() => {}} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
