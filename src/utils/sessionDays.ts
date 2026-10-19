import { sumSessionMinutes, type PracticeSession } from '../services/practiceSessionService';

// The history reads "one day, then one block per instrument" (issue #5).
export interface SessionDay {
  date: string;
  totalMinutes: number;
  sessions: PracticeSession[];
}

// Instruments alphabetical so each one sits at the same place every day. The
// sort is stable: sessions sharing an instrument keep the order they came in.
export function sortByInstrument(sessions: readonly PracticeSession[]): PracticeSession[] {
  return [...sessions].sort((a, b) => a.instrumentType.localeCompare(b.instrumentType));
}

// Groups sessions by day, most recent day first. The DATEONLY strings compare
// as text: no Date parsing, which would shift the day in some timezones.
export function groupSessionsByDay(sessions: readonly PracticeSession[]): SessionDay[] {
  const byDate = new Map<string, PracticeSession[]>();
  for (const session of sessions) {
    byDate.set(session.date, [...(byDate.get(session.date) ?? []), session]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, daySessions]) => ({
      date,
      totalMinutes: daySessions.reduce((sum, session) => sum + sumSessionMinutes(session), 0),
      sessions: sortByInstrument(daySessions),
    }));
}
