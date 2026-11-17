import { DEFAULT_FILTER_SECTIONS, resolveFilterSections, sectionOfFilter } from '../utils/filterSections';

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
