import { useState } from 'react';
import { instrumentTypeOptions } from '../constants/instrumentTypes';
import { songService, type AddInstrumentResult } from '../services/songService';

export type InstrumentAdded = AddInstrumentResult & { instrument: string };

/**
 * #71: the Songlist's bulk "Set instrument" action. Adds one instrument type to the selected
 * songs (never replaces their instruments). Unlike "Add to playlist", it calls the service
 * itself to keep the page small; the page opens and closes it (one bulk panel at a time) and
 * decides what to do with the result.
 */
export function BulkSetInstrument({
  open,
  onOpenChange,
  selectedSongUids,
  disabled,
  onAdded,
  onFailed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSongUids: string[];
  disabled: boolean;
  onAdded: (result: InstrumentAdded) => void;
  /** Nothing was changed (all or none): the panel stays open to try again. */
  onFailed: (error: unknown) => void;
}) {
  const [instrument, setInstrument] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    onOpenChange(false);
    setInstrument('');
  };

  const submit = async () => {
    let result: AddInstrumentResult;
    setSubmitting(true);
    try {
      result = await songService.addInstrumentToSongs(selectedSongUids, instrument);
    } catch (err) {
      console.error(err);
      onFailed(err);
      return;
    } finally {
      setSubmitting(false);
    }
    close();
    onAdded({ instrument, ...result });
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="btn-primary text-sm px-3 py-1.5"
        onClick={() => (open ? close() : onOpenChange(true))}
        disabled={disabled}
      >
        Set instrument
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 shadow-lg z-20 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-700 dark:text-gray-200">Add an instrument</p>
            <button
              type="button"
              aria-label="Close"
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
              onClick={close}
              disabled={submitting}
            >
              ✕
            </button>
          </div>
          <select
            aria-label="Instrument to add"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 text-sm dark:bg-gray-700 dark:text-gray-100 disabled:opacity-50"
            value={instrument}
            onChange={e => setInstrument(e.target.value)}
            disabled={submitting}
          >
            <option value="">Choose an instrument</option>
            {instrumentTypeOptions.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <p className="mt-2 mb-3 text-xs text-gray-500 dark:text-gray-400">Their other instruments stay.</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="text-sm px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              onClick={close}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-sm px-3 py-1 rounded-md bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50"
              onClick={() => { void submit(); }}
              disabled={instrument === '' || submitting}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
