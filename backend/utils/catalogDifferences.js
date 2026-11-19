'use strict';

// #236: where a suggested group differs from the published Catalog entry it matches. Only for
// curators to decide (Merge); it never decides that two songs are the same song.
//
// The compared fields: the Catalog's intrinsic ones minus streaming links (fixed in the entry
// form, and a personal link never leaves a Songlist). Both sides are stored normalised on save,
// so stored values compare as they are; text is trimmed, an empty value is "nothing", and the
// list fields (language, genre) compare as sets — "Rock, Metal" is "Metal, Rock".
const COMPARED_FIELDS = [
  { field: 'key', column: 'key', kind: 'text' },
  { field: 'mode', column: 'mode', kind: 'text' },
  { field: 'bpm', column: 'bpm', kind: 'number' },
  { field: 'timeSignature', column: 'time_signature', kind: 'text' },
  { field: 'durationSeconds', column: 'duration_seconds', kind: 'number' },
  { field: 'language', column: 'language', kind: 'list' },
  { field: 'genre', column: 'genre', kind: 'list' },
  { field: 'pitchStandard', column: 'pitch_standard', kind: 'number' },
];

// A value as compared: null for nothing; a sorted list for a list field (an older row may hold a
// single text); the value itself otherwise.
function canonical(kind, value) {
  if (value == null) return null;
  if (kind === 'list') {
    const items = (Array.isArray(value) ? value : [value])
      .map(item => String(item).trim())
      .filter(Boolean);
    return items.length ? [...new Set(items)].sort() : null;
  }
  if (kind === 'text') {
    const text = String(value).trim();
    return text || null;
  }
  return value;
}

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// members: the group's songs, each as { key, mode, bpm, timeSignature, … } (field names).
// entry: the published entry, by field name. Returns one item per field where at least one
// member's non-empty value differs from the entry: the entry's value and every distinct
// non-empty suggested value with its user count, most users first.
function groupDifferences(members, entry) {
  const differences = [];
  for (const { field, kind } of COMPARED_FIELDS) {
    const catalog = canonical(kind, entry[field]);
    const counts = new Map();
    for (const member of members || []) {
      const value = canonical(kind, member[field]);
      if (value == null) continue;
      const id = JSON.stringify(value);
      const seen = counts.get(id);
      if (seen) seen.users += 1;
      else counts.set(id, { value, users: 1 });
    }
    const suggested = [...counts.values()];
    if (!suggested.some(s => !sameValue(s.value, catalog))) continue;
    suggested.sort((a, b) => b.users - a.users);
    differences.push({ field, catalog, suggested });
  }
  return differences;
}

// The same rule in SQL, for one song `s` against the entry `c`: are all its compared values
// equal to the entry's? Used when tying songs to an entry: only an equal song is stamped up to
// date (#236), any other shows its owner the "different values" banner. Here an empty value is
// a value — a song with no BPM differs from an entry that has one, and Refresh would fill it.
// A list held as a single text (older rows) is read as a one-item list; list items are compared
// as stored (both sides are normalised on save).
const asList = (col) => `(CASE WHEN ${col} IS NULL THEN '[]'::jsonb WHEN jsonb_typeof(${col}) = 'array' THEN ${col} ELSE jsonb_build_array(${col}) END)`;
function sameValuesSql(s, c) {
  return COMPARED_FIELDS.map(({ column, kind }) => {
    if (kind === 'text') return `NULLIF(btrim(${s}.${column}), '') IS NOT DISTINCT FROM NULLIF(btrim(${c}.${column}), '')`;
    if (kind === 'list') return `(${asList(`${s}.${column}`)} @> ${asList(`${c}.${column}`)} AND ${asList(`${c}.${column}`)} @> ${asList(`${s}.${column}`)})`;
    return `${s}.${column} IS NOT DISTINCT FROM ${c}.${column}`;
  }).join('\n       AND ');
}

module.exports = { COMPARED_FIELDS, groupDifferences, sameValuesSql };
