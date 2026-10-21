import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

// Issue #19 — what the user sees when a routed page crashes. Mounted through the REAL route
// tree in a REAL data router (createMemoryRouter): errorElement only exists there, which is
// why router.test.tsx (useRoutes) can't cover it. The real RootLayout renders; its chrome
// (Header / banner / Footer) and the pages are stubbed, auth is mocked.
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
let mockIsDevBuild = false;
jest.mock('../utils/buildMode', () => ({
  get isDevBuild() { return mockIsDevBuild; },
}));
jest.mock('../components/Header', () => {
  const { Link: RouterLink } = jest.requireActual('react-router-dom');
  return { __esModule: true, default: () => <nav>HEADER <RouterLink to="/my-topics">Topics</RouterLink></nav> };
});
jest.mock('../components/Footer', () => ({ __esModule: true, default: () => <footer>FOOTER</footer> }));
jest.mock('../components/VerifyEmailBanner', () => ({ __esModule: true, default: () => null }));

let mockSongsThrows = false;
jest.mock('../pages/Songs', () => ({
  __esModule: true,
  default: () => {
    if (mockSongsThrows) throw new Error('songs exploded');
    return <div>SONGS</div>;
  },
}));
jest.mock('../pages/LoginPage', () => ({ __esModule: true, default: () => <div>LOGIN</div> }));
jest.mock('../pages/RegisterPage', () => ({ __esModule: true, default: () => <div>REGISTER</div> }));
jest.mock('../pages/MyInstrumentsPage', () => ({ __esModule: true, default: () => <div>INSTRUMENTS</div> }));
jest.mock('../pages/MyPlaylistsPage', () => ({ __esModule: true, default: () => <div>PLAYLISTS</div> }));
jest.mock('../pages/MyTopicsPage', () => ({ __esModule: true, default: () => <div>TOPICS</div> }));
jest.mock('../pages/MySessionsPage', () => ({ __esModule: true, default: () => <div>SESSIONS</div> }));
jest.mock('../pages/MyHeatmapPage', () => ({ __esModule: true, default: () => <div>HEATMAP</div> }));
jest.mock('../pages/ProfilePage', () => ({ __esModule: true, default: () => <div>PROFILE</div> }));
jest.mock('../pages/VerifyEmailPage', () => ({ __esModule: true, default: () => <div>VERIFY</div> }));
jest.mock('../pages/ForgotPasswordPage', () => ({ __esModule: true, default: () => <div>FORGOT</div> }));
jest.mock('../pages/ResetPasswordPage', () => ({ __esModule: true, default: () => <div>RESET</div> }));
jest.mock('../pages/Catalog', () => ({ __esModule: true, default: () => <div>CATALOG</div> }));
jest.mock('../pages/CatalogAdmin', () => ({ __esModule: true, default: () => <div>CATALOG_ADMIN</div> }));
jest.mock('../pages/CatalogManage', () => ({ __esModule: true, default: () => <div>CATALOG_MANAGE</div> }));
jest.mock('../pages/CatalogEntry', () => ({ __esModule: true, default: () => <div>CATALOG_ENTRY</div> }));
jest.mock('../pages/CatalogCollection', () => ({ __esModule: true, default: () => <div>COLLECTION</div> }));
jest.mock('../pages/CatalogCollectionCompose', () => ({ __esModule: true, default: () => <div>COMPOSE</div> }));

import { routes } from '../router';
import { useAuth } from '../contexts/AuthContext';
const mockAuth = useAuth as jest.Mock;

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  mockSongsThrows = false;
  mockIsDevBuild = false;
  mockAuth.mockReturnValue({ isAuthenticated: true, loading: false, user: { name: 'Sam', emailVerified: true } });
  // React and our error view both report the caught error; keep the test output readable.
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('a page that crashes', () => {
  test('keeps the header and footer and shows the error screen with both ways out', () => {
    mockSongsThrows = true;
    renderAt('/songs');
    expect(screen.getByText(/HEADER/)).toBeInTheDocument();
    expect(screen.getByText('FOOTER')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to songlist' })).toHaveAttribute('href', '/songs');
  });

  test('opening another page from the header clears the error', async () => {
    mockSongsThrows = true;
    renderAt('/songs');
    fireEvent.click(screen.getByRole('link', { name: 'Topics' }));
    expect(await screen.findByText('TOPICS')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  test('logs the error to the console', () => {
    mockSongsThrows = true;
    renderAt('/songs');
    expect(console.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'songs exploded' }));
  });

  test('a development build shows the error message', () => {
    mockIsDevBuild = true;
    mockSongsThrows = true;
    renderAt('/songs');
    expect(screen.getByText('songs exploded')).toBeInTheDocument();
  });

  test('a production build shows nothing technical', () => {
    mockSongsThrows = true;
    renderAt('/songs');
    expect(screen.queryByText(/songs exploded/)).not.toBeInTheDocument();
  });
});
