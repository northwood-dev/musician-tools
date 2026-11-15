import type { ReactNode } from 'react';

// The message block of the design pass (#141, #153): one recipe per tone, dark mode
// included, instead of the red / amber / green / grey boxes copied by hand page by page.
//
//   error   red        announced at once (alert)
//   warning amber      announced politely (status)
//   info    grey-blue  announced politely (status)
//   success green      announced politely (status)
//
// `announce` overrides the default when a site needs it: a failed batch recap is amber
// but an alert; content that is part of the page from the start (an invalid reset link,
// a "newer version" hint) is not announced at all ("none").
//
// A notice whose role changes in place is not reliably re-announced: when the tone or
// the announcement can change, the caller remounts it with a `key` (as BulkRecap does).
//
// `variant="strip"` is the full-width bar under the header (verify-email banner); the
// default is a box. `action` sits on the right of the message (e.g. a Refresh button);
// `onDismiss` adds a ✕ that always has a name.
export type NoticeTone = 'error' | 'warning' | 'info' | 'success';

const TONE: Record<NoticeTone, string> = {
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  info: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200',
  success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200',
};

const SHAPE = {
  box: 'rounded-lg border px-4 py-3',
  strip: 'border-b',
};

export function Notice({
  tone,
  children,
  announce = tone === 'error' ? 'alert' : 'status',
  label,
  onDismiss,
  dismissLabel = 'Dismiss',
  action,
  variant = 'box',
  className = '',
}: {
  tone: NoticeTone;
  children: ReactNode;
  announce?: 'alert' | 'status' | 'none';
  /** Accessible name of the region, when several live regions share a page. */
  label?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  action?: ReactNode;
  variant?: 'box' | 'strip';
  className?: string;
}) {
  const body = (
    <>
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <button
          type="button"
          aria-label={dismissLabel}
          className="shrink-0 rounded px-1 text-xs opacity-70 hover:opacity-100"
          onClick={onDismiss}
        >
          ✕
        </button>
      )}
    </>
  );
  return (
    <div
      role={announce === 'none' ? undefined : announce}
      aria-label={label}
      className={`${SHAPE[variant]} ${TONE[tone]} text-sm ${className}`}
    >
      {variant === 'strip' ? (
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">{body}</div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">{body}</div>
      )}
    </div>
  );
}
