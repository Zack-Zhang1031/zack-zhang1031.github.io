import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOT_DIR = path.join(ROOT, 'public', 'jing', 'generated', 'lot');
const SOURCE_DIR = path.join(LOT_DIR, 'frames-v3');
const MASTER_DIR = path.join(LOT_DIR, 'frames-safe-hi');
const WEB_DIR = path.join(LOT_DIR, 'frames-safe');
const PREVIEW_DIR = path.join(LOT_DIR, 'frame-safe-preview');
const COLLECTIONS = ['guanyin', 'luzu', 'guandi'];
const FRAME_COUNT = 16;
const ALPHA_THRESHOLD = 2;

const MASTER = { width: 1024, height: 1536 };
const WEB = { width: 768, height: 1152 };
const SAFE = {
  left: Math.round(MASTER.width * 0.12),
  right: Math.round(MASTER.width * 0.12),
  top: Math.round(MASTER.height * 0.18),
  bottom: Math.round(MASTER.height * 0.10),
};
const ANCHOR = { x: MASTER.width / 2, y: 1200 };
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

const requested = process.argv.find((argument) => argument.startsWith('--collection='))
  ?.split('=')[1] ?? 'all';
const outputCollections = requested === 'all' ? COLLECTIONS : [requested];
if (outputCollections.some((collection) => !COLLECTIONS.includes(collection))) {
  throw new Error(`Unknown collection: ${requested}`);
}

const sourcePath = (collection, index) =>
  path.join(SOURCE_DIR, collection, `frame-${index}.png`);

async function alphaBounds(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha <= ALPHA_THRESHOLD) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error(`No visible pixels in ${file}`);
  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
    imageWidth: info.width,
    imageHeight: info.height,
  };
}

function unionBounds(bounds) {
  const left = Math.min(...bounds.map((bound) => bound.left));
  const top = Math.min(...bounds.map((bound) => bound.top));
  const right = Math.max(...bounds.map((bound) => bound.right));
  const bottom = Math.max(...bounds.map((bound) => bound.bottom));
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
}

function positiveRatio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : Number.POSITIVE_INFINITY;
}

async function inspectCollection(collection) {
  const frames = await Promise.all(
    Array.from({ length: FRAME_COUNT }, (_, index) => alphaBounds(sourcePath(collection, index))),
  );
  const union = unionBounds(frames);
  const idle = frames[0];
  // Frame zero is the stable reference. Keeping this bottom-centre point fixed
  // preserves the vessel anchor while retaining intentional shake movement.
  const sourceAnchor = {
    x: (idle.left + idle.right) / 2,
    y: idle.bottom,
  };
  const maximumScale = Math.min(
    positiveRatio(ANCHOR.x - SAFE.left, sourceAnchor.x - union.left),
    positiveRatio(MASTER.width - SAFE.right - ANCHOR.x, union.right - sourceAnchor.x),
    positiveRatio(ANCHOR.y - SAFE.top, sourceAnchor.y - union.top),
    positiveRatio(MASTER.height - SAFE.bottom - ANCHOR.y, union.bottom - sourceAnchor.y),
  );
  return { collection, frames, union, idle, sourceAnchor, maximumScale };
}

const inspections = Object.fromEntries(
  await Promise.all(COLLECTIONS.map(async (collection) => [collection, await inspectCollection(collection)])),
);
// One scale for all three sets keeps their apparent size and motion range
// consistent. The smallest safe scale wins; no frame receives individual zoom.
const scale = Math.min(...Object.values(inspections).map((inspection) => inspection.maximumScale));

