import type { ReactNode } from 'react';

// The failed-load block of the design pass (#216): what a list says when it could not be
// loaded — a centred line saying WHAT didn't load ("Couldn't load the Catalog."), announced
// at once (alert), and a Retry under it. Laid out like <EmptyState>, which says a list is
// empty; this one says it never arrived, one shade darker because it is an error.
//
// ALWAYS MOUNTED: a live region that appears together with its message is not reliably
// announced (#153), so the page renders <LoadFailed failed={…}> from the start and only the
// content comes and goes. `label` names the region, since a page may hold another alert
// (an action's error). It replaced six hand-written "Something went wrong." + Retry copies.
export function LoadFailed({
  failed,
  children,
  onRetry,
  label = 'Loading error',
  className = '',
}: {
  failed: boolean;
  children: ReactNode;
  onRetry: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <div role="alert" aria-label={label}>
      {failed && (
        <div className={`px-4 py-10 text-center text-sm text-gray-600 dark:text-gray-300 ${className}`}>
          <p>{children}</p>
          <button type="button" className="btn-secondary mt-3" onClick={onRetry}>Retry</button>
        </div>
      )}
    </div>
  );
}
