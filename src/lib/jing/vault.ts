/**
 * Jingxin local vault: password-derived authenticated encryption for the
 * private notebook.
 *
 * Envelope: PBKDF2-SHA-256 (310 000 iterations, random 16-byte salt) ->
 * AES-GCM-256 (random 12-byte IV). The envelope carries format, version,
 * and all KDF/cipher parameters. The password, derived key, and plaintext
 * never persist; only the sealed envelope is stored under `jing.vault.v1`.
 *
 * A failed import never overwrites the current vault: imports are parsed
 * and decrypted in memory first, and storage is replaced only after a
 * successful open.
 */

import type { StorageLike } from './settings';

export const VAULT_KEY = 'jing.vault.v1';
export const VAULT_FORMAT = 'jing-vault';
export const VAULT_VERSION = 1;
export const KDF_ITERATIONS = 310_000;
const MIN_IMPORT_ITERATIONS = 1_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
export const DEFAULT_LOCK_TIMEOUT_MS = 15 * 60 * 1000;

export interface VaultEnvelope {
  format: typeof VAULT_FORMAT;
  version: number;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: { name: 'AES-GCM'; iv: string };
  data: string;
}

export type VaultErrorCode =
  | 'wrong-password'
  | 'damaged'
  | 'unsupported-version'
  | 'unsupported-crypto'
  | 'storage-denied';

export class VaultError extends Error {
  readonly code: VaultErrorCode;
  constructor(code: VaultErrorCode, message: string) {
    super(message);
    this.name = 'VaultError';
    this.code = code;
  }
}

/* ------------------------------------------------------------------ */
/* base64 helpers (chunked to stay safe on large payloads)             */
/* ------------------------------------------------------------------ */

function b64encode(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function b64decode(text: string): Uint8Array {
  const bin = atob(text);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function requireSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new VaultError('unsupported-crypto', '当前环境不支持 Web Crypto，无法使用加密笔记。');
  }
  return subtle;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const subtle = requireSubtle();
  const baseKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/* ------------------------------------------------------------------ */
/* envelope primitives                                                 */
/* ------------------------------------------------------------------ */

export async function sealNotes(password: string, plaintext: string): Promise<VaultEnvelope> {
  const subtle = requireSubtle();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt, KDF_ITERATIONS);
  const sealed = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    format: VAULT_FORMAT,
    version: VAULT_VERSION,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: KDF_ITERATIONS, salt: b64encode(salt) },
    cipher: { name: 'AES-GCM', iv: b64encode(iv) },
    data: b64encode(new Uint8Array(sealed)),
  };
}

export async function openNotes(password: string, envelope: VaultEnvelope): Promise<string> {
  validateEnvelopeShape(envelope);
  const subtle = requireSubtle();
  let key: CryptoKey;
  try {
    key = await deriveKey(password, b64decode(envelope.kdf.salt), envelope.kdf.iterations);
  } catch (err) {
    if (err instanceof VaultError) throw err;
    throw new VaultError('damaged', '密文封套参数损坏，无法派生密钥。');
  }
  try {
    const plain = await subtle.decrypt(
      { name: 'AES-GCM', iv: b64decode(envelope.cipher.iv) as BufferSource },
      key,
      b64decode(envelope.data) as BufferSource,
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new VaultError('wrong-password', '密码错误或密文已被改动。');
  }
}

function validateEnvelopeShape(envelope: VaultEnvelope): void {
  if (!envelope || typeof envelope !== 'object') {
    throw new VaultError('damaged', '导入内容不是有效的笔记封套。');
  }
  if (envelope.format !== VAULT_FORMAT) {
    throw new VaultError('damaged', '导入内容不是静心堂笔记格式。');
  }
  if (envelope.version !== VAULT_VERSION) {
    throw new VaultError('unsupported-version', `不支持的笔记版本：${String(envelope.version)}。`);
  }
  const { kdf, cipher, data } = envelope;
  if (
    !kdf || kdf.name !== 'PBKDF2' || kdf.hash !== 'SHA-256'
    || !Number.isInteger(kdf.iterations) || kdf.iterations < MIN_IMPORT_ITERATIONS
    || typeof kdf.salt !== 'string' || kdf.salt.length === 0
    || !cipher || cipher.name !== 'AES-GCM'
    || typeof cipher.iv !== 'string' || cipher.iv.length === 0
    || typeof data !== 'string' || data.length === 0
  ) {
    throw new VaultError('damaged', '笔记封套缺少必要的加密参数或已损坏。');
  }
}

export function serializeEnvelope(envelope: VaultEnvelope): string {
  validateEnvelopeShape(envelope);
  return JSON.stringify(envelope, null, 2);
}

/** Parse and structurally validate an import without touching storage. */
export function parseEnvelope(json: string): VaultEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new VaultError('damaged', '导入文件不是有效的 JSON。');
  }
  const envelope = parsed as VaultEnvelope;
  validateEnvelopeShape(envelope);
  return envelope;
}

