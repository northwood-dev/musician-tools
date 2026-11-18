import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { catalogService, SuggestionGoneError, SuggestionInCatalogError } from '../services/catalogService';
import type { CatalogSuggestionLine } from '../services/catalogService';
import { ListSkeleton } from '../components/ListSkeleton';
import { LoadFailed } from '../components/LoadFailed';
import { Page } from '../components/Page';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Notice } from '../components/Notice';
import { Tag } from '../components/Chip';

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
  const navigate = useNavigate();
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

  // The three actions share their bookkeeping: one at a time, the outcome announced, then the
  // queue reloaded — it may have changed under the curator (an owner opting out meanwhile).
  // `act` returns the success message, or null when it navigated away.
  const runAction = async (verb: string, line: CatalogSuggestionLine, act: () => Promise<string | null>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setDoneMessage(null);
    try {
      const done = await act();
      if (done === null) return; // left the page
      setDoneMessage(done);
    } catch (err) {
      setError(
        err instanceof SuggestionInCatalogError ? 'This song is already in the Catalog.'
          : err instanceof SuggestionGoneError ? 'This suggestion is no longer waiting.'
            : `Could not ${verb} "${line.song.title}".`
      );
    }
    await load();
    setBusy(false);
  };

  // #215: a pre-filled Catalog draft, opened in the entry form with this line: publishing it
  // there links the suggesters' songs.
  const handleAccept = (line: CatalogSuggestionLine) => runAction('accept', line, async () => {
    const { catalogUid } = await catalogService.acceptSuggestion(line.id);
    navigate(`/catalog/admin/${catalogUid}?suggestion=${line.id}`);
    return null;
  });

  // #214: the song is already published in the Catalog — link the line's songs to that entry.
  const handleLink = (line: CatalogSuggestionLine) => runAction('link', line, async () => {
    const { linked } = await catalogService.linkSuggestion(line.id);
    return `"${line.song.title}" linked to the Catalog entry (${linked} ${linked === 1 ? 'song' : 'songs'}).`;
  });

  // #213: the line's songs leave the queue for good; their owners aren't told.
  const handleReject = async () => {
    if (!toReject) return;
    const line = toReject;
    await runAction('reject', line, async () => {
      await catalogService.rejectSuggestion(line.id);
      return `"${line.song.title}" rejected.`;
    });
    setToReject(null);
  };

  return (
    <Page
      width="wide"
      title="Suggestions"
      description="Songs typed into a Songlist and suggested to the Catalog by their owners. Identical songs are grouped; who suggested them is never shown."
    >
      {/* Always mounted: a region that appears with its message may not be announced (#153). */}
      <div role="alert">{error && <Notice tone="error" announce="none" className="mb-4">{error}</Notice>}</div>
      <div role="status">{doneMessage && <Notice tone="success" announce="none" className="mb-4">{doneMessage}</Notice>}</div>
      <LoadFailed failed={loadFailed} onRetry={load}>Couldn't load the suggestions.</LoadFailed>
      {!loadFailed && suggestions === null && <ListSkeleton rows={6} />}
      {!loadFailed && suggestions?.length === 0 && (
        <EmptyState>No suggestions waiting.</EmptyState>
      )}
      {!loadFailed && suggestions !== null && suggestions.length > 0 && (
        <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th scope="col" className="px-3 py-2 font-medium">Song</th>
                <th scope="col" className="px-3 py-2 font-medium">Details</th>
                <th scope="col" className="px-3 py-2 font-medium">Suggested</th>
                <th scope="col" className="px-3 py-2 font-medium">Catalog</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map(line => (
                <tr key={line.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{line.song.title}</div>
                    <div className="text-gray-600 dark:text-gray-300">{line.song.artist}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{details(line.song)}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    suggested by {line.suggestedBy} {line.suggestedBy === 1 ? 'user' : 'users'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-300">
                    {line.catalog?.published && <Tag>Already in the Catalog</Tag>}
                    {line.catalog && !line.catalog.published && (
                      <>
                        <Tag>Draft in progress</Tag>{' '}
                        <Link
                          to={`/catalog/admin/${line.catalog.uid}?suggestion=${line.id}`}
                          className="text-brand-600 dark:text-brand-400 hover:underline"
                          aria-label={`Open the draft of ${line.song.title}`}
                        >
                          Open
                        </Link>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap space-x-2">
                    {!line.catalog && (
                      <button
                        type="button"
                        className="btn-primary btn-sm min-h-[44px]"
                        aria-label={`Accept ${line.song.title}`}
                        onClick={() => handleAccept(line)}
                        disabled={busy}
                      >
                        Accept
                      </button>
                    )}
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
