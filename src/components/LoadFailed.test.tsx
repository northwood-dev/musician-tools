import { fireEvent, render, screen } from '@testing-library/react';
import { LoadFailed } from './LoadFailed';

// #216: what a list says when it failed to load.
test('the named alert region is there before anything fails, empty (#153: it must exist first)', () => {
  render(<LoadFailed failed={false} onRetry={() => {}}>Couldn't load the Catalog.</LoadFailed>);
  expect(screen.getByRole('alert', { name: 'Loading error' })).toBeEmptyDOMElement();
});

test('once failed, the same region says what did not load', () => {
  const { rerender } = render(<LoadFailed failed={false} onRetry={() => {}}>Couldn't load the Catalog.</LoadFailed>);
  const region = screen.getByRole('alert', { name: 'Loading error' });
  rerender(<LoadFailed failed onRetry={() => {}}>Couldn't load the Catalog.</LoadFailed>);
  expect(screen.getByRole('alert', { name: 'Loading error' })).toBe(region);
  expect(region).toHaveTextContent("Couldn't load the Catalog.");
});

test('Retry calls back', () => {
  const onRetry = jest.fn();
  render(<LoadFailed failed onRetry={onRetry}>Couldn't load the Catalog.</LoadFailed>);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});
