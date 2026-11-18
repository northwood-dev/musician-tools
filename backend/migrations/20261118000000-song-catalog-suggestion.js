'use strict';

// #190 / #211: whether a Songlist song is suggested to the Catalog. Three states, constrained:
//   private   — not suggested (DEFAULT: any creation path other than the "Add song" form, e.g.
//               Add from the Catalog or a collection, stays private without touching its code)
//   suggested — in the curators' queue (once it has a title and an artist, and no Catalog link)
//   rejected  — a curator said no; only the owner unchecking then checking suggests it again
// A column, not a copy: the queue reads the songs (one source of truth).
//
// Decided in the grilling (beta, ~4 users): songs ALREADY typed by hand are suggested too.
// Production count, read-only, 2026-11-18: 110 songs, 1 typed by hand (no Catalog link) with a
// title and an artist. `down` drops the column (the states are not worth keeping).
// No new table → the RLS boot guard (#209) has nothing to check here.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Songs', 'catalog_suggestion', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'private',
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE "Songs" ADD CONSTRAINT songs_catalog_suggestion_check
        CHECK (catalog_suggestion IN ('private', 'suggested', 'rejected'));
    `);
    await queryInterface.sequelize.query(`
      UPDATE "Songs" SET catalog_suggestion = 'suggested'
       WHERE source_catalog_uid IS NULL
         AND coalesce(btrim(title), '') <> ''
         AND coalesce(btrim(artist), '') <> '';
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Songs', 'catalog_suggestion');
  },
};
