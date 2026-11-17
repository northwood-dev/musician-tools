import { useLayoutEffect, useRef } from 'react';
import { RemovableChip } from './Chip';
import type { ActiveFilterChip } from '../utils/songFilters';

// #188: the active Songlist filters as removable chips, under the search field, so a
// shorter list explains itself without opening the sidebar (folded away on mobile).
// #195: after a removal, focus moves to the next chip still there, else the previous
// one, else `onEmptied` (the search field). Removing the song instrument can drop
// several chips at once, so "next" means the first SURVIVING chip after the removed one.
export function ActiveFilterChips({ chips, onRemove, onClearAll, onEmptied }: {
  chips: ActiveFilterChip[];
  onRemove: (chip: ActiveFilterChip) => void;
  onClearAll: () => void;
  onEmptied: () => void;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const pending = useRef<{ keys: string[]; index: number } | null>(null);

  useLayoutEffect(() => {
    const removal = pending.current;
    if (!removal) return;
    pending.current = null;
    const surviving = new Set(chips.map(c => c.key));
    const after = removal.keys.slice(removal.index + 1).find(k => surviving.has(k));
    const before = removal.keys.slice(0, removal.index).reverse().find(k => surviving.has(k));
    const target = after ?? before;
    if (target === undefined) { onEmptied(); return; }
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>('[data-chip-slot] > button');
    buttons?.[chips.findIndex(c => c.key === target)]?.focus();
  }, [chips, onEmptied]);

  if (chips.length === 0) return null;
  return (
    <div ref={groupRef} role="group" aria-label="Active filters" className="mt-3 flex flex-wrap items-center gap-2">
      {chips.map((chip, index) => (
        <span key={chip.key} data-chip-slot className="contents">
          <RemovableChip
            label={chip.label}
            onRemove={() => {
              pending.current = { keys: chips.map(c => c.key), index };
              onRemove(chip);
            }}
          />
        </span>
      ))}
      <button type="button" className="btn-link" onClick={onClearAll}>Clear all</button>
    </div>
  );
}
