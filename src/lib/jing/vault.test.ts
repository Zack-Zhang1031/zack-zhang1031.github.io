import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LOCK_TIMEOUT_MS,
  KDF_ITERATIONS,
  VAULT_KEY,
  VaultError,
  VaultSession,
  openNotes,
  parseEnvelope,
  sealNotes,
  serializeEnvelope,
  type VaultEnvelope,
} from './vault';
import type { StorageLike } from './settings';

function memoryStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function deniedStorage(): StorageLike {
  return {
    getItem: () => { throw new Error('denied'); },
    setItem: () => { throw new Error('denied'); },
    removeItem: () => { throw new Error('denied'); },
  };
}

describe('seal/open round trip', () => {
  it('opens what it seals, with envelope metadata', async () => {
    const envelope = await sealNotes('正确的密码', '今日静坐二十分钟。');
    expect(envelope.format).toBe('jing-vault');
    expect(envelope.version).toBe(1);
    expect(envelope.kdf.iterations).toBe(KDF_ITERATIONS);
    expect(envelope.kdf.hash).toBe('SHA-256');
    expect(envelope.cipher.name).toBe('AES-GCM');

    const opened = await openNotes('正确的密码', envelope);
    expect(opened).toBe('今日静坐二十分钟。');
    // plaintext must never appear in the serialized envelope
    expect(serializeEnvelope(envelope)).not.toContain('静坐');
  });

  it('rejects a wrong password', async () => {
    const envelope = await sealNotes('对', 'secret');
    await expect(openNotes('错', envelope)).rejects.toMatchObject({
      name: 'VaultError',
      code: 'wrong-password',
    });
  });

  it('detects tampered ciphertext', async () => {
    const envelope = await sealNotes('pw', '重要笔记');
    const bytes = atob(envelope.data);
    const flipped = btoa(String.fromCharCode(bytes.charCodeAt(0) ^ 1) + bytes.slice(1));
    const tampered: VaultEnvelope = { ...envelope, data: flipped };
    await expect(openNotes('pw', tampered)).rejects.toMatchObject({ code: 'wrong-password' });
  });

  it('rejects unsupported versions and damaged shapes', async () => {
    const envelope = await sealNotes('pw', 'x');
    expect(() => serializeEnvelope({ ...envelope, version: 99 })).toThrow(VaultError);
    expect(() => parseEnvelope('{"format":"other","version":1}')).toThrow(VaultError);
    expect(() => parseEnvelope('not json')).toThrow(VaultError);
    const future = JSON.stringify({ ...envelope, version: 99 });
    expect(() => parseEnvelope(future)).toThrow(VaultError);
    try {
      parseEnvelope(future);
    } catch (err) {
      expect((err as VaultError).code).toBe('unsupported-version');
    }
  });
});

describe('VaultSession', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('creates, persists only ciphertext, and unlocks again', async () => {
    const storage = memoryStorage();
    const created = await VaultSession.create('pw', { storage }, '第一段笔记');
    expect(created.unlocked).toBe(true);
    const raw = storage.getItem(VAULT_KEY)!;
    expect(raw).not.toContain('第一段笔记');

    const reopened = await VaultSession.unlock('pw', { storage });
    expect(reopened.getNotes()).toBe('第一段笔记');
  });

  it('saves notes with a fresh IV and persists only sealed data', async () => {
    const storage = memoryStorage();
    const session = await VaultSession.create('pw', { storage });
    await session.saveNotes('更新后的内容');
    expect(storage.getItem(VAULT_KEY)!).not.toContain('更新后的内容');
    const reopened = await VaultSession.unlock('pw', { storage });
    expect(reopened.getNotes()).toBe('更新后的内容');
  });

  it('locks automatically after the default 15 idle minutes', async () => {
    const onLock = vi.fn();
    const storage = memoryStorage();
    const session = await VaultSession.create('pw', { storage, onLock });
    expect(session.unlocked).toBe(true);

    vi.advanceTimersByTime(DEFAULT_LOCK_TIMEOUT_MS - 1000);
    expect(session.unlocked).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(session.unlocked).toBe(false);
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('resets the idle timer on activity', async () => {
    const storage = memoryStorage();
    const session = await VaultSession.create('pw', { storage });
    vi.advanceTimersByTime(10 * 60 * 1000);
    session.touch();
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(session.unlocked).toBe(true);
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(session.unlocked).toBe(false);
  });

  it('honours a custom lock timeout', async () => {
    const storage = memoryStorage();
    const session = await VaultSession.create('pw', { storage, lockTimeoutMs: 60_000 });
    vi.advanceTimersByTime(59_000);
    expect(session.unlocked).toBe(true);
    vi.advanceTimersByTime(2_000);
    expect(session.unlocked).toBe(false);
  });

  it('never overwrites the current vault on a failed import', async () => {
    const storage = memoryStorage();
    const session = await VaultSession.create('old-pw', { storage }, '旧笔记');
    const before = storage.getItem(VAULT_KEY)!;

    await expect(session.applyImport('pw', '{broken')).rejects.toMatchObject({ code: 'damaged' });
    expect(storage.getItem(VAULT_KEY)).toBe(before);
    expect(session.getNotes()).toBe('旧笔记');

    const other = await sealNotes('other-pw', '别人的笔记');
    await expect(
      session.applyImport('wrong-pw', serializeEnvelope(other)),
    ).rejects.toMatchObject({ code: 'wrong-password' });
    expect(storage.getItem(VAULT_KEY)).toBe(before);
    expect(session.getNotes()).toBe('旧笔记');
  });

  it('applies a valid import and reads it back', async () => {
    const storage = memoryStorage();
    const session = await VaultSession.create('old-pw', { storage }, '旧笔记');
    const incoming = await sealNotes('new-pw', '导入的笔记');
    await session.applyImport('new-pw', serializeEnvelope(incoming));
    expect(session.getNotes()).toBe('导入的笔记');
    const reopened = await VaultSession.unlock('new-pw', { storage });
    expect(reopened.getNotes()).toBe('导入的笔记');
  });

  it('clearAll removes storage and locks the session', async () => {
    const storage = memoryStorage();
    const session = await VaultSession.create('pw', { storage }, 'x');
    session.clearAll();
    expect(storage.getItem(VAULT_KEY)).toBeNull();
    expect(session.unlocked).toBe(false);
    expect(() => session.getNotes()).toThrow(VaultError);
  });

  it('surfaces storage denial instead of crashing', async () => {
    await expect(VaultSession.create('pw', { storage: deniedStorage() }))
      .rejects.toMatchObject({ code: 'storage-denied' });
    await expect(VaultSession.unlock('pw', { storage: deniedStorage() }))
      .rejects.toMatchObject({ code: 'storage-denied' });
  });

  it('exportFile round-trips through parseEnvelope', async () => {
    const storage = memoryStorage();
    const session = await VaultSession.create('pw', { storage }, '导出内容');
    const file = session.exportFile();
    const parsed = parseEnvelope(file);
    await expect(openNotes('pw', parsed)).resolves.toBe('导出内容');
  });
});
