'use strict';

const { sequelize } = require('../models');
const { isUuid } = require('../utils/uuid');

// #190 / #215: when a Catalog entry is published, the songs suggested from Songlists that it
// answers are linked to it — the same link as a song added from the Catalog, stamped as synced
// (no false "newer version" banner), so Refresh just works.
//
// Which songs: still `suggested` and unlinked (an owner who opted out meanwhile is respected),
// whose identity — the same expressions as the unique indexes — is the PUBLISHED entry's, or
// the one of the suggestion the curator accepted (`suggestionId`): the curator may have fixed
// a typo in the title, and the suggesters' songs must still be found. Raw SQL leaves the
// songs' "updatedAt" alone: provenance bookkeeping, not an edit of someone's song.
const LINK_ON_PUBLISH_SQL = `
  WITH identities AS (
    SELECT lower(f_unaccent(title::text)) AS title_key, f_artist_key(artist::text) AS artist_key
      FROM "CatalogSongs"
     WHERE uid = :catalogUid AND published_at IS NOT NULL
    UNION
    SELECT lower(f_unaccent(title::text)), f_artist_key(artist::text)
      FROM "Songs"
     WHERE uid = :suggestionId AND catalog_suggestion = 'suggested' AND source_catalog_uid IS NULL
  )
  UPDATE "Songs" s
     SET source_catalog_uid = :catalogUid, source_catalog_synced_at = :syncedAt
    FROM identities i
   WHERE s.catalog_suggestion = 'suggested'
     AND s.source_catalog_uid IS NULL
     AND btrim(coalesce(s.title, '')) <> ''
     AND btrim(coalesce(s.artist, '')) <> ''
     AND lower(f_unaccent(s.title::text)) = i.title_key
     AND f_artist_key(s.artist::text) = i.artist_key
  RETURNING s.uid
`;

// Returns how many songs were linked. `entry` is the just-published row (uid, updatedAt).
async function linkSuggestionsToPublished(entry, suggestionId) {
  const [rows] = await sequelize.query(LINK_ON_PUBLISH_SQL, {
    replacements: {
      catalogUid: entry.uid,
      suggestionId: isUuid(suggestionId) ? suggestionId : null,
      syncedAt: entry.updatedAt,
    },
  });
  return rows.length;
}

module.exports = { linkSuggestionsToPublished, LINK_ON_PUBLISH_SQL };
