import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { catalogService, SuggestionGoneError } from '../services/catalogService';
import type { CatalogSuggestionLine } from '../services/catalogService';
import { ListSkeleton } from '../components/ListSkeleton';
import { Page } from '../components/Page';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Notice } from '../components/Notice';

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
  const [toReject, setToReject] = useState<CatalogSuggestionLine | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

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

  // #214: the song is already published in the Catalog — link the line's songs to that entry.
  const handleLink = async (target: CatalogSuggestionLine) => {
    if (busy) return;
    const { title } = target.song;
    setBusy(true);
    setError(null);
    setDoneMessage(null);
    try {
      const { linked } = await catalogService.linkSuggestion(target.id);
      setDoneMessage(`"${title}" linked to the Catalog entry (${linked} ${linked === 1 ? 'song' : 'songs'}).`);
      await load();
    } catch (err) {
      if (err instanceof SuggestionGoneError) {
        setError('This suggestion is no longer waiting.');
        await load();
      } else {
        setError(`Could not link "${title}".`);
      }
    } finally {
      setBusy(false);
    }
  };

  // #213: the line's songs leave the queue for good; their owners aren't told.
  const handleReject = async () => {
    if (!toReject || busy) return;
    const { title } = toReject.song;
    setBusy(true);
    setError(null);
    setDoneMessage(null);
    try {
      await catalogService.rejectSuggestion(toReject.id);
      setDoneMessage(`"${title}" rejected.`);
      await load();
    } catch (err) {
      if (err instanceof SuggestionGoneError) {
        setError('This suggestion is no longer waiting.');
        await load(); // show what is really waiting
      } else {
        setError(`Could not reject "${title}".`);
      }
    } finally {
      setBusy(false);
      setToReject(null);
    }
  };

  return (
    <Page
      width="content"
      title="Suggestions"
      description="Songs typed into a Songlist and suggested to the Catalog by their owners. Identical songs are grouped; who suggested them is never shown."
    >
      {/* Always mounted: a region that appears with its message may not be announced (#153). */}
      <div role="alert">{error && <Notice tone="error" announce="none" className="mb-4">{error}</Notice>}</div>
      <div role="status">{doneMessage && <Notice tone="success" announce="none" className="mb-4">{doneMessage}</Notice>}</div>
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
                <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
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
                  <td className="px-3 py-2 text-right whitespace-nowrap space-x-2">
                    {line.catalog?.published && (
                      <button
                        type="button"
                        className="btn-primary btn-sm min-h-[44px]"
                        aria-label={`Link ${line.song.title} to the Catalog entry`}
                        onClick={() => handleLink(line)}
                        disabled={busy}
                      >
                        Link to it
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-secondary btn-sm min-h-[44px]"
                      aria-label={`Reject ${line.song.title}`}
                      onClick={() => setToReject(line)}
                      disabled={busy}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        isOpen={toReject !== null}
        title="Reject this suggestion"
        message={toReject ? `Reject "${toReject.song.title}"${toReject.song.artist ? ` by ${toReject.song.artist}` : ''}? It leaves the queue. The users who suggested it aren't told, and their songs don't change.` : ''}
        confirmText={busy ? 'Rejecting…' : 'Reject'}
        cancelText="Cancel"
        isDangerous
        onConfirm={handleReject}
        onCancel={() => { if (!busy) setToReject(null); }}
      />
    </Page>
  );
}
