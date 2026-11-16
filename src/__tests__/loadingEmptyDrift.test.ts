import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// #158 drift guard: a list loads with <ListSkeleton>, a short load says "Loading…" (the
// real ellipsis), and an empty list uses <EmptyState>. "Loading..." with three dots, or a
// hand-written centred grey empty-state paragraph, fails here.
const SRC = join(__dirname, '..');
const OWNER = 'components/EmptyState.tsx';

// #173: a word directly followed by three dots, in visible text ("Saving...", "Search
// songs..."). JavaScript spread / rest (`{...props}`, `[...list]`, `(...args)`) has no
// word before the dots, so it never matches. Comment lines are skipped by the caller.
const THREE_DOTS = /([A-Za-z][\w ,-]*?)\.\.\.(?=[\s'"`<)]|$)/;
function threeDotTexts(line: string): string[] {
  if (/^\s*(\/\/|\*|\/\*)/.test(line)) return [];
  const m = line.match(THREE_DOTS);
  return m ? [`${m[1]}...`] : [];
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

test('no three-dot ellipsis in visible text, and no hand-written empty state', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = relative(SRC, file);
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      for (const text of threeDotTexts(line)) offenders.push(`${rel}:${i + 1} — "${text}" (use the real ellipsis …)`);
      if (rel !== OWNER && /\btext-center\b/.test(line) && /\btext-gray-500\b/.test(line) && /\bpy-(6|8|10)\b/.test(line)) {
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
});
