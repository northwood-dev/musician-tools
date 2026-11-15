import { render, screen } from '@testing-library/react';
import { Page } from './Page';

test('the title is the page\'s one level-1 heading', () => {
  render(<Page width="wide" title="My sessions"><p>content</p></Page>);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('heading', { level: 1, name: 'My sessions' })).toBeInTheDocument();
  expect(screen.getByText('content')).toBeInTheDocument();
});

test('an optional description and actions sit with the title', () => {
  render(
    <Page width="content" title="Catalog" description="Ready-made songs to add to your songlist." actions={<button type="button">New entry</button>}>
      <p>list</p>
    </Page>,
  );
  expect(screen.getByText('Ready-made songs to add to your songlist.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'New entry' })).toBeInTheDocument();
});

test.each(['content', 'wide'] as const)('the %s width renders', (width) => {
  render(<Page width={width} title="Profile"><p>x</p></Page>);
  expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();
});
