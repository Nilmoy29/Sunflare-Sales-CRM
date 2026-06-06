/**
 * One-off script to generate simple amber Sunflare PWA icons.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "public", "icons");

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const cx = size / 2;
  const cy = size / 2;
  const sunR = size * 0.22;
  const bg = { r: 245, g: 158, b: 11 }; // amber-500
  const sun = { r: 255, g: 237, b: 160 }; // amber-100

  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 4;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const inSun = dx * dx + dy * dy <= sunR * sunR;
      const c = inSun ? sun : bg;
      raw[i] = c.r;
      raw[i + 1] = c.g;
      raw[i + 2] = c.b;
      raw[i + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(join(OUT_DIR, "icon-192x192.png"), createPng(192));
await writeFile(join(OUT_DIR, "icon-512x512.png"), createPng(512));
console.log("Generated public/icons/icon-192x192.png and icon-512x512.png");
