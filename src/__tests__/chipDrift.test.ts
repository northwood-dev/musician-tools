import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// #159 drift guard: chips and tags come from the chip block (Chip.tsx). A hand-written
// pill (`rounded-full px-3 py-1`), an amber tag (`bg-amber-100`) or a count badge
// (`rounded-full bg-brand-500 text-xs`, #190 review) elsewhere fails here.
const SRC = join(__dirname, '..');
const OWNER = 'components/Chip.tsx';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

test('no chip or tag is written by hand outside the chip block', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = relative(SRC, file);
    if (rel === OWNER) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (/\brounded-full\b/.test(line) && /\bpx-3\b/.test(line) && /\bpy-1\b/.test(line)) offenders.push(`${rel}:${i + 1} — a hand-written chip`);
      if (/\bbg-amber-100\b/.test(line)) offenders.push(`${rel}:${i + 1} — a hand-written tag`);
      if (/\brounded-full\b/.test(line) && /\bbg-brand-500\b/.test(line) && /\btext-xs\b/.test(line)) offenders.push(`${rel}:${i + 1} — a hand-written count badge`);
      if (/\brounded-md\b/.test(line) && /\bbg-blue-100\b/.test(line)) offenders.push(`${rel}:${i + 1} — a hand-written link chip`);
    });
  }
  expect(offenders).toEqual([]);
});
