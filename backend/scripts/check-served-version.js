// Checks that production serves the version that was just deployed (#66), by
// polling its /version.json until it matches or the deadline passes. Called by the
// Deploy workflow right after `flyctl deploy`:
//
//   node backend/scripts/check-served-version.js <url> <expected version>
//
// Exits 0 on a match, 1 with "expected X, served Y" otherwise.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// What production answers, in words: its version, or why there is none yet.
async function readServed(url, fetch) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    // Network error or request timeout, typically a Fly machine still waking up.
    return `no version (${error.cause?.code || error.message})`;
  }
  if (!response.ok) return `no version (HTTP ${response.status})`;
  const text = await response.text();
  try {
    const { version } = JSON.parse(text);
    if (typeof version === 'string') return version;
  } catch {
    // Not JSON: typically the HTML page of a build that has no version.json yet.
  }
  return 'no version (not a version.json)';
}

async function checkServedVersion({ url, expected, fetch, timeoutMs, intervalMs }) {
  const deadline = Date.now() + timeoutMs;
  let served;
  for (;;) {
    served = await readServed(url, fetch);
    if (served === expected) return;
    if (Date.now() >= deadline) break;
    await sleep(intervalMs);
  }
  throw new Error(`expected ${expected}, served ${served}`);
}

module.exports = { checkServedVersion };

if (require.main === module) {
  const [url, expected] = process.argv.slice(2);
  if (!url || !expected) {
    console.error('Usage: node check-served-version.js <url> <expected version>');
    process.exit(2);
  }
  // A request that hangs (machine waking up) is cut short and retried.
  const fetchWithTimeout = (target) =>
    fetch(target, { signal: AbortSignal.timeout(10_000), cache: 'no-store' });
  checkServedVersion({
    url,
    expected,
    fetch: fetchWithTimeout,
    timeoutMs: 120_000,
    intervalMs: 5_000,
  }).then(
    () => console.log(`Production serves ${expected}.`),
    (error) => {
      console.error(`Production does not serve the deployed version: ${error.message}`);
      process.exit(1);
    },
  );
}
