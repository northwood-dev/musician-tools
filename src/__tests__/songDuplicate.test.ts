import { findDuplicateSong } from '../utils/songDuplicate';
import type { Song } from '../services/songService';

const makeSong = (overrides: Partial<Song>): Song => ({
  uid: '1',
  title: 'Killing in the Name',
  artist: 'Rage Against the Machine',
  album: '',
  bpm: null,
  key: '',
  timeSignature: '',
  mode: '',
  notes: '',
  instrument: [],
  genre: [],
  technique: [],
  instrumentDifficulty: {},
  instrumentLinks: {},
  pitchStandard: 440,
  ...overrides,
});

describe('findDuplicateSong', () => {
  it('matches on title + artist ignoring case and surrounding whitespace', () => {
    const songs = [makeSong({})];
    const hit = findDuplicateSong(songs, {
      title: '  killing in the name ',
      artist: 'RAGE AGAINST THE MACHINE',
    });
    expect(hit).toBe(songs[0]);
  });

  it('collapses internal whitespace differences', () => {
    const songs = [makeSong({ artist: 'Rage  Against the Machine' })]; // double space
    expect(
      findDuplicateSong(songs, { title: 'Killing in the Name', artist: 'Rage Against the Machine' }),
    ).toBe(songs[0]);
  });

  it('treats NFC and NFD encodings of the same accented text as equal', () => {
    const nfc = 'Beyonce\u0301'.normalize('NFC'); // precomposed é
    const nfd = 'Beyonce\u0301'.normalize('NFD'); // e + combining acute accent
    const songs = [makeSong({ title: nfc, artist: nfc })];
    expect(findDuplicateSong(songs, { title: nfd, artist: nfd })).toBe(songs[0]);
  });

  it('#36: ignores accents on the artist and the title', () => {
    const songs = [makeSong({ title: 'Déjà Vu', artist: 'Beyoncé' })];
    expect(findDuplicateSong(songs, { title: 'Deja Vu', artist: 'Beyonce' })).toBe(songs[0]);
  });

  it.each([
    ['The Beatles', 'Beatles'],
    ['Beatles', 'THE beatles'],
    ['Les Rita Mitsouko', 'Rita Mitsouko'],
    ['Le Tigre', 'Tigre'],
    ['La Roux', 'Roux'],
    ["L'Algérino", 'Algerino'],
    ['L’Algérino', "l'algerino"],
    ['The  Beatles', 'Beatles'],
  ])('#36: ignores a leading article on the artist: %s = %s', (stored, typed) => {
    const songs = [makeSong({ title: 'Help!', artist: stored })];
    expect(findDuplicateSong(songs, { title: 'Help!', artist: typed })).toBe(songs[0]);
  });

  it.each([
    ['The', 'Who'], // an artist that is only the article is kept
    ['Les', 'Paul'],
    ['Theatre', 'Atre'], // the article must be a whole word
    ['Lara', 'Ra'],
    ['The Who', 'The Band'],
  ])('#36: does not confuse %s with %s', (stored, typed) => {
    const songs = [makeSong({ title: 'Help!', artist: stored })];
    expect(findDuplicateSong(songs, { title: 'Help!', artist: typed })).toBeNull();
  });

  it('#36: an artist that is only the article matches itself, and "The The" is "The"', () => {
    const songs = [makeSong({ title: 'Help!', artist: 'The' })];
    expect(findDuplicateSong(songs, { title: 'Help!', artist: 'the' })).toBe(songs[0]);
    expect(findDuplicateSong(songs, { title: 'Help!', artist: 'The The' })).toBe(songs[0]);
  });

  // Expected values measured on the real f_unaccent, which the unique index uses.
  it.each([
    ['Cœur', 'Coeur'],
    ['Ægir', 'Aegir'],
    ['Sigur Rós', 'Sigur Ros'],
    ['Mø', 'Mo'],
    ['Straße', 'Strasse'],
    ['Stanisław', 'Stanislaw'],
    ['Björk Guðmundsdóttir', 'Bjork Gudmundsdottir'],
    ['Þór', 'Thor'],
    ['Ελληνικά', 'Ελληνικα'],
  ])('#36: folds %s like the database: %s', (stored, typed) => {
    const songs = [makeSong({ title: stored, artist: stored })];
    expect(findDuplicateSong(songs, { title: typed, artist: typed })).toBe(songs[0]);
  });

  it.each([
    ['ガ', 'カ'],
    ['पि', 'प'],
    ['กิ', 'ก'],
    ['Русский', 'Русскии'],
  ])('#36: keeps %s and %s apart, as the database does', (stored, typed) => {
    const songs = [makeSong({ title: stored, artist: 'Someone' })];
    expect(findDuplicateSong(songs, { title: typed, artist: 'Someone' })).toBeNull();
  });

  it('#36: a leading article in the title still counts', () => {
    const songs = [makeSong({ title: 'The Wall', artist: 'Pink Floyd' })];
    expect(findDuplicateSong(songs, { title: 'Wall', artist: 'Pink Floyd' })).toBeNull();
  });

  it('returns null when the artist differs (same title, other artist)', () => {
    const songs = [makeSong({})];
    expect(
      findDuplicateSong(songs, { title: 'Killing in the Name', artist: 'Cover Band' }),
    ).toBeNull();
  });

  it('returns null when the title is empty (the required field)', () => {
    const songs = [makeSong({})];
    expect(findDuplicateSong(songs, { title: '', artist: 'Rage Against the Machine' })).toBeNull();
  });

  it('treats null/undefined artist as empty on both sides', () => {
    const songs = [makeSong({ artist: null as unknown as string })]; // DB allows null artist
    expect(findDuplicateSong(songs, { title: 'Killing in the Name', artist: '' })).toBe(songs[0]);
    expect(findDuplicateSong(songs, { title: 'Killing in the Name' })).toBe(songs[0]);
  });

  it('ignores the song being edited via excludeUid', () => {
    const songs = [makeSong({ uid: 'self' })];
    expect(
      findDuplicateSong(
        songs,
        { title: 'Killing in the Name', artist: 'Rage Against the Machine' },
        'self',
      ),
    ).toBeNull();
  });

  // The bug this fix addresses: detection scans the whole songlist, independent
  // of any list filter — so a song hidden from the visible list still matches.
  it('matches regardless of how the visible list is filtered', () => {
    const hidden = makeSong({ uid: 'hidden', instrument: [] }); // no instrument → hidden by an instrument filter
    expect(
      findDuplicateSong([hidden], {
        title: 'Killing in the Name',
        artist: 'Rage Against the Machine',
      }),
    ).toBe(hidden);
  });
});
