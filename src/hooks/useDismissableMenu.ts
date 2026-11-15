import { useEffect, useRef } from 'react';

// A menu opened by a button (the bulk-bar menus, the header account menu) closes like
// its ✕ on a press outside it and on Escape — wherever focus is — and Escape gives
// focus back to the button so a keyboard user doesn't land nowhere (#38).
//
// The caller keeps its open state and its close action (the one its ✕ runs), and
// attaches `buttonRef` to the opening button and `menuRef` to the menu. `blocked`
// mirrors a disabled ✕: while a request runs, nothing closes the menu.
//
// A press on the button itself is left to the button's own toggle; otherwise the press
// would close the menu and the click would reopen it.
//
// An Escape a nearer element already handled (a dialog, an autocomplete list — they call
// preventDefault) is theirs: one Escape closes one thing.
export interface UseDismissableMenuOptions {
  open: boolean;
  onClose: () => void;
  blocked?: boolean;
}

export function useDismissableMenu({ open, onClose, blocked = false }: UseDismissableMenuOptions) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Read at event time, so the listeners don't re-subscribe on every render.
  const latest = useRef({ onClose, blocked });
  useEffect(() => {
    latest.current = { onClose, blocked };
  });

  useEffect(() => {
    if (!open) return;
    const onPress = (event: MouseEvent) => {
      if (latest.current.blocked) return;
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      latest.current.onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || latest.current.blocked) return;
      latest.current.onClose();
      buttonRef.current?.focus();
    };
    document.addEventListener('mousedown', onPress);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPress);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { buttonRef, menuRef };
}
