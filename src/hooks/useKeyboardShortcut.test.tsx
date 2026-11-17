import { render, fireEvent, screen } from '@testing-library/react';
import { useKeyboardShortcut } from './useKeyboardShortcut';

// #187 / #201: single-key shortcuts that never get in the way of typing or of the browser.
function Probe({ shortcut, onFire }: { shortcut: string; onFire: () => void }) {
  useKeyboardShortcut(shortcut, onFire);
  return (
    <div>
      <input aria-label="Field" />
      <textarea aria-label="Notes" />
      <select aria-label="Pick"><option>a</option></select>
      <div aria-label="Editable" contentEditable suppressContentEditableWarning tabIndex={0} />
      <button type="button">Plain button</button>
    </div>
  );
}

const setup = (shortcut: string) => {
  const onFire = jest.fn();
  render(<Probe shortcut={shortcut} onFire={onFire} />);
  return onFire;
};

test('fires on the produced character, anywhere outside a field', () => {
  const onFire = setup('n');
  fireEvent.keyDown(document.body, { key: 'n' });
  expect(onFire).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Plain button' }), { key: 'n' });
  expect(onFire).toHaveBeenCalledTimes(2);
});

test('matches the character, not the physical key: AZERTY "/" is Shift + :', () => {
  const onFire = setup('/');
  fireEvent.keyDown(document.body, { key: '/', code: 'Period', shiftKey: true });
  expect(onFire).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(document.body, { key: ':', code: 'Period' });
  expect(onFire).toHaveBeenCalledTimes(1);
});

test.each(['Field', 'Notes', 'Pick', 'Editable'])('ignored while typing in %s', name => {
  const onFire = setup('n');
  fireEvent.keyDown(screen.getByLabelText(name), { key: 'n' });
  expect(onFire).not.toHaveBeenCalled();
});

test.each([['ctrlKey'], ['metaKey'], ['altKey']])('ignored with %s held (browser shortcuts stay theirs)', modifier => {
  const onFire = setup('n');
  fireEvent.keyDown(document.body, { key: 'n', [modifier]: true });
  expect(onFire).not.toHaveBeenCalled();
});

test('an event something nearer already handled (an Escape that closed a menu) is not the shortcut\'s', () => {
  const onFire = setup('Escape');
  const closeMenu = (e: KeyboardEvent) => e.preventDefault();
  document.addEventListener('keydown', closeMenu);
  fireEvent.keyDown(document.body, { key: 'Escape' });
  document.removeEventListener('keydown', closeMenu);
  expect(onFire).not.toHaveBeenCalled();
  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(onFire).toHaveBeenCalledTimes(1);
});

test('the shortcut is gone once the component unmounts', () => {
  const onFire = jest.fn();
  const { unmount } = render(<Probe shortcut="n" onFire={onFire} />);
  unmount();
  fireEvent.keyDown(document.body, { key: 'n' });
  expect(onFire).not.toHaveBeenCalled();
});

test('a disabled shortcut leaves the key alone (its default action included)', () => {
  const onFire = jest.fn();
  function Off() {
    useKeyboardShortcut('/', onFire, { enabled: false });
    return null;
  }
  render(<Off />);
  const event = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
  document.body.dispatchEvent(event);
  expect(onFire).not.toHaveBeenCalled();
  expect(event.defaultPrevented).toBe(false);
});

// #187 review fixes.
test('a checkbox or a radio is not a place where one types: the shortcut still fires there', () => {
  const onFire = jest.fn();
  function WithBoxes() {
    useKeyboardShortcut('n', onFire);
    return <><input type="checkbox" aria-label="Row" /><input type="radio" aria-label="Choice" /></>;
  }
  render(<WithBoxes />);
  fireEvent.keyDown(screen.getByLabelText('Row'), { key: 'n' });
  fireEvent.keyDown(screen.getByLabelText('Choice'), { key: 'n' });
  expect(onFire).toHaveBeenCalledTimes(2);
});

test('holding the key down fires once, not on every repeat', () => {
  const onFire = setup('n');
  fireEvent.keyDown(document.body, { key: 'n' });
  fireEvent.keyDown(document.body, { key: 'n', repeat: true });
  expect(onFire).toHaveBeenCalledTimes(1);
});

test('nothing fires behind an open modal window', () => {
  const onFire = setup('n');
  const modal = document.createElement('div');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  document.body.appendChild(modal);
  fireEvent.keyDown(document.body, { key: 'n' });
  modal.remove();
  expect(onFire).not.toHaveBeenCalled();
});

test('a shortcut allowed in fields (Escape on a song) fires while typing too', () => {
  const onFire = jest.fn();
  function Form() {
    useKeyboardShortcut('Escape', onFire, { inFields: true });
    return <input aria-label="Title" />;
  }
  render(<Form />);
  fireEvent.keyDown(screen.getByLabelText('Title'), { key: 'Escape' });
  expect(onFire).toHaveBeenCalledTimes(1);
});