/** Whether a sealed vault exists in storage. Safe probe for UI chrome. */
export function hasStoredVault(storage: StorageLike): boolean {
  try {
    return storage.getItem(VAULT_KEY) !== null;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* session: memory-only unlocked state + idle auto-lock                */
/* ------------------------------------------------------------------ */

export interface VaultSessionOptions {
  storage: StorageLike;
  lockTimeoutMs?: number;
  onLock?: () => void;
}

export class VaultSession {
  private readonly storage: StorageLike;
  private readonly lockTimeoutMs: number;
  private readonly onLock?: () => void;
  private key: CryptoKey | null = null;
  private plaintext: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  private constructor(options: VaultSessionOptions) {
    this.storage = options.storage;
    this.lockTimeoutMs = options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
    this.onLock = options.onLock;
  }

  /** Create a brand-new vault holding `initialText` (default empty). */
  static async create(
    password: string,
    options: VaultSessionOptions,
    initialText = '',
  ): Promise<VaultSession> {
    const session = new VaultSession(options);
    const envelope = await sealNotes(password, initialText);
    session.persist(envelope);
    session.key = await deriveKey(
      password,
      b64decode(envelope.kdf.salt),
      envelope.kdf.iterations,
    );
    session.plaintext = initialText;
    session.armTimer();
    return session;
  }

  /** Unlock the stored vault. Throws VaultError on wrong password/damage. */
  static async unlock(password: string, options: VaultSessionOptions): Promise<VaultSession> {
    const session = new VaultSession(options);
    const envelope = session.readStored();
    if (!envelope) {
      throw new VaultError('damaged', '本机还没有加密笔记，请先创建。');
    }
    const plaintext = await openNotes(password, envelope);
    session.key = await deriveKey(
      password,
      b64decode(envelope.kdf.salt),
      envelope.kdf.iterations,
    );
    session.plaintext = plaintext;
    session.armTimer();
    return session;
  }

  get unlocked(): boolean {
    return this.key !== null;
  }

  /** Current notes; throws when locked. */
  getNotes(): string {
    if (this.plaintext === null) {
      throw new VaultError('storage-denied', '笔记已锁定，请先解锁。');
    }
    this.touch();
    return this.plaintext;
  }

  /** Re-encrypt and persist notes. Memory plaintext updates only on success. */
  async saveNotes(text: string): Promise<void> {
    if (!this.key) {
      throw new VaultError('storage-denied', '笔记已锁定，请先解锁。');
    }
    const subtle = requireSubtle();
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const sealed = await subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      this.key,
      new TextEncoder().encode(text),
    );
    const current = this.readStored();
    if (!current) {
      throw new VaultError('damaged', '本地笔记封套丢失，无法保存。');
    }
    const next: VaultEnvelope = {
      ...current,
      cipher: { name: 'AES-GCM', iv: b64encode(iv) },
      data: b64encode(new Uint8Array(sealed)),
    };
    this.persist(next);
    this.plaintext = text;
    this.touch();
  }

  /** Serialized envelope for `.jing` export. Empty string when nothing stored. */
  exportFile(): string {
    const envelope = this.readStored();
    return envelope ? serializeEnvelope(envelope) : '';
  }

  /**
   * Validate and apply an imported `.jing` file. The existing vault is
   * replaced only after the import parses and opens with `password`;
   * any failure leaves current storage and session untouched.
   */
  async applyImport(password: string, json: string): Promise<void> {
    const envelope = parseEnvelope(json);
    const plaintext = await openNotes(password, envelope);
    this.persist(envelope);
    this.key = await deriveKey(
      password,
      b64decode(envelope.kdf.salt),
      envelope.kdf.iterations,
    );
    this.plaintext = plaintext;
    this.armTimer();
  }

  /**
   * Validate, persist, and open an imported `.jing` file in one step.
   * Storage is replaced only after the import opens successfully.
   */
  static async importFrom(
    password: string,
    json: string,
    options: VaultSessionOptions,
  ): Promise<VaultSession> {
    const session = new VaultSession(options);
    await session.applyImport(password, json);
    return session;
  }

  /** Remove the stored envelope and wipe memory state. */
  clearAll(): void {
    try {
      this.storage.removeItem(VAULT_KEY);
    } catch {
      /* removal failure must not keep plaintext in memory */
    }
    this.wipe();
  }

  lock(): void {
    this.wipe();
    this.onLock?.();
  }

  /** Reset the idle countdown; call on meaningful user activity. */
  touch(): void {
    if (this.key) this.armTimer();
  }

  private armTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.lock(), this.lockTimeoutMs);
  }

  private wipe(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.key = null;
    this.plaintext = null;
  }

  private readStored(): VaultEnvelope | null {
    let raw: string | null;
    try {
      raw = this.storage.getItem(VAULT_KEY);
    } catch {
      throw new VaultError('storage-denied', '浏览器拒绝了本地存储访问。');
    }
    if (raw === null) return null;
    return parseEnvelope(raw);
  }

  private persist(envelope: VaultEnvelope): void {
    try {
      this.storage.setItem(VAULT_KEY, serializeEnvelope(envelope));
    } catch {
      throw new VaultError('storage-denied', '浏览器拒绝了本地存储写入，笔记未保存。');
    }
  }
}
