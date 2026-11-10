// #56, #90: an empty playlist list can mean "none yet", "still loading" or "failed to load".
export type PlaylistsLoadStatus = 'loading' | 'failed' | 'loaded';

/**
 * What the song form's picker and the Songlist's bulk panel say while the playlists load or
 * after they failed, with the same words in both. Once loaded it says nothing: each place has
 * its own message for an empty list.
 */
export function PlaylistsLoadMessage({ status, onRetry }: { status: PlaylistsLoadStatus; onRetry: () => void }) {
  if (status === 'loading') return <>Loading playlists…</>;
  if (status === 'failed') {
    return (
      <>
        Couldn't load your playlists{' '}
        <button
          type="button"
          className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 underline"
          onClick={onRetry}
        >
          Retry
        </button>
      </>
    );
  }
  return null;
}
