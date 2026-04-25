import { describe, it, expect } from 'vitest';
import {
  selectBlindDraftPool,
  rerollBlindDraftLogic,
  pubAdvanceTeamLogic,
  MOCK_POOL
} from './helpers/extracted.js';

// Build a fake DB of 60 players for blind draft tests
function makeDB(n){
  const arr = [];
  for(let i = 0; i < n; i++){
    arr.push({n: 'Player ' + i, a: ['p' + i], e: 'M', p: 'MF', c: ['club']});
  }
  return arr;
}

describe('Blind Draft — initial pool selection', () => {
  it('returns null when fewer than 30 discovered', () => {
    const db = makeDB(60);
    const order = db.slice(0, 25).map(p => p.n);
    expect(selectBlindDraftPool(order, db, 30)).toBeNull();
  });

  it('returns 30 players when collection has enough', () => {
    const db = makeDB(60);
    const order = db.map(p => p.n);
    const drawn = selectBlindDraftPool(order, db, 30);
    expect(drawn).not.toBeNull();
    expect(drawn.length).toBe(30);
  });

  it('all returned players are unique', () => {
    const db = makeDB(60);
    const order = db.map(p => p.n);
    const drawn = selectBlindDraftPool(order, db, 30);
    const names = new Set(drawn.map(p => p.n));
    expect(names.size).toBe(drawn.length);
  });

  it('all drawn players come from the order array', () => {
    const db = makeDB(60);
    const order = db.slice(0, 40).map(p => p.n);
    const drawn = selectBlindDraftPool(order, db, 30);
    drawn.forEach(p => {
      expect(order).toContain(p.n);
    });
  });
});

describe('Blind Draft — re-roll', () => {
  it('keeps picked players, replaces unpicked', () => {
    const db = makeDB(60);
    const order = db.map(p => p.n);
    const initial = selectBlindDraftPool(order, db, 30);
    const picked = new Set([initial[0].n, initial[1].n, initial[2].n]);

    const rerolled = rerollBlindDraftLogic(initial, picked, order, db, 30);

    // Picked must still be in the pool
    picked.forEach(name => {
      expect(rerolled.find(p => p.n === name)).toBeTruthy();
    });
    expect(rerolled.length).toBe(30);
  });

  it('introduces new players (replacements) on re-roll', () => {
    const db = makeDB(60);
    const order = db.map(p => p.n);
    const initial = selectBlindDraftPool(order, db, 30);
    const picked = new Set([initial[0].n]);
    const rerolled = rerollBlindDraftLogic(initial, picked, order, db, 30);

    // The unpicked 29 should be different from the unpicked of initial
    const initialUnpicked = new Set(initial.filter(p => !picked.has(p.n)).map(p => p.n));
    const rerolledUnpicked = new Set(rerolled.filter(p => !picked.has(p.n)).map(p => p.n));
    // Some new players present
    let newCount = 0;
    rerolledUnpicked.forEach(n => { if(!initialUnpicked.has(n)) newCount++; });
    expect(newCount).toBeGreaterThan(0);
  });

  it('no duplicates after re-roll', () => {
    const db = makeDB(60);
    const order = db.map(p => p.n);
    const initial = selectBlindDraftPool(order, db, 30);
    const picked = new Set([initial[0].n, initial[1].n]);
    const rerolled = rerollBlindDraftLogic(initial, picked, order, db, 30);
    const names = new Set(rerolled.map(p => p.n));
    expect(names.size).toBe(rerolled.length);
  });

  it('handles edge case: collection size = 30 exactly (fallback to reshuffle)', () => {
    const db = makeDB(30);
    const order = db.map(p => p.n);
    const initial = selectBlindDraftPool(order, db, 30);
    const picked = new Set([initial[0].n]);
    const rerolled = rerollBlindDraftLogic(initial, picked, order, db, 30);
    expect(rerolled.length).toBe(30);
    // No duplicates
    const names = new Set(rerolled.map(p => p.n));
    expect(names.size).toBe(30);
  });
});

describe('Pub Mode — Last Team Standing advancement', () => {
  it('advances to next team', () => {
    const teams = [
      { name: 'A', lives: 3, eliminated: false },
      { name: 'B', lives: 3, eliminated: false },
      { name: 'C', lives: 3, eliminated: false }
    ];
    const result = pubAdvanceTeamLogic(teams, 0);
    expect(result.gameOver).toBe(false);
    expect(result.nextIdx).toBe(1);
  });

  it('skips eliminated team', () => {
    const teams = [
      { name: 'A', lives: 3, eliminated: false },
      { name: 'B', lives: 0, eliminated: true },
      { name: 'C', lives: 3, eliminated: false }
    ];
    const result = pubAdvanceTeamLogic(teams, 0);
    expect(result.nextIdx).toBe(2); // skipped B
  });

  it('wraps around to start of array', () => {
    const teams = [
      { name: 'A', lives: 3, eliminated: false },
      { name: 'B', lives: 3, eliminated: false }
    ];
    const result = pubAdvanceTeamLogic(teams, 1);
    expect(result.nextIdx).toBe(0);
  });

  it('declares game over when only one team alive', () => {
    const teams = [
      { name: 'A', lives: 3, eliminated: false },
      { name: 'B', lives: 0, eliminated: true },
      { name: 'C', lives: 0, eliminated: true }
    ];
    const result = pubAdvanceTeamLogic(teams, 1);
    expect(result.gameOver).toBe(true);
    expect(result.winner.name).toBe('A');
  });

  it('handles all-eliminated edge case (no winner)', () => {
    const teams = [
      { name: 'A', lives: 0, eliminated: true },
      { name: 'B', lives: 0, eliminated: true }
    ];
    const result = pubAdvanceTeamLogic(teams, 0);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBeNull();
  });
});
