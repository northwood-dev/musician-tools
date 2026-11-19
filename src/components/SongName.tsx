// #229: a song in a list or a table, the one way the app shows it: artist above, title below
// and emphasized (it's the song you look for). The rule is in CLAUDE.md; in a sentence, use
// songLabel(). Spans and not divs, so it fits inside a link or a button.
export function SongName({
  song,
  className = '',
}: {
  song: { title: string; artist?: string | null };
  className?: string;
}) {
  const artist = (song.artist || '').trim();
  return (
    <span className={`block ${className}`}>
      {artist && <span className="block text-gray-600 dark:text-gray-300">{artist}</span>}
      <strong className="block font-medium text-gray-900 dark:text-gray-100">{song.title}</strong>
    </span>
  );
}
