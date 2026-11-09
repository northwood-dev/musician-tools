import { useRef, useState } from 'react';
import { instrumentTypeOptions } from '../constants/instrumentTypes';

// The instrument songs are added with from the Catalog (#34). One choice per device, shared
// by every Catalog page through localStorage: a convenience for the selector, never a record
// (the song's own `instrument` field is the only one).
const STORAGE_KEY = 'catalogAddAsInstrument';

// Not the Songlist filter's NO_INSTRUMENT, despite the same label: that one finds songs
// without an instrument, this one adds them without one.
export const NO_INSTRUMENT_CHOICE = '__none__';

const instrumentOf = (choice: string | null) =>
  choice && choice !== NO_INSTRUMENT_CHOICE ? choice : undefined;

function isKnownChoice(value: string | null): value is string {
  return value === NO_INSTRUMENT_CHOICE || (value !== null && instrumentTypeOptions.includes(value));
}

function readRememberedChoice(): string | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return isKnownChoice(saved) ? saved : null;
  } catch {
    return null; // blocked storage: the user just chooses again
  }
}

/** What the bulk and collection confirmations say about the instrument. */
export function describeAddAsChoice(choice: string | null): string {
  const instrument = instrumentOf(choice);
  const added = instrument ? `Added as ${instrument}.` : 'Added with no instrument.';
  return `${added} Songs already in your songlist keep their instrument.`;
}

export interface AddAsInstrument {
  /** null until a choice is made. */
  choice: string | null;
  choose: (value: string) => void;
  /** An add was attempted with nothing chosen. */
  needsChoice: boolean;
  /**
   * Call before adding. Returns what to add with, or null when nothing is chosen: the caller
   * must then send nothing, and the selector is pointed out.
   */
  requireChoice: () => { instrument: string | undefined } | null;
  selectRef: React.RefObject<HTMLSelectElement | null>;
}

export function useAddAsInstrument(): AddAsInstrument {
  const [choice, setChoice] = useState<string | null>(readRememberedChoice);
  const [needsChoice, setNeedsChoice] = useState(false);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  const choose = (value: string) => {
    setChoice(value);
    setNeedsChoice(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // blocked storage: the choice still holds for this page
    }
  };

  const requireChoice = () => {
    if (choice === null) {
      setNeedsChoice(true);
      selectRef.current?.focus();
      return null;
    }
    return { instrument: instrumentOf(choice) };
  };

  return { choice, choose, needsChoice, requireChoice, selectRef };
}
