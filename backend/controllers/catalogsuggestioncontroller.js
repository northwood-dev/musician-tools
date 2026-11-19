'use strict';

const createError = require('http-errors');
const { sequelize, Song, CatalogSong } = require('../models');
const { normalizeText } = require('../utils/normalize');
const { pickIntrinsic } = require('../utils/catalogFields');
const { titleKey, artistKey, sameSongAs, waitingInQueue, officialLinks } = require('../utils/catalogSuggestion');
const { COMPARED_FIELDS, groupDifferences, proposedValue, sameValuesSql } = require('../utils/catalogDifferences');
const logger = require('../logger');
const { isUuid } = require('../utils/uuid');

// #190 / #212: the curators' queue of songs suggested to the Catalog. No copy: it READS the
// Songlist songs (one source of truth), so an owner's later edit or opt-out shows at once.
//
// One line per song: identical songs from several users are grouped (same identity as the
// unique indexes), shown with the most recently updated one. Only the Catalog's own fields
// leave this query: no user, nothing personal (#190 privacy).
// #236: a group's compared fields, as JSON by field name, and the entry's, as catalog_<column>.
const MEMBER_JSON = `json_build_object(${COMPARED_FIELDS.map(f => `'${f.field}', ${f.column}`).join(', ')})`;
const CATALOG_COLUMNS = COMPARED_FIELDS.map(f => `c.${f.column} AS catalog_${f.column}`).join(', ');
const entryValues = (r) => Object.fromEntries(COMPARED_FIELDS.map(f => [f.field, r[`catalog_${f.column}`]]));

const SUGGESTIONS_SQL = `
  WITH suggested AS (
    SELECT s.uid, s.title, s.artist, s.album, s.key, s.mode, s.bpm, s.time_signature,
           s.duration_seconds, s.language, s.genre, s.streaming_links, s.pitch_standard,
           s."updatedAt", ${titleKey('s')} AS title_key, ${artistKey('s')} AS artist_key
      FROM "Songs" s
     WHERE ${waitingInQueue('s')}
  ), ranked AS (
    SELECT *,
           count(*) OVER (PARTITION BY title_key, artist_key) AS suggested_by,
           -- #236: every song of the group, to compare with a published entry.
           json_agg(${MEMBER_JSON}) OVER (PARTITION BY title_key, artist_key) AS members,
           row_number() OVER (PARTITION BY title_key, artist_key ORDER BY "updatedAt" DESC, uid) AS rank
      FROM suggested
  )
  SELECT r.uid, r.title, r.artist, r.album, r.key, r.mode, r.bpm, r.time_signature,
         r.duration_seconds, r.language, r.genre, r.streaming_links, r.pitch_standard,
         r.suggested_by, r.members, c.uid AS catalog_uid, c.published_at AS catalog_published_at,
         ${CATALOG_COLUMNS}
    FROM ranked r
    LEFT JOIN "CatalogSongs" c ON ${sameSongAs('c', 'r')}
   WHERE r.rank = 1
   ORDER BY r.suggested_by DESC, r."updatedAt" DESC
`;

// The entry a line matches. A published one also says where the group differs from it (#236).
function catalogOf(r) {
  if (r.catalog_published_at == null) return { uid: r.catalog_uid, published: false };
  return { uid: r.catalog_uid, published: true, differences: groupDifferences(r.members, entryValues(r)) };
}

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
    streamingLinks: officialLinks(r.streaming_links), // never a personal link
    pitchStandard: r.pitch_standard,
  },
  catalog: r.catalog_uid ? catalogOf(r) : null,
});

// GET /api/catalog/suggestions (curator only).
const getSuggestions = async (req, res, next) => {
  try {
    const rows = await sequelize.query(SUGGESTIONS_SQL, { type: 'SELECT' });
    const suggestions = rows.map(toSuggestion);
    // The button's count: lines a curator has something to do on — a draft in progress is
    // already being handled.
    const pending = suggestions.filter(line => !(line.catalog && !line.catalog.published)).length;
    res.json({ pending, suggestions });
  } catch (error) {
    logger.error('Error listing Catalog suggestions:', error);
    next(createError(500, 'Error listing Catalog suggestions'));
  }
};

