import { listOf } from './listOf';

// A song's instruments as a list (#97), by the listOf rule. Mirrors the backend `instrumentsOf`.
export function instrumentsOf(song: { instrument?: string[] | string | null }): string[] {
  return listOf(song.instrument);
}
