'use strict';

// #36: the Catalog follows the same rule as the Songlist (migration 20261109000000): "Beatles"
// next to "The Beatles" is a twin entry, with the same title. Only the COMPARISON changes:
// official names such as "Beyoncé" stay as written. A duplicate isn't merged: it aborts,
// inside the transaction, so the release stops with production on the previous version.

module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const [[{ groups }]] = await sequelize.query(`
        SELECT count(*)::int AS groups FROM (
          SELECT 1 FROM "CatalogSongs"
          GROUP BY lower(f_unaccent(title)), f_artist_key(artist)
          HAVING count(*) > 1
        ) duplicates;
      `, { transaction });
      if (groups > 0) {
        throw new Error(`#36: ${groups} group(s) of Catalog entries would be duplicates under the new rule. Nothing was changed: decide what to do with them, then deploy again.`);
      }

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
    });
  },
};
