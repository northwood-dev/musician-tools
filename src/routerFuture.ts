// The React Router v7 future flags the app runs with (stories 18.1 / 18.2), shared with
// the tests so a test router runs the app's router exactly (#174): a <MemoryRouter> takes
// both, a data router (createBrowserRouter / createMemoryRouter) takes the router-level
// one and its <RouterProvider> the render-level one.
export const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;
export const DATA_ROUTER_FUTURE = { v7_relativeSplatPath: true } as const;
export const PROVIDER_FUTURE = { v7_startTransition: true } as const;
