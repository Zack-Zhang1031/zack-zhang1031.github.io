import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MASTER_DIR = path.join(ROOT, 'public', 'jing', 'generated', 'lot', 'masters');
const MASTER_SIZE = { width: 1024, height: 1536 };
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const collections = ['guanyin', 'luzu', 'guandi'];

async function removeBorderCheckerboard(source) {
  const { data, info } = await sharp(source)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = info.width * info.height;
  const exterior = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const isCheckerboard = (index) => {
    const offset = index * info.channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max - min <= 24 && (r + g + b) / 3 >= 165;
  };

  const enqueue = (index) => {
    if (exterior[index] || !isCheckerboard(index)) return;
    exterior[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < info.width; x += 1) {
    enqueue(x);
    enqueue((info.height - 1) * info.width + x);
  }
  for (let y = 0; y < info.height; y += 1) {
    enqueue(y * info.width);
    enqueue(y * info.width + info.width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % info.width;
    const y = Math.floor(index / info.width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < info.width) enqueue(index + 1);
    if (y > 0) enqueue(index - info.width);
    if (y + 1 < info.height) enqueue(index + info.width);
  }

  const rgba = Buffer.alloc(pixelCount * 4);
  for (let index = 0; index < pixelCount; index += 1) {
    const sourceOffset = index * info.channels;
    const targetOffset = index * 4;
    rgba[targetOffset] = data[sourceOffset];
    rgba[targetOffset + 1] = data[sourceOffset + 1];
    rgba[targetOffset + 2] = data[sourceOffset + 2];
    rgba[targetOffset + 3] = exterior[index] ? 0 : 255;
  }

  return sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ background: transparent, threshold: 2 })
    .png()
    .toBuffer();
}

async function prepareMaster(collectionId) {
  const source = path.join(MASTER_DIR, `${collectionId}-stable-source.png`);
  const output = path.join(MASTER_DIR, `${collectionId}-stable-master.png`);
  const cutout = await removeBorderCheckerboard(source);
  const normalized = await sharp(cutout)
    .resize(860, 1360, { fit: 'contain', background: transparent })
    .png()
    .toBuffer();

  await sharp({ create: { ...MASTER_SIZE, channels: 4, background: transparent } })
    .composite([{ input: normalized, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(output);

  const metadata = await sharp(output).metadata();
  console.log(`Prepared ${collectionId}: ${metadata.width}x${metadata.height}, alpha=${metadata.hasAlpha}`);
}

for (const collectionId of collections) {
  await prepareMaster(collectionId);
}
