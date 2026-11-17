import { useSyncExternalStore } from 'react';

// #187 / #202: the "Keyboard shortcuts: On/Off" switch (WCAG 2.1.4: single-key shortcuts
// can be turned off). Stored in this browser, on by default, shared by every shortcut and
// the help window through one small store.
const KEY = 'keyboardShortcuts';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setShortcutsEnabled(enabled: boolean) {
  try {
    if (enabled) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, 'off');
  } catch { /* ignore */ }
  listeners.forEach(notify => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => { listeners.delete(notify); };
}

export function useShortcutsEnabled(): boolean {
  return useSyncExternalStore(subscribe, read, () => true);
}
