// #174: test output must only show what matters. A console message matching one of these
// patterns fails the test that printed it, so the noise fixed in #174 can't creep back:
//   - the React Router v7 "Future Flag" warning: tests must use the app's router options
//     (ROUTER_FUTURE), the same as the app;
// Ordinary errors (the logs of error-path tests) are left alone.
export const FORBIDDEN_CONSOLE: RegExp[] = [
  /React Router Future Flag Warning/,
];

export function forbiddenConsoleMessage(args: unknown[]): string | null {
  const text = args.map(a => (typeof a === 'string' ? a : a instanceof Error ? a.message : '')).join(' ');
  return FORBIDDEN_CONSOLE.some(p => p.test(text)) ? text : null;
}

export function installConsoleGuard() {
  for (const level of ['warn', 'error'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      const forbidden = forbiddenConsoleMessage(args);
      if (forbidden) throw new Error(`Forbidden console.${level} in a test (#174): ${forbidden.slice(0, 200)}`);
      original(...args);
    };
  }
}
