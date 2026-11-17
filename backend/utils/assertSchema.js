'use strict';

// Story 11.1: migrations are the single source of truth for the schema. The
// case/accent-insensitive per-user UNIQUE constraints are FUNCTIONAL indexes
// (e.g. lower(name)) that can't be expressed in Sequelize's index DSL — so
// sync({alter:false}) never creates them; only the migrations do. This guard
// runs at boot (after sync) and FAILS FAST if any expected index is missing,
// instead of silently serving a schema without per-user uniqueness. It replaces
// the old self-healing afterSync hook (which duplicated the migration SQL).
const EXPECTED_INDEXES = [
  // migration 20260625000000-topics-name-ci-unaccent (story 7.12)
  { table: 'Topics', index: 'topics_user_uid_name_ci_unaccent' },
  // migration 20260628000200-playlists-name-ci-unique (story 10.1)
  { table: 'Playlists', index: 'playlists_user_uid_name_ci' },
  // migration 20261109100000-search-key-and-artist-aliases (#76): shared, not per-user
  { table: 'ArtistAliases', index: 'artist_aliases_alias_search_key' }
];

// Throws (does NOT exit — the caller decides) when a functional unique index is
// absent, so the boot can log it and exit. Pure + injectable for testing.
async function assertFunctionalIndexes(sequelize) {
  const names = EXPECTED_INDEXES.map(e => e.index);
  // Scope to the app's own schema: pg_indexes.indexname is unique per schema, not
  // globally, so a same-named index in another schema must not satisfy the check.
  const rows = await sequelize.query(
    'SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND indexname IN (:names)',
    { type: 'SELECT', replacements: { names } }
  );
  const present = new Set(rows.map(r => r.indexname));
  const missing = EXPECTED_INDEXES.filter(e => !present.has(e.index));
  if (missing.length > 0) {
    const list = missing.map(e => `${e.index} (on ${e.table})`).join(', ');
    throw new Error(
      `Missing functional unique index(es): ${list}. The DB schema is out of date — ` +
      'run `make migrate` (migrations are the single source of truth for the schema).'
    );
  }
}

// #207 / #209: Supabase serves every table of the schema through its auto-generated REST API to
// the `anon` / `authenticated` roles; Row-Level Security (on, with no policy) is what keeps them
// out, while the backend, as the tables' owner, bypasses it. So the boot REFUSES to serve while
// any table has RLS off — a new table whose migration forgot it, or one created by the sync
// safety net above. Reads the catalog, not a hard-coded list: a new table is covered for free.
// Same contract as the index guard: throws, the caller logs and exits.
async function assertRowLevelSecurity(sequelize) {
  const rows = await sequelize.query(
    `SELECT c.relname FROM pg_class c
      WHERE c.relnamespace = current_schema()::regnamespace
        AND c.relkind IN ('r', 'p')
        AND NOT c.relrowsecurity
      ORDER BY c.relname`,
    { type: 'SELECT' }
  );
  if (rows.length > 0) {
    const list = rows.map(r => r.relname).join(', ');
    throw new Error(
      `Row-Level Security is off on: ${list}. Without it, Supabase's REST API exposes the table ` +
      'to anyone holding the anon key. Add `ALTER TABLE "<table>" ENABLE ROW LEVEL SECURITY;` ' +
      'to the migration that creates the table, then run `make migrate`.'
    );
  }
}

module.exports = { assertFunctionalIndexes, assertRowLevelSecurity, EXPECTED_INDEXES };