// The songs a queue line stands for: the line's song (`:id`, still waiting) gives the
// identity; every song still waiting with that identity is in the group — re-read NOW, so an
// owner who opted out since the queue loaded is left alone. Raw SQL leaves "updatedAt" alone:
// a curator's decision is not an edit of the owner's song.
const TARGET_CTE = `
  target AS (
    SELECT ${titleKey('t')} AS title_key, ${artistKey('t')} AS artist_key
      FROM "Songs" t
     WHERE t.uid = :id AND ${waitingInQueue('t')}
  )`;

const updateGroup = (set) => `
  WITH ${TARGET_CTE}
  UPDATE "Songs" s SET ${set}
    FROM target
   WHERE ${waitingInQueue('s')} AND ${sameSongAs('s', 'target')}
  RETURNING s.uid
`;
const REJECT_SQL = updateGroup("catalog_suggestion = 'rejected'");

// The Catalog entry a line matches, if any: [] when the line no longer waits.
const MATCH_SQL = `
  WITH ${TARGET_CTE}
  SELECT c.uid AS catalog_uid, (c.published_at IS NOT NULL) AS published
    FROM target LEFT JOIN "CatalogSongs" c ON ${sameSongAs('c', 'target')}
`;

// #236: the group's songs as they are NOW, each with the entry its identity matches (if any):
// [] when the line no longer waits. What Merge compares before tying anything.
const GROUP_SQL = `
  WITH ${TARGET_CTE}
  SELECT ${COMPARED_FIELDS.map(f => `s.${f.column}`).join(', ')},
         c.uid AS catalog_uid, (c.published_at IS NOT NULL) AS published, ${CATALOG_COLUMNS}
    FROM target
    JOIN "Songs" s ON ${waitingInQueue('s')} AND ${sameSongAs('s', 'target')}
    LEFT JOIN "CatalogSongs" c ON ${sameSongAs('c', 'target')}
`;

// #214 / #236: tie the group's songs to the PUBLISHED entry they match — the same link as a song
// added from the Catalog, so Refresh works. A song whose values equal the entry's is stamped up
// to date; any other is left not up to date, so its owner sees the "different values" banner.
const MERGE_SQL = `
  WITH ${TARGET_CTE}
  UPDATE "Songs" s
     SET source_catalog_uid = c.uid,
         source_catalog_synced_at = CASE WHEN ${sameValuesSql('s', 'c')}
                                         THEN c."updatedAt" ELSE NULL END
    FROM target
    JOIN "CatalogSongs" c ON ${sameSongAs('c', 'target')} AND c.published_at IS NOT NULL
   WHERE ${waitingInQueue('s')} AND ${sameSongAs('s', 'target')}
  RETURNING s.uid
`;

const NOT_WAITING = 'This suggestion is no longer waiting';

// POST /api/catalog/suggestions/:id/reject (curator only). #213: the group's songs leave the
// queue for good; their owners aren't told and see no change (the box stays checked). Only an
// owner unchecking then checking suggests one again.
const rejectSuggestion = async (req, res, next) => {
  if (!isUuid(req.params.id)) return next(createError(404, NOT_WAITING));
  try {
    const [rows] = await sequelize.query(REJECT_SQL, { replacements: { id: req.params.id } });
    if (rows.length === 0) return next(createError(404, NOT_WAITING));
    res.json({ rejected: rows.length });
  } catch (error) {
    logger.error('Error rejecting a Catalog suggestion:', error);
    next(createError(500, 'Error rejecting the suggestion'));
  }
};

