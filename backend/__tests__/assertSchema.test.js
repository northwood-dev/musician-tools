const { assertFunctionalIndexes, assertRowLevelSecurity, EXPECTED_INDEXES } = require('../utils/assertSchema');

// Mock a sequelize whose single catalog query returns the given rows.
function mockQueryRows(rows) {
  return { query: jest.fn().mockResolvedValue(rows) };
}

// Each guard reads the catalog once and writes nothing.
function expectOneReadOnlyQuery(sequelize) {
  expect(sequelize.query).toHaveBeenCalledTimes(1);
  expect(sequelize.query.mock.calls[0][0]).toMatch(/^\s*SELECT\b/i);
}

const ALL = EXPECTED_INDEXES.map(e => e.index);
const indexRows = names => names.map(indexname => ({ indexname }));

describe('assertFunctionalIndexes (story 11.1 fail-fast schema guard)', () => {
  test('resolves quietly when every expected functional index is present', async () => {
    const sequelize = mockQueryRows(indexRows(ALL));
    await expect(assertFunctionalIndexes(sequelize)).resolves.toBeUndefined();
    expectOneReadOnlyQuery(sequelize);
  });

  test('throws naming the missing index when one is absent', async () => {
    // playlists index missing
    const sequelize = mockQueryRows(indexRows(['topics_user_uid_name_ci_unaccent']));
    await expect(assertFunctionalIndexes(sequelize)).rejects.toThrow(/playlists_user_uid_name_ci/);
  });

  test('error tells the dev to run migrations when nothing is there', async () => {
    const sequelize = mockQueryRows([]);
    await expect(assertFunctionalIndexes(sequelize)).rejects.toThrow(/make migrate/);
  });
});

// #209: Supabase exposes every table of the schema through its REST API; only Row-Level
// Security keeps the API roles out. The boot refuses to serve while any table has it off.
describe('assertRowLevelSecurity (#209 fail-fast RLS guard)', () => {
  // The query LEFT JOINs the offending tables onto the current schema: always one row at least.
  const rlsRows = (names, schema = 'public') =>
    names.length ? names.map(relname => ({ schema, relname })) : [{ schema, relname: null }];

  test('resolves quietly when every table has RLS on', async () => {
    const sequelize = mockQueryRows(rlsRows([]));
    await expect(assertRowLevelSecurity(sequelize)).resolves.toBeUndefined();
    expectOneReadOnlyQuery(sequelize);
  });

  test('throws naming every table that has RLS off', async () => {
    const sequelize = mockQueryRows(rlsRows(['Setlists', 'session']));
    await expect(assertRowLevelSecurity(sequelize)).rejects.toThrow(/Setlists, session/);
  });

  test('error tells the dev how to fix it', async () => {
    const sequelize = mockQueryRows(rlsRows(['Setlists']));
    await expect(assertRowLevelSecurity(sequelize)).rejects.toThrow(/ENABLE ROW LEVEL SECURITY/);
    await expect(assertRowLevelSecurity(sequelize)).rejects.toThrow(/make migrate/);
  });

  test('refuses instead of passing silently when there is no current schema', async () => {
    const sequelize = mockQueryRows(rlsRows([], null));
    await expect(assertRowLevelSecurity(sequelize)).rejects.toThrow(/search_path/);
  });
});
