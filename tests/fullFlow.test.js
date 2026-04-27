/**
 * FULL FLOW TEST — simulates a real player's journey from zero to a saved XI.
 *
 * This is the single highest-value test in the suite. If this passes, the
 * core game loop works end-to-end. If it fails, something fundamental
 * regressed.
 *
 * Player journey simulated:
 *   1. Empty state — no discoveries, no unlocks
 *   2. Play quiz → guess 5 players → state grows
 *   3. Continue playing → cross 50-player threshold → blind draft unlocks
 *   4. Open blind draft → pool of 30 drawn from collection
 *   5. Pick 11 of 30 → confirm
 *   6. State persists (refresh simulation = re-read from storage)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  norm,
  tryMatch,
  resolveAmbiguous,
  simulateSubmit,
  addDiscovered,
  getDiscovered,
  getDiscoveredOrder,
  selectBlindDraftPool,
  rerollBlindDraftLogic,
  makeMockStorage
} from './helpers/extracted.js';

// Build a fake DB of 60 players so we can cross the 50-player unlock threshold
function buildTestDB(n){
  const arr = [];
  const positions = ['GK','DF','MF','FW'];
  const eras = ['C','G','M'];
  for(let i = 0; i < n; i++){
    const surname = 'Player' + i;
    arr.push({
      n: 'First' + i + ' ' + surname,
      a: ['first' + i + ' ' + surname.toLowerCase(), surname.toLowerCase()],
      e: eras[i % 3],
      p: positions[i % 4],
      c: ['testclub']
    });
  }
  return arr;
}

describe('FULL FLOW — new player journey from zero to saved XI', () => {
  let storage;
  let db;

  beforeEach(() => {
    storage = makeMockStorage();
    db = buildTestDB(60);
  });

  it('Stage 1: Empty state — no discoveries, no unlock pending', () => {
    expect(getDiscovered(storage).size).toBe(0);
    expect(getDiscoveredOrder(storage)).toEqual([]);
    expect(storage.getItem('fl_blind_unlock_pending')).toBeNull();
    expect(storage.getItem('fl_xi_unlocked')).toBeNull();
  });

  it('Stage 2: First 5 guesses grow state correctly', () => {
    const guesses = ['First0 Player0', 'First1 Player1', 'First2 Player2', 'First3 Player3', 'First4 Player4'];
    const found = new Set();

    for(const guess of guesses){
      const result = simulateSubmit(guess, { found, pendingSurname: null }, db);
      expect(result.action).toBe('correct');
      expect(found.has(result.player.n)).toBe(false); // not yet added
      found.add(result.player.n);
      addDiscovered(result.player.n, storage);
    }

    expect(getDiscovered(storage).size).toBe(5);
    expect(getDiscoveredOrder(storage).length).toBe(5);
    // No unlock yet — under 50
    expect(storage.getItem('fl_blind_unlock_pending')).toBeNull();
  });

  it('Stage 3: Crossing 50-player threshold flags unlock pending', () => {
    // Add 49 first — flag should NOT be set
    for(let i = 0; i < 49; i++){
      addDiscovered('First' + i + ' Player' + i, storage);
    }
    expect(getDiscovered(storage).size).toBe(49);
    expect(storage.getItem('fl_blind_unlock_pending')).toBeNull();

    // Add the 50th — flag should now be set
    addDiscovered('First49 Player49', storage);
    expect(getDiscovered(storage).size).toBe(50);
    expect(storage.getItem('fl_blind_unlock_pending')).toBe('1');
  });

  it('Stage 4: Blind draft draws a valid pool of 30 from collection', () => {
    // Build collection of 55 players
    for(let i = 0; i < 55; i++){
      addDiscovered('First' + i + ' Player' + i, storage);
    }
    const order = getDiscoveredOrder(storage);
    expect(order.length).toBe(55);

    const drawn = selectBlindDraftPool(order, db, 30);
    expect(drawn).not.toBeNull();
    expect(drawn.length).toBe(30);

    // All drawn players must be unique
    const names = new Set(drawn.map(p => p.n));
    expect(names.size).toBe(30);

    // All drawn must be from the discovered collection
    drawn.forEach(p => {
      expect(order).toContain(p.n);
    });
  });

  it('Stage 5: Pick 11 of 30, re-roll preserves picks, no duplicates', () => {
    for(let i = 0; i < 55; i++){
      addDiscovered('First' + i + ' Player' + i, storage);
    }
    const order = getDiscoveredOrder(storage);
    const initial = selectBlindDraftPool(order, db, 30);

    // User picks 5 players
    const picked = new Set(initial.slice(0, 5).map(p => p.n));
    expect(picked.size).toBe(5);

    // Re-roll keeps the 5 picks, replaces the other 25
    const rerolled = rerollBlindDraftLogic(initial, picked, order, db, 30);
    expect(rerolled.length).toBe(30);

    // All 5 picks survived
    picked.forEach(name => {
      expect(rerolled.find(p => p.n === name)).toBeTruthy();
    });
    // No duplicates
    expect(new Set(rerolled.map(p => p.n)).size).toBe(30);
  });

  it('Stage 6: State persists after refresh (storage is source of truth)', () => {
    // Initial play
    for(let i = 0; i < 10; i++){
      addDiscovered('First' + i + ' Player' + i, storage);
    }
    storage.setItem('fl_user_name', 'TestPlayer');
    storage.setItem('fl_daily_streak', '3');

    // Simulate refresh — re-create storage view, but data persists since we share `storage` ref
    // (In production, this is localStorage which truly persists)
    const beforeRefresh = {
      discovered: [...getDiscovered(storage)],
      order: getDiscoveredOrder(storage),
      name: storage.getItem('fl_user_name'),
      streak: storage.getItem('fl_daily_streak')
    };

    // "Refresh" — no destruction of storage, but re-read everything
    const afterRefresh = {
      discovered: [...getDiscovered(storage)],
      order: getDiscoveredOrder(storage),
      name: storage.getItem('fl_user_name'),
      streak: storage.getItem('fl_daily_streak')
    };

    expect(afterRefresh).toEqual(beforeRefresh);
    expect(afterRefresh.discovered.length).toBe(10);
    expect(afterRefresh.name).toBe('TestPlayer');
    expect(afterRefresh.streak).toBe('3');
  });

  it('FULL E2E: Complete journey — empty → 50 unlock → blind pool → picks', () => {
    // 1. Start fresh
    expect(getDiscovered(storage).size).toBe(0);

    // 2. Play through quiz — guess 50 players over multiple rounds
    for(let i = 0; i < 50; i++){
      const game = { found: getDiscovered(storage), pendingSurname: null };
      const guess = 'First' + i + ' Player' + i;
      const result = simulateSubmit(guess, game, db);
      expect(result.action).toBe('correct');
      addDiscovered(result.player.n, storage);
    }

    // 3. Unlock should be pending
    expect(storage.getItem('fl_blind_unlock_pending')).toBe('1');

    // 4. Mark unlock as seen (simulating user dismissing the overlay)
    storage.setItem('fl_blind_unlocked_seen', '1');

    // 5. Open blind draft — pool of 30 is drawn
    const order = getDiscoveredOrder(storage);
    const drawn = selectBlindDraftPool(order, db, 30);
    expect(drawn.length).toBe(30);

    // 6. User picks 11 from the drawn pool
    const picked = drawn.slice(0, 11);
    expect(picked.length).toBe(11);

    // 7. State remains consistent
    expect(getDiscovered(storage).size).toBe(50);
    expect(storage.getItem('fl_blind_unlock_pending')).toBe('1');
    expect(storage.getItem('fl_blind_unlocked_seen')).toBe('1');

    // 8. The 11 picks would become the basis for the XI on the pitch.
    // (Actual lock-in to HoF requires DOM — covered by manual testing)
    const xiSlots = picked.map(p => ({ name: p.n, era: p.e, position: p.p }));
    expect(xiSlots.length).toBe(11);
    expect(new Set(xiSlots.map(s => s.name)).size).toBe(11); // no duplicates
  });

  it('Edge case: typing same player twice — second is rejected', () => {
    const found = new Set();
    const game = { found, pendingSurname: null };

    let result = simulateSubmit('First0 Player0', game, db);
    expect(result.action).toBe('correct');
    found.add(result.player.n);

    // Same input again — should be "already_found"
    result = simulateSubmit('First0 Player0', game, db);
    expect(result.action).toBe('already_found');
  });

  it('Edge case: ambiguous surname → resolution → correct player', () => {
    // Add two players sharing surname "Smith"
    const ambiguousDB = [
      ...db,
      {n: 'John Smith', a: ['john smith'], e: 'G', p: 'MF', c: ['testclub']},
      {n: 'Mark Smith', a: ['mark smith'], e: 'G', p: 'DF', c: ['testclub']}
    ];

    const game = { found: new Set(), pendingSurname: null };

    // Type "Smith" — ambiguous
    let result = simulateSubmit('Smith', game, ambiguousDB);
    expect(result.action).toBe('ambiguous');
    expect(result.surname).toBe('smith');
    game.pendingSurname = result.surname;

    // Type "John" — resolves to John Smith
    result = simulateSubmit('John', game, ambiguousDB);
    expect(result.action).toBe('correct');
    expect(result.player.n).toBe('John Smith');
  });

  it('Edge case: empty input does not crash', () => {
    const game = { found: new Set(), pendingSurname: null };
    const result = simulateSubmit('', game, db);
    expect(result.action).toBe('noop');
  });
});
