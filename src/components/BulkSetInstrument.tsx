import { useState } from 'react';
import { instrumentTypeOptions } from '../constants/instrumentTypes';
import { songService, type Song } from '../services/songService';

export type SetInstrumentResult = { instrument: string; added: number; alreadyHad: number; songs: Song[] };

/**
 * #71: the Songlist's bulk "Set instrument" action. Adds one instrument type to the selected
 * songs (never replaces their instruments); the page decides what to do with the result.
 */
export function BulkSetInstrument({
  selectedSongUids,
  disabled,
  onApplied,
  onFailed,
}: {
  selectedSongUids: string[];
  disabled: boolean;
  onApplied: (result: SetInstrumentResult) => void;
  /** Nothing was changed (all or none): the panel stays open to try again. */
  onFailed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [instrument, setInstrument] = useState('');
  const [running, setRunning] = useState(false);

  const close = () => {
    setOpen(false);
    setInstrument('');
  };

  const add = async () => {
    let result;
    setRunning(true);
    try {
      result = await songService.setInstrumentOnSongs(selectedSongUids, instrument);
    } catch (err) {
      console.error(err);
      onFailed();
      return;
    } finally {
      setRunning(false);
    }
    close();
    onApplied({ instrument, ...result });
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="btn-primary text-sm px-3 py-1.5"
        onClick={() => (open ? close() : setOpen(true))}
        disabled={disabled}
      >
        Set instrument
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 shadow-lg z-20 p-3">
          <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">Add an instrument to the selected songs</p>
          <select
            aria-label="Instrument to add"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm dark:bg-gray-700 dark:text-gray-100"
            value={instrument}
            onChange={e => setInstrument(e.target.value)}
          >
            <option value="">Choose an instrument</option>
            {instrumentTypeOptions.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Their other instruments stay.</p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="btn-secondary text-sm px-3 py-1.5" onClick={close}>Cancel</button>
            <button type="button" className="btn-primary text-sm px-3 py-1.5" onClick={() => { void add(); }} disabled={instrument === '' || running}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}
