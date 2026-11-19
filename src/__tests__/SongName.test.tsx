import { render } from '@testing-library/react';
import { SongInline, SongName } from '../components/SongName';

// #229: in lists and tables a song shows its artist first, then its title, which stays the
// emphasis (the song you look for).
test('the artist comes before the title, and the title is emphasized', () => {
  const { container } = render(<SongName song={{ artist: 'The Breeders', title: 'Cannonball' }} />);
  expect(container.textContent).toMatch(/^The Breeders.*Cannonball$/);
  expect(container.querySelector('strong')?.textContent).toBe('Cannonball');
});

test.each([
  ['null', null],
  ['undefined', undefined],
  ['an empty text', ''],
  ['only spaces', '   '],
])('with %s as artist, only the title, and no empty line above it', (_name, artist) => {
  const { container } = render(<SongName song={{ artist, title: 'Cannonball' }} />);
  const brick = container.firstElementChild!;
  expect(brick.children).toHaveLength(1);
  expect(brick.textContent).toBe('Cannonball');
});

// #233 review: a compact one-line row (session entry, day play) reads "Artist — Title", the
// title emphasized; no artist (or only spaces) leaves the title alone, never " — Title".
describe('SongInline', () => {
  test('one line, artist first, title emphasized', () => {
    const { container } = render(<SongInline song={{ artist: ' Oasis ', title: 'Wonderwall' }} />);
    expect(container.textContent).toBe('Oasis — Wonderwall');
    expect(container.querySelector('strong')?.textContent).toBe('Wonderwall');
  });

  test.each([null, '', '   '])('with %p as artist, only the title', (artist) => {
    const { container } = render(<SongInline song={{ artist, title: 'Wonderwall' }} />);
    expect(container.textContent).toBe('Wonderwall');
  });
});
