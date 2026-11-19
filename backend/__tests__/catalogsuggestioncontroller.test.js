// #212: the curators' queue of songs suggested to the Catalog (read-only).
jest.mock('../models', () => ({
  sequelize: { query: jest.fn() },
  Song: { findOne: jest.fn() },
  CatalogSong: { create: jest.fn() },
}));

const { sequelize, Song, CatalogSong } = require('../models');
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

test('shows curators only official track links, never a personal one', async () => {
  sequelize.query.mockResolvedValue([row({ streaming_links: [
    { label: 'Drive', url: 'https://drive.google.com/file/d/abc/view' },
    { label: 'YouTube', url: 'https://www.youtube.com/watch?v=bx1Bh8ZvH84' },
  ] })]);
  const res = mockRes();
  await controller.getSuggestions({ session: { user: 'curator' } }, res, jest.fn());
  expect(res.json.mock.calls[0][0].suggestions[0].song.streamingLinks).toEqual([{ label: 'YouTube', url: 'https://www.youtube.com/watch?v=bx1Bh8ZvH84' }]);
});

test('the count leaves out lines whose draft is already in progress', async () => {
  sequelize.query.mockResolvedValue([
    row(),
    row({ uid: '22222222-2222-4222-8222-222222222222', catalog_uid: 'draft-1', catalog_published_at: null }),
    row({ uid: '33333333-3333-4333-8333-333333333333', catalog_uid: 'cat-1', catalog_published_at: '2026-01-01T00:00:00.000Z' }),
  ]);
  const res = mockRes();
  await controller.getSuggestions({ session: { user: 'curator' } }, res, jest.fn());
  expect(res.json.mock.calls[0][0].pending).toBe(2);
  expect(res.json.mock.calls[0][0].suggestions).toHaveLength(3);
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
  expect(published.catalog).toEqual({ uid: 'cat-1', published: true, differences: [] });
  expect(draft.catalog).toEqual({ uid: 'cat-2', published: false });
});

