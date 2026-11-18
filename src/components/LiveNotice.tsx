import type { ReactNode } from 'react';
import { Notice, type NoticeTone } from './Notice';

// A message that must be read out (#225): its live region is ALWAYS on the page, and the
// <Notice> box appears inside it only when there is a message. A region that appears together
// with its text is often not read — above all a polite `status` (#153) — so pages used to write
// that wrapper by hand around a Notice; this block owns it. Role from the tone as in Notice
// (error → alert, others → status) unless `announce` says otherwise; `label` names the region
// when a page holds several. The box itself is not announced again (announce="none").
export function LiveNotice({
  tone,
  children,
  announce = tone === 'error' ? 'alert' : 'status',
  label,
  action,
  className = '',
}: {
  tone: NoticeTone;
  /** The message; nothing (null, '', false) = no box, the region stays. */
  children: ReactNode;
  announce?: 'alert' | 'status';
  label?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div role={announce} aria-label={label}>
      {children ? (
        <Notice tone={tone} announce="none" action={action} className={className}>{children}</Notice>
      ) : null}
    </div>
  );
}
