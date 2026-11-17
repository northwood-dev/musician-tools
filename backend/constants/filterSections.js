// #185: the Songlist sidebar's filter section ids, as stored in Users.songlist_filter_sections.
// Mirrors FILTER_SECTION_IDS on the front end (src/utils/filterSections.ts): an id added there
// must be added here too, or saving a layout that uses it is refused (400).
const FILTER_SECTION_IDS = [
  'instrument', 'playlist', 'difficulty', 'capo', 'tuning', 'technique', 'genre', 'language',
  'key', 'mode', 'timeSignature', 'bpm', 'pitch',
];

module.exports = { FILTER_SECTION_IDS };
