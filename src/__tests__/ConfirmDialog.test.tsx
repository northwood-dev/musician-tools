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