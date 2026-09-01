import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOT_DIR = path.join(ROOT, 'public', 'jing', 'generated', 'lot');
const MASTER_SIZE = { width: 1024, height: 1536 };
const WEB_SIZE = { width: 768, height: 1152 };
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

const collections = [
  {
    id: 'guanyin',
    label: '观音灵签',
    stickPalette: { light: '#f1ad49', mid: '#c87522', dark: '#713812', ink: '#3a210f' },
    poses: [
      { tube: {}, bundle: {} },
      { tube: {}, bundle: { dx: -12, dy: 2, angle: -2.4 } },
      { tube: { dx: -4, angle: -1.6 }, bundle: { dx: 14, dy: -3, angle: 2.5 } },
      { tube: { dx: -8, angle: -2.3 }, bundle: { dx: -9, dy: -5, angle: -3 } },
      { tube: { dx: 5, angle: 1.8 }, bundle: { dx: 12, dy: -2, angle: 3.2 } },
      { tube: { dx: 8, angle: 2.3 }, bundle: { dx: -4, dy: -8, angle: -1.2 } },
      { tube: {}, bundle: { dy: -7, angle: -0.7 }, stick: { x: 470, y: 300, angle: 0 } },
      { tube: {}, bundle: { dy: -4, angle: 0.5 }, stick: { x: 476, y: 180, angle: 0 } },
      { tube: {}, bundle: {}, stick: { x: 492, y: 20, angle: 1.5 } },
      { tube: { dy: 10 }, bundle: { dy: 3 } },
      { tube: { dy: 16, scale: 0.99 }, bundle: { dy: 6, scale: 0.99 } },
      { tube: {}, bundle: {} },
    ],
  },
  {
    id: 'luzu',
    label: '吕祖灵签',
    stickPalette: { light: '#dea04a', mid: '#9d5c23', dark: '#572f17', ink: '#2d1b10' },
    poses: [
      { tube: {}, bundle: {} },
      { tube: { dx: -3, angle: -1.5 }, bundle: { dx: -16, dy: 0, angle: -3.1 } },
      { tube: { dx: 5, angle: 2.1 }, bundle: { dx: 17, dy: -5, angle: 3.5 } },
      { tube: { dx: -8, angle: -2.8 }, bundle: { dx: -13, dy: -8, angle: -3.8 } },
      { tube: { dx: 7, angle: 2.6 }, bundle: { dx: 14, dy: -4, angle: 3.9 } },
      { tube: { dx: 10, angle: 2.9 }, bundle: { dx: -5, dy: -11, angle: -1.8 } },
      { tube: {}, bundle: { dy: -9, angle: -0.8 }, stick: { x: 470, y: 292, angle: -1 } },
      { tube: {}, bundle: { dy: -5, angle: 0.6 }, stick: { x: 478, y: 164, angle: 0 } },
      { tube: {}, bundle: {}, stick: { x: 500, y: 6, angle: 2 } },
      { tube: { dy: 11 }, bundle: { dy: 4 } },
      { tube: { dy: 18, scale: 0.99 }, bundle: { dy: 7, scale: 0.99 } },
      { tube: {}, bundle: {} },
    ],
  },
  {
    id: 'guandi',
    label: '关帝灵签',
    stickPalette: { light: '#e7a23d', mid: '#b56220', dark: '#64300f', ink: '#321b0d' },
    poses: [
      { tube: {}, bundle: {} },
      { tube: { dy: 2 }, bundle: { dx: -9, dy: 5, angle: -1.7 } },
      { tube: { dx: -3, angle: -1.2 }, bundle: { dx: 10, dy: 1, angle: 1.9 } },
      { tube: { dx: -6, angle: -1.8 }, bundle: { dx: -8, dy: -3, angle: -2.2 } },
      { tube: { dx: 4, angle: 1.4 }, bundle: { dx: 9, dy: 0, angle: 2.3 } },
      { tube: { dx: 7, dy: 4, angle: 1.8 }, bundle: { dx: -3, dy: -6, angle: -0.9 } },
      { tube: { dy: 4 }, bundle: { dy: -5, angle: -0.4 }, stick: { x: 470, y: 310, angle: 0 } },
      { tube: { dy: 4 }, bundle: { dy: -3, angle: 0.3 }, stick: { x: 474, y: 198, angle: 0 } },
      { tube: { dy: 4 }, bundle: {}, stick: { x: 486, y: 44, angle: 1 } },
      { tube: { dy: 13 }, bundle: { dy: 4 } },
      { tube: { dy: 20, scale: 0.99 }, bundle: { dy: 8, scale: 0.99 } },
      { tube: {}, bundle: {} },
    ],
  },
];

async function cropLayer(master, left, top, width, height) {
  return sharp(master).extract({ left, top, width, height }).png().toBuffer();
}

async function transformLayer(input, centerX, centerY, pose = {}) {
  const scale = pose.scale ?? 1;
  const metadata = await sharp(input).metadata();
  const width = Math.round((metadata.width ?? 1) * scale);
  const height = Math.round((metadata.height ?? 1) * scale);
  const { data, info } = await sharp(input)
    .resize(width, height, { fit: 'fill' })
    .rotate(pose.angle ?? 0, { background: transparent })
    .png()
    .toBuffer({ resolveWithObject: true });
  return {
    input: data,
    left: Math.round(centerX + (pose.dx ?? 0) - info.width / 2),
    top: Math.round(centerY + (pose.dy ?? 0) - info.height / 2),
  };
}

