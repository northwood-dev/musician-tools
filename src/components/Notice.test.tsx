import { render, screen, fireEvent } from '@testing-library/react';
import { Notice } from './Notice';

test.each([
  ['error', 'alert'],
  ['warning', 'status'],
  ['info', 'status'],
  ['success', 'status'],
] as const)('a %s notice is announced as %s by default', (tone, role) => {
  render(<Notice tone={tone}>Something happened</Notice>);
  expect(screen.getByRole(role)).toHaveTextContent('Something happened');
});

test('the announcement can be forced: a failed batch recap is amber but an alert', () => {
  render(<Notice tone="warning" announce="alert" label="Bulk action result">2 failed</Notice>);
  expect(screen.getByRole('alert', { name: 'Bulk action result' })).toHaveTextContent('2 failed');
});

test('page content is not announced (announce="none")', () => {
  render(<Notice tone="error" announce="none">This reset link is invalid.</Notice>);
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.getByText('This reset link is invalid.')).toBeInTheDocument();
});

test('an optional ✕ has a name and dismisses it', () => {
  const onDismiss = jest.fn();
  render(<Notice tone="info" onDismiss={onDismiss} dismissLabel="Dismiss result">Done</Notice>);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss result' }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test('the ✕ is named "Dismiss" by default', () => {
  render(<Notice tone="info" onDismiss={() => {}}>Done</Notice>);
  expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
});

test('an action sits next to the message', () => {
  render(<Notice tone="warning" announce="none" action={<button type="button">Refresh</button>}>A newer version exists.</Notice>);
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
});

test('no ✕ without a dismiss action', () => {
  render(<Notice tone="success">Saved</Notice>);
  expect(screen.queryByRole('button')).toBeNull();
});
