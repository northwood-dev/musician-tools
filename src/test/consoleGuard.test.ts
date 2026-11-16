import { forbiddenConsoleMessage } from './consoleGuard';

test('a React Router future-flag warning is forbidden', () => {
  expect(forbiddenConsoleMessage(['⚠️ React Router Future Flag Warning: React Router will begin wrapping…'])).not.toBeNull();
});

test('an ordinary error from an error-path test is allowed', () => {
  expect(forbiddenConsoleMessage(['Error loading playlists:', new Error('network')])).toBeNull();
  expect(forbiddenConsoleMessage([new Error('boom')])).toBeNull();
});