async function renderFrame(inspection, index) {
  const { collection, union, sourceAnchor } = inspection;
  const masterDirectory = path.join(MASTER_DIR, collection);
  const webDirectory = path.join(WEB_DIR, collection);
  await Promise.all([
    mkdir(masterDirectory, { recursive: true }),
    mkdir(webDirectory, { recursive: true }),
  ]);

  const extracted = await sharp(sourcePath(collection, index))
    .extract({ left: union.left, top: union.top, width: union.width, height: union.height })
    .resize(Math.round(union.width * scale), Math.round(union.height * scale), {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
  const metadata = await sharp(extracted).metadata();
  const left = Math.round(ANCHOR.x - (sourceAnchor.x - union.left) * scale);
  const top = Math.round(ANCHOR.y - (sourceAnchor.y - union.top) * scale);
  const masterPath = path.join(masterDirectory, `frame-${index}.png`);
  const webPath = path.join(webDirectory, `frame-${index}.png`);

  await sharp({ create: { ...MASTER, channels: 4, background: transparent } })
    .composite([{ input: extracted, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(masterPath);
  await sharp(masterPath)
    .resize(WEB.width, WEB.height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, palette: true, colours: 256, dither: 0.8 })
    .toFile(webPath);

  return { masterPath, webPath, placed: { left, top, width: metadata.width, height: metadata.height } };
}

function frameLabel(index) {
  return Buffer.from(`<svg width="256" height="384" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="255" height="383" fill="none" stroke="#9d7840" stroke-opacity="0.55"/>
    <text x="18" y="28" fill="#d9b96f" font-family="serif" font-size="18">${String(index + 1).padStart(2, '0')}</text>
  </svg>`);
}

async function buildContactSheet(collection, webFrames) {
  const tiles = await Promise.all(webFrames.map(async ({ webPath }, index) => {
    const input = await sharp(webPath)
      .resize(240, 360, { fit: 'contain', background: transparent })
      .extend({ top: 12, bottom: 12, left: 8, right: 8, background: transparent })
      .composite([{ input: frameLabel(index), left: 0, top: 0 }])
      .png()
      .toBuffer();
    return { input, left: (index % 4) * 256, top: Math.floor(index / 4) * 384 };
  }));
  const output = path.join(PREVIEW_DIR, `${collection}-safe-contact.png`);
  await sharp({ create: { width: 1024, height: 1536, channels: 4, background: transparent } })
    .composite(tiles)
    .png({ compressionLevel: 9 })
    .toFile(output);
  return output;
}

function buildGif(collection, webFrames) {
  const output = path.join(PREVIEW_DIR, `${collection}-safe-preview.gif`);
  execFileSync('magick', [
    '-delay', '10',
    ...webFrames.map(({ webPath }) => webPath),
    '-delay', '75', webFrames.at(-1).webPath,
    '-resize', '384x576',
    '-loop', '0',
    '-layers', 'Optimize',
    output,
  ]);
  return output;
}

async function auditOutput(collection) {
  const masterBounds = await Promise.all(
    Array.from({ length: FRAME_COUNT }, (_, index) =>
      alphaBounds(path.join(MASTER_DIR, collection, `frame-${index}.png`))),
  );
  const minimumMargins = {
    left: Math.min(...masterBounds.map((bound) => bound.left)),
    top: Math.min(...masterBounds.map((bound) => bound.top)),
    right: Math.min(...masterBounds.map((bound) => MASTER.width - 1 - bound.right)),
    bottom: Math.min(...masterBounds.map((bound) => MASTER.height - 1 - bound.bottom)),
  };
  for (const edge of Object.keys(SAFE)) {
    if (minimumMargins[edge] < SAFE[edge] - 2) {
      throw new Error(`${collection} ${edge} safety failed: ${minimumMargins[edge]} < ${SAFE[edge]}`);
    }
  }
  return { minimumMargins, bounds: masterBounds };
}

await mkdir(PREVIEW_DIR, { recursive: true });
const reports = {};
for (const collection of outputCollections) {
  const inspection = inspections[collection];
  const rendered = [];
  for (let index = 0; index < FRAME_COUNT; index += 1) {
    rendered.push(await renderFrame(inspection, index));
  }
  const contactSheet = await buildContactSheet(collection, rendered);
  const gif = buildGif(collection, rendered);
  const audit = await auditOutput(collection);
  reports[collection] = {
    sourceUnion: inspection.union,
    sourceAnchor: inspection.sourceAnchor,
    maximumScale: inspection.maximumScale,
    appliedScale: scale,
    masterSize: MASTER,
    webSize: WEB,
    safeInsets: SAFE,
    anchor: ANCHOR,
    minimumMargins: audit.minimumMargins,
    contactSheet: path.relative(ROOT, contactSheet).replaceAll('\\', '/'),
    gif: path.relative(ROOT, gif).replaceAll('\\', '/'),
  };
}

const manifestPath = path.join(PREVIEW_DIR, `${requested}-safe-bounds.json`);
await writeFile(manifestPath, `${JSON.stringify({ scale, reports }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ scale, reports, manifest: path.relative(ROOT, manifestPath) }, null, 2));
