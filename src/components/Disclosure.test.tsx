import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Disclosure } from './Disclosure';

function Demo({ initial = false, aside, lead }: { initial?: boolean; aside?: React.ReactNode; lead?: React.ReactNode }) {
  const [open, setOpen] = useState(initial);
  return (
    <Disclosure title="Genre filters" open={open} onToggle={() => setOpen(o => !o)} aside={aside} lead={lead}>
      <p>Body content</p>
    </Disclosure>
  );
}

test('the header is a button named by its title, collapsed by default here', () => {
  render(<Demo />);
  const header = screen.getByRole('button', { name: 'Genre filters' });
  expect(header).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('Body content')).not.toBeInTheDocument();
});

test('toggling the header shows the body, linked by aria-controls, and hides it again', () => {
  render(<Demo />);
  const header = screen.getByRole('button', { name: 'Genre filters' });
  fireEvent.click(header);
  expect(header).toHaveAttribute('aria-expanded', 'true');
  const body = screen.getByText('Body content').parentElement!;
  expect(header).toHaveAttribute('aria-controls', body.id);
  fireEvent.click(header);
  expect(header).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('Body content')).not.toBeInTheDocument();
});

test('the arrow toggles too, and is hidden from assistive tech', () => {
  const { container } = render(<Demo />);
  const arrow = container.querySelector('[aria-hidden="true"]')!;
  expect(arrow).toHaveTextContent('▸');
  fireEvent.click(arrow);
  expect(screen.getByRole('button', { name: 'Genre filters' })).toHaveAttribute('aria-expanded', 'true');
});

test('content on the right is rendered and stays outside the header button', () => {
  render(<Demo initial aside={<button type="button">Mark as played</button>} />);
  expect(screen.getByRole('button', { name: 'Mark as played' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Genre filters' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('Body content')).toBeInTheDocument();
});

// #185: a drag handle sits on the LEFT of the title (northwood's request), outside the header button.
test('content on the left comes before the title and stays outside the header button', () => {
  render(<Demo lead={<button type="button">Move Genre filters</button>} />);
  const handle = screen.getByRole('button', { name: 'Move Genre filters' });
  const header = screen.getByRole('button', { name: 'Genre filters' });
  expect(header).not.toContainElement(handle);
  expect(handle.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
