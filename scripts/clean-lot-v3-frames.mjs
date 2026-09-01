import { execFileSync } from 'node:child_process';
import { renameSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve('public/jing/generated/lot/frames-v3');
const collections = ['guanyin', 'luzu', 'guandi'];
const canvasWidth = 320;
const canvasHeight = 480;

const componentsFor = (file) => {
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
      /^\s*\d+:\s+(\d+)x(\d+)\+(\d+)\+(\d+)\s+[^\s]+\s+(\d+)\s+srgb\(255,255,255\)$/,
    );
    if (!match) return [];
    const [, width, height, x, y, area] = match.map(Number);
    return [{ width, height, x, y, area }];
  });
};

const expand = ({ width, height, x, y }, padding = 7) => {
  const left = Math.max(0, x - padding);
  const top = Math.max(0, y - padding);
  const right = Math.min(canvasWidth, x + width + padding);
  const bottom = Math.min(canvasHeight, y + height + padding);
  return { x: left, y: top, width: right - left, height: bottom - top };
};

for (const collection of collections) {
  for (let frame = 0; frame < 16; frame += 1) {
    const file = join(root, collection, `frame-${frame}.png`);
    const output = join(root, collection, `frame-${frame}.clean.png`);
    const minimumArea = frame <= 9 ? 5_000 : 1_000;
    const regions = componentsFor(file)
      .filter(({ area }) => area >= minimumArea)
      .map((component) => expand(component));

    if (regions.length === 0) {
      throw new Error(`No foreground component found in ${collection} frame ${frame}`);
    }

    const args = ['-size', `${canvasWidth}x${canvasHeight}`, 'canvas:none'];
    for (const region of regions) {
      args.push(
        '(', file,
        '-crop', `${region.width}x${region.height}+${region.x}+${region.y}`,
        '+repage', ')',
        '-geometry', `+${region.x}+${region.y}`,
        '-composite',
      );
    }
    args.push('-define', 'png:exclude-chunk=date,time', output);
    execFileSync('magick', args);
    renameSync(output, file);
  }
}

console.log('Cleaned 48 lot animation frames.');
