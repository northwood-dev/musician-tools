import { RemovableChip } from './Chip';
import type { ActiveFilterChip } from '../utils/songFilters';

// #188: the active Songlist filters as removable chips, under the search field, so a
// shorter list explains itself without opening the sidebar (folded away on mobile).
export function ActiveFilterChips({ chips, onRemove, onClearAll }: {
  chips: ActiveFilterChip[];
  onRemove: (chip: ActiveFilterChip) => void;
  onClearAll: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div role="group" aria-label="Active filters" className="mt-3 flex flex-wrap items-center gap-2">
      {chips.map(chip => (
        <RemovableChip key={chip.key} label={chip.label} onRemove={() => onRemove(chip)} />
      ))}
      <button type="button" className="btn-link" onClick={onClearAll}>Clear all</button>
    </div>
  );
}
