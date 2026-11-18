import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// #153 drift guard: the red / amber / green / grey message boxes live in <Notice> only.
// A hand-written copy of a tone's recipe anywhere else in the source fails here, so the
// copies the design pass removed (#141) can't come back one page at a time. The light
// background is enough to spot a message box; chips, buttons, table headers and hover
// states use other shades and are not matched.
const SRC = join(__dirname, '..');
const OWNER = 'components/Notice.tsx';
const LIVE_NOTICE_OWNER = 'components/LiveNotice.tsx';

// #225: a message that must be read out goes through <LiveNotice>, which keeps its region on
// the page. A hand-written `role="alert"` / `role="status"` element wrapping a <Notice> (only an
// expression between them, e.g. `{error && <Notice …`) is the copy it replaced. Read over the
// whole file: such a wrapper usually spans lines. Returns the 1-based lines where they start.
const HAND_WRITTEN_LIVE_REGION = /role=["'](alert|status)["'][^>]*>\s*\{[^<]*<Notice\b/g;
function handWrittenLiveRegions(source: string): number[] {
  return [...source.matchAll(HAND_WRITTEN_LIVE_REGION)].map(m => source.slice(0, m.index).split('\n').length);
}

// Each recipe is a set of classes that must ALL be on one line, in any order.
const RECIPES: [string, RegExp[]][] = [
  ['a red, amber or green message background', [/\bbg-(red|amber|green)-50(\/\d+)?(?=[\s'"`]|$)/]],
  ['a blue message box', [/\bbg-blue-50\b/, /\bborder-blue-\d+\b/]],
  ['the grey info box', [/\bbg-gray-50\b/, /\bborder-gray-200\b/, /\btext-gray-700\b/]],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) ? [path] : [];
  });
}

test('no message box recipe is written by hand outside <Notice>', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = relative(SRC, file);
    if (rel === OWNER) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      for (const [what, patterns] of RECIPES) {
        // Variant classes (hover:, focus-visible:, active:, dark:…) are states, not boxes.
        const plain = line.replace(/(^|[\s'"`])[a-z-]+:[^\s'"`]+/g, '$1');
        if (patterns.every(p => p.test(plain))) offenders.push(`${rel}:${i + 1} — ${what}`);
      }
    });
  }
  expect(offenders).toEqual([]);
});

test('no announcement region is written by hand around a <Notice> (#225: use <LiveNotice>)', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = relative(SRC, file);
    if (rel === LIVE_NOTICE_OWNER) continue;
    for (const line of handWrittenLiveRegions(readFileSync(file, 'utf8'))) offenders.push(`${rel}:${line} — a hand-written region around a Notice`);
  }
  expect(offenders).toEqual([]);
});

test('the live-region rule catches the wrappers, even over several lines, and nothing else (probe)', () => {
  expect(handWrittenLiveRegions('<div role="alert">{error && <Notice tone="error" announce="none">{error}</Notice>}</div>')).toEqual([1]);
  expect(handWrittenLiveRegions('x\n<div role="status" aria-label="Result">\n  {done && (\n    <Notice tone="success">{done}</Notice>\n  )}\n</div>')).toEqual([2]);
  expect(handWrittenLiveRegions('<div role="status" aria-label="History status">{sessions === null ? "Loading…" : null}</div>')).toEqual([]);
  expect(handWrittenLiveRegions('<div role="alert"><p>Boom</p><Notice tone="error">x</Notice></div>')).toEqual([]); // a tag in between: not a bare wrapper
  expect(handWrittenLiveRegions('<LiveNotice tone="error">{error}</LiveNotice>')).toEqual([]);
});
