// #212: the curators' queue of songs suggested to the Catalog (read-only).
jest.mock('../models', () => ({ sequelize: { query: jest.fn() } }));

const { sequelize } = require('../models');
const controller = require('../controllers/catalogsuggestioncontroller');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

// One row per group, as the query returns it: the group's most recently updated song.
const row = (overrides = {}) => ({
  uid: '11111111-1111-4111-8111-111111111111',
  title: 'Wonderwall', artist: 'Oasis', album: '(What\'s the Story) Morning Glory?',
  key: 'F#', mode: 'Minor', bpm: 87, time_signature: '4/4', duration_seconds: 258,
  language: ['English'], genre: ['Rock'], streaming_links: null, pitch_standard: 440,
  updatedAt: '2026-11-18T10:00:00.000Z', suggested_by: '3',
  catalog_uid: null, catalog_published_at: null,
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

test('lists one line per group with its count and the Catalog fields of its latest song', async () => {
  sequelize.query.mockResolvedValue([row()]);
  const res = mockRes();
  await controller.getSuggestions({ session: { user: 'curator' } }, res, jest.fn());
  const body = res.json.mock.calls[0][0];
  expect(body.pending).toBe(1);
  expect(body.suggestions).toEqual([{
    id: '11111111-1111-4111-8111-111111111111',
    suggestedBy: 3,
    song: {
      title: 'Wonderwall', artist: 'Oasis', album: '(What\'s the Story) Morning Glory?',
      key: 'F#', mode: 'Minor', bpm: 87, timeSignature: '4/4', durationSeconds: 258,
      language: ['English'], genre: ['Rock'], streamingLinks: null, pitchStandard: 440,
    },
    catalog: null,
  }]);
});

test('never exposes the user or anything personal, even if the row carried it', async () => {
  sequelize.query.mockResolvedValue([row({ user_uid: 'u-9', notes: 'my notes', instrument: ['Guitar'], capo: 2, myInstrumentUid: 'x' })]);
  const res = mockRes();
  await controller.getSuggestions({ session: { user: 'curator' } }, res, jest.fn());
  const json = JSON.stringify(res.json.mock.calls[0][0]);
  for (const leak of ['u-9', 'my notes', 'Guitar', 'capo', 'myInstrumentUid', 'user_uid', 'notes']) {
    expect(json).not.toContain(leak);
  }
});

test('flags a group already in the Catalog (published or draft)', async () => {
  sequelize.query.mockResolvedValue([
    row({ catalog_uid: 'cat-1', catalog_published_at: '2026-01-01T00:00:00.000Z' }),
    row({ uid: '22222222-2222-4222-8222-222222222222', title: 'Zombie', catalog_uid: 'cat-2', catalog_published_at: null }),
  ]);
  const res = mockRes();
  await controller.getSuggestions({ session: { user: 'curator' } }, res, jest.fn());
  const [published, draft] = res.json.mock.calls[0][0].suggestions;
  expect(published.catalog).toEqual({ uid: 'cat-1', published: true });
  expect(draft.catalog).toEqual({ uid: 'cat-2', published: false });
});

test('the query reads only suggested, complete, unlinked songs, grouped by the identity of the unique indexes', async () => {
  sequelize.query.mockResolvedValue([]);
  const res = mockRes();
  await controller.getSuggestions({ session: { user: 'curator' } }, res, jest.fn());
  const sql = sequelize.query.mock.calls[0][0];
  expect(sql).toMatch(/^\s*WITH\b/);
  expect(sql).toMatch(/catalog_suggestion\s*=\s*'suggested'/);
  expect(sql).toMatch(/source_catalog_uid IS NULL/);
  expect(sql).toMatch(/lower\(f_unaccent\(/);
  expect(sql).toMatch(/f_artist_key\(/);
  expect(res.json.mock.calls[0][0]).toEqual({ pending: 0, suggestions: [] });
});

test('a database failure is a 500, not a crash', async () => {
  sequelize.query.mockRejectedValue(new Error('db down'));
  const next = jest.fn();
  await controller.getSuggestions({ session: { user: 'curator' } }, mockRes(), next);
  expect(next.mock.calls[0][0].status).toBe(500);
});

// #213: Reject — every song of the group still suggested becomes rejected.
describe('rejectSuggestion (#213)', () => {
  const ID = '11111111-1111-4111-8111-111111111111';

  test('rejects the still-suggested, unlinked songs with the same identity and says how many', async () => {
    sequelize.query.mockResolvedValue([[{ uid: 'a' }, { uid: 'b' }], {}]); // raw query: [rows, metadata]
    const res = mockRes();
    await controller.rejectSuggestion({ params: { id: ID }, session: { user: 'curator' } }, res, jest.fn());
    const [sql, options] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/UPDATE "Songs"/);
    expect(sql).toMatch(/SET catalog_suggestion = 'rejected'/);
    expect(sql).toMatch(/catalog_suggestion = 'suggested'/);
    expect(sql).toMatch(/source_catalog_uid IS NULL/);
    expect(sql).not.toMatch(/updatedAt/); // the owners' songs are not "edited"
    expect(options.replacements).toEqual({ id: ID });
    expect(res.json).toHaveBeenCalledWith({ rejected: 2 });
  });

  test('a suggestion no longer waiting (opted out, linked, already rejected) is a 404', async () => {
    sequelize.query.mockResolvedValue([[], {}]);
    const next = jest.fn();
    await controller.rejectSuggestion({ params: { id: ID }, session: { user: 'curator' } }, mockRes(), next);
    expect(next.mock.calls[0][0].status).toBe(404);
  });

  test('a malformed id is a 404 without touching the database', async () => {
    const next = jest.fn();
    await controller.rejectSuggestion({ params: { id: 'nope' }, session: { user: 'curator' } }, mockRes(), next);
    expect(next.mock.calls[0][0].status).toBe(404);
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});

// #214: Link to it — the group's songs are tied to the published Catalog entry they match.
describe('linkSuggestion (#214)', () => {
  const ID = '11111111-1111-4111-8111-111111111111';
  const call = async () => {
    const res = mockRes();
    const next = jest.fn();
    await controller.linkSuggestion({ params: { id: ID }, session: { user: 'curator' } }, res, next);
    return { res, next };
  };

  test('links the still-suggested, unlinked songs to the published entry, stamped as synced', async () => {
    sequelize.query
      .mockResolvedValueOnce([{ catalog_uid: 'cat-1', published: true }]) // the line's match
      .mockResolvedValueOnce([[{ uid: 'a' }, { uid: 'b' }], {}]); // the UPDATE
    const { res } = await call();
    const [sql, options] = sequelize.query.mock.calls[1];
    expect(sql).toMatch(/SET source_catalog_uid = c\.uid/);
    expect(sql).toMatch(/source_catalog_synced_at = c\."updatedAt"/);
    expect(sql).toMatch(/c\.published_at IS NOT NULL/);
    expect(sql).not.toMatch(/"updatedAt" =/); // the owners' songs are not "edited"
    expect(options.replacements).toEqual({ id: ID });
    expect(res.json).toHaveBeenCalledWith({ linked: 2, catalogUid: 'cat-1' });
  });

  test('a suggestion no longer waiting is a 404', async () => {
    sequelize.query.mockResolvedValueOnce([]);
    const { next } = await call();
    expect(next.mock.calls[0][0].status).toBe(404);
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('no published entry to link to (none, or only a draft) is a 409', async () => {
    sequelize.query.mockResolvedValueOnce([{ catalog_uid: null, published: false }]);
    let { next } = await call();
    expect(next.mock.calls[0][0].status).toBe(409);
    sequelize.query.mockReset();
    sequelize.query.mockResolvedValueOnce([{ catalog_uid: 'draft-1', published: false }]);
    ({ next } = await call());
    expect(next.mock.calls[0][0].status).toBe(409);
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('a malformed id is a 404 without touching the database', async () => {
    const next = jest.fn();
    await controller.linkSuggestion({ params: { id: 'nope' }, session: { user: 'curator' } }, mockRes(), next);
    expect(next.mock.calls[0][0].status).toBe(404);
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});
