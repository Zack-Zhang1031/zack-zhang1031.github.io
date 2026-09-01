import { describe, expect, it } from 'vitest';
import { getSourceGate, sourceLedger } from './source-ledger';

const requiredIds = [
  'image-shakyamuni', 'image-guanyin', 'image-ksitigarbha',
  'image-yuanshi', 'image-lingbao', 'image-daode', 'image-luzu', 'image-guandi',
  'audio-woodfish', 'audio-lot-shake', 'audio-coins-toss', 'audio-chime', 'audio-bell',
  'audio-windchime', 'audio-water', 'audio-pine-wind',
  'lots-guanyin', 'lots-luzu', 'lots-guandi',
  'rules-calendar', 'rules-bazi', 'rules-yijing',
  'rules-qimen-chai-bu', 'rules-qimen-zhi-run', 'rules-qimen-maoshan',
] as const;

describe('Jingxin source ledger', () => {
  it('contains every required source owner exactly once', () => {
    const ids = sourceLedger.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...requiredIds].sort());
  });

  it('makes verified and blocked records auditable', () => {
    for (const source of sourceLedger) {
      expect(source.title.trim()).not.toBe('');
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.version.trim()).not.toBe('');
      expect(source.localTarget.trim()).not.toBe('');

      if (source.status === 'verified') {
        expect(source.attribution.trim()).not.toBe('');
        expect(source.license.trim()).not.toBe('');
        expect(source.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
      } else {
        expect(source.blockedReason.trim()).not.toBe('');
      }
    }
  });

  it('gates each section by verification state', () => {
    // media verified 2026-08-27; rules verified 2026-08-28 with the Qimen
    // golden fixtures; lots verified 2026-08-28 with dual-transcription
    // freezes of all three 100-lot collections
    expect(getSourceGate('figures').ready).toBe(true);
    expect(getSourceGate('audio').ready).toBe(true);
    expect(getSourceGate('lots').ready).toBe(true);
    expect(getSourceGate('rules').ready).toBe(true);
  });
});
