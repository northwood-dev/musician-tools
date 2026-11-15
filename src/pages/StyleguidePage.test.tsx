import { render, screen, within } from '@testing-library/react';
import StyleguidePage from './StyleguidePage';

// #152: the dev-only demo page shows every shared building block, one section each, so
// northwood can judge the look in one place (light/dark via the header's theme switch).
test('has a main title and one section per building block', () => {
  render(<StyleguidePage />);
  expect(screen.getByRole('heading', { level: 1, name: 'Styleguide' })).toBeInTheDocument();
  for (const block of ['Page error banner', 'Form error message', 'Loading placeholders', 'Buttons']) {
    expect(screen.getByRole('region', { name: block })).toBeInTheDocument();
  }
});

test('shows each block in its states', () => {
  render(<StyleguidePage />);
  const formErrors = screen.getByRole('region', { name: 'Form error message' });
  expect(within(formErrors).getByRole('alert')).toBeInTheDocument(); // error
  expect(within(formErrors).getByRole('status')).toBeInTheDocument(); // rate limited
  const banner = screen.getByRole('region', { name: 'Page error banner' });
  expect(within(banner).getByRole('button', { name: 'Dismiss error' })).toBeInTheDocument();
});
