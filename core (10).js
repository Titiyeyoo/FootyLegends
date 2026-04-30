/* ════════════════════════════════════════════════════════════════════
   Footy Legends Quiz — Core Helpers
   ════════════════════════════════════════════════════════════════════
   Extracted from index.html as part of Phase 4 Stage B file split.
   - go(id): screen navigation
   - toast(msg, type): user-facing messages
   - norm(s), tryMatch(input, found): player name matching
   - lev(a, b), isAlmost(input, found): typo detection
   - refreshTitleScreen(): unlock states + progress widget
   - flashRed(), flashGreen(): visual feedback
   - safeParse(raw, fallback): localStorage corruption-proof JSON parse
   - withLock(fn, ms): debounce/spam protection wrapper
   ════════════════════════════════════════════════════════════════════ */

// ─── safeParse() — decode JSON from localStorage with fallback on corruption ──
// Use everywhere localStorage data is read.
// If user manually breaks a key (DevTools, extension, browser bug), game survives.
function safeParse(raw, fallback){
  if(raw === null || raw === undefined) return fallback;
  try {
    const v = JSON.parse(raw);
    return v;
  } catch(e){
    console.warn('safeParse: corrupt JSON, falling back to default. Raw:', raw);
    return fallback;
  }
}

// ─── withLock() — wraps a function so it can't be called again within `ms` ms ──
// Used on critical buttons (start game, lock in XI, draw blind) to prevent
// double-clicks from spam-tapping users on slow phones.
function withLock(fn, ms){
  let locked = false;
  ms = ms || 600;
  return function(){
    if(locked) return;
    locked = true;
    try { return fn.apply(this, arguments); }
    finally {
      setTimeout(()=>{ locked = false; }, ms);
    }
  };
}

// ─── APP VERSION + migration check ─────────────────────────────────────────
// Bump APP_VERSION when localStorage shape changes (new keys, renamed keys, etc).
// Migration runs once at app load; old version → run migration steps in order.
const APP_VERSION = '1.0.0';

function checkVersion(){
  let saved;
  try { saved = localStorage.getItem('fl_app_version'); }
  catch(e){ return; } // private mode — skip

  if(saved === APP_VERSION) return; // already current

  if(saved === null){
    // First-time user (or pre-versioning install)
    try { localStorage.setItem('fl_app_version', APP_VERSION); }
    catch(e){}
    return;
  }

  // Future-proof: when we change schemas, add migration steps here.
  // Example:
  //   if(saved === '1.0.0') migrateV1ToV2();
  //   if(saved === '1.0.1') migrateV1_1ToV2();
  console.log('[VERSION] Migrating from', saved, 'to', APP_VERSION);

  try { localStorage.setItem('fl_app_version', APP_VERSION); }
  catch(e){}
}


// ─── norm() ────────────────────────────────────────────────────────
function norm(s){
  const m={á:"a",à:"a",â:"a",ä:"a",é:"e",è:"e",ê:"e",ë:"e",
    í:"i",î:"i",ï:"i",ó:"o",ô:"o",ö:"o",ú:"u",û:"u",ü:"u",ñ:"n",ç:"c"};
  return s.toLowerCase().split('').map(c=>m[c]||c).join('')
    .replace(/[^a-z0-9 ]/g,'').trim().replace(/\s+/g,' ');
}

// ─── tryMatch() ────────────────────────────────────────────────────
function tryMatch(input, found){
  const v = norm(input);
  if(!v || v.length < 2) return null;

  for(const p of G.pool){
    if(found.has(p.n)) continue;
    for(const a of p.a){
      if(norm(a) === v) return {player: p, ok: true};
    }
  }

  const words = v.split(' ');

  // 2-word input — also try reversed order (e.g. "Neville Gary" → match "gary neville")
  // Caught by tests/tryMatch.test.js → "BUG: typing Neville Gary as single submit"
  if(words.length === 2){
    const reversed = words[1] + ' ' + words[0];
    for(const p of G.pool){
      if(found.has(p.n)) continue;
      for(const a of p.a){
        if(norm(a) === reversed) return {player: p, ok: true};
      }
    }
  }

  // Check if it's a bare surname — look for unfound players with that surname
  if(words.length === 1){
    const remaining = G.pool.filter(p =>
      !found.has(p.n) && norm(p.n.split(' ').pop()) === v
    );
    if(remaining.length > 1){
      return {player: null, ok: false, ambiguous: true, surname: v};
    } else if(remaining.length === 1){
      return {player: remaining[0], ok: true};
    }
    // Also check aliases that are single words
    const aliasMatch = G.pool.filter(p =>
      !found.has(p.n) && p.a.some(a => norm(a) === v)
    );
    if(aliasMatch.length === 1) return {player: aliasMatch[0], ok: true};
  }

  return null;
}

