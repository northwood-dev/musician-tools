// Merge rules for practice sessions (issue #5): a session is "one day, one
// instrument", so every path that could produce two sessions — or two entries
// for the same song/topic — folds them together with ONE definition, here.
// Callers: Mark as Played, session create/update, and the dedup migration.
//
// Pure: no database access. Callers load rows, call these, then persist the
// result (including re-attaching plays BEFORE deleting removed entries, since
// SongPlays cascade on SessionItem deletion).

// Two entries are "the same" when they point at the same song, or the same
// topic. Orphans (song/topic deleted, both refs null) match on the exact label.
function entryKey(entry) {
  if (entry.songUid) return `song:${entry.songUid}`;
  if (entry.topicUid) return `topic:${entry.topicUid}`;
  return `orphan:${entry.label}`;
}

// Sum of the integer minutes; a missing value counts as 0, but the result stays
// null when none of them carried minutes (an entry without duration is legit).
function sumMinutes(...values) {
  const known = values.filter(Number.isInteger);
  return known.length ? known.reduce((total, m) => total + m, 0) : null;
}

// Non-empty notes, trimmed, one per line, in the order given.
function joinNotes(...notes) {
  const kept = notes
    .filter((note) => typeof note === 'string')
    .map((note) => note.trim())
    .filter(Boolean);
  return kept.length ? kept.join('\n') : null;
}

// Folds entries given in chronological order. Each group of same-key entries
// becomes one entry at the position of its first occurrence. The survivor keeps
// the uid of the first EXISTING row of the group (null = all new, to create);
// every other existing row is removed and its plays re-attached to the survivor.
function mergeEntries(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = entryKey(entry);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  const merged = [];
  const removedUids = [];
  const playRemap = {};
  for (const group of groups.values()) {
    const [first] = group;
    const survivorUid = group.find((entry) => entry.uid)?.uid ?? null;
    for (const entry of group) {
      if (entry.uid && entry.uid !== survivorUid) {
        removedUids.push(entry.uid);
        playRemap[entry.uid] = survivorUid;
      }
    }
    merged.push({
      uid: survivorUid,
      songUid: first.songUid ?? null,
      topicUid: first.topicUid ?? null,
      label: first.label,
      minutes: sumMinutes(...group.map((entry) => entry.minutes)),
      note: joinNotes(...group.map((entry) => entry.note)),
      position: merged.length,
    });
  }
  return { entries: merged, removedUids, playRemap };
}

const byCreation = (a, b) =>
  new Date(a.createdAt) - new Date(b.createdAt) || String(a.uid).localeCompare(String(b.uid));
const byPosition = (a, b) =>
  (a.position ?? 0) - (b.position ?? 0) || String(a.uid).localeCompare(String(b.uid));

// Folds several sessions of the same day and instrument into one: notes joined
// oldest session first, entries ordered oldest session first then by position.
// Which session row survives is the caller's call; this only computes content.
function mergeSessions(sessions) {
  const ordered = [...sessions].sort(byCreation);
  const entries = ordered.flatMap((session) => [...(session.items || [])].sort(byPosition));
  return {
    note: joinNotes(...ordered.map((session) => session.note)),
    ...mergeEntries(entries),
  };
}

module.exports = { entryKey, sumMinutes, joinNotes, mergeEntries, mergeSessions };
