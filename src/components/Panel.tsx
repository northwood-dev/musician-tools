import type { ReactNode, RefObject } from 'react';
import { CloseButton } from './CloseButton';

// The panel block of the design pass (#141, #156): the frame of the panels that open under
// a button (Set instrument, Add to playlist, Add to collection, the header account panel).
// It works with the shared hook (#38, #145): pass the hook's result as `panel`, so the
// frame carries the ref the hook watches for outside presses and the id the button's
// aria-controls points to. A disclosure, not an ARIA menu: no menu roles.
//   size md  the bulk-action panels (title row + ✕, form inside)
//   size sm  the header account panel (a short list of links)
// `title` adds the title row with a ✕ named "Close" (`onClose`, `closeDisabled` while a
// request runs).
const SIZE = {
  md: 'w-72 p-3 z-20',
  sm: 'w-44 py-1 z-50',
};

export function Panel({
  panel,
  size = 'md',
  title,
  onClose,
  closeDisabled,
  children,
}: {
  panel: { panelRef: RefObject<HTMLDivElement | null>; panelId: string };
  size?: 'md' | 'sm';
  title?: ReactNode;
  onClose?: () => void;
  closeDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      ref={panel.panelRef}
      id={panel.panelId}
      className={`absolute right-0 mt-2 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 ${SIZE[size]}`}
    >
      {title && (
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-gray-700 dark:text-gray-200">{title}</p>
          {onClose && <CloseButton label="Close" onClick={onClose} disabled={closeDisabled} className="-my-1" />}
        </div>
      )}
      {children}
    </div>
  );
}