// ─── lev() ─────────────────────────────────────────────────────────
function lev(a,b){
  if(Math.abs(a.length-b.length)>2) return 99;
  const d=Array.from({length:a.length+1},(_,i)=>
    Array.from({length:b.length+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=a.length;i++)
    for(let j=1;j<=b.length;j++)
      d[i][j]=a[i-1]===b[j-1]?d[i-1][j-1]:1+Math.min(d[i-1][j],d[i][j-1],d[i-1][j-1]);
  return d[a.length][b.length];
}

// ─── isAlmost() ────────────────────────────────────────────────────
function isAlmost(input, found){
  const v = norm(input);
  if(v.length < 3) return false;
  return G.pool.some(p => !found.has(p.n) && p.a.some(a => {
    const na = norm(a);
    return na.length > 3 && lev(v, na) === 1;
  }));
}

// ─── findAlmost() — like isAlmost but returns the matched player ──────
// Used to auto-accept typos: "BECKAM" → returns Beckham player object,
// so handleSubmit can auto-credit it instead of just warning.
function findAlmost(input, found){
  const v = norm(input);
  if(v.length < 3) return null;
  for(const p of G.pool){
    if(found.has(p.n)) continue;
    for(const a of p.a){
      const na = norm(a);
      if(na.length > 3 && lev(v, na) === 1) return p;
    }
  }
  return null;
}

// ─── refreshTitleScreen() ──────────────────────────────────────────
function refreshTitleScreen(){
  // Refresh daily streak badge
  const streak = checkStreakStale();
  const badge = document.getElementById('title-streak');
  const n = document.getElementById('title-streak-n');
  if(badge && n){
    if(streak > 0){
      n.textContent = streak;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }

  const count = getDiscoveredCount();
  const blindBtn = document.getElementById('title-blind-btn');

  // Blind draft button state
  if(blindBtn){
    blindBtn.classList.remove('new-unlock-pulse');
    if(count >= 50){
      blindBtn.style.display = 'block';
      blindBtn.style.borderColor = '#aa88ff';
      blindBtn.style.color = '#aa88ff';
      blindBtn.disabled = false;
      blindBtn.textContent = '🎲 BLIND DRAFT';
      blindBtn.onclick = openBlindDraft;
      if(localStorage.getItem('fl_blind_first_seen') !== '1'){
        blindBtn.classList.add('new-unlock-pulse');
      }
    } else if(count >= 25){
      blindBtn.style.display = 'block';
      blindBtn.style.borderColor = '#444';
      blindBtn.style.color = '#666';
      blindBtn.disabled = true;
      blindBtn.textContent = '🔒 BLIND DRAFT (' + count + '/50)';
      blindBtn.onclick = null;
    } else {
      blindBtn.style.display = 'none';
    }
  }

  // Progress widget
  updateTitleProgress(count);

  // XI button state — unlocked by completing a blind draft
  const xiBtn = document.getElementById('title-xi-btn');
  if(xiBtn){
    xiBtn.classList.remove('new-unlock-pulse');
    const xiUnlocked = localStorage.getItem('fl_xi_unlocked') === '1';
    if(xiUnlocked){
      xiBtn.style.display = 'block';
      xiBtn.style.borderColor = '#c8960c';
      xiBtn.style.color = '#c8960c';
      xiBtn.disabled = false;
      xiBtn.textContent = '👕 MY LEGENDARY XI';
      xiBtn.onclick = openXI;
      if(localStorage.getItem('fl_xi_first_seen') !== '1'){
        xiBtn.classList.add('new-unlock-pulse');
      }
    } else if(count >= 50){
      xiBtn.style.display = 'block';
      xiBtn.style.borderColor = '#444';
      xiBtn.style.color = '#666';
      xiBtn.disabled = true;
      xiBtn.textContent = '🔒 MY LEGENDARY XI';
      xiBtn.onclick = null;
    } else {
      xiBtn.style.display = 'none';
    }
  }

  // Unlock overlay — shown once, right after you cross 50
  if(localStorage.getItem('fl_blind_unlock_pending') === '1'){
    setTimeout(()=>showUnlockOverlay('blind'), 200);
  } else if(localStorage.getItem('fl_xi_unlock_pending') === '1'){
    setTimeout(()=>showUnlockOverlay('xi'), 200);
  }
}

// ─── go() ──────────────────────────────────────────────────────────
function go(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  window.scrollTo(0,0);
  if(id==='s-hof') renderHOF('ALL');
  if(id==='s-title'){
    refreshTitleScreen();
  }
  if(id==='s-settings'){
    setTimeout(()=>{ if(typeof updateSoundBtn==='function') updateSoundBtn(); }, 0);
  }
  if(id==='s-xi'){
    // Re-render on entry — canvas needs to be redrawn at correct size
    // once the screen is visible and has layout dimensions
    setTimeout(()=>{
      if(typeof render==='function'){ render(); updateCounter(); }
      if(typeof renderBench==='function') renderBench();
    }, 0);
  }
  if(id==='s-xi-locked'){
    setTimeout(()=>{ if(typeof renderLockedScreen==='function') renderLockedScreen(); }, 0);
  }

  // Switch pitch background
  // Hide both backgrounds on XI screens — they have their own canvas pitch
  const darkScreens = ['s-results','s-gameover'];
  const noBg = (id === 's-xi' || id === 's-xi-locked' || id === 's-hof' || id === 's-settings');
  const isDark = darkScreens.includes(id);
  document.querySelector('.pitch').style.display = (isDark || noBg) ? 'none' : '';
  document.querySelector('.pitch-dark').style.display = (isDark && !noBg) ? 'block' : 'none';
  // Dark body on XI / HOF / Settings to avoid the green pitch bleeding around dark content
  document.body.classList.toggle('xi-mode', noBg);
}

// ─── flashRed() ────────────────────────────────────────────────────
function flashRed(){
  const fl = document.getElementById('red-flash');
  if(!fl) return;
  fl.style.opacity = '0.35';
  setTimeout(()=>{ fl.style.opacity = '0'; }, 350);
}

// ─── flashGreen() ──────────────────────────────────────────────────
function flashGreen(){
  const fl = document.getElementById('green-flash');
  if(!fl) return;
  fl.style.opacity = '0.18';
  setTimeout(()=>{ fl.style.opacity = '0'; }, 250);
}

// ─── toast() ───────────────────────────────────────────────────────
function toast(msg, type){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast '+(type||'')+' on';
  clearTimeout(toastT);
  toastT = setTimeout(()=>{ el.className='toast '+(type||''); }, 1600);
}

