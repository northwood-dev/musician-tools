import { useLayoutEffect, useRef } from 'react';
import { RemovableChip } from './Chip';
import type { ActiveFilterChip } from '../utils/songFilters';

// #188: the active Songlist filters as removable chips, under the search field, so a
// shorter list explains itself without opening the sidebar (folded away on mobile).
// #195: after a removal, focus moves to the next chip still there, else the previous
// one, else `onEmptied` (the search field). Removing the song instrument drops its
// dependent chips in the same render, so "next" means the first SURVIVING chip after
// the removed one.
export function ActiveFilterChips({ chips, onRemove, onClearAll, onEmptied }: {
  chips: ActiveFilterChip[];
  onRemove: (chip: ActiveFilterChip) => void;
  onClearAll: () => void;
  onEmptied: () => void;
}) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const pending = useRef<{ keys: string[]; index: number } | null>(null);

  useLayoutEffect(() => {
    const removal = pending.current;
    if (!removal) return;
    pending.current = null;
    const surviving = new Set(chips.map(c => c.key));
    const after = removal.keys.slice(removal.index + 1).find(k => surviving.has(k));
    const before = removal.keys.slice(0, removal.index).reverse().find(k => surviving.has(k));
    const target = after ?? before;
    if (target === undefined) onEmptied();
    else buttons.current.get(target)?.focus();
  }, [chips, onEmptied]);

  if (chips.length === 0) return null;
  return (
    <div role="group" aria-label="Active filters" className="mt-3 flex flex-wrap items-center gap-2">
      {chips.map((chip, index) => (
        <RemovableChip
          key={chip.key}
          ref={el => {
            if (el) buttons.current.set(chip.key, el);
            else buttons.current.delete(chip.key);
          }}
          label={chip.label}
          onRemove={() => {
            pending.current = { keys: chips.map(c => c.key), index };
            onRemove(chip);
          }}
        />
      ))}
      {/* Named apart from the sidebar's "Clear all", so a screen reader's button list tells them apart. */}
      <button type="button" className="btn-link" aria-label="Clear all filters" onClick={onClearAll}>Clear all</button>
    </div>
  );
}
