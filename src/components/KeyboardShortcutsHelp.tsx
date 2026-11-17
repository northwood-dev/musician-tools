import { useEffect, useId, useRef } from 'react';
import { CloseButton } from './CloseButton';
import { setShortcutsEnabled, useShortcutsEnabled } from '../hooks/useShortcutsEnabled';

// #187 / #202: the "Keyboard shortcuts" help, opened by "?" or the footer link. A native
// <dialog> shown modally: the browser makes the rest of the page inert and keeps focus
// inside. Escape is handled here (not left to the native cancel) so it behaves the same
// everywhere, and focus goes back to where it was.
const SHORTCUTS: { keys: string; action: string; where: string }[] = [
  { keys: '/', action: 'Search', where: 'Songlist, Catalog' },
  { keys: 'n', action: 'Add a song', where: 'Songlist' },
  { keys: 'Esc', action: 'Back to the songlist', where: 'a song' },
  { keys: '?', action: 'This help', where: 'everywhere' },
];

export function KeyboardShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const enabled = useShortcutsEnabled();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      returnFocus.current?.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onKeyDown={e => {
        if (e.key !== 'Escape') return;
        e.preventDefault(); // one Escape closes one thing (and not the native cancel twice)
        onClose();
      }}
      onCancel={e => { e.preventDefault(); onClose(); }}
      className="w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-0 text-gray-800 shadow-xl backdrop:bg-black/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
    >
      {open && (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="text-lg font-semibold">Keyboard shortcuts</h2>
            <CloseButton label="Close" onClick={onClose} />
          </div>
          <table className="w-full text-sm">
            <tbody>
              {SHORTCUTS.map(s => (
                <tr key={s.keys} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-2 pr-3 w-12">
                    <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono text-xs dark:border-gray-600 dark:bg-gray-700">{s.keys}</kbd>
                  </td>
                  <td className="py-2">{s.action}</td>
                  <td className="py-2 text-right text-gray-500 dark:text-gray-400">{s.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <label className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4 text-sm dark:border-gray-700">
            <span>
              Keyboard shortcuts: <strong>{enabled ? 'On' : 'Off'}</strong>
              <span className="block text-xs text-gray-500 dark:text-gray-400">Turn them off if single keys get in your way (screen reader, voice control). “?” keeps working.</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              aria-label="Keyboard shortcuts"
              className="h-5 w-5 accent-brand-500"
              checked={enabled}
              onChange={e => setShortcutsEnabled(e.target.checked)}
            />
          </label>
        </div>
      )}
    </dialog>
  );
}
