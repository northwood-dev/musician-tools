// #242: a "Last played" value — "?" when the song's plays didn't load (unknown, not "-", which
// means never played), the formatted date otherwise. One look in the list and on a song's page.
export function LastPlayedValue({ unknown, value }: { unknown: boolean; value: string }) {
  if (unknown) return <span title="Couldn't load when this song was last played">?</span>;
  return <>{value}</>;
}
