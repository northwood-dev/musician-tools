jest.mock('../models', () => ({
  PracticeSession: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  sequelize: {
    // (options, callback): the nested call opens a savepoint on the caller's transaction
    transaction: jest.fn(async (options, callback) => callback({ id: 'savepoint', parent: options.transaction })),
  },
}));

const { PracticeSession, sequelize } = require('../models');
const { findOrCreateDaySession } = require('../services/daySession');

const day = { userUid: 'user-1', date: '2026-10-13', instrumentType: 'Bass' };
const tx = { id: 'tx' };

beforeEach(() => {
  jest.resetAllMocks();
  sequelize.transaction.mockImplementation(async (options, callback) =>
    callback({ id: 'savepoint', parent: options.transaction }));
});

test('returns the existing session of that day and instrument', async () => {
  const existing = { uid: 's1' };
  PracticeSession.findOne.mockResolvedValueOnce(existing);

  await expect(findOrCreateDaySession(day, tx)).resolves.toEqual([existing, false]);
  expect(PracticeSession.findOne).toHaveBeenCalledWith({ where: day, transaction: tx });
  expect(PracticeSession.create).not.toHaveBeenCalled();
});

test('creates it in a savepoint of the caller transaction when missing', async () => {
  const created = { uid: 's-new' };
  PracticeSession.findOne.mockResolvedValueOnce(null);
  PracticeSession.create.mockResolvedValueOnce(created);

  await expect(findOrCreateDaySession({ ...day, note: 'warm up' }, tx)).resolves.toEqual([created, true]);
  expect(sequelize.transaction).toHaveBeenCalledWith({ transaction: tx }, expect.any(Function));
  expect(PracticeSession.create).toHaveBeenCalledWith(
    { ...day, note: 'warm up' },
    { transaction: { id: 'savepoint', parent: tx } }
  );
});

test('a concurrent request that created it first wins: the loser reads its row', async () => {
  const winner = { uid: 's-winner' };
  PracticeSession.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
  PracticeSession.create.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { name: 'SequelizeUniqueConstraintError' }));

  await expect(findOrCreateDaySession(day, tx)).resolves.toEqual([winner, false]);
  expect(PracticeSession.findOne).toHaveBeenLastCalledWith({ where: day, transaction: tx });
});

test('any other failure is not swallowed', async () => {
  PracticeSession.findOne.mockResolvedValueOnce(null);
  PracticeSession.create.mockRejectedValueOnce(new Error('db down'));

  await expect(findOrCreateDaySession(day, tx)).rejects.toThrow('db down');
});
