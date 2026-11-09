'use strict';

// #36: two songs are the same song whatever the accents, and whatever a leading article on
// the artist: "Beatles" = "The Beatles", "Beyonce" = "Beyoncé". This holds for each person's
// Songlist and for the Catalog. Only the COMPARISON changes: no stored value is touched, so
// official names such as "Beyoncé" stay as written.
//
// f_artist_key is the database's definition of the artist part. An index can't read another
// table, so aliases (#76) can never take part in this rule. The application mirrors it in
// songDuplicate (frontend) and songIdentity (backend): if one differs on a rare character,
// these indexes decide.
//
// Both indexes change in ONE migration, so ONE transaction: `db:migrate` commits per file, so
// a Catalog duplicate found by a second file would leave the Songlist already on the new
// rule, under a release that failed and code that doesn't know it.
//
// Unlike 20260710 (the same index, case only), a duplicate is NOT merged here: it would
// silently decide between two songs carrying a person's notes and practice history. It
// aborts instead: the release stops and production stays on the previous version. The error
// gives counts only, because this runs in the deploy logs.

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

      const [[{ songs, entries }]] = await sequelize.query(`
        SELECT
          (SELECT count(*)::int FROM (
            SELECT 1 FROM "Songs"
            GROUP BY user_uid, lower(f_unaccent(title)), f_artist_key(artist)
            HAVING count(*) > 1
          ) s) AS songs,
          (SELECT count(*)::int FROM (
            SELECT 1 FROM "CatalogSongs"
            GROUP BY lower(f_unaccent(title)), f_artist_key(artist)
            HAVING count(*) > 1
          ) c) AS entries;
      `, { transaction });
      if (songs > 0 || entries > 0) {
        throw new Error(`#36: duplicates under the new rule: ${songs} group(s) of songs in a Songlist, ${entries} group(s) of Catalog entries. Nothing was changed: decide what to do with them, then deploy again.`);
      }

      await sequelize.query('DROP INDEX IF EXISTS songs_user_uid_title_artist_ci;', { transaction });
      await sequelize.query(`
        CREATE UNIQUE INDEX songs_user_uid_title_artist_ci
        ON "Songs" (user_uid, lower(f_unaccent(title)), f_artist_key(artist));
      `, { transaction });

      await sequelize.query('DROP INDEX IF EXISTS catalog_songs_title_artist_ci;', { transaction });
      await sequelize.query(`
        CREATE UNIQUE INDEX catalog_songs_title_artist_ci
        ON "CatalogSongs" (lower(f_unaccent(title)), f_artist_key(artist));
      `, { transaction });
    });
  },

  async down(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP INDEX IF EXISTS catalog_songs_title_artist_ci;', { transaction });
      await sequelize.query(`
        CREATE UNIQUE INDEX catalog_songs_title_artist_ci
        ON "CatalogSongs" (lower(title), COALESCE(lower(artist), ''));
      `, { transaction });

      await sequelize.query('DROP INDEX IF EXISTS songs_user_uid_title_artist_ci;', { transaction });
      await sequelize.query(`
        CREATE UNIQUE INDEX songs_user_uid_title_artist_ci
        ON "Songs" (user_uid, lower(title), COALESCE(lower(artist), ''));
      `, { transaction });

      await sequelize.query('DROP FUNCTION IF EXISTS f_artist_key(text);', { transaction });
    });
  },
};
