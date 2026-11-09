'use strict';

// #36: two songs are the same song whatever the accents, and whatever a leading article on
// the artist: "Beatles" = "The Beatles", "Beyonce" = "Beyoncé". Only the COMPARISON changes:
// no stored value is touched.
//
// f_artist_key is the one definition of the artist part. An index can't read another table,
// so aliases (#76) can never take part in this rule. The frontend mirrors it in songDuplicate.
//
// Unlike 20260710 (the same index, case only), a duplicate is NOT merged here: it would
// silently decide between two songs carrying a person's notes and practice history. It
// aborts instead, inside the transaction: the release stops and production stays on the
// previous version. The error gives counts only, because this runs in the deploy logs.

const ARTIST_KEY = `
  CREATE OR REPLACE FUNCTION f_artist_key(text)
    RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$
    SELECT regexp_replace(
      lower(public.f_unaccent(coalesce($1, ''))),
      '^((the|le|la|les)\\s+|l[''’]\\s*)(?=\\S)',
      ''
    )
  $$;
`;

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(ARTIST_KEY, { transaction });

      const [[{ groups }]] = await sequelize.query(`
        SELECT count(*)::int AS groups FROM (
          SELECT 1 FROM "Songs"
          GROUP BY user_uid, lower(f_unaccent(title)), f_artist_key(artist)
          HAVING count(*) > 1
        ) duplicates;
      `, { transaction });
      if (groups > 0) {
        throw new Error(`#36: ${groups} group(s) of songs in a Songlist would be duplicates under the new rule. Nothing was changed: decide what to do with them, then deploy again.`);
      }

      await sequelize.query('DROP INDEX IF EXISTS songs_user_uid_title_artist_ci;', { transaction });
      await sequelize.query(`
        CREATE UNIQUE INDEX songs_user_uid_title_artist_ci
        ON "Songs" (user_uid, lower(f_unaccent(title)), f_artist_key(artist));
      `, { transaction });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP INDEX IF EXISTS songs_user_uid_title_artist_ci;', { transaction });
      await sequelize.query(`
        CREATE UNIQUE INDEX songs_user_uid_title_artist_ci
        ON "Songs" (user_uid, lower(title), COALESCE(lower(artist), ''));
      `, { transaction });
      await sequelize.query('DROP FUNCTION IF EXISTS f_artist_key(text);', { transaction });
    });
  },
};
