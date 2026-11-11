const { checkServedVersion } = require('../scripts/check-served-version');

const URL = 'https://example.test/version.json';

// A fake fetch that answers each call with the next scripted answer (the last one
// repeats). An answer is { status, body } or an Error to throw (network failure).
function scriptedFetch(answers) {
  let call = 0;
  return async () => {
    const answer = answers[Math.min(call, answers.length - 1)];
    call += 1;
    if (answer instanceof Error) throw answer;
    return {
      ok: answer.status >= 200 && answer.status < 300,
      status: answer.status,
      text: async () => answer.body,
    };
  };
}

const json = (version) => ({ status: 200, body: JSON.stringify({ version }) });
const fast = { timeoutMs: 200, intervalMs: 1 };

describe('checkServedVersion (does production serve the deployed version?)', () => {
  test('resolves when the right version is served first time', async () => {
    const fetch = scriptedFetch([json('2.11.0')]);
    await expect(
      checkServedVersion({ url: URL, expected: '2.11.0', fetch, ...fast }),
    ).resolves.toBeUndefined();
  });

  test('waits while the old version is still served, then resolves on the new one', async () => {
    const fetch = scriptedFetch([json('2.10.1'), json('2.10.1'), json('2.11.0')]);
    await expect(
      checkServedVersion({ url: URL, expected: '2.11.0', fetch, ...fast }),
    ).resolves.toBeUndefined();
  });

  test('retries on an HTML answer (old build without version.json), then resolves', async () => {
    const html = { status: 200, body: '<!doctype html><html></html>' };
    const fetch = scriptedFetch([html, json('2.11.0')]);
    await expect(
      checkServedVersion({ url: URL, expected: '2.11.0', fetch, ...fast }),
    ).resolves.toBeUndefined();
  });

  test('retries on a non-2xx status, even with a version-looking body, then resolves', async () => {
    const notFound = { status: 404, body: JSON.stringify({ version: '2.11.0' }) };
    const fetch = scriptedFetch([notFound, notFound, json('2.11.0')]);
    let calls = 0;
    const counting = async (...args) => { calls += 1; return fetch(...args); };
    await checkServedVersion({ url: URL, expected: '2.11.0', fetch: counting, ...fast });
    expect(calls).toBe(3);
  });

  test('retries on a network error (machine still waking up), then resolves', async () => {
    const fetch = scriptedFetch([new Error('ECONNRESET'), json('2.11.0')]);
    await expect(
      checkServedVersion({ url: URL, expected: '2.11.0', fetch, ...fast }),
    ).resolves.toBeUndefined();
  });

  test('fails at the deadline after network errors only, saying so', async () => {
    const fetch = scriptedFetch([new Error('ECONNREFUSED')]);
    await expect(
      checkServedVersion({ url: URL, expected: '2.11.0', fetch, timeoutMs: 20, intervalMs: 1 }),
    ).rejects.toThrow(/expected 2\.11\.0, served no version \(.*ECONNREFUSED.*\)/);
  });

  test('fails at the deadline, naming the expected and the served version', async () => {
    const fetch = scriptedFetch([json('2.10.1')]);
    await expect(
      checkServedVersion({ url: URL, expected: '2.11.0', fetch, timeoutMs: 20, intervalMs: 1 }),
    ).rejects.toThrow('expected 2.11.0, served 2.10.1');
  });
});
