// #76: artist aliases. Models mocked per the backend convention; the index and the SQL search
// are checked on a real Postgres, which these tests can't see.
jest.mock('../models', () => ({
  ArtistAlias: { findAll: jest.fn() },
}));

const { ArtistAlias } = require('../models');
const controller = require('../controllers/artistaliascontroller');

const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('artistaliascontroller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listing returns the aliases with their artists', async () => {
    ArtistAlias.findAll.mockResolvedValue([{ uid: 'a', alias: 'RHCP', artist: 'Red Hot Chili Peppers' }]);
    const res = mockRes();
    const next = jest.fn();

    await controller.listArtistAliases({ session: { user: 'u1' } }, res, next);

    expect(res.json).toHaveBeenCalledWith([{ uid: 'a', alias: 'RHCP', artist: 'Red Hot Chili Peppers' }]);
    expect(next).not.toHaveBeenCalled();
  });

  test('a failing listing goes to the error handler', async () => {
    ArtistAlias.findAll.mockRejectedValue(new Error('boom'));
    const next = jest.fn();

    await controller.listArtistAliases({ session: { user: 'u1' } }, mockRes(), next);

    expect(next.mock.calls[0][0].status).toBe(500);
  });
});
