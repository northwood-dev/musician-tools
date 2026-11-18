'use strict';

const { sequelize } = require('../models');
const { isUuid } = require('../utils/uuid');
const { titleKey, artistKey, sameSongAs, waitingInQueue } = require('../utils/catalogSuggestion');

// #190 / #215: when a Catalog entry is published, the songs suggested from Songlists that it
// answers are linked to it — the same link as a song added from the Catalog, stamped as synced
// (no false "newer version" banner), so Refresh just works.
//
// Which songs: still waiting in the queue (an owner who opted out meanwhile is respected), whose
// identity is the PUBLISHED entry's, or the one of the suggestion the curator accepted
// (`suggestionId`): the curator may have fixed a typo in the title, and the suggesters' songs
// must still be found. Raw SQL leaves the
// songs' "updatedAt" alone: provenance bookkeeping, not an edit of someone's song.
// The accepted suggestion's identity is read whatever its song's state now: if its owner opted
// out between Accept and Publish, THEIR song stays unlinked (it no longer waits), but the
// others' must still be found under the title the curator may have corrected.
const LINK_ON_PUBLISH_SQL = `
  WITH identities AS (
    SELECT ${titleKey('c')} AS title_key, ${artistKey('c')} AS artist_key
      FROM "CatalogSongs" c
     WHERE c.uid = :catalogUid AND c.published_at IS NOT NULL
    UNION
    SELECT ${titleKey('a')}, ${artistKey('a')}
      FROM "Songs" a
     WHERE a.uid = :suggestionId
  )
  UPDATE "Songs" s
     SET source_catalog_uid = :catalogUid, source_catalog_synced_at = :syncedAt
    FROM identities i
   WHERE ${waitingInQueue('s')} AND ${sameSongAs('s', 'i')}
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
