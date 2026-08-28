import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  loadSettings,
  saveSettings,
  type StorageLike,
} from './settings';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { dump: () => Record<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    dump: () => Object.fromEntries(map),
  };
}

function deniedStorage(): StorageLike {
  return {
    getItem: () => { throw new Error('denied'); },
    setItem: () => { throw new Error('denied'); },
    removeItem: () => { throw new Error('denied'); },
  };
}

describe('settings', () => {
  it('returns defaults when nothing is stored', () => {
    const { settings, persisted } = loadSettings(memoryStorage());
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(persisted).toBe(false);
  });

  it('round-trips valid settings', () => {
    const storage = memoryStorage();
    const ok = saveSettings(storage, {
      volume: 0.25,
      ambience: ['water'],
      motion: 'reduce',
      lockTimeoutMinutes: 30,
      dismissedIntro: true,
    });
    expect(ok).toBe(true);
    const { settings, persisted } = loadSettings(storage);
    expect(persisted).toBe(true);
    expect(settings.volume).toBe(0.25);
    expect(settings.ambience).toEqual(['water']);
    expect(settings.motion).toBe('reduce');
    expect(settings.lockTimeoutMinutes).toBe(30);
    expect(settings.dismissedIntro).toBe(true);
  });

  it('falls back to defaults on damaged JSON', () => {
    const storage = memoryStorage({ [SETTINGS_KEY]: '{not json' });
    const { settings, persisted } = loadSettings(storage);
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(persisted).toBe(false);
  });

  it('sanitizes out-of-range and wrong-typed fields', () => {
    const storage = memoryStorage();
    storage.setItem(SETTINGS_KEY, JSON.stringify({
      volume: 9,
      ambience: ['water', 42],
      motion: 'spin',
      lockTimeoutMinutes: 0,
      dismissedIntro: 'yes',
    }));
    const { settings } = loadSettings(storage);
    expect(settings.volume).toBe(1);
    expect(settings.ambience).toEqual(['water']);
    expect(settings.motion).toBe('auto');
    expect(settings.lockTimeoutMinutes).toBe(1);
    expect(settings.dismissedIntro).toBe(false);
  });

  it('survives storage denial on read and write', () => {
    const { settings, persisted } = loadSettings(deniedStorage());
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(persisted).toBe(false);
    expect(saveSettings(deniedStorage(), { ...DEFAULT_SETTINGS })).toBe(false);
  });

  it('keeps the 15 minute default lock timeout', () => {
    expect(DEFAULT_SETTINGS.lockTimeoutMinutes).toBe(15);
  });
});
