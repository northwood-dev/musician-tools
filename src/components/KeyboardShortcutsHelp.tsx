import { useId } from 'react';
import { Dialog } from './Dialog';
import { setShortcutsEnabled, useShortcutsEnabled } from '../hooks/useShortcutsEnabled';

// #187 / #202: the "Keyboard shortcuts" help, opened by "?" or the footer link. On the
// Dialog block (#203): modal, Escape / ✕ / backdrop close it, focus goes back.
const SHORTCUTS: { keys: string; action: string; where: string }[] = [
  { keys: '/', action: 'Search', where: 'Songlist, Catalog' },
  { keys: 'n', action: 'Add a song', where: 'Songlist' },
  { keys: 'Esc', action: 'Back to the songlist', where: 'Song page' },
  { keys: '?', action: 'This help', where: 'Everywhere' },
];

export function KeyboardShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const hintId = useId();
  const enabled = useShortcutsEnabled();
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts" size="md">
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
      <label className="flex items-center justify-between gap-3 border-t border-gray-100 mt-4 pt-4 text-sm dark:border-gray-700">
        <span>
          Keyboard shortcuts: <strong>{enabled ? 'On' : 'Off'}</strong>
          <span id={hintId} className="block text-xs text-gray-500 dark:text-gray-400">Turn them off if single keys get in your way (screen reader, voice control). “?” keeps working.</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          aria-label="Keyboard shortcuts"
          aria-describedby={hintId}
          checked={enabled}
          onChange={e => setShortcutsEnabled(e.target.checked)}
        />
      </label>
    </Dialog>
  );
}
