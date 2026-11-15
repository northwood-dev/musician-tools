import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// #157 drift guard: fields and labels use the shared input-base / label-base classes
// (index.css). The song form's own recipe (rounded-md border-gray-300 p-2 …, and its
// labels) had been copied 16+ times; a hand-written copy anywhere fails here. The small
// uppercase labels of the session and topic forms are another, deliberate style.
const SRC = join(__dirname, '..');

const RECIPES: [string, RegExp[]][] = [
  ['a hand-written input (use input-base)', [/\brounded-md\b/, /\bborder-gray-300\b/, /(^|[\s'"`])p-2(?=[\s'"`]|$)/]],
  ['a hand-written label (use label-base)', [/\bblock text-sm font-medium text-gray-700\b/]],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

test('no field or label recipe is written by hand', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = relative(SRC, file);
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      for (const [what, patterns] of RECIPES) {
        if (patterns.every(p => p.test(line))) offenders.push(`${rel}:${i + 1} — ${what}`);
      }
    });
  }
  expect(offenders).toEqual([]);
});
