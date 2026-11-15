// Generates the PNG icons the page head declares (#40), with no dependency: it reads the
// logo's geometry from public/favicon.svg (the single source: gradient, corner radius,
// stem, flag, head), draws it itself, and writes the PNG bytes with Node's zlib.
// Needs Node 22.2+ (zlib.crc32).
//
//   npm run icons
//
// Outputs, in public/:
//   apple-touch-icon.png  180×180, RGB (no alpha). A FULL square with square corners:
//                         iOS rounds home-screen icons itself, and transparent corners
//                         would turn black. The note is shrunk toward the centre for margin.
//   favicon-32.png        32×32, RGBA. The favicon as is (rounded corners, transparent
//                         outside), for browsers that can't read the SVG favicon.
//
// If the logo changes, change favicon.svg and rerun. The parser below expects its current
// shape (one gradient, one rounded rect, then a stem <rect>, a cubic flag <path> and a
// rotated <ellipse>) and stops loudly if it no longer finds it.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';

const publicDir = new URL('../public/', import.meta.url);
const svg = readFileSync(new URL('favicon.svg', publicDir), 'utf8');

function must(pattern, what) {
  const match = svg.match(pattern);
  if (!match) throw new Error(`favicon.svg: could not find ${what} — update scripts/generate-icons.mjs`);
  return match;
}
const numbers = (text) => text.match(/-?\d*\.?\d+/g).map(Number);
const hex = (colour) => [1, 3, 5].map(i => parseInt(colour.slice(i, i + 2), 16));

// ---- The logo, read from favicon.svg's 32×32 space -----------------------------------
const [GRADIENT_FROM, GRADIENT_TO] = [...svg.matchAll(/stop-color="(#[0-9a-fA-F]{6})"/g)].map(m => hex(m[1]));
if (!GRADIENT_TO) throw new Error('favicon.svg: expected two gradient stops');
const CORNER_RADIUS = Number(must(/<rect[^>]*\brx="([\d.]+)"/, 'the rounded background')[1]);

const stemTag = must(/<g fill="#ffffff">\s*(<rect[^>]*>)/, 'the stem <rect>')[1];
const STEM = Object.fromEntries(['x', 'y', 'width', 'height'].map(k =>
  [k, Number(stemTag.match(new RegExp(`\\b${k}="([\\d.]+)"`))[1])]));

// The flag: "M x y C … C … Z", flattened into a polygon.
const flagPath = must(/<path d="(M[^"]+)"/, 'the flag <path>')[1];
const [mx, my, ...curves] = numbers(flagPath);
if (curves.length !== 12) throw new Error('favicon.svg: the flag is expected to be two cubic curves');

const headTag = must(/<ellipse[^>]*>/, 'the note head <ellipse>')[0];
const attr = (tag, name) => Number(tag.match(new RegExp(`\\b${name}="(-?[\\d.]+)"`))[1]);
const HEAD = {
  cx: attr(headTag, 'cx'), cy: attr(headTag, 'cy'), rx: attr(headTag, 'rx'), ry: attr(headTag, 'ry'),
  angle: (numbers(headTag.match(/rotate\(([^)]*)\)/)[1])[0] * Math.PI) / 180,
};

function cubic(p0, p1, p2, p3, steps = 48) {
  const points = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    points.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return points;
}
const pt = (i) => [curves[i], curves[i + 1]];
const FLAG = [
  [mx, my],
  ...cubic([mx, my], pt(0), pt(2), pt(4)),
  ...cubic(pt(4), pt(6), pt(8), pt(10)),
];

function insidePolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// The head is drawn rotated by HEAD.angle: undo that rotation to test a point.
const COS = Math.cos(-HEAD.angle), SIN = Math.sin(-HEAD.angle);
function insideNote(x, y) {
  if (x >= STEM.x && x <= STEM.x + STEM.width && y >= STEM.y && y <= STEM.y + STEM.height) return true;
  const dx = x - HEAD.cx, dy = y - HEAD.cy;
  const ex = dx * COS - dy * SIN, ey = dx * SIN + dy * COS;
  if ((ex / HEAD.rx) ** 2 + (ey / HEAD.ry) ** 2 <= 1) return true;
  return insidePolygon(x, y, FLAG);
}

function insideRoundedSquare(x, y) {
  const r = CORNER_RADIUS;
  const cx = Math.min(Math.max(x, r), 32 - r), cy = Math.min(Math.max(y, r), 32 - r);
  return x >= 0 && x <= 32 && y >= 0 && y <= 32 && (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

const gradientAt = (x, y) => {
  const t = Math.min(Math.max((x + y) / 64, 0), 1);
  return GRADIENT_FROM.map((from, i) => from + (GRADIENT_TO[i] - from) * t);
};

// ---- Rasterising, supersampled --------------------------------------------------------
// noteScale shrinks the note around (16, 16.5); rounded clips to the favicon's corners.
function render(size, { noteScale = 1, rounded = false, samples = 8 }) {
  const channels = rounded ? 4 : 3;
  const pixels = Buffer.alloc(size * size * channels);
  const unit = 32 / size;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, cover = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) * unit, y = (py + (sy + 0.5) / samples) * unit;
          if (rounded && !insideRoundedSquare(x, y)) continue;
          const nx = 16 + (x - 16) / noteScale, ny = 16.5 + (y - 16.5) / noteScale;
          const [cr, cg, cb] = insideNote(nx, ny) ? [255, 255, 255] : gradientAt(x, y);
          r += cr; g += cg; b += cb; cover++;
        }
      }
      const i = (py * size + px) * channels;
      const n = cover || 1;
      pixels[i] = Math.round(r / n); pixels[i + 1] = Math.round(g / n); pixels[i + 2] = Math.round(b / n);
      if (rounded) pixels[i + 3] = Math.round((255 * cover) / (samples * samples));
    }
  }
  return { size, channels, pixels };
}

// ---- PNG encoding ---------------------------------------------------------------------
function chunk(type, data) {
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
function png({ size, channels, pixels }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = channels === 4 ? 6 : 2; // 8-bit RGBA or RGB
  const rows = [];
  for (let y = 0; y < size; y++) {
    rows.push(Buffer.from([0]), pixels.subarray(y * size * channels, (y + 1) * size * channels));
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync(new URL('apple-touch-icon.png', publicDir), png(render(180, { noteScale: 0.82 })));
writeFileSync(new URL('favicon-32.png', publicDir), png(render(32, { rounded: true })));
console.log('Wrote public/apple-touch-icon.png (180×180 RGB) and public/favicon-32.png (32×32 RGBA).');
