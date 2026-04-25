import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDiscovered,
  getDiscoveredOrder,
  addDiscovered,
  makeMockStorage
} from './helpers/extracted.js';

describe('Discovery — empty state', () => {
  it('returns empty Set when no data', () => {
    const s = makeMockStorage();
    expect(getDiscovered(s).size).toBe(0);
  });
  it('returns empty array when no order', () => {
    const s = makeMockStorage();
    expect(getDiscoveredOrder(s)).toEqual([]);
  });
});

describe('addDiscovered', () => {
  it('adds a new player and returns true', () => {
    const s = makeMockStorage();
    expect(addDiscovered('Harry Kane', s)).toBe(true);
    expect(getDiscovered(s).has('Harry Kane')).toBe(true);
  });
  it('refuses duplicate and returns false', () => {
    const s = makeMockStorage();
    addDiscovered('Harry Kane', s);
    expect(addDiscovered('Harry Kane', s)).toBe(false);
  });
  it('preserves discovery order', () => {
    const s = makeMockStorage();
    addDiscovered('Harry Kane', s);
    addDiscovered('Frank Lampard', s);
    addDiscovered('Bobby Moore', s);
    expect(getDiscoveredOrder(s)).toEqual(['Harry Kane', 'Frank Lampard', 'Bobby Moore']);
  });
});

describe('Migration — order is rebuilt from set if missing', () => {
  it('rebuilds order array when only legacy fl_discovered is present', () => {
    const s = makeMockStorage();
    // Simulate a legacy user: has fl_discovered Set but no fl_discovered_order
    s.setItem('fl_discovered', JSON.stringify(['Player A', 'Player B', 'Player C']));
    const order = getDiscoveredOrder(s);
    expect(order.length).toBe(3);
    expect(order).toContain('Player A');
    expect(order).toContain('Player B');
    expect(order).toContain('Player C');
  });

  it('persists migration result back to storage', () => {
    const s = makeMockStorage();
    s.setItem('fl_discovered', JSON.stringify(['X', 'Y']));
    getDiscoveredOrder(s); // trigger migration
    const stored = JSON.parse(s.getItem('fl_discovered_order'));
    expect(stored.length).toBe(2);
  });

  it('merges missing players when order is shorter than set', () => {
    const s = makeMockStorage();
    s.setItem('fl_discovered', JSON.stringify(['A', 'B', 'C', 'D', 'E']));
    s.setItem('fl_discovered_order', JSON.stringify(['D', 'E'])); // partial
    const merged = getDiscoveredOrder(s);
    expect(merged.length).toBe(5);
    // The missing ones are prepended (oldest)
    expect(merged.slice(-2)).toEqual(['D', 'E']);
    expect(['A','B','C']).toContain(merged[0]);
  });
});

describe('Unlock flag — crossing 50 threshold', () => {
  it('does NOT set unlock pending when count stays below 50', () => {
    const s = makeMockStorage();
    for(let i = 0; i < 49; i++) addDiscovered('Player ' + i, s);
    expect(s.getItem('fl_blind_unlock_pending')).toBeNull();
  });

  it('sets unlock pending exactly when crossing 49→50', () => {
    const s = makeMockStorage();
    for(let i = 0; i < 49; i++) addDiscovered('Player ' + i, s);
    expect(s.getItem('fl_blind_unlock_pending')).toBeNull();
    addDiscovered('Player 49', s); // count becomes 50
    expect(s.getItem('fl_blind_unlock_pending')).toBe('1');
  });

  it('does not re-set flag if already seen', () => {
    const s = makeMockStorage();
    s.setItem('fl_blind_unlocked_seen', '1');
    for(let i = 0; i < 51; i++) addDiscovered('P' + i, s);
    expect(s.getItem('fl_blind_unlock_pending')).toBeNull();
  });
});
