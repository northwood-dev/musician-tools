import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogService, type CatalogSong } from '../services/catalogService';
import type { Song } from '../services/songService';
import { useAddAsInstrument } from '../hooks/useAddAsInstrument';
import AddAsInstrumentSelect from './AddAsInstrumentSelect';
import CatalogAddButton from './CatalogAddButton';

// #184 / #191: when a Songlist search finds nothing, the Catalog is searched with the same
// text (never the Songlist's filters) and up to 5 entries can be added in place. The page
// puts an added song into its list, which then replaces this block (it matches the search).
export const SUGGESTION_LIMIT = 5;
const DEBOUNCE_MS = 300;

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'done'; items: CatalogSong[]; total: number };

export default function SonglistCatalogSuggestions({
  search,
  findExisting,
  onAdded,
  preferredInstrument,
}: {
  search: string;
  findExisting: (entry: { title: string; artist?: string | null }) => Song | null;
  onAdded: (song: Song) => void;
  preferredInstrument?: string;
}) {
  const headingId = useId();
  const addAs = useAddAsInstrument(preferredInstrument);
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    const timer = setTimeout(() => {
      catalogService.listCatalog({ search, limit: SUGGESTION_LIMIT }, controller.signal)
        .then(res => { if (!controller.signal.aborted) setState({ status: 'done', items: res.items, total: res.total }); })
        .catch(() => { if (!controller.signal.aborted) setState({ status: 'error' }); });
    }, DEBOUNCE_MS);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search]);

  return (
    <section aria-labelledby={headingId} className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 text-left">
      <h2 id={headingId} className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">From the Catalog</h2>
      {/* One live region, mounted with the block: only its text changes, so screen readers
          announce it reliably (the Toast's rule). The page's toast announces an add. */}
      <p aria-live="polite" className={`text-sm text-gray-600 dark:text-gray-300 ${state.status === 'done' && state.items.length > 0 ? 'sr-only' : ''}`}>
        {state.status === 'loading' && 'Searching the Catalog…'}
        {state.status === 'error' && "Couldn't search the Catalog right now."}
        {state.status === 'done' && (state.items.length === 0
          ? 'Nothing in the Catalog either.'
          : `${state.total} found in the Catalog.`)}
      </p>
      {state.status === 'done' && state.items.length > 0 && (
        <>
          <AddAsInstrumentSelect addAs={addAs} className="mb-3" />
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {state.items.map(entry => (
              <li key={entry.uid} className="flex flex-col sm:flex-row sm:items-center gap-2 py-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{entry.title}</div>
                  {entry.artist && <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{entry.artist}</div>}
                </div>
                <CatalogAddButton entry={entry} existingSong={findExisting(entry)} addAs={addAs} onAdded={onAdded} />
              </li>
            ))}
          </ul>
          {state.total > state.items.length && (
            <Link to={`/catalog?search=${encodeURIComponent(search)}`} className="btn-link mt-2 inline-block">
              See all {state.total} in the Catalog
            </Link>
          )}
        </>
      )}
    </section>
  );
}
