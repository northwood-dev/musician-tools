import { fireEvent, render, screen } from '@testing-library/react';
import { LoadFailed } from './LoadFailed';

// #216: what a list says when it failed to load.
test('says what did not load, announced at once', () => {
  render(<LoadFailed onRetry={() => {}}>Couldn't load the Catalog.</LoadFailed>);
  expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load the Catalog.");
});

test('Retry calls back', () => {
  const onRetry = jest.fn();
  render(<LoadFailed onRetry={onRetry}>Couldn't load the Catalog.</LoadFailed>);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});
