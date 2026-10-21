import { useEffect } from 'react';
import { Link, useRouteError } from 'react-router-dom';
import { isDevBuild } from '../utils/buildMode';

// Local builds only: what crashed, without opening the console. Beta testers never see it.
function DevErrorDetails({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  return (
    <div className="pt-4 text-left">
      <p className="font-mono text-sm text-red-700 dark:text-red-300 break-words">{message}</p>
      {stack && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-300">Stack trace</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-gray-100 dark:bg-gray-800 p-3 text-xs text-gray-800 dark:text-gray-200">{stack}</pre>
        </details>
      )}
    </div>
  );
}

// Issue #19 — what a routed page shows when it throws while rendering, instead of
// react-router's raw default screen. Rendered as an `errorElement` (see router.tsx), so it
// replaces only the crashed page: the layout around it (header, banner, footer) stays.
export function RouteError() {
  const error = useRouteError();

  // react-router stops logging the error once an errorElement handles it.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Something went wrong</h1>
        <p className="text-gray-600 dark:text-gray-300">
          This page hit an error. Reload it, or head back to your songlist.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <Link to="/songs" className="btn-secondary">
            Back to songlist
          </Link>
        </div>
        {isDevBuild && <DevErrorDetails error={error} />}
      </div>
    </div>
  );
}
