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

// A title row always comes with its ✕: `title` and `onClose` are given together or not
// at all (the type refuses one without the other).
type TitleRow =
  | { title: ReactNode; onClose: () => void; closeDisabled?: boolean }
  | { title?: undefined; onClose?: undefined; closeDisabled?: undefined };

export function Panel({
  panel,
  size = 'md',
  inline = false,
  title,
  onClose,
  closeDisabled,
  children,
}: {
  panel: { panelRef: RefObject<HTMLDivElement | null>; panelId: string };
  size?: 'md' | 'sm';
  /** Opens in the flow, full width, instead of floating: for a container that clips
   *  overflow (the Songlist sidebar, #198). */
  inline?: boolean;
  children: ReactNode;
} & TitleRow) {
  return (
    <div
      ref={panel.panelRef}
      id={panel.panelId}
      className={`${inline ? 'relative mt-2 w-full py-1' : `absolute right-0 mt-2 shadow-lg ${SIZE[size]}`} rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800`}
    >
      {title && (
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-gray-700 dark:text-gray-200">{title}</p>
          <CloseButton label="Close" onClick={onClose} disabled={closeDisabled} className="-my-1" />
        </div>
      )}
      {children}
    </div>
  );
}
