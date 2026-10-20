import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { sumSessionMinutes, type PracticeSession, type SessionItem } from '../services/practiceSessionService';
import type { SessionDay } from '../utils/sessionDays';
import { resolveEntry, type LiveNames } from '../utils/liveNames';

// One entry line of a session ("Artist - Title · played during N minutes · note").
// Shared so the Sessions page and the Heatmap day-detail render entries identically.
// A song entry links (the whole "Artist - Title") to its edit form, a topic entry to
// its row in My topics, opened for editing (#16); navigation is by uid, so two songs
// sharing a title still resolve to the right one. While the song or topic still
// exists the entry shows its live names, so a rename shows everywhere (#13, #16);
// its snapshot label is only a fallback while the songlist/topics are not loaded.
// An orphan entry (its song or topic was deleted, both refs nulled) keeps its
// snapshot label, greyed, with a "deleted" badge, unlinked. Deletion nulls both
// refs, so the entry can no longer tell a song from a topic: the tooltip stays
// neutral on purpose.
export function SessionEntryLine({ item, liveNames }: { item: SessionItem; liveNames: LiveNames }) {
  const { to, artist, name, isOrphan } = resolveEntry(item, liveNames);
  const label = (
    <>
      {artist ? <span>{artist} - </span> : null}
      <span className={isOrphan ? 'font-medium text-gray-400 dark:text-gray-500' : 'font-medium'}>{name}</span>
    </>
  );
  return (
    <li className="text-sm text-gray-700 dark:text-gray-300 pl-3 border-l-2 border-gray-200 dark:border-gray-700 break-words">
      {to ? (
        <Link
          to={to}
          className="hover:text-brand-600 dark:hover:text-brand-400 hover:underline"
        >
          {label}
        </Link>
      ) : (
        label
      )}
      {isOrphan ? (
        <span
          title="This item was deleted"
          className="ml-1.5 rounded px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
        >
          deleted
        </span>
      ) : null}
      {item.minutes ? (
        <span className="text-gray-500 dark:text-gray-400"> · played during {item.minutes} {item.minutes > 1 ? 'minutes' : 'minute'}</span>
      ) : null}
      {item.note ? <span className="text-gray-500 dark:text-gray-400 italic"> · {item.note}</span> : null}
    </li>
  );
}

export interface SessionHistoryCardProps {
  session: PracticeSession;
  liveNames: LiveNames;
  // The Sessions history shows the date; the Heatmap day-detail omits it (already grouped by day).
  showDate?: boolean;
  // Edit/Delete controls differ per page (inline button vs navigation Link), so the parent supplies them.
  actions?: ReactNode;
}

export interface SessionDayGroupProps {
  day: SessionDay;
  liveNames: LiveNames;
  renderActions?: (session: PracticeSession) => ReactNode;
}

// A day of the history: header (date · day total) + one block per instrument.
export function SessionDayGroup({ day, liveNames, renderActions }: SessionDayGroupProps) {
  return (
    <li className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-semibold">{day.date}</span>
        {day.totalMinutes > 0 ? (
          <span className="text-sm text-gray-600 dark:text-gray-400">· {day.totalMinutes} min</span>
        ) : null}
      </div>
      <ul aria-label={`Sessions of ${day.date}`} className="space-y-2">
        {day.sessions.map(session => (
          <SessionHistoryCard
            key={session.uid}
            session={session}
            liveNames={liveNames}
            showDate={false}
            actions={renderActions?.(session)}
          />
        ))}
      </ul>
    </li>
  );
}

// A single session card: header (date · instrument · total) + optional note + entries.
// Extracted from MySessionsPage and MyHeatmapPage, which had drifted out of sync.
export function SessionHistoryCard({ session, liveNames, showDate = true, actions }: SessionHistoryCardProps) {
  const totalMinutes = sumSessionMinutes(session);
  return (
    <li className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {/* The DATEONLY string is displayed verbatim: new Date('YYYY-MM-DD') would
            parse as UTC midnight and shift the day in some timezones */}
        {showDate && <span className="font-semibold">{session.date}</span>}
        <span className="text-sm text-gray-600 dark:text-gray-400">{session.instrumentType}</span>
        {totalMinutes > 0 ? (
          <span className="text-sm text-gray-600 dark:text-gray-400">· {totalMinutes} min</span>
        ) : null}
        {actions ? <div className="flex gap-2 ml-auto">{actions}</div> : null}
      </div>
      {session.note && (
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{session.note}</p>
      )}
      {session.items && session.items.length > 0 && (
        // pt-3 only when a note precedes: breathing room between the note and entries (northwood feedback)
        <ul className={`space-y-1${session.note ? ' pt-3' : ''}`}>
          {session.items.map(item => (
            <SessionEntryLine
              key={item.uid}
              item={item}
              liveNames={liveNames}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
