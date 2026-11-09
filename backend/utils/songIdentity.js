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

const fold = (value) => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// The same rule in JS, for code comparing values it hasn't sent to the database (the Catalog
// seed's file). The index decides if they differ on a rare character. The separator is NUL,
// which can't occur in a Postgres text value: any printable one could collide two pairs.
const identityKey = (title, artist) =>
  `${fold(title)}\u0000${fold(artist).replace(/^((the|le|la|les)\s+|l['’]\s*)(?=\S)/, '')}`;

module.exports = { sameTitle, sameArtist, identityKey };
