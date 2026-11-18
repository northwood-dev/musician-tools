import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { catalogService } from '../services/catalogService';
import type { CatalogSuggestionLine } from '../services/catalogService';
import { ListSkeleton } from '../components/ListSkeleton';
import { Page } from '../components/Page';
import { EmptyState } from '../components/EmptyState';

// #190 / #212: the curators' queue of songs typed into Songlists and suggested to the Catalog.
// One line per song (identical songs from several users grouped), shown with the latest
// suggestion's Catalog fields. Who suggested it is never shown — only how many users.
const details = (song: CatalogSuggestionLine['song']) =>
  [song.key && `${song.key}${song.mode ? ` ${song.mode.toLowerCase()}` : ''}`, song.bpm && `${song.bpm} BPM`, song.timeSignature]
    .filter(Boolean)
    .join(' · ');

export default function CatalogSuggestions() {
  const { user } = useAuth();
  const isCurator = !!user?.isCurator;
  const [suggestions, setSuggestions] = useState<CatalogSuggestionLine[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      setSuggestions((await catalogService.getSuggestions()).suggestions);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    if (isCurator) load();
  }, [isCurator, load]);

  if (!isCurator) {
    return <Navigate to="/" replace />;
  }

  return (
    <Page
      width="content"
      title="Suggestions"
      description="Songs typed into a Songlist and suggested to the Catalog by their owners. Identical songs are grouped; who suggested them is never shown."
    >
      {loadFailed && (
        <div className="text-center py-10">
          <p className="text-gray-600 dark:text-gray-300">Something went wrong.</p>
          <button type="button" className="btn-secondary mt-3" onClick={load}>Retry</button>
        </div>
      )}
      {!loadFailed && suggestions === null && <ListSkeleton rows={6} />}
      {!loadFailed && suggestions?.length === 0 && (
        <EmptyState>No suggestions waiting.</EmptyState>
      )}
      {!loadFailed && suggestions !== null && suggestions.length > 0 && (
        <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th scope="col" className="px-3 py-2 font-medium">Title</th>
                <th scope="col" className="px-3 py-2 font-medium">Artist</th>
                <th scope="col" className="px-3 py-2 font-medium">Details</th>
                <th scope="col" className="px-3 py-2 font-medium">Suggested</th>
                <th scope="col" className="px-3 py-2 font-medium">Catalog</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map(line => (
                <tr key={line.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{line.song.title}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{line.song.artist}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{details(line.song)}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    suggested by {line.suggestedBy} {line.suggestedBy === 1 ? 'user' : 'users'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-300">
                    {line.catalog ? 'Already in the Catalog' : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
