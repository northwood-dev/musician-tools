import { useEffect, useRef, useState } from 'react';
import { useAutosave } from './useAutosave';
import { useGlobalToast } from '../contexts/GlobalToastContext';

// Inline row editing for My instruments and My topics (#30): what is typed in the open row
// is kept unless the user presses Cancel. Built on useAutosave in save-on-exit mode: the
// debounce is never armed, so nothing is sent while typing. The row saves when it closes
// (Save, opening another row) and when the page unmounts.
export interface UseInlineRowSaveOptions<TForm extends { name: string }> {
  initialForm: TForm;
  // The real network call. The page owns the payload shape and its list reconciliation.
  save: (uid: string, form: TForm) => Promise<void>;
  setError: (message: string | null) => void;
  // The message for the page's error banner.
  errorMessage: (err: unknown) => string;
  // The banner is gone once the user has left, so that failure goes to a global toast.
  leftPageErrorMessage: string;
}

export function useInlineRowSave<TForm extends { name: string }>(opts: UseInlineRowSaveOptions<TForm>) {
  const { initialForm, save, setError, errorMessage, leftPageErrorMessage } = opts;
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
      if (mountedRef.current) setError(errorMessage(err));
      else showGlobalToast(leftPageErrorMessage);
      return 'error';
    },
  });

  // Saves the open row before it closes. Returns false when the row must stay open.
  const saveOpenRow = async (): Promise<boolean> => {
    if (!form.name.trim()) {
      setError('Name is required');
      return false;
    }
    setError(null);
    return flush();
  };

  const openRow = async (uid: string, rowForm: TForm) => {
    if (editingUid !== null && !(await saveOpenRow())) return;
    setEditingUid(uid);
    setForm(rowForm);
    setBaseline(JSON.stringify(rowForm));
  };

  const saveAndClose = async () => {
    if (await saveOpenRow()) setEditingUid(null);
  };

  const cancel = () => setEditingUid(null);

  const setField = <K extends keyof TForm>(field: K, value: TForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return { editingUid, form, setField, savingRow, openRow, saveAndClose, cancel };
}
