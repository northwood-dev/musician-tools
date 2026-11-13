// A song's instruments as a list (#97). `instrument` is stored as a list, but older songs hold a
// single text and songs imported before #34 hold nothing. Mirrors the backend `instrumentsOf`.
export function instrumentsOf(song: { instrument?: string[] | string | null }): string[] {
  if (Array.isArray(song.instrument)) return song.instrument;
  return song.instrument ? [song.instrument] : [];
}
