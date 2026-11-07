import { useEffect, useRef, useState } from 'react';
// ...existing code...
// ...existing code...
import { instrumentService, type Instrument, type CreateInstrumentDTO, type UpdateInstrumentDTO } from '../services/instrumentService';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { instrumentTypeOptions } from '../constants/instrumentTypes';
import { useAutosave } from '../hooks/useAutosave';
import { useGlobalToast } from '../contexts/GlobalToastContext';

type InstrumentRowForm = { name: string; type: string; brand: string; model: string };

const rowFormOf = (item: Instrument): InstrumentRowForm => ({
  name: item.name,
  type: item.type || '',
  brand: item.brand || '',
  model: item.model || '',
});

function MyInstrumentsPage() {
  // const { logout } = useAuth();
  const [list, setList] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [deleteUid, setDeleteUid] = useState<string | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  // Separate from `loading`, which swaps the whole table for "Loading...": a row save
  // keeps the table on screen and only freezes the rows.
  const [savingRow, setSavingRow] = useState(false);
  const [editBaseline, setEditBaseline] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const { showGlobalToast } = useGlobalToast();

  // Save-on-exit only: the debounce is never armed, so nothing is sent while typing.
  const rowForm: InstrumentRowForm = { name: editName, type: editType, brand: editBrand, model: editModel };
  const { flush } = useAutosave<InstrumentRowForm>({
    form: rowForm,
    editingUid,
    baseline: editBaseline,
    deps: [],
    scheduleWhen: () => false,
    flushWhen: () => editingUid !== null,
    blockedStatus: () => null,
    setSaveStatus: status => setSavingRow(status === 'saving'),
    onCreate: async () => ({ finalize: false }), // a row always exists: this page never creates here
    onUpdate: async (uid, form, snapshot) => {
      const payload: UpdateInstrumentDTO = {
        name: form.name.trim() || undefined,
        // Always sent: an empty string tells the API to clear the field
        // (undefined would be dropped by JSON.stringify and leave it unchanged).
        type: form.type,
        brand: form.brand,
        model: form.model,
      };
      const updated = await instrumentService.update(uid, payload);
      setList(prev => prev.map(i => (i.uid === uid ? updated : i)));
      setEditBaseline(snapshot);
    },
    onError: () => {
      // After leaving the page its error banner is gone: only a global toast can still say so.
      if (mountedRef.current) setError('Failed to update instrument');
      else showGlobalToast('Your instrument changes could not be saved.');
      return 'error';
    },
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await instrumentService.getAll();
        setList(data);
      } catch {
        setError('Failed to load instruments');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setLoading(true);
      const payload: CreateInstrumentDTO = { name: name.trim(), type: type || undefined, brand: brand || undefined, model: model || undefined };
      const created = await instrumentService.create(payload);
      setList([created, ...list]);
      setName('');
      setType('');
      setBrand('');
      setModel('');
    } catch {
      setError('Failed to add instrument');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUid) return;
    try {
      setLoading(true);
      await instrumentService.remove(deleteUid);
      setList(list.filter(i => i.uid !== deleteUid));
      setDeleteUid(null);
    } catch {
      setError('Failed to delete instrument');
    } finally {
      setLoading(false);
    }
  };

  // Saves the open row before it closes. Returns false when the row must stay open.
  const saveOpenRow = async (): Promise<boolean> => {
    if (editingUid === null) return true;
    if (!editName.trim()) {
      setError('Name is required');
      return false;
    }
    setError(null);
    return flush();
  };

  const startEdit = async (item: Instrument) => {
    if (!(await saveOpenRow())) return;
    const form = rowFormOf(item);
    setEditingUid(item.uid);
    setEditName(form.name);
    setEditType(form.type);
    setEditBrand(form.brand);
    setEditModel(form.model);
    setEditBaseline(JSON.stringify(form));
  };

  const cancelEdit = () => {
    setEditingUid(null);
  };

  const saveEdit = async () => {
    if (await saveOpenRow()) setEditingUid(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-950 text-gray-900 dark:text-gray-100">
      <ConfirmDialog
        isOpen={!!deleteUid}
        title="Delete instrument"
        message="Are you sure you want to delete this instrument?"
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setDeleteUid(null)}
      />
      {error && (
        <div className="mx-4 my-4 card-base glass-effect text-red-700 bg-red-50/80 border border-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" className="btn-secondary text-xs" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="card-base glass-effect p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">My instruments</h2>
          </div>

          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="input-base text-sm"
              disabled={loading}
            >
              <option value="">Select type</option>
              {instrumentTypeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <input
              placeholder="Name (ex. 5 strings bass)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-base text-sm"
              disabled={loading}
            />
            <input
              placeholder="Brand (ex Fender)"
              value={brand}
              onChange={e => setBrand(e.target.value)}
              className="input-base text-sm"
              disabled={loading}
            />
            <input
              placeholder="Model (ex. Stratocaster)"
              value={model}
              onChange={e => setModel(e.target.value)}
              className="input-base text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              className="btn-primary justify-center"
              disabled={loading || !name.trim()}
            >
              Add
            </button>
            {/* Notes field removed */}
          </form>

          {loading ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">No instruments saved yet.</p>
          ) : (
            <div className="card-base overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm">
                    <tr>
                      <th className="text-left p-2 border-b dark:border-gray-700 uppercase text-xs font-semibold tracking-wide">Type</th>
                      <th className="text-left p-2 border-b dark:border-gray-700 uppercase text-xs font-semibold tracking-wide">Name</th>
                      <th className="text-left p-2 border-b dark:border-gray-700 uppercase text-xs font-semibold tracking-wide">Brand</th>
                      <th className="text-left p-2 border-b dark:border-gray-700 uppercase text-xs font-semibold tracking-wide">Model</th>
                      <th className="text-right p-2 border-b dark:border-gray-700 uppercase text-xs font-semibold tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(item => (
                      editingUid === item.uid ? (
                        <tr key={item.uid} className="bg-sky-50 dark:bg-sky-900/40 border border-sky-200 dark:border-sky-700/60">
                          <td className="p-2 align-top">
                            <select
                              value={editType}
                              onChange={e => setEditType(e.target.value)}
                              className="input-base text-sm"
                              disabled={loading || savingRow}
                            >
                              <option value="">Select type</option>
                              {instrumentTypeOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2 align-top">
                            <input
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="input-base text-sm"
                              disabled={loading || savingRow}
                            />
                          </td>
                          <td className="p-2 align-top">
                            <input
                              value={editBrand}
                              onChange={e => setEditBrand(e.target.value)}
                              className="input-base text-sm"
                              disabled={loading || savingRow}
                            />
                          </td>
                          <td className="p-2 align-top">
                            <input
                              value={editModel}
                              onChange={e => setEditModel(e.target.value)}
                              className="input-base text-sm"
                              disabled={loading || savingRow}
                            />
                          </td>
                          <td className="p-2 align-top text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="btn-secondary text-sm"
                                onClick={cancelEdit}
                                disabled={loading || savingRow}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="btn-primary text-sm"
                                onClick={saveEdit}
                                disabled={loading || savingRow || !editName.trim()}
                              >
                                Save
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={item.uid} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="p-2 align-middle">{item.type || '-'}</td>
                          <td className="p-2 align-middle">{item.name}</td>
                          <td className="p-2 align-middle">{item.brand || '-'}</td>
                          <td className="p-2 align-middle">{item.model || '-'}</td>
                          <td className="p-2 align-middle text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="btn-secondary text-sm"
                                onClick={() => startEdit(item)}
                                disabled={loading || savingRow}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center rounded-md bg-red-600 text-white px-3 py-1.5 hover:bg-red-700 disabled:opacity-50"
                                onClick={() => setDeleteUid(item.uid)}
                                disabled={loading || savingRow}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyInstrumentsPage;
