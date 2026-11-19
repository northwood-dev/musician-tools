import { songLabel } from './songLabel';

// #229: a song in a sentence (messages, confirmations) reads artist first.
test('the artist comes before the title', () => {
  expect(songLabel({ artist: 'The Breeders', title: 'Cannonball' })).toBe('The Breeders — Cannonball');
});

test('spaces around the values are dropped', () => {
  expect(songLabel({ artist: ' The Breeders ', title: ' Cannonball ' })).toBe('The Breeders — Cannonball');
  expect(songLabel({ artist: null, title: ' Cannonball ' })).toBe('Cannonball');
});

test.each([
  ['null', null],
  ['undefined', undefined],
  ['an empty text', ''],
  ['only spaces', '   '],
])('with %s as artist, only the title', (_name, artist) => {
  expect(songLabel({ artist, title: 'Cannonball' })).toBe('Cannonball');
});
