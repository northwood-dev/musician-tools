import { readFileSync } from 'fs';
import { join } from 'path';

// #39: jsdom loads no stylesheet and evaluates no media query, so no test can watch an
// animation stop. This guard reads the global stylesheet and checks that the
// reduced-motion rule is there and still covers every kind of motion — so it can't be
// dropped or emptied silently. The real effect was checked in Chrome with macOS
// "Reduce motion" on.
const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');

// The body of the first `@media (prefers-reduced-motion: reduce) { … }` block.
function reducedMotionBlock(source: string): string | null {
  const start = source.search(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/);
  if (start < 0) return null;
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  return null;
}

test('the global stylesheet has a reduced-motion rule', () => {
  expect(reducedMotionBlock(css)).not.toBeNull();
});

test.each([
  ['animations end at once', /animation-duration\s*:\s*0\.01ms\s*!important/],
  ['animations run once', /animation-iteration-count\s*:\s*1\s*!important/],
  ['transitions end at once', /transition-duration\s*:\s*0\.01ms\s*!important/],
  ['scrolling jumps', /scroll-behavior\s*:\s*auto\s*!important/],
])('under reduced motion, %s', (_what, declaration) => {
  expect(reducedMotionBlock(css) ?? '').toMatch(declaration);
});

test('the rule reaches every element, including pseudo-elements', () => {
  expect(reducedMotionBlock(css) ?? '').toMatch(/\*\s*,\s*\*::before\s*,\s*\*::after/);
});
