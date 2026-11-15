import type { ReactNode } from 'react';
import { Notice } from './Notice';

// Amber "already exists" banner shared by the Song edit form (duplicate already in
// your songlist) and the Catalog curator form (duplicate already in the Catalog).
// Presentational only — the caller passes the message (and any action) as children,
// so both forms render the exact same box in the exact same spot (after title).
export function DuplicateBanner({ children }: { children: ReactNode }) {
  return (
    <Notice tone="warning" announce="alert">
      {children}
    </Notice>
  );
}
