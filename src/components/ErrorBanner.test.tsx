import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBanner } from './ErrorBanner';

test('shows the message as an alert, announced at once', () => {
  render(<ErrorBanner message="Could not load your playlists." onDismiss={() => {}} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Could not load your playlists.');
});

test('its ✕ is named "Dismiss error" and dismisses it', () => {
  const onDismiss = jest.fn();
  render(<ErrorBanner message="Oops" onDismiss={onDismiss} />);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test('renders nothing without a message', () => {
  const { container } = render(<ErrorBanner message={null} onDismiss={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});
