import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// #181 drift guard: tabs come from <Tabs> (the standard pattern: keyboard, roving focus,
// tab ↔ panel link). A hand-written role="tab" elsewhere fails here.
const SRC = join(__dirname, '..');
const OWNER = 'components/Tabs.tsx';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) ? [path] : [];
  });
}

test('no tab is written by hand outside <Tabs>', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = relative(SRC, file);
    if (rel === OWNER) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (/role=["'{`]*tab(list|panel)?["'}`]/.test(line)) offenders.push(`${rel}:${i + 1}`);
    });
  }
  expect(offenders).toEqual([]);
});
