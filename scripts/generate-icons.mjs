// Generates the PNG icons the page head declares (#40), with no dependency: it draws the
// logo of public/favicon.svg itself (same 32-unit geometry, same gradient, same note)
// and writes the PNG bytes with Node's zlib.
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
// If the logo changes, change favicon.svg AND the shapes below, then rerun.
import { writeFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';

// ---- The logo, in favicon.svg's 32×32 space -------------------------------------------
const GRADIENT_FROM = [0x4f, 0x6c, 0xff]; // at (0,0)
const GRADIENT_TO = [0x93, 0x33, 0xea]; // at (32,32)
const CORNER_RADIUS = 8; // favicon only

// The flag: "M17.3 8 C 21.5 8.8 23.4 12 21.2 16 C 22.2 12.6 20.2 10.6 17.3 11.2 Z",
// flattened into a polygon.
function cubic(p0, p1, p2, p3, steps = 48) {
  const out = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}
const FLAG = [
  [17.3, 8],
  ...cubic([17.3, 8], [21.5, 8.8], [23.4, 12], [21.2, 16]),
  ...cubic([21.2, 16], [22.2, 12.6], [20.2, 10.6], [17.3, 11.2]),
];

function insidePolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const COS20 = Math.cos((20 * Math.PI) / 180), SIN20 = Math.sin((20 * Math.PI) / 180);
function insideNote(x, y) {
  if (x >= 15.4 && x <= 17.3 && y >= 8 && y <= 22.5) return true; // the stem
  // The head: ellipse (13, 22.5), rx 4.1, ry 3.1, rotate(-20) → undo the rotation.
  const dx = x - 13, dy = y - 22.5;
  const ex = dx * COS20 - dy * SIN20, ey = dx * SIN20 + dy * COS20;
  if ((ex / 4.1) ** 2 + (ey / 3.1) ** 2 <= 1) return true;
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

const out = new URL('../public/', import.meta.url);
writeFileSync(new URL('apple-touch-icon.png', out), png(render(180, { noteScale: 0.82 })));
writeFileSync(new URL('favicon-32.png', out), png(render(32, { rounded: true })));
console.log('Wrote public/apple-touch-icon.png (180×180 RGB) and public/favicon-32.png (32×32 RGBA).');
