/**
 * Action sound effects + ambience ducking for Jingxin rooms.
 *
 * Every entry point is gated by the room's sound preference. Action
 * sounds temporarily duck any registered looping ambience so the two layers
 * never fight. No audio object is created at module scope.
 */

export const FX_SRC = {
  shakeSticks: '/jing/audio/lot-draw.mp3',
  cupsDrop: '/jing/audio/cups-drop.mp3',
  coinsToss: '/jing/audio/coins-toss.wav',
  paperUnfurl: '/jing/audio/paper-unfurl.mp3',
} as const;

/** Extra atmosphere layers offered by SoundControl (all local, opt-in). */
export const LAYER_SRC: Record<string, string> = {
  rain: '/jing/audio/rain.mp3',
  insects: '/jing/audio/insects.mp3',
  tea: '/jing/audio/tea.mp3',
};

export const LAYER_LABEL: Record<string, string> = {
  rain: '雨声',
  insects: '虫鸣',
  tea: '煮茶',
};

const ambiencePool = new Set<HTMLAudioElement>();
const ambienceBaseGain = new WeakMap<HTMLAudioElement, number>();
const volumeAnimations = new WeakMap<HTMLAudioElement, number>();
let activeDucks = 0;

/** Register a looping ambience element so action sounds can duck it. */
export function registerAmbience(audio: HTMLAudioElement): void {
  ambiencePool.add(audio);
  ambienceBaseGain.set(audio, clampGain(audio.volume));
}

const DUCK_RATIO = 0.48;
const DUCK_ATTACK_MS = 150;
const DUCK_RELEASE_MS = 600;
const DUCK_FALLBACK_MS = 6000;

const clampGain = (gain: number) => Math.min(1, Math.max(0, Number.isFinite(gain) ? gain : 0));

/** Convert the saved 0..1 slider position to a more natural decibel curve. */
export function sliderToGain(position: number): number {
  const normalized = clampGain(position);
  if (normalized === 0) return 0;
  const decibels = -24 * (1 - normalized);
  return Math.pow(10, decibels / 20);
}

const fadeVolume = (audio: HTMLAudioElement, target: number, durationMs: number) => {
  const next = clampGain(target);
  const previousFrame = volumeAnimations.get(audio);
  if (previousFrame) cancelAnimationFrame(previousFrame);
  if (durationMs <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    audio.volume = next;
    return;
  }
  const from = audio.volume;
  const startedAt = performance.now();
  const tick = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / durationMs);
    const eased = 1 - Math.pow(1 - progress, 3);
    audio.volume = from + (next - from) * eased;
    if (progress < 1) volumeAnimations.set(audio, requestAnimationFrame(tick));
    else volumeAnimations.delete(audio);
  };
  volumeAnimations.set(audio, requestAnimationFrame(tick));
};

/** Keep an ambience loop's unducked level in sync with the room volume. */
export function setAmbienceVolume(audio: HTMLAudioElement, gain: number, fadeMs = 120): void {
  const base = clampGain(gain);
  ambienceBaseGain.set(audio, base);
  fadeVolume(audio, activeDucks > 0 ? base * DUCK_RATIO : base, fadeMs);
}

const startDuck = () => {
  activeDucks += 1;
  if (activeDucks !== 1) return;
  for (const audio of ambiencePool) {
    if (!audio.paused) {
      const base = ambienceBaseGain.get(audio) ?? audio.volume;
      fadeVolume(audio, base * DUCK_RATIO, DUCK_ATTACK_MS);
    }
  }
};

const stopDuck = () => {
  activeDucks = Math.max(0, activeDucks - 1);
  if (activeDucks !== 0) return;
  for (const audio of ambiencePool) {
    const base = ambienceBaseGain.get(audio) ?? audio.volume;
    fadeVolume(audio, base, DUCK_RELEASE_MS);
  }
};

/**
 * Play a one-shot action sound. While it plays, registered ambience loops
 * are lowered to ~55% of their current volume, then restored.
 */
export function playFx(src: string, volume = 0.6, delayMs = 0, playbackRate = 1): void {
  const play = () => {
    const audio = new Audio(src);
    audio.volume = clampGain(volume);
    audio.playbackRate = Math.min(1.25, Math.max(0.75, playbackRate));
    startDuck();
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      stopDuck();
    };
    audio.addEventListener('ended', restore);
    audio.addEventListener('error', restore);
    setTimeout(restore, DUCK_FALLBACK_MS);
    void audio.play().catch(restore);
  };
  if (delayMs > 0) setTimeout(play, delayMs);
  else play();
}
