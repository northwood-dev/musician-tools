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

test('a close button without a name is refused', () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  // @ts-expect-error — the label is required by the type
  expect(() => render(<CloseButton onClick={() => {}} />)).toThrow();
  expect(() => render(<CloseButton label="  " onClick={() => {}} />)).toThrow(/needs a label/);
  (console.error as jest.Mock).mockRestore();
});
