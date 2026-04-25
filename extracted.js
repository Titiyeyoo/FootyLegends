// ════════════════════════════════════════════════════════════════════════════
// EXTRACTED PURE FUNCTIONS — for unit testing only
//
// ⚠️  SOURCE OF TRUTH: footy-legends-v2.html
//
// This file is a SNAPSHOT of critical pure-logic functions copied from the
// main game file. If you change a function in production, you MUST update it
// here too — otherwise tests pass but production breaks.
//
// Sync checklist (line numbers as of 2026-04-25):
//   - norm()                  → footy-legends-v2.html L2194
//   - tryMatch()              → footy-legends-v2.html L2201
//   - lev()                   → footy-legends-v2.html L2236
//   - isAlmost()              → footy-legends-v2.html L2246
//   - getDiscovered()         → footy-legends-v2.html L3206
//   - getDiscoveredOrder()    → footy-legends-v2.html L3216
//   - addDiscovered()         → footy-legends-v2.html L3240
//   - drawBlindDraft logic    → footy-legends-v2.html (drawBlindDraft)
// ════════════════════════════════════════════════════════════════════════════

// Tiny mock pool for tests that don't need the full DB
export const MOCK_POOL = [
  {n:"Bobby Charlton",  a:["bobby charlton","bobby"], e:"C", p:"FW", c:["man utd"]},
  {n:"Jack Charlton",   a:["jack charlton","jack"],   e:"C", p:"DF", c:["leeds"]},
  {n:"Frank Lampard",   a:["lampard","frank lampard","lamps"], e:"G", p:"MF", c:["chelsea","west ham"]},
  {n:"Frank Lampard Sr",a:["frank lampard sr"],       e:"C", p:"DF", c:["west ham"]},
  {n:"Steven Gerrard",  a:["gerrard","steven gerrard","stevie g"], e:"G", p:"MF", c:["liverpool"]},
  {n:"Wayne Rooney",    a:["rooney","wayne rooney"],  e:"G", p:"FW", c:["man utd","everton"]},
  {n:"Harry Kane",      a:["kane","harry kane"],      e:"M", p:"FW", c:["tottenham","bayern munich"]},
  {n:"Marc Guehi",      a:["guehi","marc guehi"],     e:"M", p:"DF", c:["crystal palace","chelsea"]},
  {n:"Gary Neville",    a:["gary neville"],            e:"G", p:"DF", c:["man utd"]},
  {n:"Phil Neville",    a:["phil neville"],            e:"G", p:"DF", c:["man utd","everton"]},
  {n:"Bobby Moore",     a:["moore","bobby moore"],    e:"C", p:"DF", c:["west ham"]},
];

// ────────────────────────────────────────────────────────────────────────────
// norm — string normalization for fuzzy matching
// ────────────────────────────────────────────────────────────────────────────
export function norm(s){
  const m={á:"a",à:"a",â:"a",ä:"a",é:"e",è:"e",ê:"e",ë:"e",
    í:"i",î:"i",ï:"i",ó:"o",ô:"o",ö:"o",ú:"u",û:"u",ü:"u",ñ:"n",ç:"c"};
  return s.toLowerCase().split('').map(c=>m[c]||c).join('')
    .replace(/[^a-z0-9 ]/g,'').trim().replace(/\s+/g,' ');
}

