import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import VerifyEmailBanner from './components/VerifyEmailBanner';
import Footer from './components/Footer';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';
import { APP_BACKGROUND } from './constants/appBackground';

// Story 18.1 — root layout element of the data-router: the app chrome
// (header / verify-email banner / footer) around the routed page rendered in the
// <Outlet/>. It waits for the auth context to settle before rendering, exactly as
// the old <App> did. (Story 18.2 removed the custom LeaveGuardProvider — leaving the
// song form is now handled by useBlocker inside the Songs route.)
export function RootLayout() {
  const { loading, isAuthenticated } = useAuth();
  // #187 / #202: "?" (and the footer link) open the Keyboard shortcuts help, signed in only.
  // `always`: it keeps working when shortcuts are off, so they can be turned back on.
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  useKeyboardShortcut('?', () => setShortcutsHelpOpen(true), { enabled: isAuthenticated && !loading, always: true });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${APP_BACKGROUND}`}>
      <Header />
      <VerifyEmailBanner />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer onShowShortcuts={isAuthenticated ? () => setShortcutsHelpOpen(true) : undefined} />
      {isAuthenticated && <KeyboardShortcutsHelp open={shortcutsHelpOpen} onClose={() => setShortcutsHelpOpen(false)} />}
    </div>
  );
}
