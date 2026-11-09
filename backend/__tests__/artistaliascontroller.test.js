// #76: artist aliases. Models mocked per the backend convention; the index and the SQL search
// are checked on a real Postgres, which these tests can't see.
jest.mock('../models', () => ({
  ArtistAlias: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    sequelize: { query: jest.fn() },
  },
}));

const { ArtistAlias } = require('../models');
const controller = require('../controllers/artistaliascontroller');

const UID = '11111111-1111-4111-8111-111111111111';
const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn(), end: jest.fn() });
const session = { user: 'u1' };

describe('artistaliascontroller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listing returns the aliases with their artists', async () => {
    ArtistAlias.findAll.mockResolvedValue([{ uid: 'a', alias: 'RHCP', artist: 'Red Hot Chili Peppers' }]);
    const res = mockRes();
    const next = jest.fn();

    await controller.listArtistAliases({ session }, res, next);

    expect(res.json).toHaveBeenCalledWith([{ uid: 'a', alias: 'RHCP', artist: 'Red Hot Chili Peppers' }]);
    expect(next).not.toHaveBeenCalled();
  });

  test('a failing listing goes to the error handler', async () => {
    ArtistAlias.findAll.mockRejectedValue(new Error('boom'));
    const next = jest.fn();

    await controller.listArtistAliases({ session }, mockRes(), next);

    expect(next.mock.calls[0][0].status).toBe(500);
  });

  test('the curator listing returns the count of entries found', async () => {
    ArtistAlias.sequelize.query.mockResolvedValue([{ uid: 'a', alias: 'RHCP', artist: 'Red Hot Chili Peppers', entryCount: 19 }]);
    const res = mockRes();

    await controller.listArtistAliasesWithCounts({ session }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith([{ uid: 'a', alias: 'RHCP', artist: 'Red Hot Chili Peppers', entryCount: 19 }]);
  });

  test('adding trims the values and returns the alias -> 201', async () => {
    ArtistAlias.create.mockImplementation(async (data) => ({ uid: 'a', ...data }));
    const res = mockRes();
    const next = jest.fn();

    await controller.createArtistAlias({ session, body: { alias: ' RHCP ', artist: ' Red Hot Chili Peppers ' } }, res, next);

    expect(ArtistAlias.create).toHaveBeenCalledWith({ alias: 'RHCP', artist: 'Red Hot Chili Peppers' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  test.each([
    ['an empty alias', { alias: '   ', artist: 'Queen' }],
    ['an empty artist', { alias: 'QN', artist: '' }],
    ['a missing alias', { artist: 'Queen' }],
    ['an alias that is not text', { alias: 3, artist: 'Queen' }],
    ['an alias of only punctuation', { alias: '!!!', artist: 'Queen' }],
    ['an artist of only punctuation', { alias: 'QN', artist: '...' }],
    ['an alias too long', { alias: 'x'.repeat(256), artist: 'Queen' }],
    ['an artist too long', { alias: 'QN', artist: 'x'.repeat(256) }],
    ['a NUL byte', { alias: `QN${String.fromCharCode(0)}`, artist: 'Queen' }],
  ])('adding refuses %s -> 400, nothing created', async (_label, body) => {
    const next = jest.fn();

    await controller.createArtistAlias({ session, body }, mockRes(), next);

    expect(next.mock.calls[0][0].status).toBe(400);
    expect(ArtistAlias.create).not.toHaveBeenCalled();
  });

  test('a duplicate alias -> 409 with the existing alias', async () => {
    ArtistAlias.create.mockRejectedValue({ name: 'SequelizeUniqueConstraintError' });
    ArtistAlias.findOne.mockResolvedValue({ uid: 'a', alias: 'RHCP', artist: 'Red Hot Chili Peppers' });
    const res = mockRes();

    await controller.createArtistAlias({ session, body: { alias: 'r.h.c.p', artist: 'Someone' } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'duplicate_alias',
      alias: expect.objectContaining({ alias: 'RHCP' }),
    }));
  });

  test('a duplicate whose lookup fails is still a 409', async () => {
    ArtistAlias.create.mockRejectedValue({ name: 'SequelizeUniqueConstraintError' });
    ArtistAlias.findOne.mockRejectedValue(new Error('boom'));
    const res = mockRes();

    await controller.createArtistAlias({ session, body: { alias: 'RHCP', artist: 'Someone' } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ alias: null }));
  });

  test('removing an alias -> 204', async () => {
    ArtistAlias.destroy.mockResolvedValue(1);
    const res = mockRes();

    await controller.deleteArtistAlias({ session, params: { uid: UID } }, res, jest.fn());

    expect(ArtistAlias.destroy).toHaveBeenCalledWith({ where: { uid: UID } });
    expect(res.status).toHaveBeenCalledWith(204);
  });

  test.each([['an unknown uid', UID, 0], ['a malformed uid', 'nope', 0]])('removing %s -> 404', async (_label, uid, count) => {
    ArtistAlias.destroy.mockResolvedValue(count);
    const next = jest.fn();

    await controller.deleteArtistAlias({ session, params: { uid } }, mockRes(), next);

    expect(next.mock.calls[0][0].status).toBe(404);
  });
});
