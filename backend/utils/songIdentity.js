'use strict';

const { fn, col, where: whereFn } = require('sequelize');

// What makes two songs the same song on the server, as WHERE clauses: the SAME expressions as
// the unique indexes (migration 20261109000000). Used to find the existing song once an index
// has refused a copy. Case, accents and a leading article on the artist don't count (#36).
const sameTitle = (title) => whereFn(
  fn('lower', fn('f_unaccent', col('title'))),
  fn('lower', fn('f_unaccent', String(title == null ? '' : title)))
);

const sameArtist = (artist) => whereFn(
  fn('f_artist_key', col('artist')),
  fn('f_artist_key', artist ? String(artist) : '')
);

// Follows f_unaccent, measured letter by letter: accents on Latin and Greek only (й, kana and
// Indic vowel signs change the letter), and letters with no separate accent are spelled out
// (œ → oe). Rarer letters differ, and the index decides for them.
const SPELLED_OUT = { œ: 'oe', æ: 'ae', ø: 'o', ß: 'ss', ł: 'l', đ: 'd', ı: 'i', ð: 'd', þ: 'th' };
const fold = (value) => String(value || '')
  .normalize('NFD')
  .replace(/([\p{Script=Latin}\p{Script=Greek}])[̀-ͯ]+/gu, '$1')
  .normalize('NFC')
  .toLowerCase()
  .replace(/[œæøßłđıðþ]/g, (letter) => SPELLED_OUT[letter]);

// A value that is only the article keeps it, as in f_artist_key.
const withoutLeadingArticle = (value) => String(value).replace(/^((the|le|la|les)\s+|l['’]\s*)(?=\S)/i, '');

// The same rule in JS, for code comparing values it hasn't sent to the database (the Catalog
// seed's file). The index decides if they differ on a rare character. The separator is NUL,
// which can't occur in a Postgres text value: any printable one could collide two pairs.
const identityKey = (title, artist) => `${fold(title)}\u0000${withoutLeadingArticle(fold(artist))}`;

// What search compares, as in f_search_key (migration 20261109100000): only for finding, not
// for deciding that two songs are the same.
const searchKey = (value) => fold(value)
  .replace(/&/g, 'and')
  .replace(/[\s!"#$%'()*+,\-./:;<=>?@[\\\]^_`{|}~´‘’‚“”„«»‹›–—―…·•¡¿]/g, '');

module.exports = { sameTitle, sameArtist, identityKey, withoutLeadingArticle, searchKey };
