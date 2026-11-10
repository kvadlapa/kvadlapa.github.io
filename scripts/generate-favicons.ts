import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const svg = readFileSync(`${publicDir}favicon.svg`, 'utf8');

const render = (size: number, source = svg) =>
  sharp(Buffer.from(source), { density: (72 * size) / 32 }).resize(size, size).png().toBuffer();

/** An .ico that wraps PNGs, which every current browser reads. */
function toIco(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

writeFileSync(`${publicDir}icon-192.png`, await render(192));
writeFileSync(`${publicDir}icon-512.png`, await render(512));
// iOS applies its own mask, so the touch icon has square corners.
writeFileSync(`${publicDir}apple-touch-icon.png`, await render(180, svg.replace('rx="6"', 'rx="0"')));

const ico = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await render(size) })));
writeFileSync(`${publicDir}favicon.ico`, toIco(ico));
console.log('Wrote favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png');
