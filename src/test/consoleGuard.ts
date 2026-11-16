// #174: test output must only show what matters. A console message matching one of these
// patterns fails the test that printed it, so the noise fixed in #174 can't creep back:
//   - the React Router v7 "Future Flag" warning: tests must use the app's router options
//     (ROUTER_FUTURE), the same as the app;
//   - React's "not wrapped in act(...)" warning: a test must wait for the visible result of
//     the update it triggers (findBy…, waitFor, or act around an async action), not end early;
// Ordinary errors (the logs of error-path tests) are left alone.
export const FORBIDDEN_CONSOLE: RegExp[] = [
  /React Router Future Flag Warning/,
  /not wrapped in act/,
];

export function forbiddenConsoleMessage(args: unknown[]): string | null {
  const text = args.map(a => (typeof a === 'string' ? a : a instanceof Error ? a.message : '')).join(' ');
  return FORBIDDEN_CONSOLE.some(p => p.test(text)) ? text : null;
}

// Forbidden messages are RECORDED, not thrown on the spot: a throw from inside
// console.error would land in React's update path (an act warning fires while React
// applies an async update), where it can be swallowed or break that update — the test
// might then pass anyway. Each test instead fails at its end if it printed one; a message
// that lands after a test has ended fails the next test, or the file.
export function createConsoleGuard() {
  const seen: string[] = [];
  return {
    record(level: 'warn' | 'error', args: unknown[]) {
      const forbidden = forbiddenConsoleMessage(args);
      if (forbidden) seen.push(`console.${level}: ${forbidden.slice(0, 300)}`);
    },
    check() {
      if (seen.length === 0) return;
      const messages = seen.splice(0);
      throw new Error(`Forbidden console output in a test (#174):\n${messages.join('\n')}`);
    },
  };
}

export function installConsoleGuard() {
  const guard = createConsoleGuard();
  for (const level of ['warn', 'error'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      guard.record(level, args);
      original(...args);
    };
  }
  afterEach(() => guard.check());
  afterAll(() => guard.check());
}
