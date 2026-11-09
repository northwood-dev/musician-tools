'use strict';

const { Op, fn, col, cast, where: whereFn } = require('sequelize');

// A value going to a SQL function. Through cast and not as a plain string: Sequelize doubles
// every $ in a string argument of fn(), so "Ke$ha" would look for "Ke$$ha".
const sqlText = (value) => cast(String(value == null ? '' : value), 'text');

// What makes two songs the same song on the server, as WHERE clauses: the SAME expressions as
// the unique indexes (migration 20261109000000). Used to find the existing song once an index
// has refused a copy. Case, accents and a leading article on the artist don't count (#36).
const sameTitle = (title) => whereFn(
  fn('lower', fn('f_unaccent', col('title'))),
  fn('lower', fn('f_unaccent', sqlText(title)))
);

const sameArtist = (artist) => whereFn(
  fn('f_artist_key', col('artist')),
  fn('f_artist_key', sqlText(artist))
);

// Search (#76), as in f_search_key (migration 20261109100000): only for finding, never for
// deciding that two songs are the same. "RHCP" and "r.h.c.p" are one alias.
const sameAlias = (alias) => whereFn(
  fn('f_search_key', col('alias')),
  fn('f_search_key', sqlText(alias))
);

// Does a column contain what was typed, however it was typed? A key can't contain % or _ or \,
// which it drops as punctuation, so nothing needs escaping here.
const containsSearchKey = (column, text) => whereFn(
  fn('f_search_key', col(column)),
  { [Op.like]: fn('concat', '%', fn('f_search_key', sqlText(text)), '%') }
);

// Follows f_unaccent, measured letter by letter in dev and in production: accents on Latin and
// Greek only (й, kana and Indic vowel signs change the letter), and letters with no separate
// accent are spelled out (œ → oe). Rarer letters differ, and the index decides for them.
const SPELLED_OUT = { œ: 'oe', æ: 'ae', ø: 'o', ß: 'ss', ł: 'l', đ: 'd', ı: 'i', ð: 'd', þ: 'th', ё: 'е', '©': '(c)', '®': '(r)' };
const fold = (value) => String(value || '')
  .normalize('NFD')
  .replace(/([\p{Script=Latin}\p{Script=Greek}])[\u0300-\u036f]+/gu, '$1')
  .normalize('NFC')
  .toLowerCase()
  .replace(/[œæøßłđıðþё©®]/g, (letter) => SPELLED_OUT[letter]);

// A value that is only the article keeps it, as in f_artist_key.
const withoutLeadingArticle = (value) => String(value).replace(/^((the|le|la|les)\s+|l['’]\s*)(?=\S)/i, '');

// The same rule in JS, for code comparing values it hasn't sent to the database (the Catalog
// seed's file). The index decides if they differ on a rare character. The separator is NUL,
// which can't occur in a Postgres text value: any printable one could collide two pairs.
const identityKey = (title, artist) => `${fold(title)}\u0000${withoutLeadingArticle(fold(artist))}`;

// What search compares: the same fixed list as f_search_key.
const searchKey = (value) => fold(value)
  .replace(/&/g, 'and')
  .replace(/[ \t\n\r\f\v\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff!"#$%'()*+,\-./:;<=>?@[\\\]^_`{|}~\u00b4\u2018\u2019\u201a\u201c\u201d\u201e\u00ab\u00bb\u2039\u203a\u2010\u2011\u2012\u2013\u2014\u2015\u2026\u00b7\u2022\u00a1\u00bf]/g, '');

module.exports = { sameTitle, sameArtist, sameAlias, containsSearchKey, identityKey, withoutLeadingArticle, searchKey };
