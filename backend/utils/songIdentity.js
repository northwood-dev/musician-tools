'use strict';

const { fn, col, where: whereFn } = require('sequelize');

// What makes two songs the same song on the server, as WHERE clauses: the SAME expressions as
// the unique index (migration 20261109000000). Used to find the existing song once the index
// has refused a copy. Case, accents and a leading article on the artist don't count (#36).
const sameTitle = (title) => whereFn(
  fn('lower', fn('f_unaccent', col('title'))),
  fn('lower', fn('f_unaccent', String(title == null ? '' : title)))
);

const sameArtist = (artist) => whereFn(
  fn('f_artist_key', col('artist')),
  fn('f_artist_key', artist ? String(artist) : '')
);

module.exports = { sameTitle, sameArtist };
