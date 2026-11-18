import type { ReactNode } from 'react';

// The failed-load block of the design pass (#216): what a list says when it could not be
// loaded — a centred line saying WHAT didn't load ("Couldn't load the Catalog."), announced
// at once (alert, like an error Notice), and a Retry under it. Laid out like <EmptyState>,
// which says a list is empty; this one says it never arrived. It replaced six hand-written
// "Something went wrong." + Retry copies.
export function LoadFailed({ children, onRetry, className = '' }: { children: ReactNode; onRetry: () => void; className?: string }) {
  return (
    <div role="alert" className={`px-4 py-10 text-center text-sm text-gray-600 dark:text-gray-300 ${className}`}>
      <p>{children}</p>
      <button type="button" className="btn-secondary mt-3" onClick={onRetry}>Retry</button>
    </div>
  );
}
