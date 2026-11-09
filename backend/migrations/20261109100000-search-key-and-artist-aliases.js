'use strict';

const crypto = require('node:crypto');

// #76: search finds a song however it is typed. f_search_key is what the Catalog search
// compares: no case, accents, punctuation or spaces, and "&" as "and". "earth wind and fire"
// finds "Earth, Wind & Fire", "acdc" finds "AC/DC". It is only for finding: the unique indexes
// keep the same-song rule of #36. The Songlist search mirrors it in searchKey (frontend).
//
// A fixed list of characters, and not [^[:alnum:]]: measured on 2026-11-09, [:alnum:] drops the
// vowel sign of "पि" in production and keeps it in dev, because they use different locale
// providers. A search that behaves differently in production can't be tested here.

const SEARCH_KEY = `
  CREATE OR REPLACE FUNCTION f_search_key(text)
    RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $function$
    SELECT regexp_replace(
      replace(lower(public.f_unaccent(coalesce($1, ''))), '&', 'and'),
      '[\\s!"#$%''()*+,\\-./:;<=>?@\\[\\\\\\]^_\`{|}~´‘’‚“”„«»‹›–—―…·•¡¿]',
      '',
      'g'
    )
  $function$;
`;

// Artist aliases: "RHCP" also searches for "Red Hot Chili Peppers". Only search reads them, so
// they can never decide that two songs are the same. The artist is free text because there is
// no artist table, and it compares by search key, so "EWF" finds the artist with or without
// the comma. Everything is in one migration, so one transaction: all or nothing.
const STARTING_ALIASES = [
  ['RHCP', 'Red Hot Chili Peppers'],
  ['RATM', 'Rage Against the Machine'],
  ['GNR', "Guns N' Roses"],
  ['Guns and Roses', "Guns N' Roses"],
  ['CCR', 'Creedence Clearwater Revival'],
  ['SOAD', 'System of a Down'],
  ['AIC', 'Alice in Chains'],
  ['EWF', 'Earth, Wind & Fire'],
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(SEARCH_KEY, { transaction });

      await queryInterface.createTable('ArtistAliases', {
        uid: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
        alias: { type: Sequelize.STRING, allowNull: false },
        artist: { type: Sequelize.STRING, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      }, { transaction });

      await sequelize.query(`
        CREATE UNIQUE INDEX artist_aliases_alias_search_key
        ON "ArtistAliases" (f_search_key(alias));
      `, { transaction });

      const now = new Date();
      await queryInterface.bulkInsert('ArtistAliases', STARTING_ALIASES.map(([alias, artist]) => ({
        uid: crypto.randomUUID(),
        alias,
        artist,
        createdAt: now,
        updatedAt: now,
      })), { transaction });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('ArtistAliases', { transaction });
      await sequelize.query('DROP FUNCTION IF EXISTS f_search_key(text);', { transaction });
    });
  },
};
