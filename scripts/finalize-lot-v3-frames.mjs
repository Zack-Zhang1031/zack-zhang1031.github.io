import { execFileSync } from 'node:child_process';
import { renameSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve('public/jing/generated/lot/frames-v3');
const canvas = '320x480';

const collections = {
  guanyin: {
    rotation: 24,
    rise: { x: 169, y: 48 },
    flight: { x: 210, y: 48 },
  },
  luzu: {
    rotation: 40,
    rise: { x: 108, y: 42 },
    flight: { x: 192, y: 42 },
  },
  guandi: {
    rotation: -28,
    rise: { x: 145, y: 46 },
    flight: { x: 194, y: 48 },
  },
};

function foregroundComponents(file) {
  const output = execFileSync('magick', [
    file,
    '-alpha', 'extract',
    '-threshold', '12%',
    '-define', 'connected-components:verbose=true',
    '-connected-components', '8',
    'null:',
  ], { encoding: 'utf8' });

  return output.split(/\r?\n/).flatMap((line) => {
    const match = line.match(
      /^\s*(\d+):\s+(\d+)x(\d+)\+(\d+)\+(\d+)\s+[^\s]+\s+(\d+)\s+srgb\(255,255,255\)$/,
    );
    if (!match) return [];
    const [, id, width, height, x, y, area] = match.map(Number);
    return [{ id, width, height, x, y, area }];
  }).sort((left, right) => right.area - left.area);
}

function isolateComponent(source, componentId, output, mask) {
  execFileSync('magick', [
    source,
    '-alpha', 'extract',
    '-threshold', '12%',
    '-define', `connected-components:keep=${componentId}`,
    '-connected-components', '8',
    '-threshold', '0',
    '-morphology', 'Dilate', 'Disk:1',
    mask,
  ]);
  execFileSync('magick', [
    source, mask,
    '-alpha', 'off',
    '-compose', 'CopyOpacity',
    '-composite',
    output,
  ]);
}

for (const [collection, settings] of Object.entries(collections)) {
  const directory = join(root, collection);
  const frame6 = join(directory, 'frame-6.png');
  const frame9 = join(directory, 'frame-9.png');
  const frame10 = join(directory, 'frame-10.png');
  const frame11 = join(directory, 'frame-11.png');
  const mask = join(directory, '.component-mask.png');
  const selectedAirFull = join(directory, '.selected-stick-full.png');
  const selectedAir = join(directory, 'selected-stick-air.png');
  const selectedVertical = join(directory, 'selected-stick.png');
  const tubeOnly = join(directory, '.tube-only.png');
  const nextFrame9 = join(directory, '.frame-9.next.png');
  const nextFrame10 = join(directory, '.frame-10.next.png');

  const [, selectedComponent] = foregroundComponents(frame11);
  if (!selectedComponent) {
    throw new Error(`No detached stick found in ${collection} frame 11`);
  }
  isolateComponent(frame11, selectedComponent.id, selectedAirFull, mask);

  const trimArgs = [selectedAirFull];
  if (collection === 'guanyin') {
    // The generated Guanyin frame touches the adjacent red tassel at its
    // lower-left edge. Clear only that tiny overlap while preserving the full
    // round lotus-head top used by the animation.
    trimArgs.push('-channel', 'A', '-fx', 'j>78 && i<18 ? 0 : a');
  }
  trimArgs.push('-trim', '+repage', selectedAir);
  execFileSync('magick', trimArgs);

  execFileSync('magick', [
    selectedAir,
    '-background', 'none',
    '-rotate', String(settings.rotation),
    '-trim', '+repage',
    selectedVertical,
  ]);

  // Rebuild the peak frame from a complete vertical stick placed behind the
  // vessel. The 42-48 px top margin prevents clipping at the highest point.
  execFileSync('magick', [
    '-size', canvas, 'canvas:none',
    selectedVertical,
    '-geometry', `+${settings.rise.x}+${settings.rise.y}`,
    '-composite',
    frame6,
    '-geometry', '+0+0',
    '-composite',
    '-define', 'png:exclude-chunk=date,time',
    nextFrame9,
  ]);

  const [tubeComponent] = foregroundComponents(frame10);
  if (!tubeComponent) {
    throw new Error(`No vessel found in ${collection} frame 10`);
  }
  isolateComponent(frame10, tubeComponent.id, tubeOnly, mask);

  // Frame 10 is the release from the peak. Keep the complete matching stick
  // inside the canvas, then let frames 11-15 carry it down to the altar.
  execFileSync('magick', [
    '-size', canvas, 'canvas:none',
    tubeOnly,
    '-geometry', '+0+0',
    '-composite',
    selectedAir,
    '-geometry', `+${settings.flight.x}+${settings.flight.y}`,
    '-composite',
    '-define', 'png:exclude-chunk=date,time',
    nextFrame10,
  ]);

  renameSync(nextFrame9, frame9);
  renameSync(nextFrame10, frame10);
  for (const temporary of [mask, selectedAirFull, tubeOnly]) {
    unlinkSync(temporary);
  }

  const frames = Array.from({ length: 16 }, (_, index) => join(directory, `frame-${index}.png`));
  execFileSync('magick', [
    'montage', ...frames,
    '-background', '#15100b',
    '-geometry', '240x360+18+18',
    '-tile', '4x4',
    join(directory, `${collection}-v3-contact.png`),
  ]);
  execFileSync('magick', [
    '-delay', '18', ...frames,
    '-delay', '70', frames.at(-1),
    '-loop', '0',
    '-layers', 'Optimize',
    join(directory, `${collection}-v3-preview.gif`),
  ]);
}

execFileSync('magick', [
  'montage',
  ...Object.keys(collections).map((collection) => join(root, collection, 'selected-stick.png')),
  '-background', '#15100b',
  '-geometry', '180x220+24+24',
  '-tile', '3x1',
  join(root, 'selected-sticks-contact.png'),
]);

console.log('Finalized 48 v3 lot frames with safe peak and flight margins.');