// ────────────────────────────────────────────────────────────────────────────
// tryMatch — search a pool for a player matching input
// Note: uses a `pool` parameter instead of global G.pool (only difference)
// ────────────────────────────────────────────────────────────────────────────
export function tryMatch(input, found, pool){
  const v = norm(input);
  if(!v || v.length < 2) return null;

  for(const p of pool){
    if(found.has(p.n)) continue;
    for(const a of p.a){
      if(norm(a) === v) return {player: p, ok: true};
    }
  }

  // Check if it's a bare surname
  const words = v.split(' ');
  if(words.length === 1){
    const remaining = pool.filter(p =>
      !found.has(p.n) && norm(p.n.split(' ').pop()) === v
    );
    if(remaining.length > 1){
      return {player: null, ok: false, ambiguous: true, surname: v};
    } else if(remaining.length === 1){
      return {player: remaining[0], ok: true};
    }
    const aliasMatch = pool.filter(p =>
      !found.has(p.n) && p.a.some(a => norm(a) === v)
    );
    if(aliasMatch.length === 1) return {player: aliasMatch[0], ok: true};
  }

  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Levenshtein distance + isAlmost (for "almost matched" warnings)
// ────────────────────────────────────────────────────────────────────────────
export function lev(a, b){
  if(Math.abs(a.length-b.length)>2) return 99;
  const d=Array.from({length:a.length+1},(_,i)=>
    Array.from({length:b.length+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=a.length;i++)
    for(let j=1;j<=b.length;j++)
      d[i][j]=a[i-1]===b[j-1]?d[i-1][j-1]:1+Math.min(d[i-1][j],d[i][j-1],d[i-1][j-1]);
  return d[a.length][b.length];
}

export function isAlmost(input, found, pool){
  const v = norm(input);
  if(v.length < 3) return false;
  return pool.some(p => !found.has(p.n) && p.a.some(a => {
    const na = norm(a);
    return na.length > 3 && lev(v, na) === 1;
  }));
}

// ────────────────────────────────────────────────────────────────────────────
// Discovery system — uses a passed-in storage object (mock localStorage)
// In production: storage = window.localStorage. Here we inject a mock.
// ────────────────────────────────────────────────────────────────────────────
export function getDiscovered(storage){
  try {
    const raw = storage.getItem('fl_discovered');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch(e){ return new Set(); }
}

export function getDiscoveredOrder(storage){
  try {
    const raw = storage.getItem('fl_discovered_order');
    const order = raw ? JSON.parse(raw) : [];
    const set = getDiscovered(storage);
    if(order.length < set.size){
      const inOrder = new Set(order);
      const missing = [];
      set.forEach(n => { if(!inOrder.has(n)) missing.push(n); });
      const merged = missing.concat(order);
      storage.setItem('fl_discovered_order', JSON.stringify(merged));
      return merged;
    }
    return order;
  } catch(e){ return []; }
}

export function addDiscovered(playerName, storage){
  const set = getDiscovered(storage);
  if(set.has(playerName)) return false;
  const wasBelow = set.size < 50;

  // ⚠️ Read order BEFORE updating set, so migration in getDiscoveredOrder
  // doesn't pre-emptively pull in the new player and cause a duplicate.
  const order = getDiscoveredOrder(storage);
  set.add(playerName);
  order.push(playerName);

  try {
    storage.setItem('fl_discovered', JSON.stringify([...set]));
    storage.setItem('fl_discovered_order', JSON.stringify(order));
    if(wasBelow && set.size >= 50 && storage.getItem('fl_blind_unlocked_seen') !== '1'){
      storage.setItem('fl_blind_unlock_pending', '1');
    }
  } catch(e){}
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// Blind draft pool selection (extracted logic, no DOM)
// Takes order array + DB; returns shuffled drawn array of 30 (or fewer if pool small)
// ────────────────────────────────────────────────────────────────────────────
export function selectBlindDraftPool(orderArr, db, count = 30){
  const allDiscovered = orderArr
    .map(name => db.find(p => p.n === name))
    .filter(Boolean);
  if(allDiscovered.length < count){
    return null; // caller decides — alert in production
  }
  const shuffled = allDiscovered.slice();
  for(let i = shuffled.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// Re-roll: keep picked, replace unpicked with fresh players
export function rerollBlindDraftLogic(currentDrawn, picked, orderArr, db, count = 30){
  const pickedPlayers = currentDrawn.filter(p => picked.has(p.n));
  const unpickedCount = count - pickedPlayers.length;

  const currentDrawnNames = new Set(currentDrawn.map(p => p.n));
  const candidates = orderArr
    .map(name => db.find(p => p.n === name))
    .filter(p => p && !currentDrawnNames.has(p.n));

  if(candidates.length < unpickedCount){
    const unpickedOld = currentDrawn.filter(p => !picked.has(p.n));
    candidates.push(...unpickedOld);
  }

  for(let i = candidates.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const replacements = candidates.slice(0, unpickedCount);
  const newDrawn = pickedPlayers.concat(replacements);
  for(let i = newDrawn.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [newDrawn[i], newDrawn[j]] = [newDrawn[j], newDrawn[i]];
  }
  return newDrawn;
}

// ────────────────────────────────────────────────────────────────────────────
// Pub Mode — Last Team Standing — pure state advancement
// Determines who the next active team is (skipping eliminated teams)
// Returns: { nextIdx, gameOver, winner }
// ────────────────────────────────────────────────────────────────────────────
export function pubAdvanceTeamLogic(teams, currentIdx){
  const alive = teams.filter(t => !t.eliminated);
  if(alive.length <= 1){
    return { gameOver: true, winner: alive[0] || null, nextIdx: currentIdx };
  }
  let next = currentIdx;
  let safety = 0;
  do {
    next = (next + 1) % teams.length;
    if(++safety > teams.length * 2) break;
  } while(teams[next].eliminated);
  return { gameOver: false, winner: null, nextIdx: next };
}

// ────────────────────────────────────────────────────────────────────────────
// Mock localStorage — for tests
// ────────────────────────────────────────────────────────────────────────────
export function makeMockStorage(){
  const data = {};
  return {
    getItem(k){ return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem(k, v){ data[k] = String(v); },
    removeItem(k){ delete data[k]; },
    clear(){ for(const k in data) delete data[k]; },
    _data: data
  };
}
