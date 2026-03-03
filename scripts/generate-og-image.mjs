/**
 * generate-og-image.mjs
 *
 * Generates frontend/public/og-image.png (1200×630) — branded social share card.
 * Uses only Node built-ins (zlib, fs) — zero npm installs required.
 *
 * Run from repo root:
 *   node scripts/generate-og-image.mjs
 *
 * The output is a clean dark-navy gradient with a blue accent stripe.
 * For a polished version with text, replace og-image.png with a Figma/Canva export.
 */

import zlib from "zlib";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../frontend/public/og-image.png");

const W = 1200;
const H = 630;

// ── Site palette ──────────────────────────────────────────────────────────────
function hex(s) {
  const n = parseInt(s, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
const BG  = hex("060d1f");
const BG2 = hex("0c1525");
const ACC = hex("3b82f6");
const MUT = hex("1e3a5f");

// ── Build RGB pixel buffer ────────────────────────────────────────────────────
const rgb = Buffer.alloc(W * H * 3);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;

    // Subtle radial gradient from centre
    const dx = (x - W / 2) / W;
    const dy = (y - H / 2) / H;
    const t  = Math.min(Math.sqrt(dx * dx + dy * dy) * 2, 1);

    rgb[i]     = Math.round(BG2[0] + (BG[0] - BG2[0]) * t);
    rgb[i + 1] = Math.round(BG2[1] + (BG[1] - BG2[1]) * t);
    rgb[i + 2] = Math.round(BG2[2] + (BG[2] - BG2[2]) * t);

    // Top accent bar (6 px)
    if (y < 6) {
      rgb[i] = ACC[0]; rgb[i + 1] = ACC[1]; rgb[i + 2] = ACC[2];
    }

    // Horizontal accent divider at 58% height (3 px, 60% width centred)
    const sY = Math.round(H * 0.58);
    const sX0 = Math.round(W * 0.2);
    const sX1 = Math.round(W * 0.8);
    if (y >= sY && y < sY + 3 && x >= sX0 && x < sX1) {
      rgb[i] = ACC[0]; rgb[i + 1] = ACC[1]; rgb[i + 2] = ACC[2];
    }

    // Subtle left border (4 px)
    if (x < 4) {
      rgb[i] = MUT[0]; rgb[i + 1] = MUT[1]; rgb[i + 2] = MUT[2];
    }
  }
}

// ── PNG encoder (pure Node) ───────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcVal]);
}

function buildScanlines(width, height, rgbBuf) {
  // PNG filter byte (0 = None) prepended to each row
  const out = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    out[y * (1 + width * 3)] = 0;
    rgbBuf.copy(out, y * (1 + width * 3) + 1, y * width * 3, (y + 1) * width * 3);
  }
  return out;
}

function deflateSync(buf) {
  return zlib.deflateSync(buf, { level: 6 });
}

function encodePng(width, height, rgbBuf) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // colour type: RGB truecolour

  const scanlines  = buildScanlines(width, height, rgbBuf);
  const compressed = deflateSync(scanlines);
  const sig        = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Write output ──────────────────────────────────────────────────────────────
const png = encodePng(W, H, rgb);
writeFileSync(OUT, png);
console.log(`✓ og-image.png → ${OUT}`);
console.log(`  Size: ${(png.length / 1024).toFixed(1)} KB  (${W}×${H})`);
console.log("  Branded background generated. Replace with a designed version for best results.");
