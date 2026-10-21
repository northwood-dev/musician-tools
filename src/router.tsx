import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { RootLayout, HomePage } from './App';
import { RequireAuth, GuestOnly } from './components/RequireAuth';
import { RouteError, RootRouteError } from './components/RouteError';
import Songs from './pages/Songs';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MyInstrumentsPage from './pages/MyInstrumentsPage';
import MyPlaylistsPage from './pages/MyPlaylistsPage';
import MyTopicsPage from './pages/MyTopicsPage';
import MySessionsPage from './pages/MySessionsPage';
import MyHeatmapPage from './pages/MyHeatmapPage';
import ProfilePage from './pages/ProfilePage';
import CatalogAdmin from './pages/CatalogAdmin';
import CatalogManage from './pages/CatalogManage';
import CatalogCollectionCompose from './pages/CatalogCollectionCompose';
import CatalogCollection from './pages/CatalogCollection';
import Catalog from './pages/Catalog';
import CatalogEntry from './pages/CatalogEntry';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Story 18.1 — data-router route tree. Exact equivalent of the previous <Routes>:
// same paths, same auth redirects (RequireAuth -> /login ; GuestOnly -> /songs ;
// unknown -> /). Auth stays a client context (no loaders). Of the two former
// <BrowserRouter> future flags, v7_relativeSplatPath is router-level (here);
// v7_startTransition is render-level (on <RouterProvider> in main.tsx).
// Exported so tests can mount the exact same route tree: router.test.tsx via useRoutes +
// <MemoryRouter> (paths, auth guards, catch-all), routeErrors.test.tsx via a real
// createMemoryRouter, which jsdom supports since story 18.2 (jest.jsdom.env.cjs bridges the
// Fetch primitives) and which errorElement needs — useRoutes ignores it.
export const routes: RouteObject[] = [
    {
      element: <RootLayout />,
      // Issue #19 — when the layout's own chrome throws, nothing of it can be kept.
      errorElement: <RootRouteError />,
      children: [{
        // Issue #19 — pathless wrapper whose only job is the errorElement: a page that throws
        // is replaced inside RootLayout's <Outlet/>, so the header, banner and footer stay and
        // navigating elsewhere clears the error.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <HomePage /> },
          {
            element: <RequireAuth />,
            children: [
              // Story 18.2: the song form is a real route now — /songs (list),
              // /songs/new (add), /songs/:uid (edit). All render <Songs/>, which reads
              // useParams to pick the mode.
              { path: 'songs', element: <Songs /> },
              { path: 'songs/new', element: <Songs /> },
              { path: 'songs/:uid', element: <Songs /> },
              { path: 'my-instruments', element: <MyInstrumentsPage /> },
              { path: 'my-playlists', element: <MyPlaylistsPage /> },
              { path: 'my-topics', element: <MyTopicsPage /> },
              { path: 'my-sessions', element: <MySessionsPage /> },
              { path: 'my-heatmap', element: <MyHeatmapPage /> },
              { path: 'profile', element: <ProfilePage /> },
              // Story 19.3 — Catalog browse (list) + detail. Read surface, auth-gated.
              { path: 'catalog', element: <Catalog /> },
              // Story 20.4 — user-facing Collection detail (browse + import). Two-segment
              // path; no clash with catalog/:uid (fiche) or catalog/manage/collections/:uid.
              { path: 'catalog/collections/:uid', element: <CatalogCollection /> },
              // Story 19.5 — Catalog curator management hub (list + edit + delete).
              { path: 'catalog/manage', element: <CatalogManage /> },
              // Story 20.2 — curator Collection composer (search + Add/Remove, rename,
              // delete). Deeper static+:uid path; no clash with catalog/:uid.
              { path: 'catalog/manage/collections/:uid', element: <CatalogCollectionCompose /> },
              // Story 19.5 — edit an existing fiche (CatalogAdmin in edit mode). Static
              // `admin` segment outranks :uid; this stays above catalog/:uid too.
              { path: 'catalog/admin/:uid', element: <CatalogAdmin /> },
              // Story 19.2 — Catalog curator admin. Static path outranks :uid, but keep
              // it before the dynamic detail route for clarity. Role check in-component.
              { path: 'catalog/admin', element: <CatalogAdmin /> },
              { path: 'catalog/:uid', element: <CatalogEntry /> },
            ],
          },
          // Public — reached from the email link, possibly while signed out (story 7.9/7.10)
          { path: 'verify-email', element: <VerifyEmailPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
          { path: 'reset-password', element: <ResetPasswordPage /> },
          {
            element: <GuestOnly />,
            children: [
              { path: 'login', element: <LoginPage /> },
              { path: 'register', element: <RegisterPage /> },
            ],
          },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      }],
    },
];

export const router = createBrowserRouter(routes, {
  future: { v7_relativeSplatPath: true },
});
