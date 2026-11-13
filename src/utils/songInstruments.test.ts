import { instrumentsOf } from './songInstruments';

// #97: a song's `instrument` as stored today — a list, a single text (older rows) or nothing.
test('a list of instruments is returned as is', () => {
  expect(instrumentsOf({ instrument: ['Guitar', 'Bass'] })).toEqual(['Guitar', 'Bass']);
});

test('a single text (older songs) becomes a one-item list', () => {
  expect(instrumentsOf({ instrument: 'Guitar' })).toEqual(['Guitar']);
});

test.each([
  ['null', null],
  ['undefined', undefined],
  ['an empty text', ''],
])('%s gives no instruments', (_name, instrument) => {
  expect(instrumentsOf({ instrument })).toEqual([]);
});
