import { listOf } from './listOf';

// #118: a song field stored as a list, a single text (older rows) or nothing.
test('a list is returned as is', () => {
  const list = ['Rock', 'Pop'];
  expect(listOf(list)).toBe(list);
});

test('a single text becomes a one-item list', () => {
  expect(listOf('Rock')).toEqual(['Rock']);
});

test.each([
  ['null', null],
  ['undefined', undefined],
  ['an empty text', ''],
])('%s gives an empty list', (_name, value) => {
  expect(listOf(value)).toEqual([]);
});
