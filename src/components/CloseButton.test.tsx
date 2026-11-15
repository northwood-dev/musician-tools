import { render, screen, fireEvent } from '@testing-library/react';
import { CloseButton } from './CloseButton';

test('is a button named by its label, with the label as tooltip', () => {
  const onClick = jest.fn();
  render(<CloseButton label="Close" onClick={onClick} />);
  const button = screen.getByRole('button', { name: 'Close' });
  expect(button).toHaveAttribute('title', 'Close');
  fireEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('the ✕ glyph is not its name', () => {
  render(<CloseButton label="Clear search" onClick={() => {}} />);
  expect(screen.queryByRole('button', { name: '✕' })).toBeNull();
});

test('can be disabled', () => {
  render(<CloseButton label="Close" onClick={() => {}} disabled />);
  expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
});
