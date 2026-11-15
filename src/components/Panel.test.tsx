import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Panel } from './Panel';
import { useDismissablePanel } from '../hooks/useDismissablePanel';

function Demo({ title, closeDisabled }: { title?: string; closeDisabled?: boolean }) {
  const [open, setOpen] = useState(true);
  const panel = useDismissablePanel({ open, onClose: () => setOpen(false) });
  return (
    <>
      <button ref={panel.buttonRef} type="button" aria-expanded={open} aria-controls={panel.panelId} onClick={() => setOpen(o => !o)}>Open</button>
      {open && (
        <Panel panel={panel} title={title} onClose={() => setOpen(false)} closeDisabled={closeDisabled}>
          <p>Panel body</p>
        </Panel>
      )}
    </>
  );
}

test('the panel is the element its button points to', () => {
  render(<Demo title="Select playlists" />);
  const id = screen.getByRole('button', { name: 'Open' }).getAttribute('aria-controls');
  expect(document.getElementById(id!)).toHaveTextContent('Panel body');
});

test('its title row has a ✕ named "Close" that closes it', () => {
  render(<Demo title="Select playlists" />);
  expect(screen.getByText('Select playlists')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByText('Panel body')).toBeNull();
});

test('the ✕ can be disabled while a request runs', () => {
  render(<Demo title="Add an instrument" closeDisabled />);
  expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
});

test('it closes on an outside press, through the shared hook', () => {
  render(<Demo title="Select playlists" />);
  fireEvent.mouseDown(document.body);
  expect(screen.queryByText('Panel body')).toBeNull();
});

test('without a title there is no title row nor ✕', () => {
  render(<Demo />);
  expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  expect(screen.getByText('Panel body')).toBeInTheDocument();
});
