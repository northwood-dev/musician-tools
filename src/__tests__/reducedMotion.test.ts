import { readFileSync } from 'fs';
import { join } from 'path';

// #39: jsdom loads no stylesheet and evaluates no media query, so no test can watch an
// animation stop. This guard reads the global stylesheet's TEXT and checks that the
// reduced-motion rule is there and still covers every kind of motion, so it can't be
// dropped or emptied silently. It is not a rendering check: in Chrome only the
// setting-off values were measured (pulse 2s, sidebar 0.3s, smooth scrolling).
const withoutComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '');

// The body of the first `@media (prefers-reduced-motion: reduce) { … }` block, comments
// stripped first so a commented-out rule doesn't count.
function reducedMotionBlock(source: string): string | null {
  const css = withoutComments(source);
  const start = css.search(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/);
  if (start < 0) return null;
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  return null;
}

const block = reducedMotionBlock(readFileSync(join(__dirname, '..', 'index.css'), 'utf8')) ?? '';

test('the global stylesheet has a reduced-motion rule', () => {
  expect(block).not.toBe('');
});

test('a commented-out rule does not count', () => {
  expect(reducedMotionBlock('/* @media (prefers-reduced-motion: reduce) { * { animation: none } } */')).toBeNull();
});

test.each([
  ['animations end at once', /animation-duration\s*:\s*0\.01ms\s*!important/],
  ['animations run once', /animation-iteration-count\s*:\s*1\s*!important/],
  ['animations start at once', /animation-delay\s*:\s*0s\s*!important/],
  ['transitions end at once', /transition-duration\s*:\s*0\.01ms\s*!important/],
  ['transitions start at once', /transition-delay\s*:\s*0s\s*!important/],
  ['scrolling jumps', /scroll-behavior\s*:\s*auto\s*!important/],
])('under reduced motion, %s', (_what, declaration) => {
  expect(block).toMatch(declaration);
});

test('the rule reaches every element, including pseudo-elements', () => {
  expect(block).toMatch(/\*\s*,\s*\*::before\s*,\s*\*::after\s*\{/);
});
