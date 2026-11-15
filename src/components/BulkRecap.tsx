import type { ReactNode } from 'react';
import { Notice } from './Notice';

// The persistent recap of a bulk action (stories 22.2 → 22.4). Extracted because the
// same 25 lines of banner had been copied to a third surface — the exact drift this
// epic exists to stop. The engine was already shared (useBulkAddToSonglist); the
// presentation is now shared too.
//
// Two things this component encodes so no caller has to remember them:
//   • `aria-label` — the shared <Toast> keeps a permanent role="status" region mounted
//     (22.5), so an unnamed live region here would be ambiguous for users and tests.
//   • the caller must pass a `key` that changes with `negative`: a live region whose
//     role mutates in place is not reliably re-announced, remounting it is.
//
// It is deliberately NOT rendered inside <BulkActionBar>: the bar unmounts itself at
// zero selection, and a settled batch empties the selection — a recap living in its
// children would vanish exactly when it must be read.
export function BulkRecap({
  message,
  negative,
  onDismiss,
  className,
}: {
  message: ReactNode;
  negative: boolean;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <Notice
      tone={negative ? 'warning' : 'info'}
      announce={negative ? 'alert' : 'status'}
      label="Bulk action result"
      onDismiss={onDismiss}
      className={className}
    >
      <p>{message}</p>
    </Notice>
  );
}

export default BulkRecap;
