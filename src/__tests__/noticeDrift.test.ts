import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// #153 drift guard: the red / amber / green / grey message boxes live in <Notice> only.
// A hand-written copy of a tone's recipe anywhere else in the source fails here, so the
// copies the design pass removed (#141) can't come back one page at a time. The light
// background is enough to spot a message box; chips, buttons, table headers and hover
// states use other shades and are not matched.
const SRC = join(__dirname, '..');
const OWNER = 'components/Notice.tsx';

const RECIPES: [string, RegExp][] = [
  ['a red, amber or green message background', /\bbg-(red|amber|green)-50(\/\d+)?\b/],
  ['the grey info box', /border-gray-200 bg-gray-50 text-gray-700/],
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
      for (const [what, pattern] of RECIPES) {
        // Hover / focus states of buttons and rows are not message boxes.
        if (pattern.test(line.replace(/\b(hover|focus|group-hover):\S+/g, ''))) offenders.push(`${rel}:${i + 1} — ${what}`);
      }
    });
  }
  expect(offenders).toEqual([]);
});
