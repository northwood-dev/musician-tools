'use strict';

const { catalogLinksError } = require('./streamingLinks');

// #190: is a Songlist song suggested to the Catalog? Set by its owner's checkbox (private ↔
// suggested); `rejected` by a curator only. The migration's CHECK constraint lists the same three.
const SUGGESTION_STATES = ['private', 'suggested', 'rejected'];

// What makes two songs the same song, in SQL — the SAME expressions as the unique indexes
// (migration 20261109000000: case, accents and a leading article don't count), so the queue,
// its actions and the Catalog never disagree. `t` is a table alias.
const titleKey = (t) => `lower(f_unaccent(${t}.title::text))`;
const artistKey = (t) => `f_artist_key(${t}.artist::text)`;
const sameSongAs = (t, keys) => `${titleKey(t)} = ${keys}.title_key AND ${artistKey(t)} = ${keys}.artist_key`;

// A song waiting in the curators' queue: suggested, title and artist filled, not yet linked to
// the Catalog. The one definition the queue, Reject, Link to it, Accept and publishing share.
const waitingInQueue = (t) => `
  ${t}.catalog_suggestion = 'suggested'
  AND ${t}.source_catalog_uid IS NULL
  AND btrim(coalesce(${t}.title, '')) <> ''
  AND btrim(coalesce(${t}.artist, '')) <> ''`;

// A Songlist accepts any link; the Catalog only official track links (YouTube, Spotify, Deezer).
// Curators see — and a draft gets — only those: a personal link (a Drive file…) never leaves
// the Songlist.
const officialLinks = (links) => {
  if (!Array.isArray(links)) return null;
  const kept = [];
  for (const link of links) {
    if (!catalogLinksError([...kept, link])) kept.push(link);
  }
  return kept.length ? kept : null;
};

module.exports = { SUGGESTION_STATES, titleKey, artistKey, sameSongAs, waitingInQueue, officialLinks };