// POST /api/catalog/suggestions/:id/merge (curator only). #214 / #236: the song is already
// published in the Catalog — tie the group's songs to that entry instead of creating a
// duplicate. Values to review first (#237's dialog decides them): a 409 "differences".
const memberValues = (r) => Object.fromEntries(COMPARED_FIELDS.map(f => [f.field, r[f.column]]));
const mergeSuggestion = async (req, res, next) => {
  if (!isUuid(req.params.id)) return next(createError(404, NOT_WAITING));
  try {
    const replacements = { id: req.params.id };
    const group = await sequelize.query(GROUP_SQL, { type: 'SELECT', replacements });
    if (group.length === 0) return next(createError(404, NOT_WAITING));
    const [first] = group;
    if (!first.catalog_uid || !first.published) {
      return next(createError(409, 'No published Catalog entry to merge into'));
    }
    const differences = groupDifferences(group.map(memberValues), entryValues(first));
    const decisions = req.body && req.body.decisions;
    if (differences.length > 0 && !decisions) {
      return res.status(409).json({ error: 'differences', message: 'Some values differ from the Catalog entry', differences });
    }
    // #237: one decision per field that differs NOW — 'reject', or a value a suggester proposed.
    const accepted = {};
    for (const difference of differences) {
      const decision = decisions[difference.field];
      if (decision === 'reject') continue;
      const value = decision ? proposedValue(difference, decision.accept) : undefined;
      if (value === undefined) {
        return next(createError(400, `Decide ${difference.field}: reject it, or accept a suggested value`));
      }
      accepted[difference.field] = value;
    }
    // Both or neither: the entry is never corrected without the songs tied, nor the reverse.
    // Correcting it moves its version, so earlier holders see the banner — it did change. The
    // songs are then stamped against the entry's FINAL values.
    const linked = await sequelize.transaction(async (transaction) => {
      if (Object.keys(accepted).length > 0) {
        await CatalogSong.update(pickIntrinsic(accepted), { where: { uid: first.catalog_uid }, transaction });
      }
      const [rows] = await sequelize.query(MERGE_SQL, { replacements, transaction });
      return rows.length;
    });
    res.json({ linked, catalogUid: first.catalog_uid });
  } catch (error) {
    logger.error('Error merging a Catalog suggestion:', error);
    next(createError(500, 'Error merging the suggestion'));
  }
};

// POST /api/catalog/suggestions/:id/accept (curator only). #215: a Catalog DRAFT pre-filled
// with the line's song (its Catalog fields only); the curator reviews it in the entry form and
// publishes — publishing links the songs. An entry with the same identity already existing
// (published, or a draft in progress) is a 409 with its uid: nothing is created twice.
const acceptSuggestion = async (req, res, next) => {
  if (!isUuid(req.params.id)) return next(createError(404, NOT_WAITING));
  try {
    const song = await Song.findOne({ where: { uid: req.params.id, catalogSuggestion: 'suggested', sourceCatalogUid: null } });
    if (!song) return next(createError(404, NOT_WAITING));
    const [match] = await sequelize.query(MATCH_SQL, { type: 'SELECT', replacements: { id: req.params.id } });
    if (match && match.catalog_uid) return res.status(409).json({ catalogUid: match.catalog_uid });

    const fields = pickIntrinsic(song);
    // Only official track links go into a draft (a personal one never leaves the Songlist);
    // the curator can add the right ones.
    fields.streamingLinks = officialLinks(fields.streamingLinks);
    const draft = await CatalogSong.create({
      title: normalizeText(song.title),
      artist: normalizeText(song.artist) ?? null,
      album: normalizeText(song.album) ?? null,
      ...fields,
    });
    res.status(201).json({ catalogUid: draft.uid });
  } catch (error) {
    if (error && error.name === 'SequelizeUniqueConstraintError') {
      return next(createError(409, 'This song is already in the Catalog')); // created meanwhile
    }
    logger.error('Error accepting a Catalog suggestion:', error);
    next(createError(500, 'Error accepting the suggestion'));
  }
};

module.exports = { getSuggestions, rejectSuggestion, mergeSuggestion, acceptSuggestion };
