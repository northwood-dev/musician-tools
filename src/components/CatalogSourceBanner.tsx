import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { songService, RefreshFromCatalogError } from '../services/songService';
import type { Song } from '../services/songService';
import { ConfirmDialog } from './ConfirmDialog';
import { Notice } from './Notice';

// Story 21.2: on a Song fiche, surface the Catalog source (provenance + link) and offer a
// Refresh when the source has drifted. Self-contained (own getSong fetch) so the ~2000-line
// Songs.tsx doesn't grow fetch/state — dropped in with one element. Renders NOTHING when the
// song isn't a Catalog copy or its source is gone/unpublished (getSong omits `sourceCatalog`).

export default function CatalogSourceBanner({
  songUid,
  onRefreshed,
  beforeRefresh,
}: {
  songUid: string;
  onRefreshed?: (song: Song) => void;
  // Run right before the refresh POST — the fiche uses it to flush a pending autosave so the
  // server refresh doesn't run on a stale row. Returns false to CANCEL the refresh (a save that
  // was needed failed → refreshing would drop the unsaved edits). Resolves true when clear.
  beforeRefresh?: () => Promise<boolean>;
}) {
  const [source, setSource] = useState<Song['sourceCatalog'] | null>(null);
  // #214: linked through a suggestion its owner made (the song IS in the Catalog), as opposed
  // to added from it — songs added from the Catalog are never `suggested`.
  const [viaSuggestion, setViaSuggestion] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  // A refresh POST can outlive this banner: the parent keys us by songUid, so switching songs
  // unmounts this instance while the request is still in flight. Guard the post-await setState /
  // onRefreshed so a resolved refresh never contaminates the next song's fiche.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true; // reset on (re)mount — StrictMode runs cleanup then setup again
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch the source-link/drift info for this song (StrictMode-safe, abortable).
  useEffect(() => {
    const ctrl = new AbortController();
    setFeedback(null);
    songService.getSong(songUid)
      .then(song => {
        if (ctrl.signal.aborted) return;
        setSource(song.sourceCatalog ?? null);
        setViaSuggestion(song.catalogSuggestion === 'suggested');
      })
      .catch(err => { if (!ctrl.signal.aborted) console.error('CatalogSourceBanner: failed to load song source', err); }); // degrade: no banner
    return () => ctrl.abort();
  }, [songUid]);

  // Nothing to show unless there's a source link/banner OR a lingering feedback message
  // (e.g. an error after the source vanished).
  if (!source && !feedback) return null;

  // #235: keep the user's own values. Nothing in the fiche changes (no re-seed): the song is
  // only stamped as up to date with the entry, so the banner goes until the entry changes.
  const handleKeepMine = async () => {
    if (refreshing || !source) return;
    setRefreshing(true);
    try {
      await songService.keepSongValues(songUid);
      if (!mountedRef.current) return;
      setSource({ ...source, drift: false });
      setFeedback({ message: 'Kept your values.', isError: false });
    } catch {
      if (!mountedRef.current) return;
      setFeedback({ message: 'Could not keep your values. Try again.', isError: true });
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing || !source) return;
    setRefreshing(true);
    try {
      // Persist any pending fiche edits first, so the server refresh reads the current row and
      // preserves them. A failed save cancels the refresh rather than dropping the edits.
      if (beforeRefresh) {
        const clear = await beforeRefresh();
        if (!mountedRef.current) return;
        if (!clear) {
          setFeedback({ message: 'Could not save your changes — refresh cancelled.', isError: true });
          setConfirmOpen(false);
          return;
        }
      }
      const updated = await songService.refreshSongFromCatalog(songUid);
      if (!mountedRef.current) return; // banner unmounted mid-request → don't touch the next song
      setSource(updated.sourceCatalog ?? { ...source, drift: false }); // drift cleared
      setFeedback({ message: 'Updated to the Catalog version.', isError: false });
      setConfirmOpen(false);
      onRefreshed?.(updated);
    } catch (err) {
      if (!mountedRef.current) return;
      // Both 409 codes mean the link is dead: source unpublished/deleted, or the song is no
      // longer a Catalog copy. Clear the source either way so the user can't re-hit a dead-end.
      if (err instanceof RefreshFromCatalogError) {
        setSource(null);
        setFeedback({
          message: err.code === 'source_unavailable'
            ? 'The source is no longer in the Catalog.'
            : 'This song is no longer linked to the Catalog.',
          isError: true,
        });
      } else {
        setFeedback({ message: 'Could not refresh from the Catalog.', isError: true });
      }
      setConfirmOpen(false);
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  };

  return (
    <div className="mb-4 space-y-2">
      {/* Provenance (Niveau 1) */}
      {source && (
        <p className="flex flex-wrap items-center gap-x-1 text-sm text-gray-500 dark:text-gray-400">
          <span aria-hidden="true">↳</span>{viaSuggestion ? 'In the' : 'Added from the'}
          <Link
            to={`/catalog/${source.uid}`}
            className="inline-flex min-h-[44px] items-center text-brand-600 dark:text-brand-400 hover:underline"
          >
            Catalog
          </Link>
        </p>
      )}

      {/* Drift banner + Refresh */}
      {source?.drift && (
        <Notice
          tone="warning"
          announce="none"
          action={(
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm min-h-[44px]"
                onClick={() => setConfirmOpen(true)}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm min-h-[44px]"
                onClick={handleKeepMine}
                disabled={refreshing}
              >
                Keep mine
              </button>
            </div>
          )}
        >
          The Catalog has different values for this song.
        </Notice>
      )}

      {feedback && (
        <Notice key={feedback.isError ? 'error' : 'success'} tone={feedback.isError ? 'error' : 'success'}>
          {feedback.message}
        </Notice>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Refresh from the Catalog"
        message="Update key, BPM, etc. to the Catalog version? Your instrument, tuning, notes and your own links are kept."
        confirmText={refreshing ? 'Refreshing…' : 'Refresh'}
        cancelText="Cancel"
        onConfirm={handleRefresh}
        onCancel={() => { if (!refreshing) setConfirmOpen(false); }}
      />
    </div>
  );
}
