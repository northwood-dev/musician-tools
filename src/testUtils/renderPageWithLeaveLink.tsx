import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import GlobalToastProvider from '../contexts/GlobalToastProvider';

// Renders a page under the global toast and a router, next to a link that leaves it, so a
// test can exercise what happens when the page unmounts.
export function renderPageWithLeaveLink(page: ReactElement) {
  return render(
    <GlobalToastProvider>
      <MemoryRouter initialEntries={['/page']}>
        <Link to="/elsewhere">Leave</Link>
        <Routes>
          <Route path="/page" element={page} />
          <Route path="/elsewhere" element={<p>Another page</p>} />
        </Routes>
      </MemoryRouter>
    </GlobalToastProvider>
  );
}

export async function leavePage() {
  fireEvent.click(screen.getByRole('link', { name: 'Leave' }));
  await screen.findByText('Another page');
}
