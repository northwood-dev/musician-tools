import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useDismissablePanel } from './useDismissablePanel';

// A button that opens a menu, as the bulk bar and the header build them (#38).
function Menu({ blocked = false }: { blocked?: boolean }) {
  const [open, setOpen] = useState(false);
  const { buttonRef, panelRef, panelId } = useDismissablePanel({ open, onClose: () => setOpen(false), blocked });
  return (
    <div>
      <p>Elsewhere on the page</p>
      <button ref={buttonRef} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(o => !o)}>Open menu</button>
      {open && (
        <div ref={panelRef} id={panelId} role="group" aria-label="The menu">
          <button type="button">Inside</button>
        </div>
      )}
      <input aria-label="Some field" />
      {/* Stands for a dialog or an autocomplete that handles its own Escape. */}
      <input aria-label="Owns its Escape" onKeyDown={e => { if (e.key === 'Escape') e.preventDefault(); }} />
    </div>
  );
}

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
const menu = () => screen.queryByRole('group', { name: 'The menu' });

test('a press outside the menu closes it', () => {
  render(<Menu />);
  openMenu();
  fireEvent.mouseDown(screen.getByText('Elsewhere on the page'));
  expect(menu()).toBeNull();
});

test('a press inside the menu leaves it open', () => {
  render(<Menu />);
  openMenu();
  fireEvent.mouseDown(screen.getByRole('button', { name: 'Inside' }));
  expect(menu()).toBeInTheDocument();
});

test('a press on its own button is left to the button (no close-then-reopen)', () => {
  render(<Menu />);
  openMenu();
  const button = screen.getByRole('button', { name: 'Open menu' });
  fireEvent.mouseDown(button);
  fireEvent.click(button);
  expect(menu()).toBeNull(); // the button's own toggle closed it, once
});

test('Escape closes it wherever focus is, and gives focus back to the button', () => {
  render(<Menu />);
  openMenu();
  const field = screen.getByLabelText('Some field');
  field.focus();
  fireEvent.keyDown(field, { key: 'Escape' });
  expect(menu()).toBeNull();
  expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
});

test('nothing closes it while closing is blocked (a request is running)', () => {
  render(<Menu blocked />);
  openMenu();
  fireEvent.mouseDown(screen.getByText('Elsewhere on the page'));
  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(menu()).toBeInTheDocument();
});

test('aria-expanded follows the state', () => {
  render(<Menu />);
  const button = screen.getByRole('button', { name: 'Open menu' });
  expect(button).toHaveAttribute('aria-expanded', 'false');
  openMenu();
  expect(button).toHaveAttribute('aria-expanded', 'true');
  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('while closed, Escape does not steal focus', () => {
  render(<Menu />);
  const field = screen.getByLabelText('Some field');
  field.focus();
  fireEvent.keyDown(field, { key: 'Escape' });
  expect(field).toHaveFocus();
});

test('an Escape already handled by a nearer element (dialog, autocomplete) leaves the menu open', () => {
  render(<Menu />);
  openMenu();
  const owner = screen.getByLabelText('Owns its Escape');
  owner.focus();
  fireEvent.keyDown(owner, { key: 'Escape' });
  expect(menu()).toBeInTheDocument();
  expect(owner).toHaveFocus();
});

test('the panel id links the button to its panel, unique per instance (#149)', () => {
  render(<><Menu /><Menu /></>);
  const [first, second] = screen.getAllByRole('button', { name: 'Open menu' });
  fireEvent.click(first);
  const id = first.getAttribute('aria-controls');
  expect(id).toBeTruthy();
  expect(document.getElementById(id!)).toBe(screen.getByRole('group', { name: 'The menu' }));
  expect(second.getAttribute('aria-controls')).not.toBe(id);
});