function buildSelectedStick({ light, mid, dark, ink }) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="110" height="580" viewBox="0 0 110 580">
    <defs>
      <linearGradient id="bamboo" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${dark}"/>
        <stop offset="0.18" stop-color="${mid}"/>
        <stop offset="0.48" stop-color="${light}"/>
        <stop offset="0.76" stop-color="${mid}"/>
        <stop offset="1" stop-color="${dark}"/>
      </linearGradient>
      <filter id="shadow" x="-40%" y="-10%" width="180%" height="125%">
        <feDropShadow dx="4" dy="7" stdDeviation="4" flood-color="#130b06" flood-opacity="0.48"/>
      </filter>
    </defs>
    <g filter="url(#shadow)">
      <rect x="19" y="8" width="72" height="560" rx="32" fill="url(#bamboo)" stroke="${dark}" stroke-width="4"/>
      <path d="M31 30 Q55 12 79 30" fill="none" stroke="#ffd181" stroke-opacity="0.52" stroke-width="3"/>
      <path d="M55 66 C43 55 40 74 53 82 C54 71 55 66 55 66 Z M58 66 C70 55 74 74 60 82 C59 71 58 66 58 66 Z M56 64 L56 91"
        fill="${ink}" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>
      <g fill="none" stroke="${ink}" stroke-width="4" opacity="0.82">
        <path d="M30 116 H80"/><path d="M30 126 H80"/>
        <path d="M30 248 H80"/><path d="M30 258 H80"/>
        <path d="M30 380 H80"/><path d="M30 390 H80"/>
        <path d="M30 512 H80"/><path d="M30 522 H80"/>
      </g>
      <path d="M35 42 C28 164 30 408 37 536" fill="none" stroke="#ffe0a0" stroke-opacity="0.26" stroke-width="5" stroke-linecap="round"/>
    </g>
  </svg>`);
}

async function renderCollection(collection) {
  const master = path.join(LOT_DIR, 'masters', `${collection.id}-stable-master.png`);
  const hiDir = path.join(LOT_DIR, 'frames-hi', collection.id);
  const webDir = path.join(LOT_DIR, 'frames', collection.id);
  const previewDir = path.join(LOT_DIR, 'previews');
  const selectedDir = path.join(LOT_DIR, 'selected-sticks');
  await Promise.all([
    mkdir(hiDir, { recursive: true }),
    mkdir(webDir, { recursive: true }),
    mkdir(previewDir, { recursive: true }),
    mkdir(selectedDir, { recursive: true }),
  ]);

  // These crops overlap at the rim. Drawing the tube last masks the lower ends
  // of the moving bundle, so every shake frame still reads as inside the vessel.
  const bundle = await cropLayer(master, 140, 0, 744, 480);
  const tube = await cropLayer(master, 140, 420, 744, MASTER_SIZE.height - 420);
  const flyingStick = await sharp(buildSelectedStick(collection.stickPalette)).png().toBuffer();
  await sharp(flyingStick)
    .png({ compressionLevel: 9 })
    .toFile(path.join(selectedDir, `${collection.id}.png`));

  const highFrames = [];
  for (const [index, pose] of collection.poses.entries()) {
    const highPath = path.join(hiDir, `frame-${index}.png`);
    const webPath = path.join(webDir, `frame-${index}.png`);

    if (index === 0 || index === collection.poses.length - 1) {
      await sharp(master).png({ compressionLevel: 9 }).toFile(highPath);
    } else {
      const layers = [await transformLayer(bundle, 512, 240, pose.bundle)];
      if (pose.stick) {
        layers.push(await transformLayer(flyingStick, pose.stick.x + 55, pose.stick.y + 290, pose.stick));
      }
      layers.push(await transformLayer(tube, 512, 420 + (MASTER_SIZE.height - 420) / 2, pose.tube));
      await sharp({ create: { ...MASTER_SIZE, channels: 4, background: transparent } })
        .composite(layers)
        .png({ compressionLevel: 9 })
        .toFile(highPath);
    }

    await sharp(highPath)
      .resize(WEB_SIZE.width, WEB_SIZE.height, { fit: 'fill' })
      .png({ compressionLevel: 9, palette: true })
      .toFile(webPath);
    highFrames.push(highPath);
  }

  const previewTiles = await Promise.all(highFrames.map(async (frame, index) => {
    const image = await sharp(frame)
      .resize(240, 360, { fit: 'contain', background: transparent })
      .extend({ top: 34, bottom: 8, left: 8, right: 8, background: { r: 27, g: 19, b: 13, alpha: 1 } })
      .composite([{
        input: Buffer.from(`<svg width="256" height="402"><text x="128" y="24" text-anchor="middle" fill="#d9b96f" font-size="16" font-family="serif">${String(index + 1).padStart(2, '0')}</text></svg>`),
        top: 0,
        left: 0,
      }])
      .png()
      .toBuffer();
    return { input: image, left: (index % 4) * 256, top: Math.floor(index / 4) * 402 };
  }));

  const previewPath = path.join(previewDir, `${collection.id}-12-frame-preview.png`);
  await sharp({ create: { width: 1024, height: 1206, channels: 4, background: { r: 18, g: 13, b: 9, alpha: 1 } } })
    .composite(previewTiles)
    .png({ compressionLevel: 9 })
    .toFile(previewPath);

  console.log(`Generated ${collection.label}: 12 high-resolution frames, 12 web frames`);
}

for (const collection of collections) {
  await renderCollection(collection);
}

console.log(`Generated ${collections.length * 24} transparent frame files from stable masters`);
