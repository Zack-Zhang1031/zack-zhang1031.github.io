/**
 * Action sound effects + ambience ducking for Jingxin rooms.
 *
 * Every entry point is gated by the room's own sound opt-in: callers only
 * invoke playFx after the user has enabled sound via SoundControl. Action
 * sounds temporarily duck any registered looping ambience so the two layers
 * never fight. No audio object is created at module scope.
 */

export const FX_SRC = {
  shakeSticks: '/jing/audio/shake-sticks.mp3',
  cupsDrop: '/jing/audio/cups-drop.mp3',
  coinsToss: '/jing/audio/coins-toss.mp3',
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

/** Register a looping ambience element so action sounds can duck it. */
export function registerAmbience(audio: HTMLAudioElement): void {
  ambiencePool.add(audio);
}

const DUCK_RATIO = 0.55;
const DUCK_FALLBACK_MS = 2600;

/**
 * Play a one-shot action sound. While it plays, registered ambience loops
 * are lowered to ~55% of their current volume, then restored.
 */
export function playFx(src: string, volume = 0.6, delayMs = 0): void {
  const play = () => {
    const audio = new Audio(src);
    audio.volume = Math.min(1, Math.max(0, volume));
    const ducked: Array<[HTMLAudioElement, number]> = [];
    for (const a of ambiencePool) {
      if (!a.paused) {
        ducked.push([a, a.volume]);
        a.volume = a.volume * DUCK_RATIO;
      }
    }
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      for (const [a, v] of ducked) a.volume = v;
    };
    audio.addEventListener('ended', restore);
    setTimeout(restore, DUCK_FALLBACK_MS);
    void audio.play().catch(() => {});
  };
  if (delayMs > 0) setTimeout(play, delayMs);
  else play();
}
