import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// #232 drift guard for the "artist before title" rule (CLAUDE.md, #229): a song named in a
// sentence goes through songLabel() ("Artist — Title"). The wordings the rule replaced must not
// come back one page at a time:
//   - title first, then "by" and the artist: `"${song.title}" by ${song.artist}`, or the same
//     in JSX ({song.title} … by … {song.artist});
//   - the old "Artist · Title" separator of the collection composer.
// Read line by line: a wording split across lines, or names that don't say title/artist
// (`${t} by ${a}`), slip through.
const SRC = join(__dirname, '..');
const WORDINGS: [string, RegExp][] = [
  ['the title before "by" and the artist', /title\b[^\n]{0,60}?\bby\b[^\n]{0,40}?\bartist/i],
  ['the old "Artist · Title" separator', /artist\b[^\n]{0,30}?·[^\n]{0,30}?\btitle/i],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name) ? [path] : [];
  });
}

test('no song is named title first in a sentence (#232: use songLabel)', () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments may quote the old wordings
      for (const [what, pattern] of WORDINGS) {
        if (pattern.test(line)) offenders.push(`${relative(SRC, file)}:${i + 1} — ${what}`);
      }
    });
  }
  expect(offenders).toEqual([]);
});
