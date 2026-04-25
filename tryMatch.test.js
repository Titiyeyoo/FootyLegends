import { describe, it, expect } from 'vitest';
import { tryMatch, norm, isAlmost, MOCK_POOL } from './helpers/extracted.js';

describe('norm()', () => {
  it('lowercases input', () => {
    expect(norm('LAMPARD')).toBe('lampard');
  });
  it('strips accents', () => {
    expect(norm('Guéhi')).toBe('guehi');
    expect(norm('Müller')).toBe('muller');
  });
  it('removes punctuation', () => {
    expect(norm("O'Brien")).toBe('obrien');
    expect(norm('  Frank  Lampard!  ')).toBe('frank lampard');
  });
  it('collapses multiple spaces', () => {
    expect(norm('frank   lampard')).toBe('frank lampard');
  });
  it('handles empty input', () => {
    expect(norm('')).toBe('');
    expect(norm('   ')).toBe('');
  });
});

describe('tryMatch — basic matching', () => {
  it('matches a full name alias', () => {
    const result = tryMatch('Frank Lampard', new Set(), MOCK_POOL);
    expect(result.ok).toBe(true);
    expect(result.player.n).toBe('Frank Lampard');
  });
  it('matches a nickname alias', () => {
    const result = tryMatch('lamps', new Set(), MOCK_POOL);
    expect(result.ok).toBe(true);
    expect(result.player.n).toBe('Frank Lampard');
  });
  it('matches case-insensitively', () => {
    const result = tryMatch('LAMPARD', new Set(), MOCK_POOL);
    expect(result.ok).toBe(true);
  });
  it('returns null for unknown input', () => {
    const result = tryMatch('Cristiano Ronaldo', new Set(), MOCK_POOL);
    expect(result).toBeNull();
  });
  it('returns null for too-short input', () => {
    expect(tryMatch('a', new Set(), MOCK_POOL)).toBeNull();
    expect(tryMatch('', new Set(), MOCK_POOL)).toBeNull();
  });
  it('skips already-found players', () => {
    const found = new Set(['Frank Lampard']);
    const result = tryMatch('Frank Lampard', found, MOCK_POOL);
    expect(result).toBeNull();
  });
});

describe('tryMatch — ambiguous surnames', () => {
  it('flags ambiguous when multiple players share a surname', () => {
    const result = tryMatch('Charlton', new Set(), MOCK_POOL);
    expect(result.ok).toBe(false);
    expect(result.ambiguous).toBe(true);
    expect(result.surname).toBe('charlton');
  });

  it('flags ambiguous for "Neville" (Gary + Phil)', () => {
    const result = tryMatch('Neville', new Set(), MOCK_POOL);
    expect(result.ambiguous).toBe(true);
  });

  it('resolves surname to single player when only one remains unfound', () => {
    const found = new Set(['Bobby Charlton']);
    const result = tryMatch('Charlton', found, MOCK_POOL);
    expect(result.ok).toBe(true);
    expect(result.player.n).toBe('Jack Charlton');
  });

  it('returns null when surname not in any player', () => {
    const result = tryMatch('Notreal', new Set(), MOCK_POOL);
    expect(result).toBeNull();
  });

  it('resolves "Lampard" via alias (Frank), not Frank Lampard Sr', () => {
    const result = tryMatch('Lampard', new Set(), MOCK_POOL);
    expect(result.ok).toBe(true);
    expect(result.player.n).toBe('Frank Lampard');
  });
});

describe('tryMatch — accent handling', () => {
  it('matches Guéhi typed as Guehi', () => {
    const result = tryMatch('Guehi', new Set(), MOCK_POOL);
    expect(result.ok).toBe(true);
    expect(result.player.n).toBe('Marc Guehi');
  });
  it('matches Guéhi typed with accents', () => {
    const result = tryMatch('Guéhi', new Set(), MOCK_POOL);
    expect(result.ok).toBe(true);
    expect(result.player.n).toBe('Marc Guehi');
  });
});

describe('isAlmost — typo detection', () => {
  it('detects typo (1 char off)', () => {
    expect(isAlmost('lampaard', new Set(), MOCK_POOL)).toBe(true);
  });
  it('returns false for completely different word', () => {
    expect(isAlmost('xyzqwert', new Set(), MOCK_POOL)).toBe(false);
  });
  it('returns false for too-short input', () => {
    expect(isAlmost('la', new Set(), MOCK_POOL)).toBe(false);
  });
});
