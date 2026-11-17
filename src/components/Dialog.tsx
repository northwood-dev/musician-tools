import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { CloseButton } from './CloseButton';

// The dialog block (#203): every modal window of the app (the confirmations, the
// Keyboard shortcuts help) in one frame, on the browser's own modal <dialog>:
//   - it sits in the top layer, so no portal is needed — no ancestor with a transform /
//     backdrop-filter (.glass-effect) can clip it;
//   - the page behind is inert and focus stays inside (the browser's job; jsdom can't, so
//     the tests have stand-ins and Chrome is the check).
// Title row: the title (which names the window) and the shared ✕ "Close". Escape and a click
// on the backdrop close it; the Escape is marked used, so one Escape closes one thing (page
// shortcuts ignore it, #187). On open, focus goes to `initialFocus` (a confirmation passes its
// Cancel) or the first control; on close it goes back to where it was.
const WIDTH = {
  sm: 'w-[min(24rem,calc(100vw-2rem))]',
  md: 'w-[min(28rem,calc(100vw-2rem))]',
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  size = 'sm',
  initialFocus,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  size?: 'sm' | 'md';
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <OpenDialog onClose={onClose} title={title} size={size} initialFocus={initialFocus}>
      {children}
    </OpenDialog>
  );
}

function OpenDialog({ onClose, title, size, initialFocus, children }: {
  onClose: () => void;
  title: ReactNode;
  size: 'sm' | 'md';
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // Shown while mounted: open → showModal + focus in; unmount → close + focus back.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    const first = initialFocus?.current ?? dialog.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    return () => {
      if (dialog.open) dialog.close();
      returnTo?.focus();
    };
  }, [initialFocus]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // The <dialog> box itself has no padding: a click whose target is the dialog element
      // landed on its backdrop (the frame's content is the inner div).
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={e => {
        if (e.key !== 'Escape') return;
        e.preventDefault(); // used up: one Escape closes one thing
        onClose();
      }}
      onCancel={e => { e.preventDefault(); onClose(); }}
      className={`${WIDTH[size]} rounded-lg bg-white p-0 text-gray-800 shadow-lg backdrop:bg-black/50 dark:bg-gray-800 dark:text-gray-100 dark:backdrop:bg-black/70`}
    >
      <div className="p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <CloseButton label="Close" onClick={onClose} className="-my-1 -mr-2" />
        </div>
        {children}
      </div>
    </dialog>
  );
}
