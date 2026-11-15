import { useState } from 'react';
import { instrumentTypeOptions } from '../constants/instrumentTypes';
import { songService, type AddInstrumentResult } from '../services/songService';
import { useDismissablePanel } from '../hooks/useDismissablePanel';
import { CloseButton } from './CloseButton';

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
  // Outside click and Escape close like ✕, and like ✕ not while the add runs (#38).
  const { buttonRef, panelRef, panelId } = useDismissablePanel({ open, onClose: close, blocked: submitting });

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
        ref={buttonRef}
        type="button"
        className="btn-primary btn-sm"
        onClick={() => (open ? close() : onOpenChange(true))}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
      >
        Set instrument
      </button>
      {open && (
        <div ref={panelRef} id={panelId} className="absolute right-0 mt-2 w-72 rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 shadow-lg z-20 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-700 dark:text-gray-200">Add an instrument</p>
            <CloseButton label="Close" onClick={close} disabled={submitting} />
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
              className="btn-secondary btn-sm"
              onClick={close}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
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
