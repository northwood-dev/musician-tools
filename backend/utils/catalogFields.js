'use strict';

const { normalizeInt, normalizeDurationSeconds, normalizeLanguage, normalizeMode } = require('./normalize');

// The intrinsic subset copied 1:1 from CatalogSong to a personal Song (story 19.4).
// Instrument/personal fields are NOT part of the Catalog (decision DL-17).
const INTRINSIC_FIELDS = [
  'key', 'bpm', 'mode', 'timeSignature', 'durationSeconds',
  'language', 'genre', 'streamingLinks', 'pitchStandard'
];

// Pick the intrinsic fields present in the payload into a create/update object. Used by the
// Catalog controller and by the Suggestions queue's Accept (#215), which builds a draft the same way.
function pickIntrinsic(body) {
  const out = {};
  for (const f of INTRINSIC_FIELDS) {
    if (body[f] !== undefined) out[f] = body[f];
  }
  if (out.durationSeconds !== undefined) out.durationSeconds = normalizeDurationSeconds(out.durationSeconds);
  if (out.bpm !== undefined) out.bpm = normalizeInt(out.bpm, { min: 1, max: 1000 });
  if (out.pitchStandard !== undefined) out.pitchStandard = normalizeInt(out.pitchStandard, { min: 380, max: 500 });
  if (out.language !== undefined) out.language = normalizeLanguage(out.language); // title-case parity with Song (19.8)
  if (out.mode !== undefined) out.mode = normalizeMode(out.mode); // canonical casing so copies' Mode select matches (21.x)
  return out;
}

module.exports = { INTRINSIC_FIELDS, pickIntrinsic };
