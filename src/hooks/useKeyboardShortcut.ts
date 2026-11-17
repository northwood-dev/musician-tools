import { useEffect, useRef } from 'react';
import { useShortcutsEnabled } from './useShortcutsEnabled';

// #187: a single-key shortcut for as long as the calling component is mounted. Small and
// in-house on purpose (react-hotkeys-hook was weighed: four single keys don't need it —
// revisit past ~10 shortcuts or key combinations).
//
// - Matches `event.key`, the CHARACTER produced, so it doesn't depend on the keyboard
//   layout: AZERTY's "/" (Shift + :) works.
// - Never gets in the way: ignored while typing in a field (input, textarea, select,
//   contenteditable), with Ctrl / Cmd / Alt held (browser shortcuts stay the browser's),
//   and when something nearer already handled the event — the app's rule "one Escape
//   closes one thing" (menus and dialogs call preventDefault) — and when the user turned
//   shortcuts off in the help window (#202), except the ones marked `always`.
// - Listens on window, so every document-level handler (the menus') runs first.
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.getAttribute('contenteditable') === 'true') return true;
  return target.closest('input, textarea, select') !== null;
}

export function useKeyboardShortcut(
  key: string,
  onShortcut: (event: KeyboardEvent) => void,
  {
    enabled = true,
    always = false,
  }: {
    /** Off on pages where the shortcut means nothing. */
    enabled?: boolean;
    /** Works even when the user turned shortcuts off ("?", so they can turn them back on). */
    always?: boolean;
  } = {},
) {
  const switchedOn = useShortcutsEnabled();
  const active = enabled && (always || switchedOn);
  // Read at event time, so the listener doesn't re-subscribe on every render.
  const latest = useRef(onShortcut);
  useEffect(() => {
    latest.current = onShortcut;
  });

  useEffect(() => {
    // Off (not on this page): no listener at all, so the key keeps its default action.
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== key || event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(event.target)) return;
      event.preventDefault();
      latest.current(event);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, active]);
}
