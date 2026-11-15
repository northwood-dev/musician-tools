import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// #40: guard on the icons the page head declares. It reads the HTML entry page and the
// PNG files it points to: the declarations are there, each file exists, its real size
// (from the PNG header) matches, and the iPhone icon has no alpha channel — iOS rounds
// the icon itself and would turn transparent corners black. It does not see the
// rendering on a real iPhone.
const root = join(__dirname, '..', '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

// The <link> or <meta> tag whose attributes include all of `attrs`.
function tag(name: 'link' | 'meta', attrs: Record<string, string>): string | undefined {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, 'g'))?.find(t =>
    Object.entries(attrs).every(([k, v]) => t.includes(`${k}="${v}"`)));
}
// The file a declaration points to; fails with a clear message when it isn't declared.
function declaredFile(t: string | undefined): string {
  const href = t?.match(/href="([^"]+)"/)?.[1];
  if (!href) throw new Error('icon not declared in index.html');
  return join(root, 'public', href.replace(/^\//, ''));
}

// Width, height and colour type from a PNG's IHDR chunk (type 2 = RGB, 6 = RGBA).
function pngHeader(file: string) {
  const bytes = readFileSync(file);
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colourType: bytes[25] };
}

describe('iPhone home-screen icon', () => {
  const link = tag('link', { rel: 'apple-touch-icon', sizes: '180x180' });

  test('is declared at 180 × 180', () => {
    expect(link).toBeDefined();
  });

  test('exists, is really 180 × 180, and has no alpha channel', () => {
    const file = declaredFile(link);
    expect(existsSync(file)).toBe(true);
    expect(pngHeader(file)).toEqual({ width: 180, height: 180, colourType: 2 });
  });

  test('is labelled "Musician" on the home screen', () => {
    expect(tag('meta', { name: 'apple-mobile-web-app-title', content: 'Musician' })).toBeDefined();
  });
});

describe('PNG favicon fallback', () => {
  const link = tag('link', { rel: 'icon', type: 'image/png', sizes: '32x32' });

  test('is declared at 32 × 32, BEFORE the SVG favicon so that Chromium keeps the SVG', () => {
    expect(link).toBeDefined();
    expect(html.indexOf(link!)).toBeLessThan(html.indexOf('image/svg+xml'));
  });

  test('exists and is really 32 × 32, with transparency (rounded corners)', () => {
    const file = declaredFile(link);
    expect(existsSync(file)).toBe(true);
    expect(pngHeader(file)).toEqual({ width: 32, height: 32, colourType: 6 });
  });
});
