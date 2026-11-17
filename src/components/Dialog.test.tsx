import { useRef, useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Dialog } from './Dialog';

// #203: the Dialog block — one modal window for the whole app, on the native <dialog>.
function Demo({ withInitialFocus = false }: { withInitialFocus?: boolean }) {
  const [open, setOpen] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete song(s)"
        initialFocus={withInitialFocus ? keepRef : undefined}
      >
        <p>Inside text</p>
        <button type="button">Delete</button>
        <button type="button" ref={keepRef}>Keep</button>
      </Dialog>
    </>
  );
}

const open = () => {
  const opener = screen.getByRole('button', { name: 'Open' });
  opener.focus();
  fireEvent.click(opener);
  return opener;
};
const dialog = () => screen.queryByRole('dialog', { name: 'Delete song(s)' });

test('closed: nothing shown; open: a window named by its title', () => {
  render(<Demo />);
  expect(dialog()).not.toBeInTheDocument();
  open();
  expect(dialog()).toBeInTheDocument();
  expect(within(dialog()!).getByRole('heading', { name: 'Delete song(s)' })).toBeInTheDocument();
});

test('its ✕ Close closes it and gives focus back to the opener', () => {
  render(<Demo />);
  const opener = open();
  fireEvent.click(within(dialog()!).getByRole('button', { name: 'Close' }));
  expect(dialog()).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});

test('Escape closes it, and the Escape is used up (page shortcuts ignore it)', () => {
  render(<Demo />);
  const opener = open();
  const escape = fireEvent.keyDown(dialog()!, { key: 'Escape' });
  expect(escape).toBe(false); // preventDefault
  expect(dialog()).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});

test('a click on the backdrop closes it; a click inside does not', () => {
  render(<Demo />);
  open();
  fireEvent.click(screen.getByText('Inside text'));
  expect(dialog()).toBeInTheDocument();
  // The <dialog> itself is only reachable through its backdrop: a real click there is a
  // press, a release and a click, all on it.
  fireEvent.mouseDown(dialog()!);
  fireEvent.mouseUp(dialog()!);
  fireEvent.click(dialog()!);
  expect(dialog()).not.toBeInTheDocument();
});

test('on open, focus goes to the first control (the ✕), or to the one the caller chooses', () => {
  const { unmount } = render(<Demo />);
  open();
  expect(within(dialog()!).getByRole('button', { name: 'Close' })).toHaveFocus();
  unmount();

  render(<Demo withInitialFocus />);
  open();
  expect(screen.getByRole('button', { name: 'Keep' })).toHaveFocus();
});

// #203 review: a click event lands on the nearest element holding both the press and the
// release — selecting text inside and releasing over the backdrop must not close the window.
test('a press inside released on the backdrop (or the reverse) does not close it', () => {
  render(<Demo />);
  open();
  const inside = screen.getByText('Inside text');
  fireEvent.mouseDown(inside);
  fireEvent.click(dialog()!);
  expect(dialog()).toBeInTheDocument();

  fireEvent.mouseDown(dialog()!);
  fireEvent.mouseUp(inside);
  fireEvent.click(dialog()!);
  expect(dialog()).toBeInTheDocument();

  fireEvent.mouseDown(dialog()!);
  fireEvent.mouseUp(dialog()!);
  fireEvent.click(dialog()!);
  expect(dialog()).not.toBeInTheDocument(); // pressed AND released on the backdrop: closes
});
