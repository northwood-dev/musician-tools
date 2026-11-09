import { useId } from 'react';
import { instrumentTypeOptions } from '../constants/instrumentTypes';
import { NO_INSTRUMENT_CHOICE } from '../hooks/useAddAsInstrument';
import type { AddAsInstrument } from '../hooks/useAddAsInstrument';

// "Add as": the instrument every add on a Catalog page uses (#34).
export default function AddAsInstrumentSelect({ addAs, className = '' }: { addAs: AddAsInstrument; className?: string }) {
  const id = useId();
  const messageId = `${id}-message`;

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">Add as</label>
      <div className="w-full sm:w-56">
        <select
          id={id}
          ref={addAs.selectRef}
          className="input-base text-sm"
          value={addAs.choice ?? ''}
          aria-describedby={addAs.needsChoice ? messageId : undefined}
          onChange={e => addAs.choose(e.target.value)}
        >
          {addAs.choice === null && <option value="" disabled>Choose an instrument</option>}
          <option value={NO_INSTRUMENT_CHOICE}>No instrument</option>
          {instrumentTypeOptions.map(instrument => (
            <option key={instrument} value={instrument}>{instrument}</option>
          ))}
        </select>
      </div>
      {addAs.needsChoice && (
        <span id={messageId} role="alert" className="text-sm text-amber-700 dark:text-amber-300">Choose an instrument first.</span>
      )}
    </div>
  );
}
