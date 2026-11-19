import { render } from '@testing-library/react';
import { SongName } from '../components/SongName';

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
