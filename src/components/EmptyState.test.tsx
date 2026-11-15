import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';
import { ListSkeleton } from './ListSkeleton';

test('an empty state shows its text', () => {
  render(<EmptyState>No topics saved yet.</EmptyState>);
  expect(screen.getByText('No topics saved yet.')).toBeInTheDocument();
});

test('an empty state shows its action, found by role', () => {
  render(<EmptyState action={<a href="/my-playlists">Create one</a>}>No playlists yet.</EmptyState>);
  expect(screen.getByRole('link', { name: 'Create one' })).toBeInTheDocument();
});

test('a labelled list skeleton announces the load politely; the bars stay hidden', () => {
  render(<ListSkeleton rows={3} label="Loading…" />);
  expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
});

test('an unlabelled list skeleton is visual filler only (the page announces the load)', () => {
  render(<ListSkeleton rows={3} />);
  expect(screen.queryByRole('status')).toBeNull();
});