test('the query reads only suggested, complete, unlinked songs, grouped by the identity of the unique indexes', async () => {
  sequelize.query.mockResolvedValue([]);
  const res = mockRes();
  await controller.getSuggestions({ session: { user: 'curator' } }, res, jest.fn());
  const sql = sequelize.query.mock.calls[0][0];
  expect(sql).toMatch(/^\s*WITH\b/);
  expect(sql).toMatch(/catalog_suggestion\s*=\s*'suggested'/);
  expect(sql).toMatch(/btrim/);
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
// #236: a line whose song is already published in the Catalog says, field by field, where the
// whole group differs from the entry: the entry's value, then each value suggested with how many
// users suggested it (most first). A suggester's empty field doesn't count.
describe('differences with the published entry (#236)', () => {
  const member = (values = {}) => ({
    key: 'F#', mode: 'Minor', bpm: 87, timeSignature: '4/4', durationSeconds: 258,
    language: ['English'], genre: ['Rock'], pitchStandard: 440, ...values,
  });
  const entry = (values = {}) => ({
    catalog_uid: 'cat-1', catalog_published_at: '2026-01-01T00:00:00.000Z',
    catalog_key: 'F#', catalog_mode: 'Minor', catalog_bpm: 87, catalog_time_signature: '4/4',
    catalog_duration_seconds: 258, catalog_language: ['English'], catalog_genre: ['Rock'],
    catalog_pitch_standard: 440, ...values,
  });
  const list = async (r) => {
    sequelize.query.mockResolvedValue([r]);
    const res = mockRes();
    await controller.getSuggestions({ session: { user: 'curator' } }, res, jest.fn());
    return res.json.mock.calls[0][0].suggestions[0].catalog;
  };

  test('lists each differing field with the entry value and the suggested values, most users first', async () => {
    const catalog = await list(row({
      ...entry({ catalog_bpm: 94 }),
      members: [member({ bpm: 120 }), member({ bpm: 120 }), member({ bpm: 118 }), member()],
    }));
    expect(catalog).toEqual({
      uid: 'cat-1',
      published: true,
      differences: [{
        field: 'bpm',
        catalog: 94,
        suggested: [{ value: 120, users: 2 }, { value: 118, users: 1 }, { value: 87, users: 1 }],
      }],
    });
  });

  test('a group identical to the entry has no difference', async () => {
    const catalog = await list(row({ ...entry(), members: [member(), member()] }));
    expect(catalog.differences).toEqual([]);
  });

  test("a suggester's empty field is not a proposal", async () => {
    const catalog = await list(row({
      ...entry(),
      members: [member({ bpm: null, key: '  ', genre: [], language: null })],
    }));
    expect(catalog.differences).toEqual([]);
  });

  test('lists compare as sets: order and repeats do not count', async () => {
    const catalog = await list(row({
      ...entry({ catalog_genre: ['Rock', 'Metal'] }),
      members: [member({ genre: ['Metal', 'Rock'] }), member({ genre: ['Metal', 'Rock', 'Rock'] })],
    }));
    expect(catalog.differences).toEqual([]);
  });

  test('a field empty in the entry but filled in a suggestion is a difference', async () => {
    const catalog = await list(row({
      ...entry({ catalog_key: null, catalog_genre: null }),
      members: [member({ genre: ['Rock', 'Grunge'] })],
    }));
    expect(catalog.differences).toEqual([
      { field: 'key', catalog: null, suggested: [{ value: 'F#', users: 1 }] },
      { field: 'genre', catalog: null, suggested: [{ value: ['Grunge', 'Rock'], users: 1 }] },
    ]);
  });

  test('a draft line says nothing about differences', async () => {
    const catalog = await list(row({ ...entry({ catalog_published_at: null, catalog_bpm: 1 }), members: [member()] }));
    expect(catalog).toEqual({ uid: 'cat-1', published: false });
  });
});

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
describe('mergeSuggestion (#214, #236)', () => {
  const ID = '11111111-1111-4111-8111-111111111111';
  const call = async () => {
    const res = mockRes();
    const next = jest.fn();
    await controller.mergeSuggestion({ params: { id: ID }, session: { user: 'curator' } }, res, next);
    return { res, next };
  };
  // One row per song of the group, with the entry it matches (re-read at merge time).
  const groupRow = (values = {}) => ({
    catalog_uid: 'cat-1', published: true,
    catalog_key: 'F#', catalog_mode: 'Minor', catalog_bpm: 87, catalog_time_signature: '4/4',
    catalog_duration_seconds: 258, catalog_language: ['English'], catalog_genre: ['Rock'],
    catalog_pitch_standard: 440,
    key: 'F#', mode: 'Minor', bpm: 87, time_signature: '4/4', duration_seconds: 258,
    language: ['English'], genre: ['Rock'], pitch_standard: 440,
    ...values,
  });

  test('with no difference, ties the waiting songs to the published entry and says how many', async () => {
    sequelize.query
      .mockResolvedValueOnce([groupRow(), groupRow({ bpm: null })]) // the group, re-read
      .mockResolvedValueOnce([[{ uid: 'a' }, { uid: 'b' }], {}]); // the UPDATE
    const { res } = await call();
    const [sql, options] = sequelize.query.mock.calls[1];
    expect(sql).toMatch(/SET source_catalog_uid = c\.uid/);
    expect(sql).toMatch(/c\.published_at IS NOT NULL/);
    expect(sql).not.toMatch(/"updatedAt" =/); // the owners' songs are not "edited"
    expect(options.replacements).toEqual({ id: ID });
    expect(res.json).toHaveBeenCalledWith({ linked: 2, catalogUid: 'cat-1' });
  });

  test('each tied song is up to date only if its values equal the entry (else its owner sees the banner)', async () => {
    sequelize.query
      .mockResolvedValueOnce([groupRow()])
      .mockResolvedValueOnce([[{ uid: 'a' }], {}]);
    await call();
    const [sql] = sequelize.query.mock.calls[1];
    expect(sql).toMatch(/source_catalog_synced_at = CASE WHEN[\s\S]+THEN c\."updatedAt" ELSE NULL END/);
  });

  test('values to review first: a 409 "differences", nothing tied (the dialog decides, #237)', async () => {
    sequelize.query.mockResolvedValueOnce([groupRow(), groupRow({ bpm: 120 })]);
    const { res, next } = await call();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].error).toBe('differences');
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('a suggestion no longer waiting is a 404', async () => {
    sequelize.query.mockResolvedValueOnce([]);
    const { next } = await call();
    expect(next.mock.calls[0][0].status).toBe(404);
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('no published entry to merge into (none, or only a draft) is a 409', async () => {
    sequelize.query.mockResolvedValueOnce([groupRow({ catalog_uid: null, published: false })]);
    let { next } = await call();
    expect(next.mock.calls[0][0].status).toBe(409);
    sequelize.query.mockReset();
    sequelize.query.mockResolvedValueOnce([groupRow({ catalog_uid: 'draft-1', published: false })]);
    ({ next } = await call());
    expect(next.mock.calls[0][0].status).toBe(409);
    expect(sequelize.query).toHaveBeenCalledTimes(1);
  });

  test('a malformed id is a 404 without touching the database', async () => {
    const next = jest.fn();
    await controller.mergeSuggestion({ params: { id: 'nope' }, session: { user: 'curator' } }, mockRes(), next);
    expect(next.mock.calls[0][0].status).toBe(404);
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});

// #215: Accept — a Catalog draft pre-filled from the line's song; publishing it links the songs.
describe('acceptSuggestion (#215)', () => {
  const ID = '11111111-1111-4111-8111-111111111111';
  const SONG = {
    uid: ID, title: ' Wonderwall ', artist: 'Oasis', album: null, key: 'F#', mode: 'minor', bpm: 87,
    timeSignature: '4/4', durationSeconds: 258, language: ['English'], genre: ['Rock'], pitchStandard: 440,
    streamingLinks: [{ label: 'YouTube', url: 'https://www.youtube.com/watch?v=bx1Bh8ZvH84' }],
    notes: 'my notes', instrument: ['Guitar'], capo: 2, userUid: 'u-9',
  };
  const call = async () => {
    const res = mockRes();
    const next = jest.fn();
    await controller.acceptSuggestion({ params: { id: ID }, session: { user: 'curator' } }, res, next);
    return { res, next };
  };

  test('creates a draft with the Catalog fields of the line\'s song, nothing personal', async () => {
    Song.findOne.mockResolvedValue(SONG);
    sequelize.query.mockResolvedValueOnce([{ catalog_uid: null, published: false }]);
    CatalogSong.create.mockResolvedValue({ uid: 'draft-1' });
    const { res } = await call();
    expect(Song.findOne.mock.calls[0][0].where).toEqual({ uid: ID, catalogSuggestion: 'suggested', sourceCatalogUid: null });
    const draft = CatalogSong.create.mock.calls[0][0];
    expect(draft).toEqual(expect.objectContaining({ title: 'Wonderwall', artist: 'Oasis', key: 'F#', bpm: 87, mode: 'Minor', streamingLinks: SONG.streamingLinks }));
    expect(draft.publishedAt).toBeUndefined(); // a draft
    for (const personal of ['notes', 'instrument', 'capo', 'userUid', 'uid']) expect(draft).not.toHaveProperty(personal);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ catalogUid: 'draft-1' });
  });

  test('only official track links go into the draft (the curator adds the right ones)', async () => {
    Song.findOne.mockResolvedValue({ ...SONG, streamingLinks: [{ label: 'Spotify', url: 'https://open.spotify.com/search/wonderwall' }] });
    sequelize.query.mockResolvedValueOnce([{ catalog_uid: null, published: false }]);
    CatalogSong.create.mockResolvedValue({ uid: 'draft-1' });
    await call();
    expect(CatalogSong.create.mock.calls[0][0].streamingLinks).toBeNull();
  });

  test('a suggestion no longer waiting is a 404, nothing created', async () => {
    Song.findOne.mockResolvedValue(null);
    const { next } = await call();
    expect(next.mock.calls[0][0].status).toBe(404);
    expect(CatalogSong.create).not.toHaveBeenCalled();
  });

  test('an entry with the same identity already exists (draft or published): 409 with its uid, nothing created', async () => {
    Song.findOne.mockResolvedValue(SONG);
    sequelize.query.mockResolvedValueOnce([{ catalog_uid: 'cat-1', published: false }]);
    const { res, next } = await call();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ catalogUid: 'cat-1' });
    expect(CatalogSong.create).not.toHaveBeenCalled();
  });
});

describe('linkSuggestionsToPublished (#215, called by publish)', () => {
  const { linkSuggestionsToPublished } = require('../services/catalogSuggestionLinks');
  const CAT = '33333333-3333-4333-8333-333333333333';
  const SUG = '11111111-1111-4111-8111-111111111111';
  const syncedAt = new Date('2026-11-18T12:00:00.000Z');

  test('links the still-suggested songs with the entry\'s identity OR the accepted suggestion\'s', async () => {
    sequelize.query.mockResolvedValue([[{ uid: 'a' }], {}]);
    const linked = await linkSuggestionsToPublished({ uid: CAT, updatedAt: syncedAt }, SUG);
    const [sql, options] = sequelize.query.mock.calls[0];
    expect(sql).toMatch(/catalog_suggestion = 'suggested'/);
    expect(sql).toMatch(/source_catalog_uid IS NULL/);
    expect(sql).toMatch(/UNION/);
    // the accepted suggestion's identity is read whatever its state (its owner may opt out)
    expect(sql).toMatch(/WHERE a\.uid = :suggestionId\s*\)/);
    expect(options.replacements).toEqual({ catalogUid: CAT, suggestionId: SUG, syncedAt });
    expect(linked).toBe(1);
  });

  test('without a (valid) accepted suggestion, only the entry\'s identity counts', async () => {
    sequelize.query.mockResolvedValue([[], {}]);
    await linkSuggestionsToPublished({ uid: CAT, updatedAt: syncedAt }, 'not-a-uuid');
    expect(sequelize.query.mock.calls[0][1].replacements.suggestionId).toBeNull();
  });
});
