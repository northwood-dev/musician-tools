const httpErrors = require('http-errors');

jest.mock('../models', () => {
  return {
    Song: {
      create: jest.fn(async (data) => ({ ...data, uid: 'test-uid' })),
      findByPk: jest.fn()
    },
    SongPlay: {}
  };
});

const { Song } = require('../models');
const controller = require('../controllers/songcontroller');

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

function mockNext() {
  return jest.fn();
}

describe('songcontroller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createSong persists timeSignature and mode', async () => {
    const req = {
      session: { user: 'user-1' },
      body: {
        title: 'Test Song',
        bpm: 120,
        key: 'C',
        timeSignature: '4/4',
        mode: 'Major'
      }
    };
    const res = mockRes();
    const next = mockNext();

    await controller.createSong(req, res, next);

    expect(Song.create).toHaveBeenCalled();
    const arg = Song.create.mock.calls[0][0];
    expect(arg.timeSignature).toBe('4/4');
    expect(arg.mode).toBe('Major');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();
  });

  test('updateSong updates timeSignature and mode', async () => {
    const update = jest.fn();
    Song.findByPk.mockResolvedValue({
      userUid: 'user-1',
      update,
    });

    const req = {
      params: { uid: 'song-1' },
      session: { user: 'user-1' },
      body: {
        timeSignature: '3/4',
        mode: 'Minor'
      }
    };
    const res = mockRes();
    const next = mockNext();

    await controller.updateSong(req, res, next);

    expect(update).toHaveBeenCalled();
    const arg = update.mock.calls[0][0];
    expect(arg.timeSignature).toBe('3/4');
    expect(arg.mode).toBe('Minor');
    expect(res.json).toHaveBeenCalled();
  });
});