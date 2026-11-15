import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// #156 drift guard: a panel opened under a button gets its frame from <Panel>. A
// hand-written `absolute right-0 … shadow-lg` panel frame elsewhere fails here, so the
// three copies (plus the header's own) can't come back.
const SRC = join(__dirname, '..');
const OWNER = 'components/Panel.tsx';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

test('no button-opened panel frame is written by hand outside <Panel>', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = relative(SRC, file);
    if (rel === OWNER) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      // A full-width dropdown (`left-0 right-0`: autocomplete lists) is another element.
      if (/\babsolute\b/.test(line) && /\bright-0\b/.test(line) && !/\bleft-0\b/.test(line) && /\bshadow-lg\b/.test(line)) offenders.push(`${rel}:${i + 1}`);
    });
  }
  expect(offenders).toEqual([]);
});
