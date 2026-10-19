const { entryKey, sumMinutes, joinNotes, mergeEntries, mergeSessions } = require('../utils/sessionMerge');

const song = (uid, extra = {}) => ({ songUid: 'song-a', topicUid: null, label: 'Autumn Leaves', uid, ...extra });
const topic = (uid, extra = {}) => ({ songUid: null, topicUid: 'topic-f', label: 'Learn the fretboard', uid, ...extra });
const orphan = (uid, label, extra = {}) => ({ songUid: null, topicUid: null, label, uid, ...extra });

describe('entryKey', () => {
  test('same song, same topic, or same orphan label share a key', () => {
    expect(entryKey(song('a'))).toBe(entryKey(song('b')));
    expect(entryKey(topic('a'))).toBe(entryKey(topic('b')));
    expect(entryKey(orphan('a', 'Solo'))).toBe(entryKey(orphan('b', 'Solo')));
  });

  test('a song and a topic with the same label stay distinct', () => {
    expect(entryKey(song('a', { label: 'X' }))).not.toBe(entryKey(topic('b', { label: 'X' })));
  });

  test('orphans with different labels stay distinct', () => {
    expect(entryKey(orphan('a', 'Solo'))).not.toBe(entryKey(orphan('b', 'Solo ')));
  });
});

describe('sumMinutes', () => {
  test('a missing value counts as 0', () => {
    expect(sumMinutes(10, null, 15, undefined)).toBe(25);
  });

  test('stays null when no value carried minutes', () => {
    expect(sumMinutes(null, undefined)).toBeNull();
  });
});

describe('joinNotes', () => {
  test('joins non-empty trimmed notes one per line, in order', () => {
    expect(joinNotes(' morning ', null, '', '  ', 'evening')).toBe('morning\nevening');
  });

  test('null when every note is empty', () => {
    expect(joinNotes(null, '', '  ')).toBeNull();
  });
});

describe('mergeEntries', () => {
  test('the same song becomes one entry: minutes summed, notes joined in order', () => {
    const { entries } = mergeEntries([
      song('e1', { minutes: 10, note: 'slow' }),
      song('e2', { minutes: 15, note: 'up to tempo' }),
    ]);
    expect(entries).toEqual([{
      uid: 'e1', songUid: 'song-a', topicUid: null, label: 'Autumn Leaves',
      minutes: 25, note: 'slow\nup to tempo', position: 0,
    }]);
  });

  test('the same topic merges like a song', () => {
    const { entries } = mergeEntries([topic('t1', { minutes: 10 }), topic('t2', { minutes: 5 })]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ uid: 't1', topicUid: 'topic-f', minutes: 15 });
  });

  test('orphans with the same label merge; different labels stay separate', () => {
    const { entries } = mergeEntries([
      orphan('o1', 'Solo', { minutes: 4 }),
      orphan('o2', 'Riff', { minutes: 3 }),
      orphan('o3', 'Solo', { minutes: 6 }),
    ]);
    expect(entries.map((e) => [e.label, e.minutes])).toEqual([['Solo', 10], ['Riff', 3]]);
  });

  test('keeps chronological order: each group sits where it first appeared', () => {
    const { entries } = mergeEntries([
      song('e1'), topic('t1'), orphan('o1', 'Solo'), song('e2'),
    ]);
    expect(entries.map((e) => [e.uid, e.position])).toEqual([['e1', 0], ['t1', 1], ['o1', 2]]);
  });

  test('removed rows are listed and their plays re-attached to the survivor', () => {
    const { removedUids, playRemap } = mergeEntries([song('e1'), topic('t1'), song('e2'), song('e3')]);
    expect(removedUids).toEqual(['e2', 'e3']);
    expect(playRemap).toEqual({ e2: 'e1', e3: 'e1' });
  });

  test('a new entry (no uid) folds into the existing row, which survives', () => {
    const { entries, removedUids } = mergeEntries([
      song(undefined, { minutes: 4 }),
      song('e1', { minutes: 10 }),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ uid: 'e1', minutes: 14 });
    expect(removedUids).toEqual([]);
  });

  test('a group of new entries only has no survivor uid (to be created)', () => {
    const { entries, playRemap } = mergeEntries([song(undefined, { minutes: 2 }), song(undefined, { minutes: 3 })]);
    expect(entries[0]).toMatchObject({ uid: null, minutes: 5 });
    expect(playRemap).toEqual({});
  });

  test('minutes stay null when no merged entry had minutes', () => {
    const { entries } = mergeEntries([song('e1', { minutes: null }), song('e2')]);
    expect(entries[0].minutes).toBeNull();
  });
});

describe('mergeSessions', () => {
  const morning = {
    uid: 's-morning', createdAt: '2026-10-13T08:00:00Z', note: 'Warm hands',
    items: [
      song('m2', { minutes: 10, position: 1 }),
      topic('m1', { minutes: 10, position: 0 }),
    ],
  };
  const evening = {
    uid: 's-evening', createdAt: '2026-10-13T20:00:00Z', note: '  ',
    items: [song('v1', { minutes: 4, position: 0 }), orphan('v2', 'Solo', { minutes: 2, position: 1 })],
  };
  const noon = {
    uid: 's-noon', createdAt: '2026-10-13T12:00:00Z', note: 'Tired',
    items: [],
  };

  test('session notes are joined oldest first, empty ones skipped', () => {
    expect(mergeSessions([evening, noon, morning]).note).toBe('Warm hands\nTired');
  });

  test('entries follow the oldest session first, then each session position', () => {
    const { entries } = mergeSessions([evening, morning, noon]);
    expect(entries.map((e) => [e.uid, e.minutes, e.position])).toEqual([
      ['m1', 10, 0],
      ['m2', 14, 1],
      ['v2', 2, 2],
    ]);
  });

  test('plays of the folded entries go to the surviving entry', () => {
    expect(mergeSessions([morning, evening]).playRemap).toEqual({ v1: 'm2' });
  });

  test('a single session with no duplicate is returned as is', () => {
    const { entries, removedUids, note } = mergeSessions([morning]);
    expect(entries.map((e) => e.uid)).toEqual(['m1', 'm2']);
    expect(removedUids).toEqual([]);
    expect(note).toBe('Warm hands');
  });
});
