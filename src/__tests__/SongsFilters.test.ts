import { applySongFilters, countActiveFilters, NO_INSTRUMENT, type ActiveFilterState } from '../utils/songFilters';
import type { Song } from '../services/songService';

const noFilters: ActiveFilterState = {
  instrumentFilter: '',
  myInstrumentFilter: '',
  instrumentDifficultyFilter: '',
  capoFilter: '',
  tuningFilter: '',
  keyFilter: '',
  bpmMinFilter: '',
  bpmMaxFilter: '',
  pitchStandardMinFilter: '',
  pitchStandardMaxFilter: '',
  timeSignatureFilter: '',
  modeFilter: '',
  languageFilters: new Set(),
  playlistFilter: '',
  techniqueFilters: new Set(),
  genreFilters: new Set(),
};

describe('countActiveFilters', () => {
  test('returns 0 when nothing is set', () => {
    expect(countActiveFilters(noFilters)).toBe(0);
  });

  test('counts a single active select filter', () => {
    expect(countActiveFilters({ ...noFilters, keyFilter: 'C' })).toBe(1);
  });

  test('a non-empty Set counts as one dimension', () => {
    expect(countActiveFilters({ ...noFilters, genreFilters: new Set(['Rock', 'Jazz']) })).toBe(1);
    expect(countActiveFilters({ ...noFilters, techniqueFilters: new Set(['Bend']) })).toBe(1);
    expect(countActiveFilters({ ...noFilters, languageFilters: new Set(['en']) })).toBe(1);
  });

  test('capo 0 is active (!== ""), empty string is not', () => {
    expect(countActiveFilters({ ...noFilters, capoFilter: 0 })).toBe(1);
    expect(countActiveFilters({ ...noFilters, capoFilter: '' })).toBe(0);
  });

  test('sums multiple active dimensions', () => {
    expect(
      countActiveFilters({
        ...noFilters,
        instrumentFilter: 'Guitar',
        bpmMinFilter: '90',
        genreFilters: new Set(['Rock']),
        playlistFilter: 'pl-1',
      }),
    ).toBe(4);
  });
});

const baseSong: Song = {
  uid: '1',
  title: 'Song A',
  artist: 'Artist',
  album: 'Album',
  bpm: 100,
  key: 'C',
  timeSignature: '4/4',
  mode: 'Major',
  notes: '',
  instrument: [],
  genre: [],
  technique: [],
  instrumentDifficulty: {},
  instrumentLinks: {},
  pitchStandard: 440,
};

const makeOpts = (overrides: Partial<Parameters<typeof applySongFilters>[1]> = {}) => ({
  searchQuery: '',
  instrumentFilter: '',
  instrumentMatchMode: 'any' as const,
  myInstrumentFilter: '',
  tuningFilter: '',
  instrumentDifficultyFilter: '' as const,
  capoFilter: '' as const,
  techniqueFilters: new Set<string>(),
  techniqueMatchMode: 'any' as const,
  genreFilters: new Set<string>(),
  genreMatchMode: 'any' as const,
  keyFilter: '',
  bpmMinFilter: '',
  bpmMaxFilter: '',
  pitchStandardMinFilter: '',
  pitchStandardMaxFilter: '',
  timeSignatureFilter: '',
  modeFilter: '',
  languageFilters: new Set<string>(),
  languageMatchMode: 'any' as const,
  playlistFilter: '',
  playlists: [],
  ...overrides,
});

