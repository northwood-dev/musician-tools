// Issue #18 — dev seeder for the verified test account. Models are mocked
// (jest.mock('../models')) per the project's backend test convention — no real DB.
// What these tests CANNOT exercise: the real unique constraints and the bcrypt round trip
// through login. That is checked by hand on the docker Postgres (`make seed` twice, then log in).
let mockEnv = 'development';
jest.mock('../config/env', () => ({
  get env() { return mockEnv; },
}));
jest.mock('../models', () => ({
  User: { create: jest.fn(), destroy: jest.fn() },
}));

const { Op } = require('sequelize');
const { User } = require('../models');
const seeder = require('../seeders/20261022000000-dev-test-user');

const queryInterfaceOn = host => ({ sequelize: { config: { host } } });

beforeEach(() => {
  jest.clearAllMocks();
  mockEnv = 'development';
});

describe('prod guard', () => {
  test('refuses outside development and writes nothing', async () => {
    mockEnv = 'production';
    await expect(seeder.up(queryInterfaceOn('localhost'))).rejects.toThrow(/development/);
    expect(User.destroy).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  test('refuses a remote database even in development (a wrong DATABASE_URL_DEV)', async () => {
    await expect(seeder.up(queryInterfaceOn('aws-1-eu.pooler.supabase.com'))).rejects.toThrow(/supabase/);
    expect(User.destroy).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  test('accepts the docker-compose database host', async () => {
    await expect(seeder.up(queryInterfaceOn('db'))).resolves.toBeUndefined();
  });
});

describe('up', () => {
  test('creates a verified, plain test user when it does not exist', async () => {
    await seeder.up(queryInterfaceOn('db'));
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      emailVerified: true,
      isAdmin: false,
      isCurator: false,
    }));
  });

  test('a rerun first deletes any previous test account, by email or by handle, so it comes back empty', async () => {
    const order = [];
    User.destroy.mockImplementation(async () => { order.push('destroy'); });
    User.create.mockImplementation(async () => { order.push('create'); });
    await seeder.up(queryInterfaceOn('db'));
    expect(order).toEqual(['destroy', 'create']);
  });

  test('recreates the account under the same fixed uid, so a browser still signed in keeps working', async () => {
    // Dev sessions live in the backend's memory and hold the uid; a new uid would leave them
    // pointing at a deleted user (reads empty, writes 500).
    await seeder.up(queryInterfaceOn('db'));
    await seeder.up(queryInterfaceOn('db'));
    const [first, second] = User.create.mock.calls.map(([values]) => values.uid);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).toBe(first);
    expect(User.destroy).toHaveBeenCalledWith({
      where: { [Op.or]: [{ email: 'test@example.com' }, { name: 'testuser', discriminator: '0000' }] },
    });
  });
});

describe('down', () => {
  test('deletes the seeded account only', async () => {
    await seeder.down(queryInterfaceOn('db'));
    expect(User.destroy).toHaveBeenCalledWith({ where: { name: 'testuser', discriminator: '0000' } });
  });

  test('is guarded like up', async () => {
    mockEnv = 'production';
    await expect(seeder.down(queryInterfaceOn('db'))).rejects.toThrow(/development/);
    expect(User.destroy).not.toHaveBeenCalled();
  });
});
