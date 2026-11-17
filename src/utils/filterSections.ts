// #185: the Songlist sidebar's filter sections, by stable id (also stored on the account).
// The order here is the historical sidebar order.
export const FILTER_SECTION_IDS = [
  'instrument',
  'playlist',
  'difficulty',
  'capo',
  'tuning',
  'technique',
  'genre',
  'language',
  'key',
  'mode',
  'timeSignature',
  'bpm',
  'pitch',
] as const;

export type FilterSectionId = typeof FILTER_SECTION_IDS[number];