describe('#76: an artist alias typed in full also searches for its artist', () => {
  const artistAliases = [
    { alias: 'RHCP', artist: 'Red Hot Chili Peppers' },
    { alias: 'Guns and Roses', artist: "Guns N' Roses" },
    { alias: 'EWF', artist: 'Earth, Wind & Fire' },
  ];
  const found = (songs: Partial<Song>[], searchQuery: string, aliases = artistAliases) =>
    applySongFilters(songs.map((s, i) => ({ ...baseSong, uid: String(i), ...s })), makeOpts({ searchQuery, artistAliases: aliases })).map(s => s.uid);

  test.each([
    ['RHCP', { artist: 'Red Hot Chili Peppers' }],
    ['rhcp', { artist: 'Red Hot Chili Peppers feat. Someone' }],
    ['r.h.c.p', { artist: 'Red Hot Chili Peppers' }],
    ['guns and roses', { artist: "Guns N' Roses" }],
    ['Guns & Roses', { artist: "Guns N' Roses" }],
    ['ewf', { artist: 'Earth Wind & Fire' }], // the Catalog's spelling can change
    ['ewf', { artist: 'Earth, Wind and Fire' }],
  ])('"%s" finds %j', (query, song) => {
    expect(found([song], query)).toEqual(['0']);
  });

  test('normal results stay: a song whose title contains the alias still appears', () => {
    const songs = [{ title: 'RHCP Blues', artist: 'Someone' }, { title: 'Otherside', artist: 'Red Hot Chili Peppers' }];
    expect(found(songs, 'RHCP')).toEqual(['0', '1']);
  });

  test.each([['rh'], ['rhc'], ['rhcpp']])('a partial or longer text "%s" does not trigger the alias', (query) => {
    expect(found([{ title: 'Otherside', artist: 'Red Hot Chili Peppers' }], query)).toEqual([]);
  });

  test('an alias only applies to the artist, not to titles or albums', () => {
    expect(found([{ title: 'Red Hot Chili Peppers', artist: 'Someone', album: 'Red Hot Chili Peppers' }], 'RHCP')).toEqual([]);
  });

  test('an alias to an artist with an article also finds the artist stored without it', () => {
    const aliases = [{ alias: 'TBT', artist: 'The Beatles' }];
    expect(found([{ artist: 'Beatles' }, { artist: 'The Beatles' }, { artist: 'Queen' }], 'tbt', aliases)).toEqual(['0', '1']);
  });

  test('without aliases, search still works', () => {
    expect(found([{ title: 'Otherside', artist: 'Red Hot Chili Peppers' }], 'chili', [])).toEqual(['0']);
    expect(found([{ title: 'Otherside', artist: 'Red Hot Chili Peppers' }], 'RHCP', [])).toEqual([]);
  });
});

describe('#76: search ignores punctuation and spaces, and & counts as and', () => {
  const found = (songs: Partial<Song>[], searchQuery: string) =>
    applySongFilters(songs.map((s, i) => ({ ...baseSong, uid: String(i), ...s })), makeOpts({ searchQuery })).map(s => s.uid);

  test.each([
    ['earth wind and fire', { artist: 'Earth, Wind & Fire' }],
    ['Earth Wind & Fire', { artist: 'Earth, Wind & Fire' }],
    ['earth, wind & fire', { artist: 'Earth Wind and Fire' }],
    ['ben e king', { artist: 'Ben E. King' }],
    ['acdc', { artist: 'AC/DC' }],
    ['ac dc', { artist: 'AC/DC' }],
    ['ac-dc', { artist: 'AC/DC' }],
    ['dont stop', { title: "Don't Stop" }],
    ['dont stop', { title: 'Don’t Stop' }],
    ["don't", { album: 'Dont' }],
    ['the earth wind and fire', { artist: 'Earth, Wind & Fire' }],
    ['ガ', { artist: 'ガ!' }],
  ])('"%s" finds %j', (query, song) => {
    expect(found([song], query)).toEqual(['0']);
  });

  test.each([
    ['ガ', { artist: 'カ' }], // a letter is never reduced to another one
    ['पि', { artist: 'प' }],
    ['ben e king', { artist: 'Ben King' }],
  ])('"%s" does not find %j', (query, song) => {
    expect(found([song], query)).toEqual([]);
  });

  test('a search made only of punctuation looks for that text, and does not return everything', () => {
    expect(found([{ title: 'Help!', artist: 'Someone' }, { title: 'Wow', artist: 'Someone' }], '!')).toEqual(['0']);
  });

  test.each([['the ...'], ['la -'], ['the /'], ["l'?!"]])('"%s" has nothing left after its article, and does not return everything', (query) => {
    expect(found([{ title: 'Cry', artist: 'Mxyz', album: 'Pop' }], query)).toEqual([]);
  });

  // Expected values measured on the real f_unaccent and regexp_replace, in dev and in production.
  test.each([
    ['ab', { title: 'a\u00a0b' }], // a no-break space: production's \s removes it, dev's doesn't
    ['ab', { title: 'a\u2010b' }], // a typographic hyphen
    ['семен', { artist: 'Семён' }],
    ['c', { title: '©' }],
    ['r', { title: '®' }],
  ])('"%s" finds %j, as the database does', (query, song) => {
    expect(found([song], query)).toEqual(['0']);
  });

  test('й stays й, as the database does', () => {
    expect(found([{ artist: 'Семён' }, { artist: 'Майк' }], 'маик')).toEqual([]);
  });

  test('an empty search still returns everything', () => {
    expect(found([{ title: 'Help!' }, { title: 'Wow' }], '')).toEqual(['0', '1']);
  });
});

