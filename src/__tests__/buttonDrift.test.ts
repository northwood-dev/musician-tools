import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// #154 drift guard: buttons come from the button block — the btn-primary / btn-secondary /
// btn-danger / btn-link classes with the btn-sm size (index.css) and <CloseButton> for ✕.
// A hand-written button colour, or a size override on a btn-* class, fails here. Layout
// classes (w-full, mt-3, justify-center, min-h-[44px]…) stay allowed at the call site.
const SRC = join(__dirname, '..');

// Each recipe is a set of patterns that must ALL be on one line, in any order; `unless`
// exempts lines that are not buttons (chips are #159's block).
const RECIPES: { what: string; all: RegExp[]; unless?: RegExp }[] = [
  { what: 'a hand-written red (danger) button', all: [/\bbg-red-(600|700)\b/] },
  { what: 'a hand-written solid brand button', all: [/\bbg-brand-500\b/, /\btext-white\b/], unless: /\brounded-full\b|text-\[10px\]/ },
  { what: 'a hand-written outline button', all: [/\brounded-md\b/, /\bborder-gray-(200|300)\b/, /\bpx-3\b/, /\bpy-1(\.5)?\b/] },
  { what: 'a size override on a btn-* class (use btn-sm)', all: [/\bbtn-(primary|secondary|danger|link)\b/, /(^|[\s'"`])(px-\d|py-\d|text-(xs|sm|base|lg))(?=[\s'"`]|$)/] },
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) ? [path] : [];
  });
}

test('no button colour or size is written by hand outside the button block', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = relative(SRC, file);
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      // Variant classes (hover:, focus-visible:, dark:…) are states, not the recipe itself.
      const plain = line.replace(/(^|[\s'"`])[a-z-]+:[^\s'"`]+/g, '$1');
      for (const { what, all, unless } of RECIPES) {
        if (all.every(p => p.test(plain)) && !(unless && unless.test(plain))) offenders.push(`${rel}:${i + 1} — ${what}`);
      }
    });
  }
  expect(offenders).toEqual([]);
});

test('no <button> is styled as a link by hand (use btn-link)', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const source = readFileSync(file, 'utf8');
    for (const tag of source.matchAll(/<button\b[^>]*?className=("[^"]*"|\{`[^`]*`\})/gs)) {
      const cls = tag[1];
      // Tabs (border-b-2) are their own element, not a link-looking button.
      if (/underline|\btext-brand-(500|600)\b/.test(cls) && !/\bbtn-/.test(cls) && !/border-b-2/.test(cls)) {
        offenders.push(`${relative(SRC, file)}:${source.slice(0, tag.index).split('\n').length}`);
      }
    }
  }
  expect(offenders).toEqual([]);
});

test('every ✕ / × button has a name (use <CloseButton label=…>)', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const source = readFileSync(file, 'utf8');
    for (const tag of source.matchAll(/<button\b((?:[^>]|=>)*?)>\s*(?:<span[^>]*>)?\s*[✕×]\s*(?:<\/span>)?\s*<\/button>/gs)) {
      if (!/aria-label=/.test(tag[1])) offenders.push(`${relative(SRC, file)}:${source.slice(0, tag.index).split('\n').length}`);
    }
  }
  expect(offenders).toEqual([]);
});
