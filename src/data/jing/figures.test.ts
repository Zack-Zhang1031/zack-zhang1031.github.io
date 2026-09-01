import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import {
  AMBIENCE_BY_TRADITION,
  AMBIENCE_SRC,
  BUDDHIST_FIGURES,
  NEUTRAL_AMBIENCE,
  TAOIST_FIGURES,
  WOODFISH_SOUND_SRC,
} from './figures';
import { getSourceGate, sourceLedger } from './source-ledger';

describe('sacred figures', () => {
  it('contains the approved figures for each tradition', () => {
    expect(BUDDHIST_FIGURES.map((f) => f.id)).toEqual(['shakyamuni', 'guanyin', 'ksitigarbha']);
    expect(TAOIST_FIGURES.map((f) => f.id)).toEqual(['yuanshi', 'lingbao', 'daode', 'luzu', 'guandi']);
  });

  it('never mixes traditions', () => {
    for (const f of BUDDHIST_FIGURES) expect(f.tradition).toBe('buddhist');
    for (const f of TAOIST_FIGURES) expect(f.tradition).toBe('taoist');
    const ids = new Set([...BUDDHIST_FIGURES, ...TAOIST_FIGURES].map((f) => f.id));
    expect(ids.size).toBe(8);
  });

  it('carries attribution, license, and an existing local image for every figure', () => {
    for (const f of [...BUDDHIST_FIGURES, ...TAOIST_FIGURES]) {
      expect(f.image.attribution.trim()).not.toBe('');
      expect(f.image.license.trim()).not.toBe('');
      expect(f.image.sourceUrl).toMatch(/^https:\/\//);
      expect(f.image.alt.trim()).not.toBe('');
      expect(existsSync(`public${f.image.src}`)).toBe(true);
    }
  });

  it('has verified ledger records for all figure images and audio', () => {
    expect(getSourceGate('figures').ready).toBe(true);
    expect(getSourceGate('audio').ready).toBe(true);
    for (const f of [...BUDDHIST_FIGURES, ...TAOIST_FIGURES]) {
      const record = sourceLedger.find((s) => s.localTarget === `public${f.image.src}`);
      expect(record?.status).toBe('verified');
    }
  });
});

describe('ambience groups', () => {
  it('keeps buddhist and taoist ambience disjoint', () => {
    const overlap = [...AMBIENCE_BY_TRADITION.buddhist].filter((id) =>
      (AMBIENCE_BY_TRADITION.taoist as readonly string[]).includes(id),
    );
    expect(overlap).toEqual([]);
  });

  it('maps every ambience id to an existing local file', () => {
    const ids = [
      ...AMBIENCE_BY_TRADITION.buddhist,
      ...AMBIENCE_BY_TRADITION.taoist,
      ...NEUTRAL_AMBIENCE,
    ];
    for (const id of ids) {
      const src = AMBIENCE_SRC[id];
      expect(src, `missing src for ${id}`).toBeTruthy();
      expect(existsSync(`public${src}`), `missing file for ${id}`).toBe(true);
    }
    expect(existsSync(`public${WOODFISH_SOUND_SRC}`)).toBe(true);
  });
});