describe('#36: search ignores accents and a leading article', () => {
  const found = (songs: Partial<Song>[], searchQuery: string) =>
    applySongFilters(songs.map((s, i) => ({ ...baseSong, uid: String(i), ...s })), makeOpts({ searchQuery })).map(s => s.uid);

  test.each([
    ['Beyonce', { artist: 'Beyoncé' }],
    ['Beyoncé', { artist: 'Beyonce' }],
    ['deja vu', { title: 'Déjà Vu' }],
    ['pandora', { album: "Pandorá's Box" }],
    ['The Red Hot Chili Peppers', { artist: 'Red Hot Chili Peppers' }],
    ['les rita', { artist: 'Rita Mitsouko' }],
    ["L'Algerino", { artist: 'Algérino' }],
    ['L’Algerino', { artist: 'Algérino' }],
    ['Beatles', { artist: 'The Beatles' }],
    ['Coeur', { title: 'Cœur de pirate' }],
  ])('"%s" finds %j', (query, song) => {
    expect(found([song], query)).toEqual(['0']);
  });

  test.each([
    ['The', { title: 'The Wall' }],
    ['The Wall', { title: 'The Wall' }],
    ['La', { artist: 'La Roux' }],
    ['the', { artist: 'The' }],
  ])('"%s" still finds what it found before: %j', (query, song) => {
    expect(found([song], query)).toEqual(['0']);
  });

  test.each([
    ['The Wall', { title: 'Wall', artist: 'Pink Floyd' }], // only the artist drops the article
    ['The Beatles', { artist: 'Rolling Stones' }],
  ])('"%s" does not find %j', (query, song) => {
    expect(found([song], query)).toEqual([]);
  });
});

test('filters by BPM range', () => {
  const songs: Song[] = [
    { ...baseSong, uid: '1', bpm: 90 },
    { ...baseSong, uid: '2', bpm: 120 },
    { ...baseSong, uid: '3', bpm: 100 },
  ];

  const result = applySongFilters(songs, makeOpts({ bpmMinFilter: '95', bpmMaxFilter: '110' }));
  expect(result.map(s => s.uid)).toEqual(['3']);
});

test('filters by key, mode, and time signature together', () => {
  const songs: Song[] = [
    { ...baseSong, uid: '1', key: 'C', mode: 'Major', timeSignature: '4/4' },
    { ...baseSong, uid: '2', key: 'G', mode: 'Minor', timeSignature: '3/4' },
  ];

  const result = applySongFilters(songs, makeOpts({ keyFilter: 'C', modeFilter: 'Major', timeSignatureFilter: '4/4' }));
  expect(result.map(s => s.uid)).toEqual(['1']);
});

test('filters by playlist membership', () => {
  const songs: Song[] = [
    { ...baseSong, uid: '1' },
    { ...baseSong, uid: '2' },
  ];

  const playlists = [{ uid: 'p1', name: 'Set', songUids: ['2'] }];
  const result = applySongFilters(songs, makeOpts({ playlistFilter: 'p1', playlists }));
  expect(result.map(s => s.uid)).toEqual(['2']);
});

