import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// #203 drift guard: modal windows come from the Dialog block (native <dialog>: modal, named
// by its title, Escape / backdrop / ✕, focus in and back). A hand-written modal frame —
// a <dialog>, role="dialog" or aria-modal — anywhere else fails here.
const SRC = join(__dirname, '..');
const OWNER = 'components/Dialog.tsx';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) ? [path] : [];
  });
}

test('no modal window is written by hand outside the Dialog block', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = relative(SRC, file);
    if (rel === OWNER) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\/?\*|\{\/\*)/.test(line)) return; // a comment may name <dialog>
      // JSX only: a selector looking FOR an open modal ('[aria-modal="true"]') is not a frame.
      if (/<dialog\b|role\s*=\s*["'{`]*(alert)?dialog["'}`]|(?<!\[)\baria-modal\b/.test(line)) offenders.push(`${rel}:${i + 1}`);
    });
  }
  expect(offenders).toEqual([]);
});
