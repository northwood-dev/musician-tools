import { useRef } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RootLayout } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { ROUTER_FUTURE } from '../routerFuture';

// #187 / #202: "?" and a footer link open the Keyboard shortcuts help; an On/Off switch
// turns the single-key shortcuts off (WCAG 2.1.4). Tested on the real app chrome (header,
// footer) around a small page using a shortcut, like the Songlist's "/".
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
const mockAuth = useAuth as jest.Mock;

const leftPage = jest.fn();
function SearchPage() {
  const ref = useRef<HTMLInputElement>(null);
  useKeyboardShortcut('/', () => ref.current?.focus());
  useKeyboardShortcut('Escape', leftPage, { inFields: true }); // like Esc on a song
  return <input ref={ref} aria-label="Search" />;
}

const renderApp = (signedIn = true) => {
  mockAuth.mockReturnValue({ isAuthenticated: signedIn, loading: false, user: signedIn ? { uid: 'u1', emailVerified: true } : null, logout: jest.fn() });
  return render(
    <MemoryRouter future={ROUTER_FUTURE} initialEntries={['/songs']}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/songs" element={<SearchPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};
const help = () => screen.queryByRole('dialog', { name: 'Keyboard shortcuts' });
const press = (key: string, target: Element = document.body) => fireEvent.keyDown(target, { key });

beforeEach(() => {
  localStorage.clear();
  leftPage.mockClear();
});

test('? opens the help, which lists every shortcut and where it works', () => {
  renderApp();
  expect(help()).not.toBeInTheDocument();
  press('?');
  const dialog = help()!;
  expect(dialog).toBeInTheDocument();
  expect(within(dialog).getAllByRole('row').map(r => r.textContent)).toEqual([
    '/SearchSonglist, Catalog',
    'nAdd a songSonglist',
    'EscBack to the songlistSong page',
    '?This helpEverywhere',
  ]);
});

test('the footer link opens it with the mouse; Escape closes it and focus goes back', () => {
  renderApp();
  const link = screen.getByRole('button', { name: 'Keyboard shortcuts' });
  link.focus();
  fireEvent.click(link);
  expect(help()).toBeInTheDocument();
  press('Escape', help()!);
  expect(help()).not.toBeInTheDocument();
  expect(link).toHaveFocus();
});

test('its ✕ closes it', () => {
  renderApp();
  press('?');
  fireEvent.click(within(help()!).getByRole('button', { name: 'Close' }));
  expect(help()).not.toBeInTheDocument();
});

test('? typed in a field stays text', () => {
  renderApp();
  press('?', screen.getByLabelText('Search'));
  expect(help()).not.toBeInTheDocument();
});

test('the Off switch turns the shortcuts off, keeps ? working, and is remembered', () => {
  const { unmount } = renderApp();
  press('/');
  expect(screen.getByLabelText('Search')).toHaveFocus();
  screen.getByLabelText('Search').blur();

  press('?');
  const toggle = within(help()!).getByRole('switch', { name: 'Keyboard shortcuts' });
  expect(toggle).toBeChecked();
  fireEvent.click(toggle);
  expect(toggle).not.toBeChecked();
  press('Escape', help()!);

  press('/');
  expect(screen.getByLabelText('Search')).not.toHaveFocus();
  press('?'); // still opens, so they can be turned back on
  expect(help()).toBeInTheDocument();

  unmount();
  renderApp();
  press('/');
  expect(screen.getByLabelText('Search')).not.toHaveFocus();
});

test('signed out: no footer link, and ? does nothing', () => {
  renderApp(false);
  expect(screen.queryByRole('button', { name: 'Keyboard shortcuts' })).not.toBeInTheDocument();
  press('?');
  expect(help()).not.toBeInTheDocument();
});

// #187 review fixes.
test('opened with ?, it gives focus back to where it was on close', () => {
  renderApp();
  const field = screen.getByLabelText('Search');
  field.focus();
  field.blur();
  const add = screen.getByRole('button', { name: 'Keyboard shortcuts' });
  add.focus();
  press('?', add);
  press('Escape', help()!);
  expect(add).toHaveFocus();
});

test('while the help is open, page shortcuts do nothing behind it', () => {
  renderApp();
  press('?');
  const close = within(help()!).getByRole('button', { name: 'Close' });
  close.focus();
  press('/', close);
  expect(screen.getByLabelText('Search')).not.toHaveFocus();
});

test('an Escape that closes the mobile menu does not also act on the page', () => {
  renderApp();
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
  expect(document.getElementById('mobile-nav')).toBeInTheDocument();
  press('Escape');
  expect(document.getElementById('mobile-nav')).not.toBeInTheDocument();
  expect(leftPage).not.toHaveBeenCalled();
});
