import { DEFAULT_FILTER_SECTIONS, moveSection, resolveFilterSections, sectionOfFilter, sectionWaitingReason } from '../utils/filterSections';

// #185 / #198: which sidebar sections show, in which order.
describe('resolveFilterSections', () => {
  test('never customised: the short default', () => {
    expect(resolveFilterSections(null, new Set())).toEqual([
      'instrument', 'playlist', 'difficulty', 'capo', 'tuning', 'technique', 'genre', 'language',
    ]);
    expect(DEFAULT_FILTER_SECTIONS).toEqual(resolveFilterSections(null, new Set()));
  });

  test('a saved layout is used as is, in its order', () => {
    expect(resolveFilterSections(['key', 'genre'], new Set())).toEqual(['key', 'genre']);
  });

  test('an empty saved layout stays empty', () => {
    expect(resolveFilterSections([], new Set())).toEqual([]);
  });

  test('unknown ids (an old browser copy) and duplicates are dropped', () => {
    expect(resolveFilterSections(['colour', 'key', 'key', 'genre'], new Set())).toEqual(['key', 'genre']);
  });

  test('a hidden section whose filter is active is appended, so no filter is out of sight', () => {
    expect(resolveFilterSections(['genre'], new Set(['key', 'genre']))).toEqual(['genre', 'key']);
    expect(resolveFilterSections(null, new Set(['bpm']))).toEqual([...DEFAULT_FILTER_SECTIONS, 'bpm']);
  });
});

test('each chip filter belongs to a section (My instrument lives in Instrument filters)', () => {
  expect(sectionOfFilter('myInstrument')).toBe('instrument');
  expect(sectionOfFilter('instrument')).toBe('instrument');
  expect(sectionOfFilter('timeSignature')).toBe('timeSignature');
  expect(sectionOfFilter('genre')).toBe('genre');
});

// #199: dropping a section where another one is.
test('moveSection drops a section at the place of another, the others shift', () => {
  expect(moveSection(['genre', 'key', 'mode'], 'genre', 'mode')).toEqual(['key', 'mode', 'genre']);
  expect(moveSection(['genre', 'key', 'mode'], 'mode', 'genre')).toEqual(['mode', 'genre', 'key']);
  expect(moveSection(['genre', 'key'], 'genre', 'genre')).toEqual(['genre', 'key']);
  expect(moveSection(['genre', 'key'], 'bpm', 'genre')).toEqual(['genre', 'key']);
});

// #185 follow-up: why an instrument-dependent section is not shown right now.
test.each<[string, string, boolean, string | null]>([
  ['difficulty', '', false, 'needs a song instrument'],
  ['difficulty', 'Piano', true, null],
  ['technique', '__none__', false, 'needs a song instrument'],
  ['capo', '', false, 'needs Guitar as the song instrument'],
  ['capo', 'Piano', true, 'needs Guitar as the song instrument'],
  ['capo', 'Guitar', true, null],
  ['tuning', '', false, 'needs a song instrument'],
  ['tuning', 'Drums', false, 'needs an instrument with tunings'],
  ['tuning', 'Bass', true, null],
  ['genre', '', false, null],
])('%s with instrument "%s" → %s', (id, instrumentFilter, showTuningFilters, reason) => {
  expect(sectionWaitingReason(id as never, { instrumentFilter, showTuningFilters })).toBe(reason);
});
