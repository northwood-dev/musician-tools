import { songPlayService } from '../services/songPlayService';
import { clearCsrfToken } from '../services/csrf';

// A mutation (POST) first fetches the CSRF token (story 7.3), then hits the
// endpoint. Mock keyed on URL so the token round-trip is transparent here.
function mockFetchWithCsrf(endpointResponse: unknown) {
  return jest.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.endsWith('/csrf-token')) {
      return Promise.resolve({ ok: true, json: async () => ({ csrfToken: 'tok' }) });
    }
    return Promise.resolve(endpointResponse);
  });
}

describe('songPlayService.markPlayed', () => {
  const originalFetch = global.fetch;
  const originalLocation = window.location;
  beforeEach(() => {
    clearCsrfToken();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    // Restore the real location: the 401 test below stubs it
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  test('sends the client-local day (playedOn) and instrument in the POST body (FR19/FR21)', async () => {
    const fetchMock = mockFetchWithCsrf({ ok: true, json: async () => ({ uid: 'play-1' }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    await songPlayService.markPlayed('song-1', { instrumentType: 'Guitar', playedOn: '2026-03-10' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/songs/song-1/plays',
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    );
    const mutationCall = fetchMock.mock.calls.find((c) => c[0] === '/api/songs/song-1/plays');
    const body = JSON.parse((mutationCall![1] as RequestInit).body as string);
    expect(body).toEqual({ instrumentType: 'Guitar', playedOn: '2026-03-10' });
  });

  test('throws a clear error when the request fails', async () => {
    global.fetch = mockFetchWithCsrf({ ok: false, status: 500 }) as unknown as typeof fetch;

    await expect(
      songPlayService.markPlayed('song-1', { instrumentType: 'Guitar', playedOn: '2026-03-10' })
    ).rejects.toThrow('Failed to mark song as played');
  });

  test('a 401 through a real service redirects to /login and clears the user (5.1)', async () => {
    localStorage.setItem('user', JSON.stringify({ uid: 'u1' }));
    const assignMock = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/my-sessions', assign: assignMock },
    });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as unknown as typeof fetch;

    // On 401 the call hangs (apiFetch never resolves, the page is navigating),
    // so the service never throws a misleading error. Don't await it.
    let threw = false;
    songPlayService.getPlays('song-1').catch(() => { threw = true; });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(localStorage.getItem('user')).toBeNull();
    expect(assignMock).toHaveBeenCalledWith('/login');
    expect(threw).toBe(false);
  });
});

// #244: the Songlist's plays in one request — each song's latest play per instrument, by song.
describe('songPlayService.getLastPlays', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  test('asks once for every song, and returns the plays by song', async () => {
    const bySong = { s1: [{ uid: 'p1', songUid: 's1', instrumentType: 'Guitar', instrumentUid: null, playedAt: '2026-03-01T10:00:00.000Z' }] };
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => bySong });
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(songPlayService.getLastPlays()).resolves.toEqual(bySong);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/songs/last-plays');
  });

  test('a failed request throws (the page then shows the plays as unknown)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    await expect(songPlayService.getLastPlays()).rejects.toThrow();
  });
});
