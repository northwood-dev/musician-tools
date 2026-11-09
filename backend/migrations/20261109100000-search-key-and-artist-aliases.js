'use strict';

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

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(SEARCH_KEY, { transaction });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP FUNCTION IF EXISTS f_search_key(text);', { transaction });
    });
  },
};
