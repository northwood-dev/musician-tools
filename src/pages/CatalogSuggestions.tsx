import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { catalogService, SuggestionDifferencesError, SuggestionGoneError, SuggestionInCatalogError, SuggestionNotPublishedError } from '../services/catalogService';
import type { CatalogSuggestionLine, MergeDecisions } from '../services/catalogService';
import { ListSkeleton } from '../components/ListSkeleton';
import { LoadFailed } from '../components/LoadFailed';
import { Page } from '../components/Page';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LiveNotice } from '../components/LiveNotice';
import { Tag } from '../components/Chip';
import { MergeSuggestionDialog } from '../components/MergeSuggestionDialog';
import { SongName } from '../components/SongName';
import { songLabel } from '../utils/songLabel';

// #190 / #212: the curators' queue of songs typed into Songlists and suggested to the Catalog.
// One line per song (identical songs from several users grouped), shown with the latest
// suggestion's Catalog fields. Who suggested it is never shown — only how many users.
const details = (song: CatalogSuggestionLine['song']) =>
  [song.key && `${song.key}${song.mode ? ` ${song.mode.toLowerCase()}` : ''}`, song.bpm && `${song.bpm} BPM`, song.timeSignature]
    .filter(Boolean)
    .join(' · ');

// #230: the song name opens what Review opens (a draft, created if needed), or the published
// entry once the song is in the Catalog — to check it before Merge.
const SONG_LINK = 'block hover:underline disabled:cursor-not-allowed';

// #234 review: Merge refused because the group changed under the curator.
const GROUP_CHANGED = 'The suggestions changed: review them again.';

// The entry form for a line's draft; the suggestion id links the songs when it is published.
const draftPath = (line: CatalogSuggestionLine, catalogUid = line.catalog?.uid) =>
  `/catalog/admin/${catalogUid}?suggestion=${line.id}`;

