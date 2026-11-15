import { render, screen } from '@testing-library/react';
import { MemoryRouter, useRoutes } from 'react-router-dom';

// #152: in a dev build (`npm run dev`) the styleguide is routed at /dev/styleguide, signed
// in or not. router.test.tsx covers the production build, where it doesn't exist.
jest.mock('../utils/buildMode', () => ({ isDevBuild: true }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../App', () => {
  const { Outlet } = jest.requireActual('react-router-dom');
  return { RootLayout: () => <Outlet /> };
});
jest.mock('../pages/StyleguidePage', () => ({ __esModule: true, default: () => <div>STYLEGUIDE</div> }));

import { routes } from '../router';
import { useAuth } from '../contexts/AuthContext';

function RoutedApp() {
  return useRoutes(routes);
}

test.each([false, true])('the styleguide is routed in a dev build (signed in: %s)', (isAuthenticated) => {
  (useAuth as jest.Mock).mockReturnValue({ isAuthenticated, loading: false, user: null });
  render(<MemoryRouter initialEntries={['/dev/styleguide']}><RoutedApp /></MemoryRouter>);
  expect(screen.getByText('STYLEGUIDE')).toBeInTheDocument();
});
