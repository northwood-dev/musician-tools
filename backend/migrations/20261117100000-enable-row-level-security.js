'use strict';

// #207 / #208: Supabase exposes every table of `public` through its auto-generated REST API
// (PostgREST) to the `anon` and `authenticated` roles. With Row-Level Security off, anyone
// holding the project's anon key could read and write Users (password hashes), AuthTokens and
// session. The app never uses that API: the backend connects as the tables' OWNER, and an owner
// bypasses RLS (FORCE is deliberately NOT used). So RLS on + no policy = the backend keeps full
// access, every API role is denied.
//
// Explicit list rather than "every table": `down` must undo exactly what `up` did. A table added
// later enables RLS in its own migration; the boot guard (#209) refuses to start otherwise.
// IF EXISTS: `session` is created lazily by connect-pg-simple and may be missing on a fresh DB.
// Idempotent (re-enabling is a no-op). No row is touched.
const TABLES = [
  'ArtistAliases',
  'AuthTokens',
  'CatalogCollectionSongs',
  'CatalogCollections',
  'CatalogSongs',
  'Instruments',
  'PlaylistSongs',
  'Playlists',
  'PracticeSessions',
  'SequelizeMeta',
  'SessionItems',
  'SongPlays',
  'Songs',
  'Topics',
  'Users',
  'session',
];

async function setRowLevelSecurity(queryInterface, state) {
  for (const table of TABLES) {
    await queryInterface.sequelize.query(`ALTER TABLE IF EXISTS "${table}" ${state} ROW LEVEL SECURITY;`);
  }
}

module.exports = {
  async up(queryInterface) {
    await setRowLevelSecurity(queryInterface, 'ENABLE');
  },

  async down(queryInterface) {
    await setRowLevelSecurity(queryInterface, 'DISABLE');
  },
};
