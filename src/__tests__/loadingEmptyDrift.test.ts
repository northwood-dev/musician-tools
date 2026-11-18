import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// #158 / #173 / #216 drift guard: a list loads with <ListSkeleton>, an empty list uses
// <EmptyState>, a list that failed to load uses <LoadFailed>, and visible text uses the
// real ellipsis "…". Any word followed by three dots ("Saving...", "Search songs..."), a
// hand-written centred grey empty-state paragraph, or a hand-written failed-load state
// ("Something went wrong." as text, a centred secondary Retry) fails here.
const SRC = join(__dirname, '..');
const EMPTY_STATE_OWNER = 'components/EmptyState.tsx';
const LOAD_FAILED_OWNER = 'components/LoadFailed.tsx';

// #173: a word directly followed by three dots, in visible text ("Saving...", "Search
// songs..."). JavaScript spread / rest (`{...props}`, `[...list]`, `(...args)`) has no
// word before the dots, so it never matches. Comment lines are skipped by the caller.
const THREE_DOTS = /([A-Za-z}][\w ,${}-]*?)\.\.\.(?=[\s'"`<)?!.,}]|$)/;
function threeDotTexts(line: string): string[] {
  if (/^\s*(\/\/|\*|\/\*)/.test(line)) return [];
  const m = line.match(THREE_DOTS);
  return m ? [`${m[1]}...`] : [];
}

// #216: a hand-written failed-load state, found in the WHOLE file (a copy spreads over
// several lines): "Something went wrong." as visible text (a JSX text node or a string), or
// the centred secondary Retry button the copies had. Returns the 1-based lines where they start.
// Not caught on purpose: the full-page title "Something went wrong" (no period), a Retry link
// inside a sentence (btn-link), a Retry in a Notice's action (btn-sm).
const HAND_WRITTEN_LOAD_FAILED = [
  />\s*Something went wrong\.\s*</g,
  /['"`]Something went wrong\.['"`]/g,
  /<button\b[^>]*\bbtn-secondary mt-3\b[^>]*>\s*Retry\s*<\/button>/g,
];
function handWrittenLoadFailed(source: string): number[] {
  const lines: number[] = [];
  for (const pattern of HAND_WRITTEN_LOAD_FAILED) {
    for (const m of source.matchAll(pattern)) lines.push(source.slice(0, m.index).split('\n').length);
  }
  return lines.sort((a, b) => a - b);
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

test('no three-dot ellipsis in visible text, and no hand-written empty or failed-load state', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = relative(SRC, file);
    const source = readFileSync(file, 'utf8');
    if (rel !== LOAD_FAILED_OWNER && rel.endsWith('.tsx')) { // visible text lives in components
      for (const line of handWrittenLoadFailed(source)) offenders.push(`${rel}:${line} — a hand-written failed-load state (use <LoadFailed>)`);
    }
    source.split('\n').forEach((line, i) => {
      for (const text of threeDotTexts(line)) offenders.push(`${rel}:${i + 1} — "${text}" (use the real ellipsis …)`);
      if (rel !== EMPTY_STATE_OWNER && /\btext-center\b/.test(line) && /\btext-gray-500\b/.test(line) && /\bpy-(6|8|10)\b/.test(line)) {
        offenders.push(`${rel}:${i + 1} — a hand-written empty state (use <EmptyState>)`);
      }

    });
  }
  expect(offenders).toEqual([]);
});

test('the ellipsis rule catches text, not JavaScript spread (probe)', () => {
  expect(threeDotTexts(`{saving ? 'Saving...' : 'Save'}`)).toEqual(['Saving...']);
  expect(threeDotTexts('placeholder="Search songs..."')).toEqual(['Search songs...']);
  expect(threeDotTexts('<Comp {...props} list={[...items]} fn={(...args) => f(...args)} />')).toEqual([]);
  expect(threeDotTexts('// Loading... in a comment')).toEqual([]);
  expect(threeDotTexts("{saving ? 'Saving…' : 'Save'}")).toEqual([]);
  expect(threeDotTexts("'Really...?'")).not.toEqual([]);
  expect(threeDotTexts('`Loading ${name}...`')).not.toEqual([]);
  expect(threeDotTexts('fn(a, ...rest)')).toEqual([]);
});

test('the failed-load rule catches the copies, even over several lines, and nothing legitimate (probe)', () => {
  expect(handWrittenLoadFailed('<p className="x">Something went wrong.</p>')).toEqual([1]);
  expect(handWrittenLoadFailed('<p>\n  Something went wrong.\n</p>')).toEqual([1]);
  expect(handWrittenLoadFailed("{'Something went wrong.'}")).toEqual([1]);
  expect(handWrittenLoadFailed('ok\n<button\n  type="button"\n  className="btn-secondary mt-3"\n  onClick={retry}\n>\n  Retry\n</button>')).toEqual([2]);
  expect(handWrittenLoadFailed('<Page title="Something went wrong">')).toEqual([]); // full-page title, no period
  expect(handWrittenLoadFailed('<button type="button" className="btn-link" onClick={retry}>Retry</button>')).toEqual([]);
  expect(handWrittenLoadFailed('<button type="button" className="btn-secondary btn-sm" onClick={retry}>Retry</button>')).toEqual([]);
});
