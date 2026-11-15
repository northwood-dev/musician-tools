import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
const mockedUseAuth = useAuth as jest.Mock;

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// The desktop nav links are always in the DOM (only CSS-hidden below md), so a link
// shows up once when only the desktop nav is rendered and twice once the mobile menu opens.

test('authenticated: the hamburger reveals the mobile nav links and flips aria-expanded', () => {
  mockedUseAuth.mockReturnValue({ isAuthenticated: true, logout: jest.fn() });
  renderHeader();

  const toggle = screen.getByRole('button', { name: /open navigation menu/i });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getAllByRole('link', { name: 'Sessions' })).toHaveLength(1); // desktop only

  fireEvent.click(toggle);

  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getAllByRole('link', { name: 'Sessions' })).toHaveLength(2); // desktop + mobile
  // All six links are present in the mobile menu
  for (const label of ['Songlist', 'Heatmap', 'Sessions', 'Playlists', 'Topics', 'Instruments']) {
    expect(screen.getAllByRole('link', { name: label })).toHaveLength(2);
  }
});

test('Escape closes the mobile nav', () => {
  mockedUseAuth.mockReturnValue({ isAuthenticated: true, logout: jest.fn() });
  renderHeader();

  fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
  expect(screen.getAllByRole('link', { name: 'Topics' })).toHaveLength(2);

  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(screen.getAllByRole('link', { name: 'Topics' })).toHaveLength(1);
});

test('clicking a mobile link closes the menu', () => {
  mockedUseAuth.mockReturnValue({ isAuthenticated: true, logout: jest.fn() });
  renderHeader();

  fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
  const heatmapLinks = screen.getAllByRole('link', { name: 'Heatmap' });
  expect(heatmapLinks).toHaveLength(2);

  fireEvent.click(heatmapLinks[1]); // the mobile-menu one
  expect(screen.getAllByRole('link', { name: 'Heatmap' })).toHaveLength(1);
});

test('authenticated mobile: Sign out lives inside the menu and logs out', () => {
  const logout = jest.fn().mockResolvedValue(undefined);
  mockedUseAuth.mockReturnValue({ isAuthenticated: true, logout });
  renderHeader();

  fireEvent.click(screen.getByRole('button', { name: /open navigation menu/i }));
  const menu = document.getElementById('mobile-nav') as HTMLElement;
  const signOut = within(menu).getByRole('button', { name: 'Sign out' });

  fireEvent.click(signOut);
  expect(logout).toHaveBeenCalled();
});

test('unauthenticated: no hamburger, no nav links, and no sign-in actions in the header', () => {
  mockedUseAuth.mockReturnValue({ isAuthenticated: false, logout: jest.fn() });
  renderHeader();

  expect(screen.queryByRole('button', { name: /navigation menu/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Sessions' })).not.toBeInTheDocument();
  // Sign in / Create account moved to the HomePage so the mobile header does not overflow.
  expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /create account/i })).not.toBeInTheDocument();
  // The dark-mode toggle stays for everyone (its accessible name comes from the title attr).
  expect(screen.getByTitle(/switch to (dark|light) mode/i)).toBeInTheDocument();
});

// Profile + Sign out moved out of the main nav into a desktop account dropdown.
// The account panel is a disclosure (#145): the button points to it with aria-controls;
// it holds plain links and a button, no menu roles.
const accountToggle = () => screen.getByRole('button', { name: /account menu/i });
const accountPanel = () => {
  const id = accountToggle().getAttribute('aria-controls');
  return id ? document.getElementById(id) : null;
};

test('account dropdown is collapsed by default and reveals Profile + Sign out', () => {
  mockedUseAuth.mockReturnValue({ isAuthenticated: true, logout: jest.fn() });
  renderHeader();

  // Not in the main desktop nav anymore, and hidden until the dropdown opens.
  expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument();

  const toggle = accountToggle();
  expect(toggle).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(toggle);

  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const panel = accountPanel()!;
  expect(panel).toBeInTheDocument();
  expect(within(panel).getByRole('link', { name: 'Profile' })).toBeInTheDocument();
  expect(within(panel).getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
});

test('#150: the account panel is a disclosure, not a menu', () => {
  mockedUseAuth.mockReturnValue({ isAuthenticated: true, logout: jest.fn(), user: { isCurator: true } });
  renderHeader();
  fireEvent.click(accountToggle());
  expect(accountToggle()).not.toHaveAttribute('aria-haspopup');
  expect(screen.queryByRole('menu')).toBeNull();
  expect(screen.queryByRole('menuitem')).toBeNull();
  expect(within(accountPanel()!).getByRole('link', { name: 'Curate' })).toBeInTheDocument();
});

test('account dropdown: Escape closes it, and Sign out logs out', () => {
  const logout = jest.fn().mockResolvedValue(undefined);
  mockedUseAuth.mockReturnValue({ isAuthenticated: true, logout });
  renderHeader();

  fireEvent.click(accountToggle());
  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(accountPanel()).toBeNull();

  fireEvent.click(accountToggle());
  fireEvent.click(within(accountPanel()!).getByRole('button', { name: 'Sign out' }));
  expect(logout).toHaveBeenCalled();
});

describe('#136: the account menu closes like the other menus', () => {
  beforeEach(() => mockedUseAuth.mockReturnValue({ isAuthenticated: true, logout: jest.fn() }));

  test('an outside click closes it, a click inside does not', () => {
    renderHeader();
    fireEvent.click(accountToggle());
    fireEvent.mouseDown(within(accountPanel()!).getByRole('link', { name: 'Profile' }));
    expect(accountPanel()).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(accountPanel()).toBeNull();
  });

  test('Escape puts focus back on the account button', () => {
    renderHeader();
    const toggle = accountToggle();
    fireEvent.click(toggle);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(accountPanel()).toBeNull();
    expect(toggle).toHaveFocus();
  });
});
