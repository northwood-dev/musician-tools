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
//
// `session` used to be created lazily by connect-pg-simple (createTableIfMissing), on the first
// request, i.e. AFTER the boot guard and without RLS: exposed until the next restart, which the
// guard would then refuse. So this migration now owns it (created if missing, same shape as
// connect-pg-simple 10's table.sql) and the store no longer creates tables. IF EXISTS stays as a
// belt for `down`. Idempotent (re-enabling is a no-op). No row is touched.
async function createSessionTableIfMissing(queryInterface) {
  await queryInterface.sequelize.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `);
}

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
    await createSessionTableIfMissing(queryInterface);
    await setRowLevelSecurity(queryInterface, 'ENABLE');
  },

  // Turns RLS back off; does NOT drop `session` (it may predate this migration and hold sessions).
  async down(queryInterface) {
    await setRowLevelSecurity(queryInterface, 'DISABLE');
  },
};
