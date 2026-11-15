import type { ReactNode } from 'react';

// The empty-state block of the design pass (#141, #158): what a list says when it has
// nothing to show — one centred grey line, and an optional action under it ("Create
// one", "Clear filters"). It replaces the two styles the pages had grown (a padded
// centred paragraph on the Catalog pages, a plain grey line on the My* pages).
export function EmptyState({ children, action, className = '' }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      <p>{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
