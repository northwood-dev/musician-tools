import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// #158 drift guard: a list loads with <ListSkeleton>, a short load says "Loading…" (the
// real ellipsis), and an empty list uses <EmptyState>. "Loading..." with three dots, or a
// hand-written centred grey empty-state paragraph, fails here.
const SRC = join(__dirname, '..');
const OWNER = 'components/EmptyState.tsx';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

test('no "Loading..." and no hand-written empty state', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = relative(SRC, file);
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (/Loading\.\.\./.test(line)) offenders.push(`${rel}:${i + 1} — "Loading..." (use "Loading…" or <ListSkeleton>)`);
      if (rel !== OWNER && /\btext-center\b/.test(line) && /\btext-gray-500\b/.test(line) && /\bpy-(6|8|10)\b/.test(line)) {
        offenders.push(`${rel}:${i + 1} — a hand-written empty state (use <EmptyState>)`);
      }
    });
  }
  expect(offenders).toEqual([]);
});
