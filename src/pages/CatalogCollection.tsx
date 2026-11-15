import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { catalogService, CollectionNotFoundError } from '../services/catalogService';
import type { CatalogCollectionDetail } from '../services/catalogService';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DetailPageSkeleton } from '../components/ListSkeleton';
import { BulkActionBar } from '../components/BulkActionBar';
import { RowSelectionCheckbox, SelectAllCheckbox } from '../components/SelectionCheckbox';
import { selectionCell } from '../utils/selectionCell';
import { useRowSelection } from '../hooks/useRowSelection';
import { useBulkAddToSonglist, describeAddRecap, isAddRecapNegative } from '../hooks/useBulkAddToSonglist';
import { BulkRecap } from '../components/BulkRecap';
import { CATALOG_ENTRY_GONE_MESSAGE } from '../constants/catalogMessages';
import AddAsInstrumentSelect from '../components/AddAsInstrumentSelect';
import { useAddAsInstrument, describeAddAsChoice } from '../hooks/useAddAsInstrument';
import { Notice } from '../components/Notice';
import { Page } from '../components/Page';

// Story 20.4: user-facing detail of a curated Collection. Shows its members and lets
// the user import the WHOLE collection into their Songlist in one action (a mirror
// Playlist is created/reused server-side, story 20.3). Non-curators see published
// members only (backend draft-safety, 20.1). A deep-link to a removed collection shows
// a calm not-found. Mirrors CatalogEntry's shape.

