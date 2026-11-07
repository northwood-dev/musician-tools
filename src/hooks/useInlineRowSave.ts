import { useCallback, useEffect, useRef, useState } from 'react';
import { useAutosave } from './useAutosave';
import { useGlobalToast } from '../contexts/GlobalToastContext';

// Inline row editing for My instruments and My topics (#30): what is typed in the open row
// is kept unless the user presses Cancel. Built on useAutosave in save-on-exit mode: the
// debounce is never armed, so nothing is sent while typing. The row saves when it closes
// (Save, opening another row) and when the page unmounts.
export interface UseInlineRowSaveOptions<TForm> {
  initialForm: TForm;
  // The real network call. The page owns the payload shape and its list reconciliation.
  save: (uid: string, form: TForm) => Promise<void>;
  setError: (message: string | null) => void;
  // Why the row can't be saved yet, or null when it can. Checked only when the row closes
  // while the user stays on the page: leaving is never blocked.
  validationError: (form: TForm) => string | null;
  // Turns a failed save into the message for the page's error banner.
  toErrorMessage: (err: unknown) => string;
  // The banner is gone once the user has left, so that failure goes to a global toast.
  leftPageErrorMessage: string;
}

export function useInlineRowSave<TForm>(opts: UseInlineRowSaveOptions<TForm>) {
  const { initialForm, save, setError, validationError, toErrorMessage, leftPageErrorMessage } = opts;
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [form, setForm] = useState<TForm>(initialForm);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [savingRow, setSavingRow] = useState(false);
  const mountedRef = useRef(true);
  const { showGlobalToast } = useGlobalToast();

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const { flush } = useAutosave<TForm>({
    form,
    editingUid,
    baseline,
    deps: [],
    scheduleWhen: () => false,
    flushWhen: () => editingUid !== null,
    blockedStatus: () => null,
    setSaveStatus: status => setSavingRow(status === 'saving'),
    onCreate: async () => ({ finalize: false }), // a row always exists: nothing is created here
    onUpdate: async (uid, current, snapshot) => {
      await save(uid, current);
      setBaseline(snapshot);
    },
    onError: err => {
      if (mountedRef.current) setError(toErrorMessage(err));
      else showGlobalToast(leftPageErrorMessage);
      return 'error';
    },
  });

  // Saves the open row before it closes. Returns false when the row must stay open.
  const saveOpenRow = async (): Promise<boolean> => {
    const invalid = validationError(form);
    setError(invalid);
    return invalid === null && flush();
  };

  // Resolves true once the row is open. An already open row stays as it is: reloading it
  // would replace what was typed with the values from before the save.
  const openLatest = async (uid: string, rowForm: TForm): Promise<boolean> => {
    if (uid === editingUid) return true;
    if (editingUid !== null && !(await saveOpenRow())) return false;
    setEditingUid(uid);
    setForm(rowForm);
    setBaseline(JSON.stringify(rowForm));
    return true;
  };
  const openLatestRef = useRef(openLatest);
  openLatestRef.current = openLatest;
  // Stable, so an effect can depend on it, and always acts on the latest open row.
  const openRow = useCallback((uid: string, rowForm: TForm) => openLatestRef.current(uid, rowForm), []);

  const saveAndClose = async () => {
    if (await saveOpenRow()) setEditingUid(null);
  };

  const cancel = () => {
    setError(null);
    setEditingUid(null);
  };

  const setField = <K extends keyof TForm>(field: K, value: TForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return { editingUid, form, setField, savingRow, openRow, saveAndClose, cancel };
}
