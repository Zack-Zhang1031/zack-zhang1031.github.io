/**
 * Synthesize a wooden-fish (木鱼) strike as a WAV file — project-owned
 * asset, no third-party licensing needed. Output: tmp-media/woodfish.wav
 * Model: noise click + three decaying resonant partials (woody knock).
 */
import { writeFileSync } from 'node:fs';

const SR = 44100;
const DUR = 0.45;
const N = Math.floor(SR * DUR);
const data = new Float32Array(N);

// deterministic tiny PRNG for the click noise
let s = 20260827;
const rnd = () => {
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 0xffffffff - 0.5;
};

const partials = [
  { f0: 1080, f1: 980, amp: 1.0, tau: 0.055 },   // main knock
  { f0: 2640, f1: 2400, amp: 0.45, tau: 0.028 }, // hard edge
  { f0: 430, f1: 400, amp: 0.35, tau: 0.09 },    // wooden body
];

for (let i = 0; i < N; i++) {
  const t = i / SR;
  let v = 0;
  for (const p of partials) {
    const f = p.f0 + (p.f1 - p.f0) * (t / DUR);
    v += p.amp * Math.exp(-t / p.tau) * Math.sin(2 * Math.PI * f * t);
  }
  if (t < 0.004) v += 0.9 * rnd() * Math.exp(-t / 0.0012); // strike click
  data[i] = v;
}

// normalize + 16-bit PCM WAV
let peak = 0;
for (const v of data) peak = Math.max(peak, Math.abs(v));
const gain = 0.85 / peak;

const buf = Buffer.alloc(44 + N * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(data[i] * gain * 32767), 44 + i * 2);
}
writeFileSync('tmp-media/woodfish.wav', buf);
console.log(`tmp-media/woodfish.wav written (${N} samples, peak ${peak.toFixed(2)})`);
