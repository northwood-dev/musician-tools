import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// #182 drift guard: every collapsible header gets its arrow from <Disclosure> (or its
// exported DisclosureArrow): ▸ that rotates, animated only under motion-safe. A
// hand-written ▾ ▸ ▴ ◂ in a file that uses aria-expanded fails here; decorative text
// elsewhere ("▸ Play") stays allowed.
const SRC = join(__dirname, '..');
const OWNER = 'components/Disclosure.tsx';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) ? [path] : [];
  });
}

test('no collapsible-header arrow is written by hand outside <Disclosure>', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = relative(SRC, file);
    if (rel === OWNER) continue;
    const source = readFileSync(file, 'utf8');
    if (!source.includes('aria-expanded')) continue;
    source.split('\n').forEach((line, i) => {
      if (/[▾▸▴◂]/.test(line)) offenders.push(`${rel}:${i + 1}`);
    });
  }
  expect(offenders).toEqual([]);
});
