// #229: a song in a list or a table, the one way the app shows it: artist above, title below
// and emphasized (it's the song you look for). The rule is in CLAUDE.md; in a sentence, use
// songLabel(). Spans and not divs, so it fits inside a link or a button. `truncate` cuts each
// line with "…" in a narrow column (#232).
export function SongName({
  song,
  truncate = false,
  className = '',
}: {
  song: { title: string; artist?: string | null };
  truncate?: boolean;
  className?: string;
}) {
  const artist = (song.artist || '').trim();
  const line = truncate ? 'block truncate' : 'block';
  return (
    <span className={`block ${truncate ? 'min-w-0' : ''} ${className}`}>
      {artist && <span className={`${line} text-gray-600 dark:text-gray-300`}>{artist}</span>}
      <strong className={`${line} font-medium text-gray-900 dark:text-gray-100`}>{song.title}</strong>
    </span>
  );
}
