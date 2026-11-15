import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// #160 guard: motion is OPT-IN. An animation, transition or smooth-scroll class only
// applies under `motion-safe:` (the user has not asked for reduced motion), and in the
// stylesheet a motion declaration sits under `@media (prefers-reduced-motion:
// no-preference)`. Anything else fails here, so a new motion can't escape the system
// setting. It replaces #39's global `!important` rule, which cancelled motion by force.
const SRC = join(__dirname, '..');

// A class token whose utility (after its variants) is motion, without motion-safe: among
// its variants. `transition-none` / `animate-none` are not motion.
// Timings too: an unprefixed duration-200 is overridden by the motion-safe transition's
// default 150ms, which is declared later (found measuring the buttons in Chrome).
// Also arbitrary values (duration-[250ms]) and the important modifier (!transition-colors).
const MOTION = /^!?(animate-(?!none)[\w[\]-]+|transition(-(?!none)[\w[\],-]+)?|scroll-smooth|duration-[\w[\]-]+|ease-[\w[\]-]+|delay-[\w[\]-]+)$/;
function unsafeMotion(text: string): string[] {
  const tokens = text.split(/[\s'"`{}()]+/).filter(Boolean);
  return tokens.filter(t => {
    const parts = t.split(':');
    const utility = parts.pop()!;
    return MOTION.test(utility) && !parts.includes('motion-safe');
  });
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

test('every motion class in components and pages is motion-safe', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = relative(SRC, file);
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      // Comments describe motion; they don't apply it.
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      for (const t of unsafeMotion(line)) offenders.push(`${rel}:${i + 1} — ${t}`);
    });
  }
  expect(offenders).toEqual([]);
});

test('every motion in the stylesheet is motion-safe or under the no-preference query', () => {
  const css = readFileSync(join(SRC, 'index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const offenders: string[] = [];
  // @apply lines: same rule as class strings.
  for (const m of css.matchAll(/@apply\s+([^;]+);/g)) offenders.push(...unsafeMotion(m[1]).map(t => `@apply ${t}`));
  // Plain declarations: allowed only inside a no-preference block.
  const noPref = [...css.matchAll(/@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)\s*\{/g)].map(m => m.index!);
  const insideNoPref = (at: number) => noPref.some(start => {
    let depth = 0;
    for (let i = css.indexOf('{', start); i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}' && --depth === 0) return at > start && at < i;
    }
    return false;
  });
  for (const m of css.matchAll(/(scroll-behavior\s*:\s*smooth|\banimation(-[\w-]+)?\s*:|\btransition(-[\w-]+)?\s*:)/g)) {
    if (!insideNoPref(m.index!)) offenders.push(m[1]);
  }
  expect(offenders).toEqual([]);
});

test('the guard catches what it should (probe)', () => {
  expect(unsafeMotion('rounded animate-pulse')).toEqual(['animate-pulse']);
  expect(unsafeMotion('hover:bg-x transition-colors duration-200')).toEqual(['transition-colors', 'duration-200']);
  expect(unsafeMotion('motion-safe:animate-spin motion-safe:transition-all')).toEqual([]);
  expect(unsafeMotion('dark:motion-safe:transition-colors scroll-smooth')).toEqual(['scroll-smooth']);
  expect(unsafeMotion('transition-none animate-none')).toEqual([]);
  expect(unsafeMotion('motion-safe:transition-colors duration-200')).toEqual(['duration-200']);
  expect(unsafeMotion('duration-[250ms] !transition-colors animate-[wiggle_1s]')).toEqual(['duration-[250ms]', '!transition-colors', 'animate-[wiggle_1s]']);
});

test('no motion property is forced with !important (#170)', () => {
  const css = readFileSync(join(SRC, 'index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  expect(css.match(/\b(animation|transition|scroll-behavior)[\w-]*\s*:[^;]*!important/g) ?? []).toEqual([]);
  expect(css.match(/@apply[^;]*!(animate|transition|duration)/g) ?? []).toEqual([]);
});