export default function CatalogSuggestions() {
  const { user } = useAuth();
  const isCurator = !!user?.isCurator;
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<CatalogSuggestionLine[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [toReject, setToReject] = useState<CatalogSuggestionLine | null>(null);
  const [toMerge, setToMerge] = useState<CatalogSuggestionLine | null>(null);
  const [mergeNotice, setMergeNotice] = useState<string | null>(null);
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
      if (err instanceof SuggestionDifferencesError && err.differences.length > 0 && line.catalog) {
        // The group changed under the curator: decide again, on the values as they are now.
        setToMerge({ ...line, catalog: { ...line.catalog, differences: err.differences } });
        setMergeNotice(GROUP_CHANGED);
      } else {
        setError(
          err instanceof SuggestionInCatalogError ? 'This song is already in the Catalog.'
            : err instanceof SuggestionGoneError ? 'This suggestion is no longer waiting.'
              : err instanceof SuggestionNotPublishedError ? 'The Catalog entry is no longer published.'
                : err instanceof SuggestionDifferencesError ? GROUP_CHANGED
                  : `Could not ${verb} "${songLabel(line.song)}".`
        );
      }
    }
    await load();
    setBusy(false);
  };

  // #215 / #230 (Review): a pre-filled Catalog draft, opened in the entry form with this line:
  // publishing it there links the suggesters' songs. Nothing is published before that.
  const handleReview = (line: CatalogSuggestionLine) => runAction('review', line, async () => {
    const { catalogUid } = await catalogService.acceptSuggestion(line.id);
    navigate(draftPath(line, catalogUid));
    return null;
  });

  // #214 / #236: the song is already published in the Catalog — Merge ties the line's songs to
  // that entry. Values that differ are decided first, in the Merge dialog (#237).
  const merge = (line: CatalogSuggestionLine, decisions?: MergeDecisions) => runAction('merge', line, async () => {
    const { linked } = await catalogService.mergeSuggestion(line.id, decisions);
    return `"${songLabel(line.song)}" merged into the Catalog entry (${linked} ${linked === 1 ? 'song' : 'songs'}).`;
  });
  const handleMerge = (line: CatalogSuggestionLine) => {
    setMergeNotice(null);
    if (line.catalog?.differences?.length) setToMerge(line);
    else merge(line);
  };
  const closeMerge = () => {
    setToMerge(null);
    setMergeNotice(null);
  };
  const handleMergeDecided = async (decisions: MergeDecisions) => {
    if (!toMerge) return;
    const decided = toMerge;
    setMergeNotice(null);
    await merge(decided, decisions);
    // Closed once done — unless the group changed and the dialog was shown again (a new line).
    setToMerge(current => (current === decided ? null : current));
  };

  // #213: the line's songs leave the queue for good; their owners aren't told.
  const handleReject = async () => {
    if (!toReject) return;
    const line = toReject;
    await runAction('reject', line, async () => {
      await catalogService.rejectSuggestion(line.id);
      return `"${songLabel(line.song)}" rejected.`;
    });
    setToReject(null);
  };

  return (
    <Page
      width="wide"
      title="Suggestions"
      description="Songs typed into a Songlist and suggested to the Catalog by their owners. Identical songs are grouped; who suggested them is never shown. Review opens a draft you can correct: nothing is published until you click Publish. Merge combines a suggestion with the Catalog entry that already exists: you accept or reject each different value, then the suggesters' songs are tied to that entry."
    >
      <LiveNotice tone="error" className="mb-4">{error}</LiveNotice>
      <LiveNotice tone="success" className="mb-4">{doneMessage}</LiveNotice>
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
                <th scope="col" className="px-3 py-2 font-medium">Key · BPM · Time</th>
                <th scope="col" className="px-3 py-2 font-medium">Suggested by</th>
                <th scope="col" className="px-3 py-2 font-medium">Status</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map(line => (
                <tr key={line.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-3 py-2">
                    {line.catalog ? (
                      <Link
                        to={line.catalog.published ? `/catalog/${line.catalog.uid}` : draftPath(line)}
                        className={SONG_LINK}
                        aria-label={`Open ${songLabel(line.song)}`}
                      >
                        <SongName song={line.song} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={`text-left ${SONG_LINK}`}
                        aria-label={`Open ${songLabel(line.song)}`}
                        onClick={() => handleReview(line)}
                        disabled={busy}
                      >
                        <SongName song={line.song} />
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{details(line.song)}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {line.suggestedBy} {line.suggestedBy === 1 ? 'user' : 'users'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-300">
                    {!line.catalog && <Tag>New</Tag>}
                    {line.catalog?.published && <Tag>Already in the Catalog</Tag>}
                    {!!line.catalog?.differences?.length && <> <Tag>Differs from the Catalog</Tag></>}
                    {line.catalog && !line.catalog.published && <Tag>Draft in progress</Tag>}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap space-x-2">
                    {!line.catalog && (
                      <button
                        type="button"
                        className="btn-primary btn-sm min-h-[44px]"
                        aria-label={`Review ${songLabel(line.song)}`}
                        onClick={() => handleReview(line)}
                        disabled={busy}
                      >
                        Review
                      </button>
                    )}
                    {line.catalog && !line.catalog.published && (
                      <Link
                        to={draftPath(line)}
                        className="btn-primary btn-sm min-h-[44px]"
                        aria-label={`Review ${songLabel(line.song)}`}
                      >
                        Review
                      </Link>
                    )}
                    {line.catalog?.published && (
                      <button
                        type="button"
                        className="btn-primary btn-sm min-h-[44px]"
                        aria-label={`Merge ${songLabel(line.song)} into the Catalog entry`}
                        onClick={() => handleMerge(line)}
                        disabled={busy}
                      >
                        Merge
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-secondary btn-sm min-h-[44px]"
                      aria-label={`Reject ${songLabel(line.song)}`}
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
      <MergeSuggestionDialog
        line={toMerge}
        notice={mergeNotice}
        busy={busy}
        onCancel={closeMerge}
        onMerge={handleMergeDecided}
      />
      <ConfirmDialog
        isOpen={toReject !== null}
        title="Reject this suggestion"
        message={toReject ? `Reject "${songLabel(toReject.song)}"? It leaves the queue. The users who suggested it aren't told, and their songs don't change.` : ''}
        confirmText={busy ? 'Rejecting…' : 'Reject'}
        cancelText="Cancel"
        isDangerous
        onConfirm={handleReject}
        onCancel={() => { if (!busy) setToReject(null); }}
      />
    </Page>
  );
}
