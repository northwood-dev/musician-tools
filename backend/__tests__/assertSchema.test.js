const { assertFunctionalIndexes, assertRowLevelSecurity, EXPECTED_INDEXES } = require('../utils/assertSchema');

// Mock a sequelize whose pg_indexes query returns the given index names.
function mockSequelize(presentIndexNames) {
  return {
    query: jest.fn().mockResolvedValue(presentIndexNames.map(indexname => ({ indexname })))
  };
}

const ALL = EXPECTED_INDEXES.map(e => e.index);

describe('assertFunctionalIndexes (story 11.1 fail-fast schema guard)', () => {
  test('resolves quietly when every expected functional index is present', async () => {
    const sequelize = mockSequelize(ALL);
    await expect(assertFunctionalIndexes(sequelize)).resolves.toBeUndefined();
    // a single read-only lookup, no side effects
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('throws naming the missing index when one is absent', async () => {
    // playlists index missing
    const sequelize = mockSequelize(['topics_user_uid_name_ci_unaccent']);
    await expect(assertFunctionalIndexes(sequelize)).rejects.toThrow(/playlists_user_uid_name_ci/);
  });

  test('error tells the dev to run migrations when nothing is there', async () => {
    const sequelize = mockSequelize([]);
    await expect(assertFunctionalIndexes(sequelize)).rejects.toThrow(/make migrate/);
  });
});

// #209: Supabase exposes every table of the schema through its REST API; only Row-Level
// Security keeps the API roles out. The boot refuses to serve while any table has it off.
describe('assertRowLevelSecurity (#209 fail-fast RLS guard)', () => {
  function mockTablesWithoutRls(names) {
    return { query: jest.fn().mockResolvedValue(names.map(relname => ({ relname }))) };
  }

  test('resolves quietly when every table has RLS on', async () => {
    const sequelize = mockTablesWithoutRls([]);
    await expect(assertRowLevelSecurity(sequelize)).resolves.toBeUndefined();
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('throws naming every table that has RLS off', async () => {
    const sequelize = mockTablesWithoutRls(['Setlists', 'session']);
    await expect(assertRowLevelSecurity(sequelize)).rejects.toThrow(/Setlists, session/);
  });

  test('error tells the dev how to fix it', async () => {
    const sequelize = mockTablesWithoutRls(['Setlists']);
    await expect(assertRowLevelSecurity(sequelize)).rejects.toThrow(/ENABLE ROW LEVEL SECURITY/);
    await expect(assertRowLevelSecurity(sequelize)).rejects.toThrow(/make migrate/);
  });
});