test('does not treat empty-string difficulty as 0', () => {
  const songs: Song[] = [
    {
      ...baseSong,
      uid: '1',
      instrument: ['Guitar'],
      instrumentDifficulty: { Guitar: '' as unknown as number },
    },
    {
      ...baseSong,
      uid: '2',
      instrument: ['Guitar'],
      instrumentDifficulty: { Guitar: 2 },
    },
  ];

  const result = applySongFilters(songs, makeOpts({ instrumentFilter: 'Guitar', instrumentDifficultyFilter: 2 }));
  expect(result.map(s => s.uid)).toEqual(['2']);
});

test('filters by exact capo position', () => {
  const songs: Song[] = [
    { ...baseSong, uid: '1', capo: 1 },
    { ...baseSong, uid: '2', capo: 2 },
    { ...baseSong, uid: '3', capo: 4 },
  ];

  const result = applySongFilters(songs, makeOpts({ capoFilter: 2 }));
  expect(result.map(s => s.uid)).toEqual(['2']);
});

test('excludes songs without capo when capo filter is active', () => {
  const songs: Song[] = [
    { ...baseSong, uid: '1', capo: null },
    { ...baseSong, uid: '2', capo: 1 },
  ];

  const result = applySongFilters(songs, makeOpts({ capoFilter: 1 }));
  expect(result.map(s => s.uid)).toEqual(['2']);
});

test('excludes capo 0 as invalid when capo filter is active', () => {
  const songs: Song[] = [
    { ...baseSong, uid: '1', capo: 0 },
    { ...baseSong, uid: '2', capo: 3 },
  ];

  const result = applySongFilters(songs, makeOpts({ capoFilter: 3 }));
  expect(result.map(s => s.uid)).toEqual(['2']);
});

test('NO_INSTRUMENT keeps only songs linked to no instrument', () => {
  const songs: Song[] = [
    { ...baseSong, uid: '1', instrument: [] },
    { ...baseSong, uid: '2', instrument: ['Guitar'] },
    { ...baseSong, uid: '3', instrument: null },
  ];

  const result = applySongFilters(songs, makeOpts({ instrumentFilter: NO_INSTRUMENT }));
  expect(result.map(s => s.uid)).toEqual(['1', '3']);
});

test('NO_INSTRUMENT ignores per-instrument sub-filters (stale difficulty/tuning do not exclude)', () => {
  const songs: Song[] = [{ ...baseSong, uid: '1', instrument: [] }];

  const result = applySongFilters(
    songs,
    makeOpts({ instrumentFilter: NO_INSTRUMENT, instrumentDifficultyFilter: 3, tuningFilter: 'Drop D' }),
  );
  expect(result.map(s => s.uid)).toEqual(['1']);
});

test('filters by language', () => {
  const songs: Song[] = [
    { ...baseSong, uid: '1', language: 'French' },
    { ...baseSong, uid: '2', language: 'English' },
  ];

  const result = applySongFilters(songs, makeOpts({ languageFilters: new Set(['French']) }));
  expect(result.map(s => s.uid)).toEqual(['1']);
});
describe('#84: a search can span the artist and the title', () => {
  const found = (songs: Partial<Song>[], searchQuery: string) =>
    applySongFilters(songs.map((s, i) => ({ ...baseSong, uid: String(i), ...s })), makeOpts({ searchQuery })).map(s => s.uid);
  const songs = [
    { title: 'Help!', artist: 'The Beatles' },
    { title: 'Yesterday', artist: 'The Beatles' },
    { title: 'Help Me', artist: 'Joni Mitchell' },
  ];

  test.each(['beatles help', 'beatles - help', 'The Beatles Help!'])('"%s" finds "Help!" by The Beatles only', query => {
    expect(found(songs, query)).toEqual(['0']);
  });

  test.each([
    ['the doors light my fire', 'Doors'],
    ['doors light my fire', 'The Doors'],
  ])('the article stays optional: "%s" finds "Light My Fire" by %s', (query, artist) => {
    expect(found([{ title: 'Light My Fire', artist }, { title: 'Riders on the Storm', artist }], query)).toEqual(['0']);
  });
});
