'use strict';

const createError = require('http-errors');
const { sequelize } = require('../models');
const logger = require('../logger');
const { isUuid } = require('../utils/uuid');

// #190 / #212: the curators' queue of songs suggested to the Catalog. No copy: it READS the
// Songlist songs (one source of truth), so an owner's later edit or opt-out shows at once.
//
// In the queue: `suggested`, title and artist filled, not linked to the Catalog. Grouped by
// what makes two songs the same song — the SAME expressions as the unique indexes (migration
// 20261109000000: case, accents and a leading article don't count), so the queue and the
// Catalog never disagree. One line per group, shown with its most recently updated song.
// Only the Catalog's own fields leave this query: no user, nothing personal (#190 privacy).
const SUGGESTIONS_SQL = `
  WITH suggested AS (
    SELECT s.uid, s.title, s.artist, s.album, s.key, s.mode, s.bpm, s.time_signature,
           s.duration_seconds, s.language, s.genre, s.streaming_links, s.pitch_standard,
           s."updatedAt",
           lower(f_unaccent(s.title::text)) AS title_key,
           f_artist_key(s.artist::text) AS artist_key
      FROM "Songs" s
     WHERE s.catalog_suggestion = 'suggested'
       AND s.source_catalog_uid IS NULL
       AND btrim(coalesce(s.title, '')) <> ''
       AND btrim(coalesce(s.artist, '')) <> ''
  ), ranked AS (
    SELECT *,
           count(*) OVER (PARTITION BY title_key, artist_key) AS suggested_by,
           row_number() OVER (PARTITION BY title_key, artist_key ORDER BY "updatedAt" DESC, uid) AS rank
      FROM suggested
  )
  SELECT r.uid, r.title, r.artist, r.album, r.key, r.mode, r.bpm, r.time_signature,
         r.duration_seconds, r.language, r.genre, r.streaming_links, r.pitch_standard,
         r.suggested_by, c.uid AS catalog_uid, c.published_at AS catalog_published_at
    FROM ranked r
    LEFT JOIN "CatalogSongs" c
      ON lower(f_unaccent(c.title::text)) = r.title_key
     AND f_artist_key(c.artist::text) = r.artist_key
   WHERE r.rank = 1
   ORDER BY r.suggested_by DESC, r."updatedAt" DESC
`;

// A whitelist, not a spread: a column added to the query by mistake still can't leak.
const toSuggestion = (r) => ({
  id: r.uid, // the group's latest song: the handle the curator's actions send back
  suggestedBy: Number(r.suggested_by),
  song: {
    title: r.title,
    artist: r.artist,
    album: r.album,
    key: r.key,
    mode: r.mode,
    bpm: r.bpm,
    timeSignature: r.time_signature,
    durationSeconds: r.duration_seconds,
    language: r.language,
    genre: r.genre,
    streamingLinks: r.streaming_links,
    pitchStandard: r.pitch_standard,
  },
  catalog: r.catalog_uid ? { uid: r.catalog_uid, published: r.catalog_published_at != null } : null,
});

// GET /api/catalog/suggestions (curator only). `pending` = the number of lines.
const getSuggestions = async (req, res, next) => {
  try {
    const rows = await sequelize.query(SUGGESTIONS_SQL, { type: 'SELECT' });
    const suggestions = rows.map(toSuggestion);
    res.json({ pending: suggestions.length, suggestions });
  } catch (error) {
    logger.error('Error listing Catalog suggestions:', error);
    next(createError(500, 'Error listing Catalog suggestions'));
  }
};

// The songs a queue line stands for, as an UPDATE target: the line's song (`:id`, still
// waiting) gives the identity; every still-suggested, unlinked song with that identity is in
// the group — re-read NOW, so an owner who opted out since the queue loaded is left alone.
// Raw SQL leaves "updatedAt" alone: a curator's decision is not an edit of the owner's song.
const updateGroup = (set) => `
  WITH target AS (
    SELECT lower(f_unaccent(title::text)) AS title_key, f_artist_key(artist::text) AS artist_key
      FROM "Songs"
     WHERE uid = :id AND catalog_suggestion = 'suggested' AND source_catalog_uid IS NULL
  )
  UPDATE "Songs" s
     SET ${set}
    FROM target
   WHERE s.catalog_suggestion = 'suggested'
     AND s.source_catalog_uid IS NULL
     AND lower(f_unaccent(s.title::text)) = target.title_key
     AND f_artist_key(s.artist::text) = target.artist_key
  RETURNING s.uid
`;

const NOT_WAITING = 'This suggestion is no longer waiting';

// POST /api/catalog/suggestions/:id/reject (curator only). #213: the group's songs leave the
// queue for good; their owners aren't told and see no change (the box stays checked). Only an
// owner unchecking then checking suggests one again.
const rejectSuggestion = async (req, res, next) => {
  if (!isUuid(req.params.id)) return next(createError(404, NOT_WAITING));
  try {
    const [rows] = await sequelize.query(updateGroup("catalog_suggestion = 'rejected'"), { replacements: { id: req.params.id } });
    if (rows.length === 0) return next(createError(404, NOT_WAITING));
    res.json({ rejected: rows.length });
  } catch (error) {
    logger.error('Error rejecting a Catalog suggestion:', error);
    next(createError(500, 'Error rejecting the suggestion'));
  }
};

module.exports = { getSuggestions, rejectSuggestion, updateGroup, NOT_WAITING };
