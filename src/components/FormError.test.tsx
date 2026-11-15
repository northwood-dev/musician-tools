import { render, screen } from '@testing-library/react';
import { FormError } from './FormError';

test('an error is an alert, announced at once', () => {
  render(<FormError message="Invalid email or password" />);
  expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password');
  expect(screen.queryByRole('status')).toBeNull();
});

test('a rate limit is a status, announced politely', () => {
  render(<FormError message="Too many attempts, try again later." rateLimited />);
  expect(screen.getByRole('status')).toHaveTextContent('Too many attempts');
  expect(screen.queryByRole('alert')).toBeNull();
});

test('renders nothing without a message', () => {
  const { container } = render(<FormError message={null} />);
  expect(container).toBeEmptyDOMElement();
});

test('a new attempt re-mounts it, so the same text is announced again', () => {
  const { rerender } = render(<FormError message="Passwords do not match" attempt={1} />);
  const first = screen.getByRole('alert');
  rerender(<FormError message="Passwords do not match" attempt={1} />);
  expect(screen.getByRole('alert')).toBe(first); // same attempt: same element
  rerender(<FormError message="Passwords do not match" attempt={2} />);
  expect(screen.getByRole('alert')).not.toBe(first);
});
