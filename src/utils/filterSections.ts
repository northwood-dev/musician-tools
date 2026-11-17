import { isRealInstrument } from './songFilters';

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

const isSectionId = (id: unknown): id is FilterSectionId =>
  typeof id === 'string' && (FILTER_SECTION_IDS as readonly string[]).includes(id);

/** What everyone starts from (#185): the four common sections, plus the instrument-dependent
 *  ones, which still only appear when the chosen song instrument allows them. */
export const DEFAULT_FILTER_SECTIONS: readonly FilterSectionId[] = [
  'instrument', 'playlist', 'difficulty', 'capo', 'tuning', 'technique', 'genre', 'language',
];

/** The sidebar title of each section, also listed in the "+ Add filter" menu. */
export const FILTER_SECTION_TITLES: Record<FilterSectionId, string> = {
  instrument: 'Instrument filters',
  playlist: 'Playlist filters',
  difficulty: 'Difficulty filter',
  capo: 'Capo filter',
  tuning: 'Tuning filters',
  technique: 'Technique filters',
  genre: 'Genre filters',
  language: 'Filter by language',
  key: 'Key filters',
  mode: 'Mode filters',
  timeSignature: 'Time signature filters',
  bpm: 'BPM filters',
  pitch: 'Pitch standard filters',
};

/** Why an instrument-dependent section doesn't show right now, for the "+ Add filter"
 *  menu (#185), or null when it shows. Mirrors the sidebar's display conditions. */
export function sectionWaitingReason(
  id: FilterSectionId,
  { instrumentFilter, showTuningFilters }: { instrumentFilter: string; showTuningFilters: boolean },
): string | null {
  const realInstrument = isRealInstrument(instrumentFilter);
  switch (id) {
    case 'difficulty':
    case 'technique':
      return realInstrument ? null : 'needs a song instrument';
    case 'capo':
      return instrumentFilter === 'Guitar' ? null : 'needs Guitar as the song instrument';
    case 'tuning':
      if (showTuningFilters) return null;
      return realInstrument ? 'needs an instrument with tunings' : 'needs a song instrument';
    default:
      return null;
  }
}

/** The section holding a filter, by the filter names of the #188 chips. */
export function sectionOfFilter(filter: 'myInstrument' | FilterSectionId): FilterSectionId {
  return filter === 'myInstrument' ? 'instrument' : filter;
}

// #198: the sections to show, in order: the saved layout (unknown ids from an old browser
// copy and duplicates dropped) or the default, then any hidden section whose filter is
// active — so hiding a section never hides an active filter. "Reset to default" is the
// same call with no saved layout.
export function resolveFilterSections(
  saved: readonly unknown[] | null | undefined,
  activeSections: ReadonlySet<FilterSectionId>,
): FilterSectionId[] {
  const base = saved ? saved.filter(isSectionId) : [...DEFAULT_FILTER_SECTIONS];
  const shown = [...new Set(base)];
  for (const id of FILTER_SECTION_IDS) {
    if (activeSections.has(id) && !shown.includes(id)) shown.push(id);
  }
  return shown;
}

/** #199: the layout with `id` dropped where `overId` was (the others shift by one). */
export function moveSection(sections: readonly FilterSectionId[], id: FilterSectionId, overId: FilterSectionId): FilterSectionId[] {
  const from = sections.indexOf(id);
  const to = sections.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return [...sections];
  const next = [...sections];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}