export default function CatalogCollection() {
  const { uid } = useParams();
  const [collection, setCollection] = useState<CatalogCollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  const addAs = useAddAsInstrument();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  // Persistent inline result banner (not a transient toast — the import recap must stay
  // visible until the user acts/navigates).
  const [result, setResult] = useState<{ message: string; isError: boolean } | null>(null);

  // Story 22.4: pick a subset instead of taking the whole collection. Not paginated →
  // select-all REPLACES. No duplicate-flag matcher on this page (epic 22, decision B):
  // the 409 stays the server's answer, and this view has no per-row Add to reflect it.
  const selection = useRowSelection();
  const bulkAdd = useBulkAddToSonglist();
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);
  // Entries found to be gone by a bulk add (#32). Transient: this page has no reload of its
  // own, so they last as long as it does, and opening it again asks the server.
  const [goneUids, setGoneUids] = useState<Set<string>>(new Set());
  const selectableUids = (collection?.songs ?? []).map(s => s.uid).filter(u => !goneUids.has(u));

  // Only one feedback banner at a time: the whole-collection recap and the subset recap
  // describe different actions and must not stack (three live regions already compete
  // on these pages).
  const userToggle = (u: string) => { bulkAdd.setRecap(null); selection.toggle(u); };
  const userSelectAll = (uids: string[]) => {
    bulkAdd.setRecap(null);
    if (selection.anyDisplayedSelected(uids)) selection.clear();
    else selection.selectOnly(uids);
  };

  const handleAddSelected = async () => {
    // `importing` too: the mutual exclusion must hold in BOTH handlers, not only in the
    // buttons — a dialog opened before the other action started stays live (lesson 22.3).
    if (importing) return;
    const chosen = addAs.requireChoice();
    if (!chosen) return;
    setResult(null); // the whole-collection banner is about another action
    const res = await bulkAdd.run(Array.from(selection.selected), chosen.instrument);
    if (!res) return;
    selection.removeMany(res.settledUids);
    setGoneUids(prev => new Set([...prev, ...res.goneUids]));
    setConfirmAddOpen(false);
  };

  useEffect(() => {
    if (!uid) return;
    const ctrl = new AbortController();
    setLoading(true);
    setNotFound(false);
    setError(false);
    catalogService.getCollection(uid, ctrl.signal)
      .then(c => { setCollection(c); setLoading(false); })
      .catch(err => {
        if (err?.name === 'AbortError') return;
        if (err instanceof CollectionNotFoundError) setNotFound(true);
        else setError(true);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [uid]);

  const handleImport = async () => {
    if (!collection || importing || bulkAdd.running) return;
    const chosen = addAs.requireChoice();
    if (!chosen) return;
    bulkAdd.setRecap(null); // this banner replaces the subset recap
    setImporting(true);
    try {
      const recap = await catalogService.importCollection(collection.uid, chosen.instrument);
      // Build the recap from segments so an all-skipped re-import reads clearly
      // ("3 already in your songlist") instead of a confusing "Added 0 · …".
      const parts: string[] = [];
      if (recap.added) parts.push(`Added ${recap.added} song${recap.added > 1 ? 's' : ''}`);
      if (recap.skipped) parts.push(`${recap.skipped} already in your songlist`);
      if (recap.failed) parts.push(`${recap.failed} failed`);
      setResult({ message: parts.length ? parts.join(' · ') : 'Nothing to import.', isError: false });
      setConfirmOpen(false);
    } catch (err) {
      setResult({
        message: err instanceof CollectionNotFoundError
          ? 'This collection no longer exists.'
          : 'Could not import the collection.',
        isError: true,
      });
      setConfirmOpen(false);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <DetailPageSkeleton />
    );
  }

  if (notFound || error || !collection) {
    return (
      <Page width="content" title={notFound ? 'Collection not found' : 'Something went wrong'}>
        <p className="text-gray-600 dark:text-gray-300">
          {notFound ? 'This collection no longer exists.' : 'The collection could not be loaded. Please try again in a moment.'}
        </p>
        <Link to="/catalog" className="btn-secondary">Browse the Catalog</Link>
      </Page>
    );
  }

  const count = collection.songs.length;

  return (
    // The wide page, like the other list screens: a song table squeezed into a reading
    // column does not read as "the Songlist display" (epic 22, #155).
    <Page
      width="wide"
      title={collection.name}
      description={(
        <>
          {collection.description && <span className="block">{collection.description}</span>}
          <span className="block">{count} {count === 1 ? 'song' : 'songs'}</span>
        </>
      )}
    >
      <div className="mb-3 space-y-3">
        <AddAsInstrumentSelect addAs={addAs} disabled={bulkAdd.running || importing} />
        <button
          type="button"
          className="btn-primary min-h-[44px]"
          onClick={() => { if (addAs.requireChoice()) setConfirmOpen(true); }}
          disabled={importing || count === 0 || bulkAdd.running || confirmAddOpen}
        >
          {importing ? 'Adding…' : 'Add collection to my songlist'}
        </button>
      </div>

      {/* Persistent inline result — stays visible after the import (not a fleeting toast). */}
      {result && (
        <Notice key={result.isError ? 'error' : 'success'} tone={result.isError ? 'error' : 'success'} className="mb-6">
          {!result.isError && <span aria-hidden="true">✓ </span>}
          {result.message}
        </Notice>
      )}

      <BulkActionBar count={selection.size} noun="song" nounPlural="songs" className="mb-4">
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => { if (addAs.requireChoice()) setConfirmAddOpen(true); }}
          disabled={bulkAdd.running || importing}
        >
          Add selected to my songlist
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => { bulkAdd.setRecap(null); selection.clear(); }}
          disabled={bulkAdd.running}
        >
          Clear selection
        </button>
      </BulkActionBar>

      {/* Sibling of the bar: a settled batch empties the selection and would take a
          recap living inside it down too. */}
      {bulkAdd.recap && (
        <BulkRecap
          key={isAddRecapNegative(bulkAdd.recap) ? 'recap-alert' : 'recap-status'}
          message={describeAddRecap(bulkAdd.recap)}
          negative={isAddRecapNegative(bulkAdd.recap)}
          onDismiss={() => bulkAdd.setRecap(null)}
          className="mb-4"
        />
      )}

      {count === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 py-6 text-center">This collection is empty.</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th scope="col" className={selectionCell('px-3 py-2 w-12 text-center')}>
                  <SelectAllCheckbox
                    allSelected={selection.allDisplayedSelected(selectableUids)}
                    someSelected={selection.someDisplayedSelected(selectableUids)}
                    onToggle={() => userSelectAll(selectableUids)}
                    disabled={bulkAdd.running}
                  />
                </th>
                <th scope="col" className="px-3 py-2 font-medium">Artist</th>
                <th scope="col" className="px-3 py-2 font-medium">Title</th>
                <th scope="col" className="px-3 py-2 font-medium">Key</th>
                <th scope="col" className="px-3 py-2 font-medium text-right">BPM</th>
              </tr>
            </thead>
            <tbody>
              {collection.songs.map(entry => (
                // No row click: this view has no per-song destination.
                <tr
                  key={entry.uid}
                  className={`border-t border-gray-100 dark:border-gray-700 ${selection.isSelected(entry.uid) ? 'bg-blue-50 dark:bg-blue-900/40' : ''}`}
                >
                  <td className={selectionCell('px-3 py-2 w-12 text-center')}>
                    <RowSelectionCheckbox
                      checked={selection.isSelected(entry.uid)}
                      onChange={() => userToggle(entry.uid)}
                      label={entry.artist ? `${entry.title} by ${entry.artist}` : entry.title}
                      disabled={bulkAdd.running || goneUids.has(entry.uid)}
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100 whitespace-nowrap">{entry.artist || '—'}</td>
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                    {entry.title}
                    {goneUids.has(entry.uid) && (
                      <span role="status" className="block text-xs font-normal text-gray-500 dark:text-gray-400">{CATALOG_ENTRY_GONE_MESSAGE}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{entry.key || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap text-right">{entry.bpm ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link to="/catalog" className="inline-block mt-8 text-sm text-brand-600 dark:text-brand-400 hover:underline">← Browse the Catalog</Link>

      <ConfirmDialog
        isOpen={confirmAddOpen}
        title={`Add ${selection.size} ${selection.size === 1 ? 'song' : 'songs'} to my songlist`}
        // Said out loud: the button right above DOES create a mirror playlist. A subset
        // does not (epic 22, decision B) — the two must not look interchangeable.
        message={`Add ${selection.size} selected ${selection.size === 1 ? 'song' : 'songs'} to your Songlist? No playlist is created — only "Add collection to my songlist" does that. ${describeAddAsChoice(addAs.choice)}`}
        confirmText={bulkAdd.running ? 'Adding…' : 'Add to my songlist'}
        cancelText="Cancel"
        onConfirm={handleAddSelected}
        onCancel={() => { if (!bulkAdd.running) setConfirmAddOpen(false); }}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Add collection to my songlist"
        message={`Add ${count} ${count === 1 ? 'song' : 'songs'} to your Songlist? A "${collection.name}" playlist will be created or reused. ${describeAddAsChoice(addAs.choice)}`}
        confirmText={importing ? 'Adding…' : 'Add to my songlist'}
        cancelText="Cancel"
        onConfirm={handleImport}
        onCancel={() => { if (!importing) setConfirmOpen(false); }}
      />

    </Page>
  );
}
