/**
 * Jingxin user settings: theme-adjacent preferences, volume, ambience,
 * motion, vault lock timeout, and dismissed-introduction state.
 *
 * Only the namespaced key `jing.settings.v1` is persisted. Storage denial
 * degrades to in-memory defaults instead of throwing into UI code.
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface JingSettings {
  /** 0..1 playback volume for opt-in audio. */
  volume: number;
  /** Enabled ambience ids (e.g. 'water', 'pine-wind'). */
  ambience: string[];
  /** 'auto' follows prefers-reduced-motion; 'reduce' forces static. */
  motion: 'auto' | 'reduce';
  /** Idle minutes before the vault locks itself. */
  lockTimeoutMinutes: number;
  /** Whether the hall introduction has been dismissed. */
  dismissedIntro: boolean;
}

export const SETTINGS_KEY = 'jing.settings.v1';

export const DEFAULT_SETTINGS: Readonly<JingSettings> = Object.freeze({
  volume: 0.6,
  ambience: [],
  motion: 'auto',
  lockTimeoutMinutes: 15,
  dismissedIntro: false,
});

const MIN_LOCK_MINUTES = 1;
const MAX_LOCK_MINUTES = 120;

export interface SettingsLoadResult {
  settings: JingSettings;
  /** false when storage threw or JSON was damaged; settings are defaults/merged. */
  persisted: boolean;
}

function sanitize(raw: unknown): JingSettings {
  const input = (raw ?? {}) as Partial<Record<keyof JingSettings, unknown>>;
  const volume = typeof input.volume === 'number' && Number.isFinite(input.volume)
    ? Math.min(1, Math.max(0, input.volume))
    : DEFAULT_SETTINGS.volume;
  const ambience = Array.isArray(input.ambience)
    ? input.ambience.filter((x): x is string => typeof x === 'string')
    : [];
  const motion = input.motion === 'reduce' ? 'reduce' : 'auto';
  const lockRaw = typeof input.lockTimeoutMinutes === 'number' && Number.isFinite(input.lockTimeoutMinutes)
    ? Math.round(input.lockTimeoutMinutes)
    : DEFAULT_SETTINGS.lockTimeoutMinutes;
  const lockTimeoutMinutes = Math.min(MAX_LOCK_MINUTES, Math.max(MIN_LOCK_MINUTES, lockRaw));
  return {
    volume,
    ambience,
    motion,
    lockTimeoutMinutes,
    dismissedIntro: input.dismissedIntro === true,
  };
}

export function loadSettings(storage: StorageLike): SettingsLoadResult {
  let rawText: string | null;
  try {
    rawText = storage.getItem(SETTINGS_KEY);
  } catch {
    return { settings: { ...DEFAULT_SETTINGS }, persisted: false };
  }
  if (rawText === null) {
    return { settings: { ...DEFAULT_SETTINGS }, persisted: false };
  }
  try {
    return { settings: sanitize(JSON.parse(rawText)), persisted: true };
  } catch {
    return { settings: { ...DEFAULT_SETTINGS }, persisted: false };
  }
}

/** @returns true when the settings were actually written. */
export function saveSettings(storage: StorageLike, settings: JingSettings): boolean {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(sanitize(settings)));
    return true;
  } catch {
    return false;
  }
}
