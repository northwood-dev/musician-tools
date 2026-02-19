import { applySongFilters } from '../utils/songFilters';
import type { Song } from '../services/songService';

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
  playlistFilter: '',
  playlists: [],
  ...overrides,
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