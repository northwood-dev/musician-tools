import { createConsoleGuard, forbiddenConsoleMessage } from './consoleGuard';

test('a React Router future-flag warning is forbidden', () => {
  expect(forbiddenConsoleMessage(['⚠️ React Router Future Flag Warning: React Router will begin wrapping…'])).not.toBeNull();
});

test('a React "not wrapped in act(...)" warning is forbidden', () => {
  expect(forbiddenConsoleMessage(['An update to X inside a test was not wrapped in act(...).'])).not.toBeNull();
});

test('an ordinary error from an error-path test is allowed', () => {
  expect(forbiddenConsoleMessage(['Error loading playlists:', new Error('network')])).toBeNull();
  expect(forbiddenConsoleMessage([new Error('boom')])).toBeNull();
});

// The mechanism itself, not just the matcher: a recorded forbidden message makes the end
// of test check throw, once; ordinary output never does.
test('the guard fails the test at its end when a forbidden message was printed, once', () => {
  const guard = createConsoleGuard();
  guard.record('error', ['An update to Foo inside a test was not wrapped in act(...)']);
  expect(() => guard.check()).toThrow(/Forbidden console output in a test/);
  expect(() => guard.check()).not.toThrow(); // reported once, then cleared for the next test
});

test('the guard lets ordinary output through', () => {
  const guard = createConsoleGuard();
  guard.record('error', ['Error loading playlists:', new Error('network')]);
  guard.record('warn', ['something else']);
  expect(() => guard.check()).not.toThrow();
});
