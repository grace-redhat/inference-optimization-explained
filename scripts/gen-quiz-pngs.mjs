/**
 * Writes 200×200 RGB PNGs into public/ for the quantization quiz.
 * Uses only Node built-ins (zlib + crc32) — no npm deps.
 */
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public');

const W = 200;
const H = 200;

/** CRC-32 table */
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writePng(filename, pixel /* (x,y) => [r,g,b] */) {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  let o = 0;
  for (let y = 0; y < H; y++) {
    raw[o++] = 0; // filter None
    for (let x = 0; x < W; x++) {
      const [r, g, b] = pixel(x, y);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(2, 9); // RGB
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(path.join(OUT, filename), png);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/** Radial + angular tint — each preset gets a distinct palette and motif */
const presets = {
  mario: (x, y) => {
    const cx = 100, cy = 95;
    const dx = x - cx, dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    const cap = r < 55 && y < 100 ? [220, 50, 45] : r < 70 ? [240, 200, 60] : [55, 95, 200];
    const vignette = clamp(1 - r / 140, 0, 1);
    return cap.map((c) => clamp(c * (0.55 + 0.45 * vignette), 0, 255));
  },
  pika: (x, y) => {
    const cx = 100, cy = 105;
    const dx = x - cx, dy = y - cy;
    const earL = (x - 55) ** 2 + (y - 35) ** 2 < 28 ** 2;
    const earR = (x - 145) ** 2 + (y - 35) ** 2 < 28 ** 2;
    if (earL || earR) return [35, 35, 40];
    const face = dx * dx + dy * dy < 72 ** 2;
    if (face) {
      const cheek = Math.abs(x - 70) < 22 && y > 115 && y < 145;
      const cheekR = Math.abs(x - 130) < 22 && y > 115 && y < 145;
      if (cheek || cheekR) return [255, 200, 80];
      if (Math.abs(dx) < 12 && y > 95 && y < 118) return [40, 40, 45];
      return [255, 230, 70];
    }
    return [255, 220, 40];
  },
  yoda: (x, y) => {
    const t = x / W;
    const skin = lerp(160, 120, y / H);
    const ear = Math.abs(x - 45) < 35 && y > 40 && y < 120;
    const ear2 = Math.abs(x - 155) < 35 && y > 40 && y < 120;
    if (ear || ear2) return [130, 175, 110];
    if ((x - 100) ** 2 + (y - 100) ** 2 < 75 ** 2) return [clamp(skin + 20, 0, 255), clamp(skin + 40, 0, 255), 90];
    return [45, 85, 55];
  },
  cap: (x, y) => {
    const star = Math.abs(x - 100) < 55 && y > 25 && y < 95;
    const stripe = ((x + y) % 28) < 14;
    if (star) return stripe ? [220, 220, 240] : [40, 55, 160];
    return [30, 40, 120];
  },
  goku: (x, y) => {
    const cx = 100, cy = 88;
    const dx = x - cx, dy = y - cy;
    const hair = y < 115 && (Math.abs(dx) > 25 || y < 50);
    if (hair) return [25, 20, 15];
    if (dx * dx + dy * dy < 68 ** 2) return [255, 215, 180];
    const gi = y > 130;
    return gi ? [255, 90, 70] : [240, 240, 245];
  },
  shrek: (x, y) => {
    const cx = 100, cy = 100;
    const dx = x - cx, dy = y - cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 78) return [120, 185, 95];
    return [55, 110, 55];
  },
  kitty: (x, y) => {
    const bow = (x - 100) ** 2 + (y - 45) ** 2 < 22 ** 2;
    if (bow) return [240, 60, 120];
    const face = (x - 100) ** 2 + (y - 110) ** 2 < 65 ** 2;
    if (face) return [255, 255, 255];
    return [255, 180, 200];
  },
  minion: (x, y) => {
    const body = Math.abs(x - 100) < 62 && y > 55 && y < 195;
    if (!body) return [120, 130, 150];
    if (y > 55 && y < 115) return [250, 230, 60];
    return [70, 140, 220];
  },
  peta: (x, y) => {
    const face = (x - 100) ** 2 + (y - 105) ** 2 < 62 ** 2;
    if (face) return [255, 220, 195];
    const shirt = y > 145 && Math.abs(x - 100) < 75;
    return shirt ? [200, 60, 50] : [85, 110, 140];
  },
  perry: (x, y) => {
    const body = Math.abs(x - 100) < 55 && y > 70 && y < 175;
    if (!body) return [180, 200, 90];
    const tail = x > 150 && y > 120 && y < 175;
    if (tail) return [200, 170, 60];
    return [30, 35, 95];
  },
};

const files = [
  ['q_mario.png', presets.mario],
  ['q_pika.png', presets.pika],
  ['q_yoda.png', presets.yoda],
  ['q_goku.png', presets.goku],
  ['q_shrek.png', presets.shrek],
  ['q_kitty.png', presets.kitty],
  ['q_minion.png', presets.minion],
  ['q_peta.png', presets.peta],
  ['q_perry.png', presets.perry],
];

for (const [name, fn] of files) writePng(name, fn);

// Captain America: JPEG requested in quiz — write PNG as q_cap.jpg would be wrong extension.
// Generate JPEG via sharp? We don't have sharp. Encode minimal JPEG in JS is heavy.
// Easiest: output q_cap.png and update quantizationQuiz to q_cap.png OR write JPEG with jpeg-js.
// User's quiz says q_cap.jpg — browser loads by extension. I'll add tiny script using canvas in node - no.

// Use `sips` on macOS to convert cap PNG to jpg, or ship PNG and change ts to q_cap.png.
writePng('q_cap_tmp.png', presets.cap);
import { execSync } from 'node:child_process';
try {
  execSync(`sips -s format jpeg "${path.join(OUT, 'q_cap_tmp.png')}" --out "${path.join(OUT, 'q_cap.jpg')}"`, { stdio: 'inherit' });
  fs.unlinkSync(path.join(OUT, 'q_cap_tmp.png'));
} catch {
  // No sips (non-mac): keep PNG and rename quiz entry
  fs.renameSync(path.join(OUT, 'q_cap_tmp.png'), path.join(OUT, 'q_cap.png'));
  console.warn('sips unavailable: wrote q_cap.png; update quantizationQuiz to publicUrl("q_cap.png")');
}

console.log('Wrote quiz images to public/');
