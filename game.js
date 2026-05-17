// ══════════════════════════════════════════════════
// DATABASE — 313 English players, top flight 1960–present
// ══════════════════════════════════════════════════
// DB loaded from db.js — see <script src="db.js"> in head


// Build shared-surname index — names that require full name
const SURNAME_COUNT = {};
DB.forEach(p => {
  const surname = p.n.split(' ').pop().toLowerCase();
  SURNAME_COUNT[surname] = (SURNAME_COUNT[surname]||0) + 1;
});

// ══════════════════════════════════════════════════
// NORMALISER
// ══════════════════════════════════════════════════
// norm() loaded from core.js

// tryMatch() loaded from core.js

// ══════════════════════════════════════════════════
// LEVENSHTEIN — for "almost" detection
// ══════════════════════════════════════════════════
// lev() loaded from core.js

// isAlmost() loaded from core.js

// safeStorage + safeRun loaded from storage.js

// ══════════════════════════════════════════════════
// GAME STATE
// ══════════════════════════════════════════════════
let G = {
  playerName: 'PLAYER',
  pool: [],
  found: new Set(),
  lives: 3,
  timer: 60,
  interval: null,
  streak: 0,
  gameActive: false,
  endReason: 'time',
  pendingSurname: null,
  era: 'ALL',
};

// ══════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════
// Refreshes Title screen state — buttons, progress widget, unlock overlays.
// Called from go('s-title') AND on initial page load (since Title is shown
// by default but its handler doesn't run until first navigation).
// refreshTitleScreen() loaded from core.js

// go() loaded from core.js

// ══════════════════════════════════════════════════
// NAME SCREEN
// ══════════════════════════════════════════════════
// KICK OFF — entry point from title. Loads stored name (if any) and starts the
// last-played era directly. New users default to ALL TIME. Era selection is
// still available via "CHANGE ERA" link below KICK OFF on title.
function kickOff(){
  G.playerName = getStoredName() || '';
  startEra(getLastEra());
}

// Open era selection — user wants a different era than their last one.
function changeEra(){
  go('s-era');
}

function confirmName(){
  const v = document.getElementById('inp-name').value.trim().toUpperCase();
  if(!v){ toast('ENTER YOUR NAME!','err'); return; }
  G.playerName = v;
  setStoredName(v);
  go('s-era');
}
document.getElementById('inp-name').addEventListener('keydown',e=>{
  if(e.key==='Enter') confirmName();
});

// ═══════════════════════════════════════════════
// SAVE SCORE FLOW (post-game name capture)
// Called by endGame/confirmQuit when score > 0 and no stored name yet.
// ═══════════════════════════════════════════════
function showSaveScorePrompt(score){
  G._pendingScore = score;
  document.getElementById('ss-score').textContent = score + ' LEGENDS FOUND';
  document.getElementById('inp-savename').value = '';
  go('s-savescore');
  // Autofocus input after screen transition
  setTimeout(()=>{
    const el = document.getElementById('inp-savename');
    if(el) el.focus();
  }, 300);
}
function confirmSaveName(){
  const v = document.getElementById('inp-savename').value.trim().toUpperCase();
  if(!v){ toast('ENTER YOUR NAME!','err'); return; }
  G.playerName = v;
  setStoredName(v);
  finishSaveScore();
}
function skipSaveName(){
  G.playerName = 'GUEST';
  finishSaveScore();
}
// Check if user has earned the XI unlock (Discovery total >= 11).
// Called after each game ends. Returns true if newly unlocked.
function checkXIUnlock(){
  if(localStorage.getItem('fl_xi_unlocked') === '1') return false;
  if(getDiscoveredCount() < 11) return false;
  try { localStorage.setItem('fl_xi_unlocked', '1'); } catch(e){}
  toast('👕 LEGENDARY XI UNLOCKED!','');
  return true;
}

// Silent variant — used at boot for legacy users who already had >=11 before this version shipped.
// Button appears on title screen without an out-of-context toast.
function silentXIUnlock(){
  if(localStorage.getItem('fl_xi_unlocked') === '1') return false;
  if(getDiscoveredCount() < 11) return false;
  try { localStorage.setItem('fl_xi_unlocked', '1'); } catch(e){}
  return true;
}

function finishSaveScore(){
  const score = (typeof G._pendingScore === 'number') ? G._pendingScore : G.found.size;
  saveHOF(G.playerName, score);
  G._pendingScore = null;
  refreshPlayingAs();
  checkXIUnlock();
  // Route to the screen this game would have ended on
  if(G.endReason === 'lives'){
    document.getElementById('go-score').textContent = score;
    renderCompare('go-compare', 'go-compare-text', score);
    updateStreakBadge('go-streak-badge');
    go('s-gameover');
    if(G._pbHit){
      G._pbHit = false;
      setTimeout(()=>confettiBurst(), 250);
    }
  } else {
    showResultsScreen(score);
  }
}
document.getElementById('inp-savename').addEventListener('keydown',e=>{
  if(e.key==='Enter') confirmSaveName();
});
document.getElementById('inp-changename').addEventListener('keydown',e=>{
  if(e.key==='Enter') confirmChangeName();
});

// Open the change-name modal. User stays in current screen (title or results) —
// modal closes back to where they were, no routing needed.
function changeName(){
  const current = getStoredName() || '';
  const inp = document.getElementById('inp-changename');
  inp.value = current;
  document.getElementById('modal-changename').classList.add('on');
  // Autofocus + select content for quick edit
  setTimeout(()=>{ inp.focus(); inp.select(); }, 100);
}
function closeChangeNameModal(){
  document.getElementById('modal-changename').classList.remove('on');
}
function confirmChangeName(){
  const v = document.getElementById('inp-changename').value.trim().toUpperCase();
  if(!v){ toast('NAME CANNOT BE EMPTY','err'); return; }
  setStoredName(v);
  G.playerName = v;
  // Update any visible name displays
  refreshPlayingAs();
  const rName = document.getElementById('r-name');
  if(rName) rName.textContent = v;
  closeChangeNameModal();
  toast('✓ NAME UPDATED','');
}

// Update the "PLAYING AS" line on the title screen.
// Hidden if no stored name (i.e. user is still anonymous).
function refreshPlayingAs(){
  const wrap = document.getElementById('title-playing-as');
  const nameEl = document.getElementById('title-playing-name');
  if(!wrap || !nameEl) return;
  const stored = getStoredName();
  if(stored){
    nameEl.textContent = stored;
    wrap.style.display = 'block';
  } else {
    wrap.style.display = 'none';
  }
}

// Update the "LAST PLAYED: ERA" line under KICK OFF on the title screen.
// Always visible — shows ALL TIME for new users (default).
function refreshTitleEra(){
  const nameEl = document.getElementById('title-era-name');
  if(!nameEl) return;
  const era = getLastEra();
  nameEl.textContent = {
    'C':'CLASSICS',
    'G':'GOLDEN ERA',
    'M':'MODERN',
    'ALL':'ALL TIME'
  }[era] || 'ALL TIME';
}

// ══════════════════════════════════════════════════
// MODE SELECT
// ══════════════════════════════════════════════════
function startEra(era){
  G.era = era;
  setLastEra(era);
  if(era === 'ALL') G.pool = [...DB];
  else G.pool = DB.filter(p => p.e === era);
  document.getElementById('g-mode-label').textContent = {
    'C':'🏆 CLASSICS',
    'G':'⭐ GOLDEN ERA',
    'M':'🔥 MODERN',
    'ALL':'🎯 ALL TIME'
  }[era] || 'LEGENDS';
  launchGame();
}


// Spam-click protection (caught by user feedback A)
startEra = withLock(startEra, 600);
// ══════════════════════════════════════════════════
// LAUNCH GAME
// ══════════════════════════════════════════════════
function launchGame(){
  G.found = new Set();
  G.lives = 3;
  G.timer = 60;
  G.streak = 0;
  G.gameActive = true;
  G.endReason = 'time';
  G.pendingSurname = null;

  // Bump daily streak on each game start (counts once per day)
  bumpDailyStreak();

  // Clear name input for next game
  document.getElementById('inp-name').value = '';

  document.getElementById('g-score').textContent = '0';
  document.getElementById('g-pname').textContent = G.playerName || 'GUEST';
  document.getElementById('g-mode-label').textContent = {
    'C':'🏆 CLASSICS','G':'⭐ GOLDEN ERA','M':'🔥 MODERN','ALL':'🎯 ALL TIME'
  }[G.era] || 'LEGENDS';
  document.getElementById('g-prog-txt').textContent = '0 found';
  document.getElementById('g-prog-fill').style.width = '0%';
  document.getElementById('g-tags').innerHTML = '';
  document.getElementById('g-streak').textContent = '';

  // Show personal best for this era
  const eraKey = 'fl_hof_' + (G.era || 'ALL');
  const hof = safeParse(localStorage.getItem(eraKey), []);
  const myPid = getPlayerId();
  const myBest = hof.filter(e=>(e.pid && e.pid===myPid) || (!e.pid && e.name===G.playerName)).sort((a,b)=>b.score-a.score)[0];
  const bestEl = document.getElementById('g-best');
  if(myBest) bestEl.textContent = 'BEST: '+myBest.score;
  else bestEl.textContent = '';
  document.getElementById('g-inp').value = '';
  document.getElementById('g-inp').disabled = false;
  // Restore quit button
  const gameFooter = document.getElementById('g-game-footer');
  if(gameFooter) gameFooter.innerHTML = `<button class="btn btn-dim" style="flex:1;padding:8px;font-size:8px" onclick="confirmQuit()">END GAME</button>`;
  updateLivesUI();
  updateTimerUI();

  go('s-game');
  clearInterval(G.interval);
  // Timer starts AFTER first guess (Twoja zasada: zero stress at start)
  G.timerStarted = false;
  G.interval = null;
  // Placeholder: first-time gets random English legends (3 of 15) as hint,
  // returning visitors just see "TYPE A PLAYER..." since they already know.
  const inpEl = document.getElementById('g-inp');
  if(inpEl){
    const isFirstTime = localStorage.getItem('fl_has_played') !== '1';
    if(isFirstTime){
      const legends = ['ROONEY','BECKHAM','OWEN','GERRARD','LAMPARD',
                       'SCHOLES','FERDINAND','TERRY','COLE','CARRAGHER',
                       'SHEARER','LINEKER','GASCOIGNE','BARNES','KANE'];
      // Fisher-Yates partial shuffle to pick 3 unique
      for(let i = legends.length - 1; i > legends.length - 4; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [legends[i], legends[j]] = [legends[j], legends[i]];
      }
      inpEl.placeholder = 'E.G. ' + legends.slice(-3).join(', ') + '...';
    } else {
      inpEl.placeholder = 'TYPE A PLAYER...';
    }
  }
  // Onboarding hint hidden by default (first-time auto-launch reverted —
  // hint can be re-enabled in a future iteration when boot flow is stable)
  const hint = document.getElementById('g-hint');
  if(hint){
    hint.style.display = 'none';
  }
  // Focus immediately, with a tiny fallback for layout
  const inp = document.getElementById('g-inp');
  if(inp) inp.focus();
  setTimeout(()=>{ if(inp) inp.focus(); }, 50);
}

// ══════════════════════════════════════════════════
// TIMER
// ══════════════════════════════════════════════════
function tickTimer(){
  if(!G.gameActive) return;
  G.timer--;
  updateTimerUI();
  if(G.timer <= 0){
    clearInterval(G.interval);
    G.gameActive = false;
    G.endReason = 'time';
    showTimeUp();
  }
}

function showTimeUp(){
  // Show TIME UP overlay with continue button
  const el = document.getElementById('g-time');
  el.textContent = '⏰';
  el.className = 'hv t-r';
  if(navigator.vibrate) navigator.vibrate([100,50,100,50,200]);

  // Disable input
  document.getElementById('g-inp').disabled = true;

  // Show continue button - replace game footer
  const gameFooter = document.getElementById('g-game-footer');
  if(gameFooter){
    gameFooter.innerHTML = `
      <button class="btn" style="flex:1;padding:12px;font-size:10px;animation:bigpop .4s ease both"
        onclick="endGame()">⏰ TIME UP — TAP TO SEE RESULTS</button>`;
  }

  // Flash toast
  const t = document.getElementById('toast');
  t.textContent = '⏰ TIME UP!';
  t.className = 'toast on err';
  t.style.fontSize = '14px';
  t.style.padding = '16px 24px';
  setTimeout(()=>{ t.className = 'toast err'; }, 3000);
}

function updateTimerUI(){
  const el = document.getElementById('g-time');
  const bar = document.getElementById('g-tbar');
  el.textContent = G.timer;
  const pct = Math.min((G.timer/60)*100, 100);
  bar.style.width = pct+'%';
  if(G.timer <= 10){
    el.className='hv t-r';
    bar.style.background='var(--red)';
    playTick();
  } else if(G.timer <= 20){
    el.className='hv t-y';
    bar.style.background='var(--yellow)';
  } else {
    el.className='hv t-g';
    bar.style.background='var(--green)';
  }
}

// ══════════════════════════════════════════════════
// AUDIO TICK
// ══════════════════════════════════════════════════
let audioCtx = null;
function playTick(){
  if(!getSoundOn()) return;
  try {
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = G.timer <= 5 ? 880 : 660;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.08);
  } catch(e){}
}

function resetTimer(bonus){
  G.timer = Math.min(60 + (bonus||0), 90);
  updateTimerUI();
}

// ══════════════════════════════════════════════════
// INPUT HANDLING
// ══════════════════════════════════════════════════
const gInp = document.getElementById('g-inp');

// Scroll input into view when keyboard opens on mobile
gInp.addEventListener('focus', function(){
  setTimeout(()=>{
    this.scrollIntoView({behavior:'smooth', block:'center'});
  }, 300);
});

gInp.addEventListener('keydown', e => {
  if(e.key === 'Enter') handleSubmit();
});

function handleSubmit(){
  if(!G.gameActive) return;
  const v = gInp.value.trim();
  if(!v) return;

  // First guess in this game → start the timer (deferred timer pattern)
  if(!G.timerStarted){
    G.timerStarted = true;
    if(G.interval) clearInterval(G.interval);
    G.interval = setInterval(tickTimer, 1000);
    // Hide onboarding hint after first input
    const hint = document.getElementById('g-hint');
    if(hint) hint.style.display = 'none';
  }

  // ── DEBUG LOGS (temporary — remove after Neville→Gary bug confirmed fixed) ──
  console.log('[SUBMIT] input:', JSON.stringify(v),
              '| pendingSurname:', G.pendingSurname,
              '| era:', G.era,
              '| pool size:', G.pool.length,
              '| found size:', G.found.size);

  // If waiting for clarification (e.g. typed "neville", now typing "gary")
  if(G.pendingSurname){
    const surname = G.pendingSurname;

    const combined1 = norm(v) + ' ' + norm(surname);
    const combined2 = norm(surname) + ' ' + norm(v);

    console.log('[RESOLVE] surname:', surname,
                '| combined1:', combined1,
                '| combined2:', combined2,
                '| normalized v:', norm(v));

    let resolved = null;
    let aliasesChecked = 0;
    for(const p of G.pool){
      if(G.found.has(p.n)) continue;
      for(const a of p.a){
        const na = norm(a);
        aliasesChecked++;
        if(na === combined1 || na === combined2 || na === norm(v)){
          resolved = p;
          console.log('[RESOLVE] MATCH found:', p.n, 'via alias:', a, '(normalized:', na + ')');
          break;
        }
      }
      if(resolved) break;
    }

    // ── FUZZY DISAMBIGUATION (Sylwia 17.05) ──
    // If exact match above failed, try fuzzy match on first names of candidates
    // with the pending surname. Catches typos like "jeo" → "Joe Cole".
    // Conservative: lev ≤ 2 (covers transpositions like jeo→joe), min name length 3,
    // and ONLY accept when exactly ONE candidate fuzzy-matches — else fall through.
    if(!resolved && norm(v).length >= 3){
      const vNorm = norm(v);
      const fuzzyMatches = [];
      for(const p of G.pool){
        if(G.found.has(p.n)) continue;
        if(norm(p.n.split(' ').pop()) !== surname) continue;
        const firstName = norm(p.n.split(' ')[0]);
        if(firstName.length < 3) continue;
        const distance = lev(vNorm, firstName);
        if(distance > 0 && distance <= 2){
          fuzzyMatches.push({player: p, distance});
        }
      }
      if(fuzzyMatches.length === 1){
        resolved = fuzzyMatches[0].player;
        console.log('[RESOLVE] FUZZY MATCH on first name:', resolved.n,
                    '(distance:', fuzzyMatches[0].distance + ')');
        // Show what was matched so player learns spelling (same pattern as findAlmost path)
        toast('✓ ' + resolved.n.toUpperCase(), '');
      } else if(fuzzyMatches.length > 1){
        console.log('[RESOLVE] fuzzy ambiguous — skip:',
                    fuzzyMatches.map(m => m.player.n + ' (d=' + m.distance + ')').join(', '));
      }
    }

    console.log('[RESOLVE] checked', aliasesChecked, 'aliases | resolved:', resolved ? resolved.n : 'NULL');

    if(resolved){
      G.pendingSurname = null;
      handleCorrect(resolved);
      gInp.value = '';
      return;
    }

    const directResult = tryMatch(v, G.found);
    console.log('[RESOLVE] direct tryMatch:', directResult);
    if(directResult && directResult.ok){
      G.pendingSurname = null;
      handleCorrect(directResult.player);
      gInp.value = '';
      return;
    }

    console.log('[RESOLVE] NOTHING MATCHED — losing life');
    G.pendingSurname = null;
    toast('✗ NOT IN THE LIST','err');
    handleWrong();
    gInp.value = '';
    return;
  }

  // Check if already found
  const vn = norm(v);
  const alreadyFound = G.pool.find(p =>
    G.found.has(p.n) && p.a.some(a => norm(a) === vn)
  );
  if(alreadyFound){
    toast('ALREADY FOUND — '+alreadyFound.n.toUpperCase(),'warn');
    gInp.value = '';
    return;
  }

  const result = tryMatch(v, G.found);
  console.log('[SUBMIT] tryMatch result:', result ? (result.ok ? ('OK ' + result.player.n) : (result.ambiguous ? 'AMBIGUOUS ' + result.surname : 'unknown')) : 'NULL');

  if(result && result.ok){
    handleCorrect(result.player);
    gInp.value = '';
    return;
  }

  if(result && result.ambiguous){
    G.pendingSurname = result.surname;
    console.log('[SUBMIT] set pendingSurname to:', G.pendingSurname);
    // Count how many unfound players have this surname
    const count = G.pool.filter(p =>
      !G.found.has(p.n) && norm(p.n.split(' ').pop()) === result.surname
    ).length;
    const msg = count > 1
      ? 'WHICH ONE? ('+count+' LEFT) — TYPE FIRST NAME'
      : 'WHICH ONE? TYPE FIRST NAME';
    toast(msg,'warn');
    gInp.value = '';
    return;
  }

  if(v.length >= 3){
    const almostMatch = findAlmost(v, G.found);
    if(almostMatch){
      // Auto-accept typo — show what was matched so player learns spelling
      toast('✓ ' + almostMatch.n.toUpperCase(), '');
      handleCorrect(almostMatch);
      gInp.value = '';
      return;
    }
  }

  handleWrong();
  gInp.value = '';
}

function handleCorrect(player){
  G.found.add(player.n);
  G.streak++;

  // Track unique discovery across all runs + check badge milestones
  const prevCount = getDiscoveredCount();
  const isNewDiscovery = addDiscovered(player.n);
  const newBadge = isNewDiscovery ? checkBadgeMilestone(prevCount, prevCount + 1) : null;

  // Vibrate — success pattern
  if(navigator.vibrate) navigator.vibrate([40,20,40]);

  // Update score
  document.getElementById('g-score').textContent = G.found.size;

  // Add tag
  const tag = document.createElement('div');
  tag.className = 'tag';
  tag.textContent = player.n;
  const tagsEl = document.getElementById('g-tags');
  tagsEl.prepend(tag);
  tagsEl.scrollTop = 0;

  // Progress
  const pct = Math.round((G.found.size / G.pool.length)*100);
  document.getElementById('g-prog-txt').textContent = G.found.size+' found';
  document.getElementById('g-prog-fill').style.width = pct+'%';

  flashGreen();
  pulseScore();

  // showStreak returns bonus, resetTimer applies it on top of 60s reset
  const bonus = showStreak();
  resetTimer(bonus);

  // ── LIVE FEEDBACK POPUP ──
  // Detect special hits — 1966 legend gets gold popup, streak milestone triggers shake
  const is1966 = typeof SQUAD_1966 !== "undefined" && SQUAD_1966.includes(norm(player.n));
  const streakMilestone = (G.streak === 3 || G.streak === 5 || G.streak === 10 || G.streak === 15);
  let popupText, popupColor, isSpecial = false;
  if(is1966){
    popupText = "⚡ 1966 LEGEND";
    popupColor = "#ffd700";
    isSpecial = true;
  } else {
    popupText = "✓ " + player.n.toUpperCase();
    popupColor = "var(--green)";
  }
  showQuizPopup(popupText, popupColor, isSpecial);

  // Screen shake for streak milestones or 1966 legend
  if(streakMilestone || is1966){
    const game = document.getElementById('s-game');
    if(game){
      game.classList.remove("shake");
      void game.offsetWidth;
      game.classList.add("shake");
      setTimeout(()=>game && game.classList.remove("shake"), 420);
    }
  }

  // Re-assert focus in case mobile keyboard blipped
  const inp = document.getElementById('g-inp');
  if(inp) inp.focus();

  // +1 XP popup on new discovery — delayed so it appears AFTER the player
  // name popup has faded, not stacked on top of it
  if(isNewDiscovery){
    setTimeout(()=>showQuizPopup("+1 XP", "#ffd700", false), 1000);
  }

  // Tier upgrade — show big celebration if we just crossed a threshold
  if(newBadge){
    setTimeout(()=>showLevelUpToast(newBadge), 600);
  }

  // All found?
  if(G.found.size >= G.pool.length){
    clearInterval(G.interval);
    G.gameActive = false;
    G.endReason = 'complete';
    setTimeout(endGame, 500);
  }
}

function showQuizPopup(text, color, isSpecial){
  const pop = document.getElementById('quiz-popup');
  if(!pop) return;
  const line = document.createElement('div');
  line.className = 'quiz-pop-line' + (isSpecial ? ' special' : '');
  line.style.color = color;
  line.textContent = text;
  pop.appendChild(line);
  // Cleanup after animation
  setTimeout(()=>{ if(line && line.parentNode) line.parentNode.removeChild(line); }, 2000);
}

function handleWrong(){
  G.lives--;
  G.streak = 0;
  G.pendingSurname = null;
  document.getElementById('g-streak').textContent = '';
  updateLivesUI();
  toast('✗ NOT IN THE LIST','err');

  // Red flash on screen
  flashRed();

  // Vibrate — error buzz
  if(navigator.vibrate) navigator.vibrate(200);

  if(G.lives <= 0){
    clearInterval(G.interval);
    G.gameActive = false;
    G.endReason = 'lives';
    setTimeout(endGame, 400);
  }
}

// flashRed() loaded from core.js

// flashGreen() loaded from core.js

function pulseScore(){
  const el = document.getElementById('g-score');
  if(!el) return;
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'scorepulse .35s ease';
}

function updateLivesUI(){
  for(let i=0;i<3;i++){
    document.getElementById('lf'+i).className = 'life'+(i < G.lives ? '' : ' lost');
  }
}

// ══════════════════════════════════════════════════
// STREAK
// ══════════════════════════════════════════════════
function showStreak(){
  const s = G.streak;
  let msg = '';
  let bonus = 0;

  if(s>=15)      { msg='🔱 UNSTOPPABLE!'; if(s===15) bonus=15; }
  else if(s>=10) { msg='⚡ ON FIRE!';     if(s===10) bonus=10; }
  else if(s>=5)  { msg='🔥 HOT STREAK!'; if(s===5)  bonus=7;  }
  else if(s>=3)  { msg='🎩 HAT-TRICK!';  if(s===3)  bonus=5;  }

  document.getElementById('g-streak').textContent = msg;

  if(bonus > 0){
    const el = document.getElementById('sflash');
    el.textContent = msg + '  +' + bonus + 's ⏱';
    el.classList.add('on');
    setTimeout(()=>{
      el.classList.add('fade');
      setTimeout(()=>el.classList.remove('on','fade'),300);
    },1200);
  }

  return bonus;
}

// ══════════════════════════════════════════════════
// END GAME
// ══════════════════════════════════════════════════
// Captures user's previous best score for the active era, sets G.prevBestScore.
// MUST be called BEFORE saveHOF() so the comparison reflects pre-game state.
function capturePrevBest(){
  const eraKey = 'fl_hof_' + (G.era || 'ALL');
  const hofBefore = safeParse(localStorage.getItem(eraKey), []);
  const myPid = getPlayerId();
  const prevBest = hofBefore.filter(e=>(e.pid && e.pid===myPid) || (!e.pid && e.name===G.playerName)).sort((a,b)=>b.score-a.score)[0];
  G.prevBestScore = prevBest ? prevBest.score : null;
}

function endGame(){
  const score = G.found.size;

  capturePrevBest();

  // If score > 0 and no stored name yet → ask user to save score (or skip)
  if(score > 0 && !getStoredName()){
    showSaveScorePrompt(score);
    return;
  }

  // Returning user (has stored name) OR score = 0 → save + show results immediately
  saveHOF(G.playerName, score);
  checkXIUnlock();

  if(G.endReason === 'lives'){
    document.getElementById('go-score').textContent = score;
    renderCompare('go-compare', 'go-compare-text', score);
    updateStreakBadge('go-streak-badge');
    go('s-gameover');
    // Fire confetti AFTER screen transition (renderCompare sets G._pbHit if new PB)
    if(G._pbHit){
      G._pbHit = false;
      setTimeout(()=>confettiBurst(), 250);
    }
  } else {
    showResultsScreen(score);
  }
}


// Spam-click protection (caught by user feedback A)
endGame = withLock(endGame, 800);
// CONFETTI BURST — visual celebration for new personal best
// Update a streak badge element (results or game-over) — shows only if user has 3+ day streak.
// Same UI on both screens so the celebration moment is consistent.
function updateStreakBadge(elId){
  const el = document.getElementById(elId);
  if(!el) return;
  const streak = (typeof getDailyStreak === 'function') ? getDailyStreak() : 0;
  if(streak >= 3){
    el.textContent = '🔥 ' + streak + ' DAY STREAK';
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

function confettiBurst(){
  const colors = ['#ff1744','#00e676','#2979ff','#ffeb3b','#ff9100','#e040fb','#00e5ff','#ffffff'];
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  const COUNT = 100;
  for(let i=0;i<COUNT;i++){
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random()*100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random()*colors.length)];
    piece.style.animationDuration = (2.8 + Math.random()*2.0) + 's';
    piece.style.animationDelay = (Math.random()*0.5) + 's';
    piece.style.width = (10 + Math.random()*8) + 'px';
    piece.style.height = (14 + Math.random()*10) + 'px';
    container.appendChild(piece);
  }
  // Auto-cleanup after animation finishes (max 5.3s = duration + delay)
  setTimeout(()=>{ if(container.parentNode) container.parentNode.removeChild(container); }, 5500);
}

// Render best-run comparison into a panel (shared by results and gameover screens)
function renderCompare(panelId, textId, score){
  const cmp  = document.getElementById(panelId);
  const cmpT = document.getElementById(textId);
  if(!cmp || !cmpT) return;
  const prev = G.prevBestScore;
  if(prev === null || prev === undefined){
    cmp.style.display = 'block';
    cmp.style.borderColor = 'var(--green)';
    cmpT.style.color = 'var(--green)';
    cmpT.textContent = '🎉 FIRST RUN — NEW PERSONAL BEST';
  } else if(score > prev){
    cmp.style.display = 'block';
    cmp.style.borderColor = 'var(--green)';
    cmpT.style.color = 'var(--green)';
    cmpT.innerHTML = '🏆 NEW BEST · +' + (score - prev) + ' (was ' + prev + ')';
    G._pbHit = true;
  } else if(score === prev){
    cmp.style.display = 'block';
    cmp.style.borderColor = 'var(--gold)';
    cmpT.style.color = 'var(--gold)';
    cmpT.textContent = '= MATCHED YOUR BEST · ' + prev;
  } else {
    cmp.style.display = 'block';
    cmp.style.borderColor = '#555';
    cmpT.style.color = '#aaa';
    cmpT.textContent = 'BEST: ' + prev + ' · Δ -' + (prev - score);
  }
}

function showResultsScreen(score){
  const total = G.pool.length;
  const pct = Math.round((score/total)*100);
  const modeStr = {
    'C':'🏆 CLASSICS','G':'⭐ GOLDEN ERA','M':'🔥 MODERN','ALL':'🎯 ALL TIME'
  }[G.era] || 'FOOTY LEGENDS';

  document.getElementById('r-name').textContent = G.playerName || 'GUEST';
  document.getElementById('r-score').textContent = score;
  document.getElementById('r-sub').textContent = G.endReason==='complete' ? '🎉 ALL FOUND!' : 'LEGENDS FOUND';
  document.getElementById('r-mode-lbl').textContent = modeStr;
  document.getElementById('r-stat').textContent = score+' / '+total+' ('+pct+'%)';

  const rating = getRating(score, total);
  document.getElementById('r-stars').textContent = rating.stars;
  document.getElementById('r-rating').textContent = rating.text;

  const bar = document.getElementById('r-bar');
  bar.style.width = '0%';
  setTimeout(()=>{ bar.style.width = pct+'%'; }, 200);

  // Best run comparison
  renderCompare('r-compare', 'r-compare-text', score);

  // Streak badge — shown only if user has a 3+ day streak
  updateStreakBadge('r-streak-badge');

  go('s-results');

  // Fire confetti AFTER screen transition (renderCompare sets G._pbHit if new PB)
  if(G._pbHit){
    G._pbHit = false;
    setTimeout(()=>confettiBurst(), 250);
  }
}

function getRating(score, total){
  const pct = score/total;
  if(score===0)   return{stars:'',text:"GIVE IT A GO!"};
  if(pct<0.05)    return{stars:'⭐',text:"NOT BAD!"};
  if(pct<0.15)    return{stars:'⭐⭐',text:"DECENT EFFORT!"};
  if(pct<0.30)    return{stars:'⭐⭐⭐',text:"GREAT GAME!"};
  if(pct<0.50)    return{stars:'⭐⭐⭐⭐',text:"FOOTBALL EXPERT!"};
  if(pct<0.75)    return{stars:'⭐⭐⭐⭐⭐',text:"ABSOLUTE LEGEND!"};
  return{stars:'🏆🏆🏆',text:"ARE YOU BOBBY MOORE?!"};
}

// ══════════════════════════════════════════════════
// MODAL — MY LEGENDS
// ══════════════════════════════════════════════════
function openModal(){
  const list = document.getElementById('modal-list');
  const count = document.getElementById('modal-count');
  count.textContent = G.found.size;
  if(G.found.size === 0){
    list.innerHTML = '<div style="font-size:8px;color:var(--grey);padding:16px;text-align:center;letter-spacing:1px">NO LEGENDS FOUND YET!</div>';
  } else {
    const sorted = [...G.found].sort();
    list.innerHTML = sorted.map((name,i) =>
      `<div style="background:#001800;border:1px solid #004400;color:var(--green);
        font-family:var(--px);font-size:7px;padding:4px 8px;letter-spacing:1px">
        <span style="color:#555;margin-right:4px">${i+1}.</span>${name}
      </div>`
    ).join('');
  }
  document.getElementById('modal-legends').classList.add('on');
}

function closeModal(){
  document.getElementById('modal-legends').classList.remove('on');
}

function confirmQuit(){
  clearInterval(G.interval);
  G.gameActive = false;
  G.endReason = 'quit';
  const score = G.found.size;
  capturePrevBest();

  // If score > 0 and no stored name yet → ask user to save score (or skip)
  if(score > 0 && !getStoredName()){
    showSaveScorePrompt(score);
    return;
  }

  saveHOF(G.playerName, score);
  checkXIUnlock();
  showResultsScreen(score);
}

function openXI(){
  // XI is the main product (v74 reframing) — always accessible.
  // The fl_xi_unlocked flag is still used by Hall of Fame XI tab and
  // the unlock celebration overlay, but no longer gates entry to the builder.
  // Reset state from any previous session (blind draft etc.)
  slots = makeDefault();
  captainIdx = null;
  xiStartTime = null;
  lastChem = null;
  window.isBlindDraftSession = false;
  // Clear stale chemistry panel UI from any previous session
  const chemResults = document.getElementById('chem-results');
  if(chemResults) chemResults.style.display = 'none';
  const chemBtn = document.getElementById('chem-btn');
  if(chemBtn) chemBtn.disabled = true;
  // Force-destroy any stale slot DOM (with stuck chem-era, chem-club, captain
  // highlight classes from a previous lock-in session). render() reuses
  // existing dots when count matches, so without this they keep old classes.
  const wrap = document.getElementById('wrap');
  if(wrap){
    wrap.querySelectorAll('.pdot').forEach(d => d.remove());
  }
  go('s-xi');
}

function playAgain(){
  startEra(G.era || 'ALL');
}

// ══════════════════════════════════════════════════
// SHARE
// ══════════════════════════════════════════════════
function buildShareText(gameOver, includeUrl){
  if(typeof includeUrl === 'undefined') includeUrl = true;
  const score = gameOver ? parseInt(document.getElementById('go-score').textContent) : G.found.size;
  const eraName = {C:'Classics',G:'Golden Era',M:'Modern',ALL:'All Time'}[G.era] || '';
  const lines = ['⚽ I named ' + score + ' England legends' + (eraName ? ' (' + eraName + ')' : '')];
  // Empty line after main score
  lines.push('');
  // Optional badges
  const isPb = (typeof G.prevBestScore !== 'undefined' && G.prevBestScore !== null && score > G.prevBestScore);
  const streak = getDailyStreak ? getDailyStreak() : 0;
  const hasStreak = streak >= 3;
  if(isPb) lines.push('🏆 New personal best!');
  if(hasStreak) lines.push('🔥 ' + streak + ' day streak');
  // Empty line before CTA only if badges were added
  if(isPb || hasStreak) lines.push('');
  lines.push('Can you beat me? ⚽');
  if(includeUrl) lines.push('footylegendsquiz.co.uk');
  return lines.join('\n');
}

function shareFB(gameOver){
  // Facebook sharer — opens share dialog with URL
  // Text must be on the page itself (FB doesn't allow pre-filled text)
  const url = encodeURIComponent(window.location.href);
  window.open('https://www.facebook.com/sharer/sharer.php?u='+url,'_blank');
}

function shareMessenger(gameOver){
  // Native Web Share API passes URL separately, so don't include it in text (avoids duplicate link in Messenger preview).
  // Desktop fallback (no navigator.share) also gets URL via the dialog 'link' param, so still no need in text.
  const text = buildShareText(gameOver, false);
  // On mobile, try Native Web Share API first — it shows a system menu
  // letting user pick Messenger, WhatsApp, IG DM, Email, etc. and then
  // pick a SPECIFIC contact (not just post to wall).
  if(navigator.share){
    navigator.share({
      title: 'Footy Legends Quiz',
      text: text,
      url: window.location.href
    }).catch(()=>{
      // User dismissed share sheet — that's fine, do nothing
    });
    return;
  }
  // Desktop fallback: open Messenger web with pre-filled link.
  // Messenger doesn't support pre-filled text via URL, so we just open the
  // app — user pastes their own message.
  const url = encodeURIComponent(window.location.href);
  window.open('https://www.facebook.com/dialog/send?app_id=140586622674265&link='+url+'&redirect_uri='+url,'_blank');
}

function shareWA(gameOver){
  const text = encodeURIComponent(buildShareText(gameOver));
  window.open('https://wa.me/?text='+text,'_blank');
}

function shareX(gameOver){
  const text = encodeURIComponent(buildShareText(gameOver));
  window.open('https://twitter.com/intent/tweet?text='+text,'_blank');
}

function shareCopy(gameOver){
  const text = buildShareText(gameOver);
  const lbl1 = document.getElementById('copy-lbl');
  const lbl2 = document.getElementById('copy-lbl2');
  const target = gameOver ? lbl2 : lbl1;

  // Try modern clipboard API first
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(()=>{
      if(target){ target.textContent='✓ DONE'; setTimeout(()=>{ target.textContent='COPY'; },2000); }
    }).catch(()=> fallbackCopy(text, target));
  } else {
    fallbackCopy(text, target);
  }
}

function fallbackCopy(text, target){
  // Create temporary textarea
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    if(target){ target.textContent='✓ DONE'; setTimeout(()=>{ target.textContent='COPY'; },2000); }
  } catch(e){
    if(target){ target.textContent='FAILED'; setTimeout(()=>{ target.textContent='COPY'; },2000); }
  }
  document.body.removeChild(ta);
}

// ══════════════════════════════════════════════════
// HALL OF FAME
// ══════════════════════════════════════════════════
// Persistent player identity — survives nick changes
// Used to look up "your best" across name changes (display name is separate)
function getPlayerId(){
  let id = localStorage.getItem('fl_player_id');
  if(!id){
    id = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    try { localStorage.setItem('fl_player_id', id); } catch(e){}
  }
  return id;
}

// Stored player name — null if user has never confirmed a name.
// Used to skip the "save score" prompt for returning players.
function getStoredName(){
  const v = localStorage.getItem('fl_player_name');
  return (v && v.trim()) ? v : null;
}
function setStoredName(name){
  if(!name) return;
  try { localStorage.setItem('fl_player_name', name); } catch(e){}
}

// Stored last-played era — used by kickOff() so KICK OFF jumps straight into
// the user's last era without showing era selection. New users default to 'ALL'.
function getLastEra(){
  const v = localStorage.getItem('fl_last_era');
  if(v === 'C' || v === 'G' || v === 'M' || v === 'ALL') return v;
  return 'ALL';
}
function setLastEra(era){
  if(era !== 'C' && era !== 'G' && era !== 'M' && era !== 'ALL') return;
  try { localStorage.setItem('fl_last_era', era); } catch(e){}
}

function saveHOF(name, score){
  if(score === 0) return;
  const era = G.era || 'ALL';
  const key = 'fl_hof_' + era;
  let hof = safeParse(localStorage.getItem(key), []);
  hof.push({
    name,
    score,
    date: new Date().toLocaleDateString('en-GB'),
    pid: getPlayerId()
  });
  hof.sort((a,b)=>b.score-a.score);
  hof = hof.slice(0,20);
  localStorage.setItem(key, JSON.stringify(hof));
}

function renderHOF(era){
  era = era || 'ALL';
  // Update tab styles
  ['ALL','C','G','M','XI'].forEach(e=>{
    const btn = document.getElementById('hof-tab-'+e);
    if(btn) btn.style.opacity = e===era ? '1' : '0.45';
  });

  const el = document.getElementById('hof-list');

  // ─── XI Leaderboard tab ──────────────────────────────────────────
  if(era === 'XI'){
    const xiList = safeParse(localStorage.getItem('fl_xi_hof'), []);
    const xiHeader = `<div style="font-size:7px;color:#aa88ff;letter-spacing:2px;text-align:center;padding:4px 0 12px;border-bottom:1px solid #222;margin-bottom:8px">⚽ XI LEADERBOARD · TOP 20</div>`;
    if(!xiList.length){
      el.innerHTML = xiHeader + `<div style="font-size:8px;color:#666;text-align:center;padding:30px 10px;letter-spacing:2px;line-height:2">NO XI BUILT YET<br><br>UNLOCK BLIND DRAFT<br>AT 25 DISCOVERED</div>`;
      return;
    }
    const medals=['🥇','🥈','🥉'];
    el.innerHTML = xiHeader + xiList.map((e,i)=>{
      const dateStr = e.ts ? new Date(e.ts).toLocaleDateString() : '';
      const modeIcon = e.mode === 'blind' ? '🎲' : '⚽';
      const stars = '★'.repeat(e.stars||0);
      return `
        <div class="hof-row">
          <div class="hof-rank">${medals[i]||'#'+(i+1)}</div>
          <div class="hof-name">${modeIcon} ${e.title || 'XI'}
            <div class="hof-date" style="color:#c8960c">${stars}</div>
            <div class="hof-date">${dateStr}</div>
          </div>
          <div class="hof-pts">${e.score}</div>
        </div>
      `;
    }).join('');
    return;
  }

  // ─── Classic Quiz HOF (ALL/C/G/M) ────────────────────────────────
  const key = 'fl_hof_' + era;
  const hof = safeParse(localStorage.getItem(key), []);
  const labels = {ALL:'🎯 ALL TIME',C:'🏆 CLASSICS',G:'⭐ GOLDEN ERA',M:'🔥 MODERN'};
  const header = `<div style="font-size:7px;color:#888;letter-spacing:2px;text-align:center;padding:4px 0 12px;border-bottom:1px solid #222;margin-bottom:8px">${labels[era]} · TOP 10</div>`;
  if(!hof.length){
    el.innerHTML = header + `<div style="font-size:8px;color:#666;text-align:center;padding:30px 10px;letter-spacing:2px;line-height:2">NO SCORES YET<br><br>BE THE FIRST!</div>`;
    return;
  }
  const medals=['🥇','🥈','🥉'];
  el.innerHTML = header + hof.map((e,i)=>`
    <div class="hof-row">
      <div class="hof-rank">${medals[i]||'#'+(i+1)}</div>
      <div class="hof-name">${e.name}
        <div class="hof-date">${e.date}</div>
      </div>
      <div class="hof-pts">${e.score}</div>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════
// DAILY STREAK — "X days in a row"
// ══════════════════════════════════════════════════
function todayStr(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function daysBetween(a, b){
  // a, b as 'YYYY-MM-DD' strings
  const ta = Date.parse(a), tb = Date.parse(b);
  return Math.round((tb - ta) / 86400000);
}
function getDailyStreak(){
  return parseInt(localStorage.getItem('fl_daily_streak') || '0', 10);
}
function getLastPlay(){
  return localStorage.getItem('fl_last_play') || null;
}
function bumpDailyStreak(){
  const today = todayStr();
  const last  = getLastPlay();
  let streak = getDailyStreak();
  if(last === today){
    // already counted today
    return streak;
  }
  if(!last){
    streak = 1;
  } else {
    const gap = daysBetween(last, today);
    if(gap === 1) streak += 1;
    else if(gap > 1) streak = 1; // missed days — reset
    else streak = Math.max(streak, 1); // same day or weirdness — keep
  }
  localStorage.setItem('fl_daily_streak', String(streak));
  localStorage.setItem('fl_last_play', today);
  return streak;
}
function checkStreakStale(){
  // If user opens app and last play was >1 day ago, streak is broken
  const last = getLastPlay();
  if(!last) return 0;
  const gap = daysBetween(last, todayStr());
  if(gap > 1){
    localStorage.setItem('fl_daily_streak', '0');
    return 0;
  }
  return getDailyStreak();
}

// ══════════════════════════════════════════════════
// DISCOVERY & BADGES — persistent tracking of unique players
// guessed across all runs. Used for progression / collection.
// ══════════════════════════════════════════════════
const BADGES = [
  {at: 1,    name: "ROOKIE SCOUT"},
  {at: 26,   name: "SUNDAY PLAYER"},
  {at: 76,   name: "FOOTBALL FAN"},
  {at: 151,  name: "TRUE SUPPORTER"},
  {at: 301,  name: "FOOTBALL EXPERT"},
  {at: 501,  name: "FOOTY LEGEND"},
  {at: 701,  name: "WORLD CLASS"}
];

function getDiscovered(){
  try {
    const raw = localStorage.getItem('fl_discovered');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch(e){ return new Set(); }
}

// Array in discovery order (oldest first). Used for "last N discovered" queries.
// Self-migrating: if legacy user has fl_discovered set but no order (or order
// is shorter), rebuild from the set so blind draft / collection still work.
function getDiscoveredOrder(){
  try {
    const raw = localStorage.getItem('fl_discovered_order');
    const order = raw ? JSON.parse(raw) : [];
    const set = getDiscovered();
    // Migration: order is stale or missing players from set
    if(order.length < set.size){
      const inOrder = new Set(order);
      const missing = [];
      set.forEach(n => { if(!inOrder.has(n)) missing.push(n); });
      // Prepend missing (we don't know true order, treat as older discoveries)
      const merged = missing.concat(order);
      localStorage.setItem('fl_discovered_order', JSON.stringify(merged));
      return merged;
    }
    return order;
  } catch(e){ return []; }
}

function getDiscoveredCount(){
  return getDiscovered().size;
}

// Returns true if the name was newly added (not already in the set)
function addDiscovered(playerName){
  const set = getDiscovered();
  if(set.has(playerName)) return false;
  const wasBelow = set.size < 25;

  // ⚠️ Read order BEFORE updating set — otherwise getDiscoveredOrder()
  // sees the new player in the set but not in the order array, runs
  // migration, and prepends it. Then our push() below duplicates it.
  // (Caught by tests/discovery.test.js → "preserves discovery order")
  const order = getDiscoveredOrder();
  set.add(playerName);
  order.push(playerName);

  try {
    localStorage.setItem('fl_discovered', JSON.stringify([...set]));
    localStorage.setItem('fl_discovered_order', JSON.stringify(order));
    // Flag the moment we cross 25 so the Title screen can celebrate it
    if(wasBelow && set.size >= 25 && localStorage.getItem('fl_blind_unlocked_seen') !== '1'){
      localStorage.setItem('fl_blind_unlock_pending', '1');
    }
  } catch(e){}
  return true;
}

// Returns highest badge reached for a given count, or null
function getCurrentBadge(count){
  let current = null;
  for(const b of BADGES){
    if(count >= b.at) current = b;
    else break;
  }
  return current;
}

// Returns a badge object if crossing oldCount->newCount passes its threshold,
// or null if no milestone was crossed.
function checkBadgeMilestone(oldCount, newCount){
  for(const b of BADGES){
    if(oldCount < b.at && newCount >= b.at) return b;
  }
  return null;
}

function showLevelUpToast(badge){
  const el = document.getElementById('sflash');
  if(!el) return;
  // Make tier upgrade BIG and impactful — more drama than streak flash
  el.innerHTML = '<span style="font-size:1.4em">🏆</span><br>TIER UNLOCKED<br><span style="font-size:1.2em;color:#ffd700;text-shadow:0 0 20px #ffd700">' + badge.name + '</span>';
  el.style.color = '#fff';
  el.style.textShadow = '0 0 20px #ffd700, 0 0 40px #ffd700';
  el.style.fontSize = 'clamp(14px,4.5vw,22px)';
  el.style.lineHeight = '1.5';
  el.classList.add('on');
  if(navigator.vibrate) navigator.vibrate([60,40,60,40,120]);
  setTimeout(()=>{
    el.classList.add('fade');
    setTimeout(()=>{
      el.classList.remove('on','fade');
      el.style.color = '';
      el.style.textShadow = '';
      el.style.fontSize = '';
      el.style.lineHeight = '';
    }, 400);
  }, 3000); // 3s instead of 2s — give it weight
}

// Backward compat — if anything still calls showBadgeToast, redirect
function showBadgeToast(badge){ showLevelUpToast(badge); }

// Tier overlay dismiss (HTML reserved, future feature)
function dismissTierOverlay(){
  const ov = document.getElementById('tier-overlay');
  if(ov) ov.style.display = 'none';
}

// ══════════════════════════════════════════════════
// SETTINGS — sound toggle + reset HOF
// ══════════════════════════════════════════════════
function getSoundOn(){
  const v = localStorage.getItem('fl_sound');
  // Default ON if never set
  return v === null ? true : v === '1';
}
function toggleSound(){
  const newVal = !getSoundOn();
  localStorage.setItem('fl_sound', newVal ? '1' : '0');
  updateSoundBtn();
  toast(newVal ? "🔊 SOUND ON" : "🔇 SOUND OFF","");
}

// ─── How To Play modal ───────────────────────────────────────────
function openHowToPlay(){
  const m = document.getElementById('modal-howto');
  if(m) m.classList.add('on');
}
function closeHowToPlay(){
  const m = document.getElementById('modal-howto');
  if(m) m.classList.remove('on');
}
function updateSoundBtn(){
  const btn = document.getElementById('opt-sound');
  if(btn){
    const on = getSoundOn();
    btn.textContent = on ? "ON" : "OFF";
    // Toggle between active (green) and inactive (dim) — class-based for
    // styleguide compliance. When OFF, opacity dims the green appearance.
    if(on){
      btn.classList.remove('off');
      btn.style.opacity = '';
    } else {
      btn.classList.add('off');
      btn.style.opacity = '.45';
    }
  }
  // Also refresh the streak widget in settings
  const sEl = document.getElementById('opt-streak');
  if(sEl){
    const s = checkStreakStale();
    sEl.textContent = s + (s === 1 ? " DAY" : " DAYS");
    sEl.style.color = s > 0 ? "var(--gold)" : "#555";
  }
  // Refresh collection / discovery stats
  updateCollectionStats();
}

function updateCollectionStats(){
  const count = getDiscoveredCount();
  const total = (typeof DB !== "undefined" && DB.length) ? DB.length : 799;
  const dEl = document.getElementById('opt-discovered');
  if(dEl) dEl.textContent = count + " / " + total;
  const barEl = document.getElementById('opt-discovered-bar');
  if(barEl) barEl.style.width = Math.min(100, Math.round((count / total) * 100)) + "%";
  const bEl = document.getElementById('opt-badge');
  if(bEl){
    const badge = getCurrentBadge(count);
    if(badge){
      bEl.textContent = "🏆 " + badge.name;
      bEl.style.color = "var(--gold)";
    } else {
      // 0 discovered — encouraging countdown to first badge
      const next = BADGES[0];
      const remaining = next.at - count;
      bEl.textContent = remaining === 1
        ? "1 LEGEND TO START"
        : remaining + " LEGENDS TO START";
      bEl.style.color = "#888";
    }
  }
}

// ══════════════════════════════════════════════════
// COLLECTION SCREEN — shows ONLY players the user has guessed,
// never leaks the full database. Gracz nie widzi kogo nie zna.
// ══════════════════════════════════════════════════
function openCollection(){
  renderCollection();
  go('s-collection');
}

function renderCollection(){
  const count = getDiscoveredCount();
  const total = DB.length;
  const pct   = Math.round((count / total) * 100);

  // Stats panel
  const cEl = document.getElementById('coll-count');
  if(cEl) cEl.textContent = count + " / " + total;
  const bar = document.getElementById('coll-bar');
  if(bar) bar.style.width = Math.min(100, pct) + "%";

  const badge = getCurrentBadge(count);
  const bEl = document.getElementById('coll-badge');
  if(bEl){
    if(badge){
      bEl.textContent = "🏆 " + badge.name;
      bEl.style.color = "var(--gold)";
    } else {
      bEl.textContent = "NONE YET";
      bEl.style.color = "#888";
    }
  }
  const nextBadge = BADGES.find(b => count < b.at);
  const nEl = document.getElementById('coll-next');
  if(nEl){
    if(nextBadge){
      nEl.textContent = nextBadge.name + " @ " + nextBadge.at + " (" + (nextBadge.at - count) + " TO GO)";
      nEl.style.color = "#666";
    } else {
      nEl.textContent = "ALL BADGES UNLOCKED!";
      nEl.style.color = "var(--gold)";
    }
  }

  renderCollectionBreakdown();
  renderCollectionTiers();
}

function renderCollectionBreakdown(){
  const container = document.getElementById('coll-era-breakdown');
  if(!container) return;
  const discovered = getDiscovered();
  const eraLabels = {C:"CLASSICS", G:"GOLDEN", M:"MODERN"};
  const eraColors = {C:"#aa88ff", G:"#ffd700", M:"#00ddff"};

  const totals = {C:0, G:0, M:0};
  const founds = {C:0, G:0, M:0};
  DB.forEach(p=>{
    if(totals[p.e] !== undefined){
      totals[p.e]++;
      if(discovered.has(p.n)) founds[p.e]++;
    }
  });

  container.innerHTML = ["C","G","M"].map(era=>{
    const f = founds[era], t = totals[era];
    const pct = t ? Math.round((f/t)*100) : 0;
    return '<div>' +
      '<div style="display:flex;justify-content:space-between;font-size:8px;letter-spacing:1px;margin-bottom:4px">' +
        '<span style="color:' + eraColors[era] + '">' + eraLabels[era] + '</span>' +
        '<span style="color:#ccc">' + f + ' / ' + t + '</span>' +
      '</div>' +
      '<div style="background:#111;border:1px solid #333;height:8px">' +
        '<div style="background:' + eraColors[era] + ';height:100%;width:' + pct + '%;transition:width .5s ease"></div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderCollectionTiers(){
  const container = document.getElementById('coll-tiers');
  if(!container) return;
  const count = getDiscoveredCount();
  const current = getCurrentBadge(count);

  container.innerHTML = BADGES.map(tier=>{
    const unlocked = count >= tier.at;
    const isCurrent = current && current.name === tier.name;
    const color = unlocked ? (isCurrent ? "var(--gold)" : "#ccc") : "#444";
    const icon  = unlocked ? (isCurrent ? "🏆" : "✓") : "🔒";
    const weight = isCurrent ? "bold" : "normal";
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 4px;border-bottom:1px solid #1a1a1a;font-size:9px;letter-spacing:1px">' +
      '<span style="color:' + color + ';font-weight:' + weight + '">' + icon + '  ' + tier.name + '</span>' +
      '<span style="color:#555;font-size:7px">' + tier.at + '+</span>' +
    '</div>';
  }).join('');
}

// ══════════════════════════════════════════════════
// BLIND DRAFT — random 20 players from recent discoveries,
// pick 11 to build XI. Unlocks at 25 discovered.
// ══════════════════════════════════════════════════
let blindDraft = null;

function openBlindDraft(){
  // Build pool: ALL discovered players (order preserved)
  const order = getDiscoveredOrder();
  if(order.length < 25){
    alert("Unlock at 25 discovered legends. You have " + order.length + ".");
    return;
  }
  // Mark blind-draft button as "seen" so it stops pulsing on future visits
  localStorage.setItem('fl_blind_first_seen', '1');
  const status = document.getElementById('blind-pool-status');
  if(status) status.textContent = "POOL: " + order.length + " LEGENDS AVAILABLE";
  go('s-blind-intro');
}

function drawBlindDraft(){
  const order = getDiscoveredOrder();
  // Pool = ALL discovered players
  const allDiscovered = order
    .map(name => DB.find(p => p.n === name))
    .filter(Boolean);

  // 25 = same threshold as the Blind Draft unlock (see core.js refreshTitleScreen).
  // The pool size matches the unlock — players choose 11 from 25 instead of 11 from 30.
  if(allDiscovered.length < 25){
    alert("Need at least 25 known players in your collection. You have " + allDiscovered.length + ".");
    return;
  }

  // Shuffle and take 25
  const shuffled = allDiscovered.slice();
  for(let i = shuffled.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const drawn = shuffled.slice(0, 25);

  blindDraft = {
    drawn: drawn,
    picked: new Set(), // player names selected (up to 11)
    rerollUsed: false
  };

  renderBlindPick();
  go('s-blind-pick');
}


// Spam-click protection (caught by user feedback A)
drawBlindDraft = withLock(drawBlindDraft, 800);
function renderBlindPick(){
  if(!blindDraft) return;

  const grid = document.getElementById('blind-pick-grid');
  if(grid){
    const eraLabels = {C:"C", G:"G", M:"M"};
    const eraColors = {C:"#aa88ff", G:"#ffd700", M:"#00ddff"};

    grid.innerHTML = blindDraft.drawn.map(p=>{
      const selected = blindDraft.picked.has(p.n);
      const full = blindDraft.picked.size >= 11;
      const disabled = !selected && full;
      const bg = selected ? "rgba(170,136,255,0.15)" : "#050";
      const border = selected ? "#aa88ff" : "#222";
      const color = disabled ? "#444" : (selected ? "#aa88ff" : "#ccc");
      const clubTxt = (p.c && p.c[0]) ? p.c[0].toUpperCase() : "";
      const eraC = eraColors[p.e] || "#888";
      return '<div onclick="' + (disabled ? "" : "toggleBlindPick('" + p.n.replace(/'/g,"\\'") + "')") + '" ' +
        'style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;' +
        'background:' + bg + ';border:1px solid ' + border + ';font-size:9px;letter-spacing:1px;' +
        (disabled ? 'opacity:.35;cursor:not-allowed' : 'cursor:pointer') + '">' +
        '<span style="color:' + color + ';font-weight:' + (selected ? 'bold' : 'normal') + ';flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          (selected ? "✓ " : "  ") + p.n.toUpperCase() +
        '</span>' +
        '<span style="color:' + eraC + ';font-size:7px;margin-left:6px;font-weight:bold">' + eraLabels[p.e] + '</span>' +
        (clubTxt ? '<span style="color:#555;font-size:6px;margin-left:6px;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + clubTxt + '</span>' : '') +
      '</div>';
    }).join('');
  }

  const count = blindDraft.picked.size;
  const cEl = document.getElementById('blind-pick-count');
  if(cEl) cEl.textContent = count + " / 11";
  const bar = document.getElementById('blind-pick-bar');
  if(bar) bar.style.width = Math.min(100, Math.round((count / 11) * 100)) + "%";

  const btn = document.getElementById('blind-confirm-btn');
  if(btn){
    const ready = count === 11;
    btn.disabled = !ready;
    btn.style.background = ready ? '#aa88ff' : '#333';
    btn.style.borderColor = ready ? '#aa88ff' : '#333';
    btn.style.color = ready ? '#000' : '#666';
    btn.textContent = ready ? '▶ BUILD MY XI' : ('LOCK IN ' + count + '/11');
  }

  // Re-roll button: disabled after use
  const rerollBtn = document.getElementById('blind-reroll-btn');
  if(rerollBtn){
    if(blindDraft.rerollUsed){
      rerollBtn.disabled = true;
      rerollBtn.textContent = '🎲 RE-ROLL USED';
      rerollBtn.style.opacity = '.4';
      rerollBtn.style.cursor = 'not-allowed';
    } else {
      rerollBtn.disabled = false;
      rerollBtn.textContent = '🎲 RE-ROLL UNPICKED (1x)';
      rerollBtn.style.opacity = '1';
      rerollBtn.style.cursor = 'pointer';
    }
  }
}

function toggleBlindPick(name){
  if(!blindDraft) return;
  if(blindDraft.picked.has(name)){
    blindDraft.picked.delete(name);
  } else {
    if(blindDraft.picked.size >= 11) return;
    blindDraft.picked.add(name);
  }
  renderBlindPick();
}

function rerollBlindDraft(){
  if(!blindDraft || blindDraft.rerollUsed) return;

  // Keep picked players in the drawn pool, replace unpicked ones
  const pickedPlayers = blindDraft.drawn.filter(p => blindDraft.picked.has(p.n));
  const unpickedCount = 30 - pickedPlayers.length;

  // Pool of candidates for replacements: all discovered MINUS anyone already in drawn
  const order = getDiscoveredOrder();
  const currentDrawnNames = new Set(blindDraft.drawn.map(p => p.n));
  const candidates = order
    .map(name => DB.find(p => p.n === name))
    .filter(p => p && !currentDrawnNames.has(p.n));

  if(candidates.length < unpickedCount){
    // Not enough fresh players — fall back to allowing reshuffles of unpicked
    // (shouldn't happen often but be safe)
    const unpickedOld = blindDraft.drawn.filter(p => !blindDraft.picked.has(p.n));
    candidates.push(...unpickedOld);
  }

  // Shuffle candidates and take needed amount
  for(let i = candidates.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const replacements = candidates.slice(0, unpickedCount);

  // New drawn = picked + replacements, reshuffled for mixed display
  const newDrawn = pickedPlayers.concat(replacements);
  for(let i = newDrawn.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [newDrawn[i], newDrawn[j]] = [newDrawn[j], newDrawn[i]];
  }

  blindDraft.drawn = newDrawn;
  blindDraft.rerollUsed = true;
  renderBlindPick();
}

function confirmBlindPick(){
  if(!blindDraft || blindDraft.picked.size !== 11) return;

  // Capture picked players in pick order, store as bench
  const pickedPlayers = blindDraft.drawn.filter(p => blindDraft.picked.has(p.n));
  blindDraft.bench = pickedPlayers.slice();
  blindDraft.benchSelected = null; // index of currently-highlighted bench player

  // Reset XI slots — empty pitch for player to position
  if(typeof setFormation === 'function') setFormation('442');
  slots = makeDefault();
  captainIdx = null;
  xiStartTime = null;
  lastChem = null;
  selectingCaptain = false;

  // Clear stale chemistry panel UI from previous session
  // (matches the same reset in openXI; without this, a returning Blind Draft
  // user sees the previous XI's chemistry/breakdown until they place a player.)
  const chemResults = document.getElementById('chem-results');
  if(chemResults) chemResults.style.display = 'none';
  const chemBtn = document.getElementById('chem-btn');
  if(chemBtn) chemBtn.disabled = true;

  // ⚠️ Force-destroy old dots so nothing stale carries over
  // (chem classes, animation state, inline styles etc.)
  const wrap = document.getElementById('wrap');
  if(wrap){
    wrap.querySelectorAll('.pdot').forEach(el => el.remove());
  }

  // Mark this as a blind draft session so lock-in saves to blind HOF
  // and the bench panel shows up
  window.isBlindDraftSession = true;

  go('s-xi');
  setTimeout(()=>{
    if(typeof render === 'function') render();
    if(typeof updateCounter === 'function') updateCounter();
    renderBench();
  }, 50);
}


// Spam-click protection (caught by user feedback A)
confirmBlindPick = withLock(confirmBlindPick, 600);
function renderBench(){
  const wrap = document.getElementById('xi-bench-wrap');
  if(!wrap) return;
  if(!window.isBlindDraftSession || !blindDraft || !blindDraft.bench){
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';

  const list = document.getElementById('xi-bench');
  if(!list) return;

  // Names already on the pitch (so we hide them from bench display)
  const onPitch = new Set();
  slots.forEach(s => { if(s.dbName) onPitch.add(s.dbName); });

  const eraColors = {C:"#aa88ff", G:"#ffd700", M:"#00ddff"};
  const eraLabels = {C:"C", G:"G", M:"M"};

  list.innerHTML = blindDraft.bench.map((p,i)=>{
    if(onPitch.has(p.n)) return ''; // hide players already placed
    const selected = blindDraft.benchSelected === i;
    const bg = selected ? "rgba(170,136,255,.25)" : "transparent";
    const border = selected ? "#aa88ff" : "#222";
    const eraC = eraColors[p.e] || "#888";
    // Compact: just last name (or full if 1 word)
    const parts = p.n.split(' ');
    const shortName = (parts.length > 1 ? parts.slice(-1).join(' ') : p.n).toUpperCase();
    return '<div onclick="selectBenchPlayer(' + i + ')" ' +
      'style="display:flex;align-items:center;gap:3px;padding:5px 5px;' +
      'background:' + bg + ';border:1px solid ' + border + ';font-size:7px;letter-spacing:.5px;cursor:pointer;line-height:1.1">' +
      '<span style="color:' + eraC + ';font-size:5px;font-weight:bold;flex-shrink:0">' + eraLabels[p.e] + '</span>' +
      '<span style="color:' + (selected ? '#aa88ff' : '#ccc') + ';font-weight:' + (selected ? 'bold' : 'normal') + ';flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
        shortName +
      '</span>' +
    '</div>';
  }).join('');

  // Update hint
  const hint = document.getElementById('bench-hint');
  if(hint){
    if(blindDraft.benchSelected !== null){
      hint.textContent = 'NOW TAP A SLOT';
      hint.style.color = '#aa88ff';
    } else {
      const remaining = blindDraft.bench.filter(p => !onPitch.has(p.n)).length;
      if(remaining === 0){
        hint.textContent = 'ALL PLACED — LOCK IN';
        hint.style.color = '#00ff88';
      } else {
        hint.textContent = remaining + ' TO PLACE';
        hint.style.color = '#666';
      }
    }
  }
}

function selectBenchPlayer(idx){
  if(!blindDraft) return;
  if(blindDraft.benchSelected === idx){
    blindDraft.benchSelected = null; // tap again to deselect
  } else {
    blindDraft.benchSelected = idx;
  }
  renderBench();
}

// Click on a slot during blind draft — either place selected bench player
// or remove the slot's current player back to bench
function handleBlindSlotClick(i){
  if(!blindDraft) return;
  if(!xiStartTime) xiStartTime = Date.now();

  const slot = slots[i];

  // Case 1: bench player selected → place into this slot
  if(blindDraft.benchSelected !== null){
    const benchIdx = blindDraft.benchSelected;
    const benchPlayer = blindDraft.bench[benchIdx];
    if(!benchPlayer) return;

    // If slot was already filled, that previous player goes back to bench
    // (it's already in bench array — onPitch logic handles visibility)
    // We just overwrite the slot.
    slot.name = benchPlayer.n.toUpperCase();
    slot.dbName = benchPlayer.n;

    // Clear selection
    blindDraft.benchSelected = null;
    if(captainIdx === i) captainIdx = null; // captain was on a swapped slot

    render();
    updateCounter();
    renderBench();
    livePreview();
    return;
  }

  // Case 2: no bench selection — if slot has a player, send back to bench
  if(slot.dbName){
    slot.name = "";
    slot.dbName = "";
    if(captainIdx === i) captainIdx = null;
    render();
    updateCounter();
    renderBench();
    livePreview();
  }
  // Case 3: slot empty + no selection — do nothing (player must select bench first)
}

// Progress widget on Title screen — always shows where the player is
function abandonBlindDraft(){
  blindDraft = null;
  go('s-title');
}

// Progress widget on Title screen — always shows where the player is
function updateTitleProgress(count){
  const widget = document.getElementById('title-progress');
  if(!widget) return;

  const total = (typeof DB !== "undefined" && DB.length) ? DB.length : 799;
  const label = document.getElementById('title-progress-label');
  const countEl = document.getElementById('title-progress-count');
  const bar = document.getElementById('title-progress-bar');
  const hint = document.getElementById('title-progress-hint');

  // Hide entirely until player has at least 1 discovery (no point before)
  if(count < 1){
    widget.style.display = 'none';
    return;
  }
  widget.style.display = 'block';

  if(count < 25){
    // Working toward the 25 unlock — keep the widget visible to motivate
    widget.style.display = 'block';
    if(label) label.textContent = "⚽ LEGENDS";
    if(countEl){
      countEl.textContent = count + " / 25";
      countEl.style.color = "var(--gold)";
    }
    if(bar){
      bar.style.width = Math.min(100, Math.round((count / 25) * 100)) + "%";
      bar.style.background = "var(--gold)";
    }
    if(hint){
      const remaining = 25 - count;
      hint.textContent = remaining + " MORE TO UNLOCK BLIND DRAFT";
      hint.style.color = "#666";
    }
  } else {
    // Blind unlocked — hide the widget entirely.
    // Collection screen has its own progress; we don't repeat "56/796 (0%)"
    // or a stale "UNLOCKED" banner on the title screen.
    widget.style.display = 'none';
  }
}

// Unlock moment — big celebration overlay, shown once after crossing 25
// mode: 'blind' (first unlock) or 'xi' (unlocked by completing a draft)
function showUnlockOverlay(mode){
  const ov = document.getElementById('unlock-overlay');
  if(!ov) return;
  const nameEl = document.getElementById('unlock-mode-name');
  const descEl = document.getElementById('unlock-desc');
  const tryBtn = document.getElementById('unlock-try-btn');

  if(mode === 'xi'){
    if(nameEl){
      nameEl.textContent = 'LEGENDARY XI';
      nameEl.style.color = '#c8960c';
      nameEl.style.textShadow = '0 0 30px #c8960c';
    }
    if(descEl){
      descEl.innerHTML = 'YOU MASTERED THE DRAFT<br>NOW BUILD YOUR OWN<br><br>' +
        '<span style="color:#888;font-size:7px">ULTIMATE ENGLAND XI AWAITS</span>';
    }
    if(tryBtn){
      tryBtn.textContent = '👕 TAP TO BUILD';
      tryBtn.style.background = '#c8960c';
      tryBtn.dataset.mode = 'xi';
    }
    localStorage.setItem('fl_xi_unlock_pending', '0');
  } else {
    // 'blind' default
    if(nameEl){
      nameEl.textContent = 'BLIND DRAFT';
      nameEl.style.color = '#aa88ff';
      nameEl.style.textShadow = '0 0 30px #aa88ff';
    }
    if(descEl){
      descEl.innerHTML = "YOU'VE DISCOVERED<br>25 LEGENDS<br><br>" +
        '<span style="color:#888;font-size:7px">A NEW CHALLENGE AWAITS</span>';
    }
    if(tryBtn){
      tryBtn.textContent = '🎲 TAP TO TRY';
      tryBtn.style.background = '#aa88ff';
      tryBtn.dataset.mode = 'blind';
    }
    localStorage.setItem('fl_blind_unlock_pending', '0');
    localStorage.setItem('fl_blind_unlocked_seen', '1');
  }
  ov.style.display = 'flex';
  if(navigator.vibrate) navigator.vibrate([80,60,120,60,200]);
}

function dismissUnlockOverlay(){
  const ov = document.getElementById('unlock-overlay');
  if(!ov) return;
  ov.style.display = 'none';
}

function acceptUnlockOverlay(){
  const tryBtn = document.getElementById('unlock-try-btn');
  const mode = tryBtn ? tryBtn.dataset.mode : 'blind';
  dismissUnlockOverlay();
  if(mode === 'xi'){
    localStorage.setItem('fl_xi_first_seen', '1');
    const btn = document.getElementById('title-xi-btn');
    if(btn) btn.classList.remove('new-unlock-pulse');
    openXI();
  } else {
    localStorage.setItem('fl_blind_first_seen', '1');
    const btn = document.getElementById('title-blind-btn');
    if(btn) btn.classList.remove('new-unlock-pulse');
    openBlindDraft();
  }
}

// ══════════════════════════════════════════════════
// PUB MODE — LAST TEAM STANDING (knockout hot-potato)
// All state in-memory. Dies on refresh.
// ══════════════════════════════════════════════════
let pubSession = null;
let pubSetupState = {teams: 4, era: "ALL", names: []};

const PUB_TURN_SECONDS = 30;
const PUB_STARTING_LIVES = 3;

function openPubSetup(){
  pubSession = null;
  // Preserve team count between sessions, default 4
  pubSetupState = {
    teams: pubSetupState.teams || 4,
    era: pubSetupState.era || "ALL",
    names: []
  };
  // Seed default names: TEAM A, TEAM B, ...
  for(let i=0;i<8;i++) pubSetupState.names[i] = "TEAM " + String.fromCharCode(65+i);
  renderPubSetup();
  go('s-pub-setup');
}

function renderPubSetup(){
  // Team count buttons (2-8)
  const row = document.getElementById('pub-team-count-row');
  if(row){
    row.innerHTML = [2,3,4,5,6,7,8].map(n=>{
      const active = pubSetupState.teams === n;
      return '<button onclick="pubSetupState.teams=' + n + ';renderPubSetup()" ' +
        'style="flex:1;min-width:36px;background:#000;border:2px solid ' +
        (active ? 'var(--green)' : '#333') + ';color:' + (active ? 'var(--green)' : '#666') +
        ';font-family:var(--px);font-size:10px;padding:8px 0;cursor:pointer;letter-spacing:1px;font-weight:bold">' +
        n + '</button>';
    }).join('');
  }

  // Name inputs — one per team
  const namesRow = document.getElementById('pub-names-row');
  if(namesRow){
    let html = "";
    for(let i=0;i<pubSetupState.teams;i++){
      const val = pubSetupState.names[i] || ("TEAM " + String.fromCharCode(65+i));
      html += '<input class="inp" oninput="pubSetupState.names[' + i + ']=this.value" ' +
        'value="' + val.replace(/"/g,'&quot;') + '" maxlength="14" ' +
        'autocomplete="off" autocapitalize="characters" spellcheck="false" ' +
        'style="width:100%;text-transform:uppercase;font-size:10px;padding:8px 10px">';
    }
    namesRow.innerHTML = html;
  }

  // Era buttons
  const eraRow = document.getElementById('pub-era-row');
  if(eraRow){
    const eras = [
      {v:"C",   label:"CLASSICS",  sub:"1960-1990"},
      {v:"G",   label:"GOLDEN",    sub:"1990-2010"},
      {v:"M",   label:"MODERN",    sub:"2010-NOW"},
      {v:"ALL", label:"ALL TIME",  sub:"1960-NOW"}
    ];
    eraRow.innerHTML = eras.map(e=>{
      const active = pubSetupState.era === e.v;
      return '<button onclick="pubSetupState.era=\'' + e.v + '\';renderPubSetup()" ' +
        'style="background:#000;border:2px solid ' + (active ? 'var(--green)' : '#333') +
        ';color:' + (active ? 'var(--green)' : '#888') +
        ';font-family:var(--px);font-size:9px;padding:10px;cursor:pointer;letter-spacing:2px;display:flex;justify-content:space-between;align-items:center">' +
        '<span>' + e.label + '</span><span style="color:#555;font-size:6px">' + e.sub + '</span>' +
      '</button>';
    }).join('');
  }
}

function startPubSession(){
  // Build team list from setup
  const teams = [];
  for(let i=0;i<pubSetupState.teams;i++){
    let name = (pubSetupState.names[i] || "").trim().toUpperCase().slice(0,14);
    if(!name) name = "TEAM " + String.fromCharCode(65+i);
    teams.push({name: name, lives: PUB_STARTING_LIVES, eliminated: false, guesses: 0, guessedPlayers: []});
  }

  // Build pool from era
  let pool;
  if(pubSetupState.era === 'ALL') pool = [...DB];
  else pool = DB.filter(p => p.e === pubSetupState.era);

  pubSession = {
    active: true,
    era: pubSetupState.era,
    teams: teams,
    currentTeamIdx: 0,
    usedPlayers: new Set(),
    pool: pool,
    turnTimer: null,
    totalGuesses: 0,
    pendingSurname: null
  };

  // Show game screen and kick off first turn
  const eraEl = document.getElementById('pub-game-era');
  if(eraEl){
    eraEl.textContent = {C:"🏆 CLASSICS",G:"⭐ GOLDEN",M:"🔥 MODERN",ALL:"🎯 ALL TIME"}[pubSession.era] || "ALL";
  }
  go('s-pub-game');
  renderPubLives();
  startPubTurn();
}

function renderPubLives(){
  const row = document.getElementById('pub-lives-row');
  if(!row || !pubSession) return;
  row.innerHTML = pubSession.teams.map((t,i)=>{
    const hearts = "❤️".repeat(t.lives) + "🖤".repeat(PUB_STARTING_LIVES - t.lives);
    const isActive = (i === pubSession.currentTeamIdx) && !t.eliminated;
    const color = t.eliminated ? "#555" : (isActive ? "var(--green)" : "#999");
    const weight = isActive ? "bold" : "normal";
    const style = t.eliminated ? "text-decoration:line-through;opacity:.5;" : "";
    const bgStyle = isActive ? "background:rgba(0,255,136,0.1);box-shadow:0 0 10px rgba(0,255,136,0.3);border-left:3px solid var(--green);" : "border-left:3px solid transparent;";
    return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;letter-spacing:2px;padding:6px 8px;' + bgStyle + style + '">' +
      '<span style="color:' + color + ';font-weight:' + weight + '">' + (isActive ? "▶ " : "  ") + t.name + '</span>' +
      '<span style="font-size:8px">' + hearts + '</span>' +
    '</div>';
  }).join('');
}

function startPubTurn(){
  if(!pubSession) return;
  // Make sure current team isn't eliminated — advance if so
  let safety = 0;
  while(pubSession.teams[pubSession.currentTeamIdx].eliminated){
    pubSession.currentTeamIdx = (pubSession.currentTeamIdx + 1) % pubSession.teams.length;
    if(++safety > pubSession.teams.length) break;
  }

  const team = pubSession.teams[pubSession.currentTeamIdx];
  pubSession.pendingSurname = null; // fresh turn, no pending clarification

  const fbEl = document.getElementById('pub-feedback');
  if(fbEl){ fbEl.textContent = ""; fbEl.style.color = ""; }

  const inp = document.getElementById('pub-inp');
  if(inp){
    inp.value = "";
    inp.disabled = false;
    inp.focus();
  }

  // Start timer
  let timeLeft = PUB_TURN_SECONDS;
  const tEl = document.getElementById('pub-timer');
  const barEl = document.getElementById('pub-timer-bar');
  if(tEl){ tEl.textContent = timeLeft; tEl.style.color = "var(--green)"; }
  if(barEl){ barEl.style.width = "100%"; barEl.style.background = "var(--green)"; }

  clearInterval(pubSession.turnTimer);
  pubSession.turnTimer = setInterval(()=>{
    timeLeft--;
    // 3-level color change matching quiz: >15s green, 6-15s yellow, <=5s red
    let col, barCol;
    if(timeLeft <= 5){ col = "var(--red)"; barCol = "var(--red)"; }
    else if(timeLeft <= 15){ col = "var(--yellow)"; barCol = "var(--yellow)"; }
    else { col = "var(--green)"; barCol = "var(--green)"; }
    if(tEl){
      tEl.textContent = timeLeft;
      tEl.style.color = col;
    }
    if(barEl){
      const pct = Math.max(0, (timeLeft / PUB_TURN_SECONDS) * 100);
      barEl.style.width = pct + "%";
      barEl.style.background = barCol;
    }
    if(timeLeft <= 0){
      clearInterval(pubSession.turnTimer);
      pubTimeOut();
    }
  }, 1000);

  renderPubLives();
  updatePubUsedCount();
}

function updatePubUsedCount(){
  const el = document.getElementById('pub-used-count');
  if(el && pubSession) el.textContent = pubSession.usedPlayers.size;
}

function pubSubmit(){
  if(!pubSession) return;
  const inp = document.getElementById('pub-inp');
  const raw = (inp ? inp.value : "").trim();
  if(raw.length < 2) return;

  // tryMatch uses G.pool + a "found" Set. Swap temporarily.
  const savedPool = G.pool;
  G.pool = pubSession.pool;

  // ── STEP 1: if waiting for first-name clarification, try to resolve ──
  if(pubSession.pendingSurname){
    const surname = pubSession.pendingSurname;
    const v = norm(raw);
    const combined1 = v + ' ' + norm(surname);
    const combined2 = norm(surname) + ' ' + v;

    let resolved = null;
    for(const p of G.pool){
      if(pubSession.usedPlayers.has(p.n)) continue;
      for(const a of p.a){
        const na = norm(a);
        if(na === combined1 || na === combined2 || na === v){
          resolved = p;
          break;
        }
      }
      if(resolved) break;
    }

    if(resolved){
      G.pool = savedPool;
      pubSession.pendingSurname = null;
      pubAcceptAnswer(resolved);
      return;
    }

    // Fallback: direct full-name match
    const direct = tryMatch(raw, pubSession.usedPlayers);
    if(direct && direct.ok){
      G.pool = savedPool;
      pubSession.pendingSurname = null;
      pubAcceptAnswer(direct.player);
      return;
    }

    // Clarification failed — clear pending and fall through to normal flow
    pubSession.pendingSurname = null;
  }

  // ── STEP 2: normal match attempt ──
  const result = tryMatch(raw, pubSession.usedPlayers);
  G.pool = savedPool;

  if(result && result.ok){
    pubAcceptAnswer(result.player);
    return;
  }

  if(result && result.ambiguous){
    // Ask for first name — no life lost, team keeps typing
    pubSession.pendingSurname = result.surname;
    pubShowFeedback("⚠ WHICH ONE? TYPE FIRST NAME", "#ffcc33", false);
    if(inp){ inp.value = ""; inp.focus(); }
    return;
  }

  // Check if player exists in full DB but not this era — different message
  const inFullDB = DB.some(p => p.a.some(a => norm(a) === norm(raw)));
  if(inFullDB){
    pubShowFeedback("❌ WRONG ERA", "#ff4444", true);
  } else {
    pubShowFeedback("❌ NOT IN DATABASE", "#ff4444", true);
  }
  pubLoseLife();
}

function pubAcceptAnswer(player){
  // Already-used guard (should be prevented by tryMatch excluding usedPlayers,
  // but defensive check for edge cases like pending-surname resolution)
  if(pubSession.usedPlayers.has(player.n)){
    pubShowFeedback("❌ ALREADY USED — " + player.n.toUpperCase(), "#ff4444", true);
    pubLoseLife();
    return;
  }
  pubSession.usedPlayers.add(player.n);
  pubSession.totalGuesses++;
  pubSession.teams[pubSession.currentTeamIdx].guesses++;
  pubSession.teams[pubSession.currentTeamIdx].guessedPlayers.push(player.n);
  pubShowFeedback("✔ " + player.n.toUpperCase(), "#00ff88", false);
  if(navigator.vibrate) navigator.vibrate([40,20,40]);
  clearInterval(pubSession.turnTimer);
  setTimeout(()=>pubAdvanceTeam(), 900);
}

function pubShowFeedback(text, color, shake){
  const el = document.getElementById('pub-feedback');
  if(!el) return;
  el.textContent = text;
  el.style.color = color;
  if(shake){
    el.classList.remove('pub-error');
    void el.offsetWidth;
    el.classList.add('pub-error');
  }
}

function pubTimeOut(){
  if(!pubSession) return;
  pubShowFeedback("⏱ TIME UP", "#ff4444", true);
  if(navigator.vibrate) navigator.vibrate([80,40,80]);
  pubLoseLife();
}

function pubLoseLife(){
  if(!pubSession) return;
  const inp = document.getElementById('pub-inp');
  if(inp){ inp.disabled = true; }
  clearInterval(pubSession.turnTimer);

  const team = pubSession.teams[pubSession.currentTeamIdx];
  team.lives--;
  renderPubLives();

  if(team.lives <= 0){
    team.eliminated = true;
    renderPubLives();
    // Fullscreen drama elimination
    setTimeout(()=>{
      showEliminationOverlay(team.name);
      if(navigator.vibrate) navigator.vibrate([200,100,200,100,300]);
    }, 400);
    setTimeout(()=>pubAdvanceTeam(), 2400);
  } else {
    setTimeout(()=>pubAdvanceTeam(), 1400);
  }
}

function showEliminationOverlay(teamName){
  const ov = document.getElementById('elim-overlay');
  if(!ov) return;
  const nameEl = document.getElementById('elim-team-name');
  if(nameEl) nameEl.textContent = teamName;
  ov.style.display = 'flex';
  // Auto-hide after animation completes
  setTimeout(()=>{ ov.style.display = 'none'; }, 1500);
}

function pubAdvanceTeam(){
  if(!pubSession) return;

  // Check win condition — only 1 team left alive
  const alive = pubSession.teams.filter(t=>!t.eliminated);
  if(alive.length <= 1){
    showPubWinner(alive[0] || null);
    return;
  }

  // Move to next non-eliminated team
  let next = pubSession.currentTeamIdx;
  let safety = 0;
  do {
    next = (next + 1) % pubSession.teams.length;
    if(++safety > pubSession.teams.length * 2) break;
  } while(pubSession.teams[next].eliminated);

  pubSession.currentTeamIdx = next;
  startPubTurn();
}

function showPubWinner(winner){
  clearInterval(pubSession.turnTimer);

  const wN = document.getElementById('pub-winner-name');
  if(wN) wN.textContent = winner ? winner.name : "NO WINNER";

  // Final results — alive first, then eliminated (in reverse elimination order if we tracked it)
  const sorted = pubSession.teams.slice().sort((a,b)=>{
    if(a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    return b.lives - a.lives;
  });

  const board = document.getElementById('pub-final-board');
  if(board){
    board.innerHTML = sorted.map((t,i)=>{
      const medal = i===0 && !t.eliminated ? "🏆" : (i===1 ? "🥈" : (i===2 ? "🥉" : (i+1)+"."));
      const isWinner = (i===0 && !t.eliminated);
      const color = t.eliminated ? "#666" : (isWinner ? "#ffd700" : "#ccc");
      const style = t.eliminated ? "text-decoration:line-through" : "";
      const status = t.eliminated ? "☠️" : "❤️".repeat(t.lives);
      const hasGuesses = t.guessedPlayers && t.guessedPlayers.length > 0;
      const rowId = "pub-row-" + i;
      const listId = "pub-guesslist-" + i;
      const chevron = hasGuesses ? '<span id="' + rowId + '-chev" style="color:#666;font-size:8px;margin-left:6px">▸</span>' : '';
      const clickable = hasGuesses ? 'cursor:pointer;' : '';
      return '<div>' +
        '<div ' + (hasGuesses ? 'onclick="togglePubGuessList(' + i + ')"' : '') +
          ' style="display:flex;justify-content:space-between;align-items:center;padding:8px 4px;border-bottom:1px solid #222;font-size:10px;letter-spacing:1px;' + clickable + style +
          (isWinner ? ';background:rgba(255,215,0,0.08)' : '') + '">' +
          '<span style="color:' + color + ';font-weight:' + (isWinner ? 'bold' : 'normal') + ';flex:1">' + medal + ' ' + t.name + chevron + '</span>' +
          '<span style="color:var(--green);font-size:9px;margin-right:12px;min-width:48px;text-align:right">⚽ ' + t.guesses + '</span>' +
          '<span style="color:#888;font-size:8px;min-width:36px;text-align:right">' + status + '</span>' +
        '</div>' +
        '<div id="' + listId + '" style="display:none;padding:8px 14px 12px;background:rgba(0,255,136,0.04);border-bottom:1px solid #222;font-size:8px;line-height:1.8;letter-spacing:1px;color:#aaa">' +
          (hasGuesses ? t.guessedPlayers.map(n=>"✓ "+n.toUpperCase()).join("<br>") : "NO PLAYERS GUESSED") +
        '</div>' +
      '</div>';
    }).join('');
  }

  const totalEl = document.getElementById('pub-total-guesses');
  if(totalEl) totalEl.textContent = pubSession.totalGuesses;

  go('s-pub-leaderboard');
}

function togglePubGuessList(idx){
  const list = document.getElementById("pub-guesslist-" + idx);
  const chev = document.getElementById("pub-row-" + idx + "-chev");
  if(!list) return;
  const isOpen = list.style.display !== "none";
  list.style.display = isOpen ? "none" : "block";
  if(chev) chev.textContent = isOpen ? "▸" : "▾";
}

function abandonPubSession(){
  if(pubSession && pubSession.active){
    if(!confirm("End the game? All progress lost.")) return;
  }
  if(pubSession) clearInterval(pubSession.turnTimer);
  pubSession = null;
  go('s-title');
}

// Enter key in pub input
document.addEventListener('DOMContentLoaded', ()=>{
  // First — check app version, run migrations if storage format changed
  if(typeof checkVersion === 'function') checkVersion();
  const inp = document.getElementById('pub-inp');
  if(inp){
    inp.addEventListener('keydown', e=>{
      if(e.key === 'Enter'){ e.preventDefault(); pubSubmit(); }
    });
  }

  // ─── BOOT: first-time → quiz, returning → title ──────────────────────
  let initialRouteLocked = false;
  function bootApp(){
    if(initialRouteLocked) return;
    initialRouteLocked = true;

    const hasPlayed = localStorage.getItem('fl_has_played') === '1';

    // Both first-time and returning users land on the title screen.
    // (Real-user testing showed auto-starting a quiz looked like a pop-up
    //  ad and got swiped away before the user even read it.)
    if(!hasPlayed){
      try { localStorage.setItem('fl_has_played', '1'); } catch(e){}
    }
    G.playerName = getStoredName() || '';
    if(typeof silentXIUnlock === 'function') silentXIUnlock();
    if(typeof refreshPlayingAs === 'function') refreshPlayingAs();
    if(typeof refreshTitleEra === 'function') refreshTitleEra();
    if(typeof refreshTitleScreen === 'function') refreshTitleScreen();
  }
  bootApp();

  // Register service worker for PWA + offline
  if(typeof registerServiceWorker === 'function') registerServiceWorker();
  // Set up event delegation for any element with data-action
  if(typeof setupEventDelegation === 'function') setupEventDelegation();
});

// ════════════════════════════════════════════════════════════════════════════
// EVENT DELEGATION
// ----------------------------------------------------------------------------
// Single document-level listener handles any element with [data-action].
// Inline onclick="..." attributes still work — this is *additive*, not a
// replacement. New code should prefer data-action; old code stays untouched.
//
// Supported attributes:
//   data-action="funcName"      → calls window.funcName()
//   data-arg="value"            → passes value as the only argument
//   data-stop-prop              → calls e.stopPropagation() before the handler
//
// Examples:
//   <button data-action="endGame">END</button>
//   <button data-action="go" data-arg="s-title">HOME</button>
//   <button data-action="dismissModal" data-stop-prop>X</button>
// ════════════════════════════════════════════════════════════════════════════
function setupEventDelegation(){
  document.addEventListener('click', function(e){
    // Find the nearest ancestor with data-action (or the element itself)
    const el = e.target.closest('[data-action]');
    if(!el) return;

    const action = el.dataset.action;
    if(!action) return;

    const fn = window[action];
    if(typeof fn !== 'function'){
      console.warn('data-action "' + action + '" is not a function on window');
      return;
    }

    // Optional: stop propagation before invoking handler
    if(el.hasAttribute('data-stop-prop')){
      e.stopPropagation();
    }

    // Optional: pass single string argument from data-arg
    const arg = el.dataset.arg;
    try {
      if(arg !== undefined){
        fn(arg);
      } else {
        fn();
      }
    } catch(err){
      console.error('Error in data-action "' + action + '":', err);
      if(typeof toast === 'function') toast('OPERATION FAILED — TRY AGAIN', 'err');
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// PWA — service worker registration + update detection
// ════════════════════════════════════════════════════════════════════════════
let swWaitingRegistration = null;

function registerServiceWorker(){
  if(!('serviceWorker' in navigator)) return;
  // Don't register on localhost file:// — service workers require http(s)
  if(location.protocol !== 'https:' && location.hostname !== 'localhost') return;

  navigator.serviceWorker.register('service-worker.js')
    .then(reg => {
      // Listen for new SW installing
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if(!newSW) return;
        newSW.addEventListener('statechange', () => {
          // When new SW is installed AND there's a controlling SW (i.e. update, not first install)
          if(newSW.state === 'installed' && navigator.serviceWorker.controller){
            swWaitingRegistration = reg;
            showUpdateBanner();
          }
        });
      });
      // If a SW is already waiting (e.g. user reopened app), prompt now
      if(reg.waiting && navigator.serviceWorker.controller){
        swWaitingRegistration = reg;
        showUpdateBanner();
      }
    })
    .catch(err => {
      // Silent fail — SW is enhancement, not requirement
      console.log('SW registration failed:', err);
    });

  // Reload page once new SW takes control (after applySWUpdate)
  let reloadingForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if(reloadingForUpdate) return;
    reloadingForUpdate = true;
    window.location.reload();
  });
}

function showUpdateBanner(){
  const banner = document.getElementById('sw-update-banner');
  if(banner) banner.style.display = 'block';
}

function applySWUpdate(){
  const banner = document.getElementById('sw-update-banner');
  if(banner) banner.textContent = '🔄 UPDATING...';
  if(swWaitingRegistration && swWaitingRegistration.waiting){
    swWaitingRegistration.waiting.postMessage({type: 'SKIP_WAITING'});
  } else {
    // Fallback — just reload
    window.location.reload();
  }
}

function resetHOF(){
  if(!confirm("Reset all Hall of Fame scores? This can't be undone.")) return;
  ['ALL','C','G','M'].forEach(era=>localStorage.removeItem('fl_hof_'+era));
  toast("✓ HALL OF FAME RESET","");
  // If currently on HOF, re-render
  const hofEl = document.getElementById('s-hof');
  if(hofEl && hofEl.classList.contains('on')) renderHOF('ALL');
}

// ══════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════
let toastT;
// toast() loaded from core.js
// DB shared from main game


// ══════════════════════════════════════════
// NORMALISER + SEARCH
// ══════════════════════════════════════════
function findPlayer(input){
  const v=norm(input); if(!v||v.length<2)return null;

  // 1. exact alias match
  for(const p of DB){ for(const a of p.a){ if(norm(a)===v)return p; }}

  const words=v.split(" ");

  // 2. single word — match surname
  if(words.length===1){
    const m=DB.filter(p=>norm(p.n.split(" ").pop())===v);
    if(m.length===1)return m[0];
    // If multiple players share this surname, don't fall back to a first-name match —
    // the user most likely meant one of them and needs to disambiguate with a first name.
    if(m.length>1)return null;
    // also match first word (first name) — only if no surname matches at all
    const m2=DB.filter(p=>norm(p.n.split(" ")[0])===v);
    if(m2.length===1)return m2[0];
  }

  // 3. two+ words — try reversed order (NEVILLE GARY → GARY NEVILLE)
  if(words.length>=2){
    const reversed=norm([...words].reverse().join(" "));
    for(const p of DB){ if(norm(p.n)===reversed)return p; }
    // also try reversed against aliases
    for(const p of DB){ for(const a of p.a){ if(norm(a)===reversed)return p; }}
  }

  // 4. Fuzzy single-word match on aliases (typo tolerance, Sylwia 17.05)
  // Mirror of findAlmost() in core.js: alias length >3, lev distance === 1
  // Catches: "beckam" → Beckham, "wazze" → Wazza, "lampd" → Lampard
  for(const p of DB){
    for(const a of p.a){
      const na = norm(a);
      if(na.length > 3 && lev(v, na) === 1) return p;
    }
  }

  // 5. Fuzzy 2-word match (typos in first+last name, Sylwia 17.05)
  // Mirror of tryMatch fuzzy block in core.js:
  // - max 2 errors per token, min length 3 per token
  // - forward + reversed order
  // - return only if exactly ONE candidate with strictly lowest total error
  // Catches: "grodon bnks" → Gordon Banks, "jeo cole" → Joe Cole, "nevile gary" → Gary Neville
  if(words.length === 2){
    const candidates = [];
    for(const p of DB){
      const pn = norm(p.n);
      const playerWords = pn.split(' ');
      if(playerWords.length < 2) continue;
      const playerFirst = playerWords[0];
      const playerLast = playerWords[playerWords.length - 1];
      if(playerFirst.length < 3 || playerLast.length < 3) continue;
      // Forward order: input[0]=first, input[1]=last
      const fLev = lev(words[0], playerFirst);
      const lLev = lev(words[1], playerLast);
      if(fLev <= 2 && lLev <= 2 && (fLev + lLev) > 0){
        candidates.push({player: p, totalLev: fLev + lLev});
      }
      // Reversed order: input[0]=last, input[1]=first
      const rfLev = lev(words[1], playerFirst);
      const rlLev = lev(words[0], playerLast);
      if(rfLev <= 2 && rlLev <= 2 && (rfLev + rlLev) > 0){
        if(!candidates.find(c => c.player === p)){
          candidates.push({player: p, totalLev: rfLev + rlLev});
        }
      }
    }
    if(candidates.length === 1){
      return candidates[0].player;
    }
    if(candidates.length > 1){
      candidates.sort((a, b) => a.totalLev - b.totalLev);
      // Pick lowest error only if strictly better than #2 (no tie)
      if(candidates[0].totalLev < candidates[1].totalLev){
        return candidates[0].player;
      }
      // Tie — don't guess, fall through
    }
  }

  return null;
}

// Returns all DB matches for a surname (for WHICH ONE logic)
function findAllBySurname(surname){
  const v=norm(surname);
  return DB.filter(p=>norm(p.n.split(" ").pop())===v || p.a.some(a=>norm(a)===v));
}
function getSuggestions(input){
  const v=norm(input); if(v.length<2)return [];
  const res=[], seen=new Set();
  for(const p of DB){
    if(!seen.has(p.n) && (p.a.some(a=>norm(a).startsWith(v))||norm(p.n).includes(v))){
      res.push(p.n); seen.add(p.n); if(res.length>=6)break;
    }
  }
  return res;
}

// ══════════════════════════════════════════
// PITCH DRAWING
// ══════════════════════════════════════════
const W_M=68,H_M=52.5;
function drawPitch(canvas){
  const CW=canvas.offsetWidth, CH=Math.round(CW*H_M/W_M);
  canvas.width=CW; canvas.height=CH;
  const ctx=canvas.getContext("2d");
  const px=m=>m/W_M*CW, py=m=>m/H_M*CH;
  const bands=[0,10,20,30,40,50,52.5];
  for(let i=0;i<bands.length-1;i++){
    ctx.fillStyle=i%2===0?"#1a5c0a":"#196009";
    ctx.fillRect(0,py(bands[i]),CW,py(bands[i+1])-py(bands[i])+1);
  }
  ctx.strokeStyle="rgba(255,255,255,0.88)";
  ctx.lineWidth=Math.max(1.2,CW/180); ctx.lineCap="round";
  const L=(x1,y1,x2,y2)=>{ctx.beginPath();ctx.moveTo(px(x1),py(y1));ctx.lineTo(px(x2),py(y2));ctx.stroke()};
  const D=(x,y,r)=>{ctx.fillStyle="rgba(255,255,255,0.88)";ctx.beginPath();ctx.arc(px(x),py(y),r,0,Math.PI*2);ctx.fill()};
  L(0,0,W_M,0);L(0,0,0,H_M);L(W_M,0,W_M,H_M);L(0,H_M,W_M,H_M);
  ctx.beginPath();ctx.arc(px(34),py(0),px(9.15),0,Math.PI);ctx.stroke();
  D(34,0,Math.max(2,CW/130));
  const paX=(W_M-40.32)/2;
  ctx.beginPath();ctx.rect(px(paX),py(H_M-16.5),px(40.32),py(H_M)-py(H_M-16.5));ctx.stroke();
  const sbX=(W_M-18.32)/2;
  ctx.beginPath();ctx.rect(px(sbX),py(H_M-5.5),px(18.32),py(H_M)-py(H_M-5.5));ctx.stroke();
  D(34,H_M-11,Math.max(1.5,CW/160));
  const sY=py(H_M-11),pY=py(H_M-16.5),aR=px(9.15),dY=sY-pY,ag=Math.acos(dY/aR);
  ctx.beginPath();ctx.arc(px(34),sY,aR,-(Math.PI/2+ag),-(Math.PI/2-ag),false);ctx.stroke();
  const cr=px(1);
  ctx.beginPath();ctx.arc(px(0),py(H_M),cr,-Math.PI/2,0);ctx.stroke();
  ctx.beginPath();ctx.arc(px(W_M),py(H_M),cr,Math.PI,-Math.PI/2);ctx.stroke();
}

// ══════════════════════════════════════════
// POSITION DEFINITIONS
// ══════════════════════════════════════════
const POS_GROUP = {
  GK:"gk",
  RB:"df",CB:"df",LB:"df",RWB:"df",LWB:"df",SW:"df",
  CM:"mf",DM:"mf",AM:"mf",RM:"mf",LM:"mf",RW:"mf",LW:"mf",
  ST:"fw",SS:"fw"
};

// X position on pitch (0=left, 1=right) for each pos
const POS_X = {
  GK:.50,
  RWB:.88, RB:.88, CB:.50, LB:.12, LWB:.12, SW:.50,
  RM:.78,  CM:.50, DM:.50, AM:.50, LM:.22,
  RW:.78,  ST:.50, SS:.50, LW:.22,
};

// Y bands per group (fraction 0=top/halfway, 1=bottom/goalline)
const GRP_Y = {gk:.90, df:.68, mf:.46, fw:.20};
const GRP_Y2 = {gk:.90, df:.79, mf:.57, fw:.31}; // second row when >5

// ══════════════════════════════════════════
// SLOTS STATE — 11 players
// ══════════════════════════════════════════
function makeDefault(){
  return [
    {pos:"GK", num:1,  name:"", dbName:"", x:.50, y:.90},
    {pos:"RB", num:2,  name:"", dbName:"", x:.88, y:.68},
    {pos:"CB", num:5,  name:"", dbName:"", x:.62, y:.68},
    {pos:"CB", num:6,  name:"", dbName:"", x:.38, y:.68},
    {pos:"LB", num:3,  name:"", dbName:"", x:.12, y:.68},
    {pos:"RM", num:7,  name:"", dbName:"", x:.88, y:.46},
    {pos:"CM", num:4,  name:"", dbName:"", x:.62, y:.46},
    {pos:"CM", num:8,  name:"", dbName:"", x:.38, y:.46},
    {pos:"LM", num:11, name:"", dbName:"", x:.12, y:.46},
    {pos:"ST", num:9,  name:"", dbName:"", x:.62, y:.20},
    {pos:"ST", num:10, name:"", dbName:"", x:.38, y:.20},
  ];
}

// ── AUTO-LAYOUT ──
// Groups slots by category, places them in rows of max 5
// Preserves relative X preference from POS_X
function autoLayout(slots){
  const groups = {gk:[],df:[],mf:[],fw:[]};
  slots.forEach((s,i)=>{ const g=POS_GROUP[s.pos]||"mf"; groups[g].push({s,i}); });

  Object.entries(groups).forEach(([g, items])=>{
    if(!items.length)return;
    const n=items.length;
    if(n<=5){
      // single row — space evenly, honour POS_X hints for left/right
      layoutRow(items, GRP_Y[g]);
    } else {
      // split into chunks of max 5
      // try to split evenly: ceil(n/2) + floor(n/2)
      const split = Math.ceil(n/2);
      const row1=items.slice(0,split>5?5:split);
      const row2=items.slice(row1.length);
      // more players = closer to goal → row1 deeper, row2 higher
      layoutRow(row1, GRP_Y[g]);
      layoutRow(row2, GRP_Y2[g]);
      // if still >5 in one row (shouldn't happen with 11 players)
      if(row2.length>5){
        const row3=row2.splice(5);
        layoutRow(row2, GRP_Y2[g]);
        layoutRow(row3, (GRP_Y[g]+GRP_Y2[g])/2);
      }
    }
  });
  return slots;
}

// Layout only ONE slot (active) — leave others untouched
function layoutSlot(i){
  // Relayout entire group of the changed slot
  const grp = POS_GROUP[slots[i].pos]||"mf";
  layoutGroup(grp);
  // Also relayout previous group if pos changed
  slots.forEach((s,j)=>{
    const g = POS_GROUP[s.pos]||"mf";
    if(g !== grp) layoutGroup(g);
  });
}

function layoutGroup(grp){
  // Get all slots in this group, sorted by POS_X preference
  const items = slots
    .map((s,i)=>({s,i}))
    .filter(({s})=>(POS_GROUP[s.pos]||"mf")===grp);

  if(!items.length) return;

  // Separate into: left-side, centre, right-side by POS_X
  const L = items.filter(({s})=>(POS_X[s.pos]||.5) <  .35);
  const C = items.filter(({s})=>{const p=POS_X[s.pos]||.5; return p>=.35&&p<=.65;});
  const R = items.filter(({s})=>(POS_X[s.pos]||.5) >  .65);

  // Place left column — stack vertically from base Y
  L.forEach(({s},j)=>{
    s.x = POS_X[s.pos]||.12;
    s.y = (GRP_Y[grp]||.5) + (POS_Y_OFFSET[s.pos]||0) + j*.07;
  });

  // Place right column — stack vertically from base Y
  R.forEach(({s},j)=>{
    s.x = POS_X[s.pos]||.88;
    s.y = (GRP_Y[grp]||.5) + (POS_Y_OFFSET[s.pos]||0) + j*.07;
  });

  // Place centre — spread horizontally
  const cn = C.length;
  const spread = cn<=1?0 : cn===2?.32 : cn===3?.52 : cn===4?.66 : .76;
  C.forEach(({s},j)=>{
    s.x = cn===1 ? .50 : (.5-spread/2) + j*spread/(cn-1);
    s.y = (GRP_Y[grp]||.5) + (POS_Y_OFFSET[s.pos]||0);
  });
}

// Fine Y offset per position (relative to group base Y)
// positive = lower on pitch (closer to goal), negative = higher (closer to opponent)
const POS_Y_OFFSET = {
  // Defenders
  RWB:-.05, LWB:-.05,  // wing backs push higher than regular backs
  SW: .06,             // sweeper sits deepest
  // Midfielders
  DM: .06,             // defensive mid sits deeper
  CM: .00,             // central mid = base line
  AM:-.06,             // attacking mid pushes higher
  RM: .00, LM: .00,    // wide mids = base line
  RW:-.05, LW:-.05,    // wingers push higher
  // Forwards
  ST:-.04,             // striker pushes highest
  SS: .03,             // second striker slightly deeper
};

function layoutRow(items, y){
  const n=items.length;
  // Sort by POS_X preference
  items.sort((a,b)=>(POS_X[a.s.pos]||.5)-(POS_X[b.s.pos]||.5));
  const spread = n===1 ? 0 : n===2 ? .36 : n===3 ? .56 : n===4 ? .70 : .78;
  const left = .5 - spread/2;

  // Count side-pinned vs centre items
  const leftPinned  = items.filter(({s})=>(POS_X[s.pos]||.5)<.40);
  const rightPinned = items.filter(({s})=>(POS_X[s.pos]||.5)>.60);
  const centre      = items.filter(({s})=>{const px=POS_X[s.pos]||.5; return px>=.40&&px<=.60;});

  // Distribute centre items evenly
  const cn = centre.length;
  centre.forEach(({s},j)=>{
    const cspread = cn<=2 ? .32 : cn<=3 ? .50 : .60;
    const cleft = .5 - cspread/2;
    s.x = cn===1 ? .50 : cleft + j*cspread/(cn-1);
    s.y = y + (POS_Y_OFFSET[s.pos]||0);
  });

  // Left/Right pinned — use exact POS_X for each position
  leftPinned.forEach(({s})=>{
    s.x = POS_X[s.pos]||.15;
    s.y = y + (POS_Y_OFFSET[s.pos]||0);
  });
  rightPinned.forEach(({s})=>{
    s.x = POS_X[s.pos]||.85;
    s.y = y + (POS_Y_OFFSET[s.pos]||0);
  });

  // Anti-overlap: push apart any dots closer than min distance
  const allItems = [...leftPinned, ...centre, ...rightPinned];
  const minDist = 0.14;
  for(let pass=0; pass<3; pass++){
    for(let a=0; a<allItems.length; a++){
      for(let b=a+1; b<allItems.length; b++){
        const sa=allItems[a].s, sb=allItems[b].s;
        const dx=sa.x-sb.x, dy=(sa.y-sb.y)*1.5;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<minDist && dist>0){
          const push=(minDist-dist)/2;
          const nx=dx/dist*push, ny=dy/dist*push/1.5;
          sa.x+=nx; sa.y+=ny;
          sb.x-=nx; sb.y-=ny;
          // clamp
          sa.x=Math.max(.05,Math.min(.95,sa.x));
          sb.x=Math.max(.05,Math.min(.95,sb.x));
        }
      }
    }
  }
}

// Always start fresh - uniform grid, NO autoLayout on init
let slots = makeDefault();
let active=null;
let xiStartTime=null; // timer starts on first interaction
let captainIdx=null;  // slot index of captain (null = no captain yet)
let selectingCaptain=false; // when true, tapping a dot selects captain instead of opening modal
let lastChem=null;   // cached result of last chemistry calculation (for locked screen + share)

function save(){} // disabled

// ══════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════
function render(){
  const canvas=document.getElementById("pitch");
  drawPitch(canvas);
  const wrap=document.getElementById("wrap");
  const existing=wrap.querySelectorAll(".pdot");

  // Only recreate if count changed
  if(existing.length !== slots.length){
    existing.forEach(e=>e.remove());
    slots.forEach((_,i)=>{ wrap.appendChild(makeDot(i)); });
  }

  // Update positions — CSS transition animates the move
  slots.forEach((s,i)=>{
    if(!s) return;
    const el=wrap.querySelector('[data-idx="'+i+'"]');
    if(!el) return;
    updateDot(el,s,i);
  });
}

function makeDot(i){
  const el=document.createElement("div");
  el.className="pdot";
  el.dataset.idx=i;
  el.innerHTML='<div class="pcircle"></div><div class="pname"></div>';

  // Simple tap handler — use 'click' event directly. No custom drag logic.
  // Mobile browsers handle click correctly after a tap, and the modal
  // backdrop ignore-next-click flag handles the ghost click bug.
  el.addEventListener("click", e=>{
    e.stopPropagation();
    if(selectingCaptain){
      const s=slots[i];
      if(s && s.name && s.name.trim()) assignCaptain(i);
    } else if(window.isBlindDraftSession){
      handleBlindSlotClick(i);
    } else {
      openSlotModal(i);
    }
  });

  return el;
}

function updateDot(el,s,i){
  if(!el||!s)return;
  const grp=POS_GROUP[s.pos]||"mf";
  const filled=!!(s.name&&s.name.trim());
  let cls=`pdot grp-${grp} ${filled?"filled":"empty"}`;
  if(i===captainIdx) cls+=" captain";
  if(selectingCaptain){
    if(filled) cls+=" cap-select-eligible";
    else       cls+=" cap-select-dim";
  }
  // Preserve chemistry highlight classes — these are added by
  // highlightChemDots and must survive a re-render.
  const chemClasses = ["chem-era","chem-club","chem-both","chem-1966"];
  chemClasses.forEach(c=>{
    if(el.classList.contains(c)) cls += " " + c;
  });
  el.className=cls;
  el.style.left=s.x*100+"%";
  el.style.top =s.y*100+"%";
  const c=el.querySelector(".pcircle");
  const n=el.querySelector(".pname");
  if(!c||!n)return;
  c.textContent = filled ? s.num : s.pos;
  // Show only surname for readability
  if(filled){
    const parts = s.name.split(" ");
    n.textContent = parts[parts.length-1]; // last word = surname
  } else {
    n.textContent = "";
  }
}

// ══════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════
function openSlotModal(i){
  // Start timer on first interaction
  if(!xiStartTime) xiStartTime = Date.now();
  active=i;
  const s=slots[i];
  document.getElementById("mpos").value=s.pos;
  const inp = document.getElementById("mname");
  inp.value = s.name;
  document.getElementById("mnum").value=s.num;
  document.getElementById("mconfirm").textContent="";
  const modal = document.getElementById("modal");
  modal.classList.add("on");
  // Ignore the ghost click from the tap that opened us
  modal.dataset.ignoreNextClick = "1";
  modal.dataset.openedAt = String(Date.now());
  // Focus input — must be synchronous in the user gesture for mobile keyboard
  if(inp) inp.focus();
}
function closeSlotModal(){ document.getElementById("modal").classList.remove("on"); active=null; }

// Backdrop click handler — ignores the first click after open (ghost-click
// protection) and any click within 400ms of open as a backup
function modalBackdropClick(e){
  if(e.target !== e.currentTarget) return;
  const modal = e.currentTarget;
  if(modal.dataset.ignoreNextClick === "1"){
    modal.dataset.ignoreNextClick = "0";
    return;
  }
  const openedAt = parseInt(modal.dataset.openedAt || '0', 10);
  if(Date.now() - openedAt < 400) return;
  closeSlotModal();
}

function onPosChange(){
  if(active===null)return;
  const newPos=document.getElementById("mpos").value;

  // number rule
  const numEl=document.getElementById("mnum");
  if(newPos==="GK" && parseInt(numEl.value)>1) numEl.value=1;
  else if(newPos!=="GK" && parseInt(numEl.value)===1) numEl.value=2;

  slots[active].pos=newPos;

  // Only update color/label of this dot — no repositioning
  const wrap2=document.getElementById("wrap");
  const el=wrap2.querySelector('[data-idx="'+active+'"]');
  if(el) updateDot(el,slots[active],active);
}

function onNameInput(){
  const val = document.getElementById("mname").value.trim();
  const el  = document.getElementById("mconfirm");
  if(val.length < 2){ el.textContent=""; return; }

  const found = findPlayer(val);
  if(found){
    el.textContent = "✓ " + found.n;
    el.style.color = "var(--green)";
    return;
  }

  // Check if multiple share this surname — prompt for first name
  const words = norm(val).split(" ");
  if(words.length === 1){
    const all = findAllBySurname(val);
    if(all.length > 1){
      el.textContent = "⚠ ADD FIRST NAME";
      el.style.color = "var(--gold)";
      return;
    }
  }

  el.textContent = val.length >= 3 ? "✗ NOT IN DATABASE" : "";
  el.style.color = "var(--red)";
}

function saveSlot(){
  if(active===null)return;
  const raw=document.getElementById("mname").value.trim();
  const newPos=document.getElementById("mpos").value;
  let num=parseInt(document.getElementById("mnum").value)||slots[active].num;

  // number 1 only for GK
  if(newPos!=="GK" && num===1){
    toast("⚠ #1 IS FOR GK ONLY","warn"); return;
  }
  // check duplicate numbers
  const dupNum=slots.some((s,i)=>i!==active && s.num===num && s.name);
  if(dupNum){ toast("⚠ NUMBER "+num+" ALREADY USED","warn"); return; }

  // check duplicate players
  const found2=findPlayer(raw);
  if(found2){
    const dupPlayer=slots.some((s,i)=>i!==active && s.dbName===found2.n);
    if(dupPlayer){ toast("⚠ "+found2.n.toUpperCase()+" ALREADY IN YOUR XI","warn"); return; }
  }

  if(!raw){ clearSlot(); return; }
  const found=findPlayer(raw);
  if(!found){
    // Check if it's an ambiguous surname
    const words2 = norm(raw).split(" ");
    if(words2.length===1 && findAllBySurname(raw).length>1){
      toast("⚠ ADD FIRST NAME","warn");
      return;
    }
    toast("✗ NOT IN DATABASE","err");
    return;
  }
  slots[active].pos=newPos;
  slots[active].num=num;
  slots[active].name=found.n.toUpperCase();
  slots[active].dbName=found.n;

  // ─── XI as discovery path ───────────────────────────────────────
  // Adding a player here also adds them to the collection, same as if
  // they were found in the quiz. Two paths to discovery now exist:
  // quiz (KICK OFF) and XI builder (MY LEGENDARY XI).
  // addDiscovered() returns true only on NEW discoveries — re-saves
  // and swaps of already-discovered players return false silently,
  // so there's no toast spam when experimenting with formations.
  const prevCount = getDiscoveredCount();
  const isNewDiscovery = addDiscovered(found.n);
  const newBadge = isNewDiscovery ? checkBadgeMilestone(prevCount, prevCount + 1) : null;

  // Capture previous chem state before recalculating, so we can show
  // what changed (new bonuses) and count up from old score.
  const prevScore = (lastChem && typeof lastChem.score === "number") ? lastChem.score : 0;
  const prevBreakdown = (lastChem && lastChem.breakdown) ? lastChem.breakdown.slice() : [];

  const savedIdx = active;
  save(); updateCounter();
  const savedName = slots[active].name;
  closeSlotModal(); render();
  // Update chem highlights IMMEDIATELY after render so they appear on the
  // dots before any side-effects (toast, vibrate) that could delay paint
  livePreview();
  // Visual celebration — flash new dot, pulse linked dots, popup, count-up
  celebrateSlotAdd(savedIdx, prevScore, prevBreakdown);
  // Micro-vibrate on success
  if(navigator.vibrate) navigator.vibrate(20);

  // ─── Discovery feedback (XI as collection path) ─────────────────
  // Hierarchy: tier upgrade > new discovery > nothing.
  // Larger reward always consumes the smaller one — no toast stacking.
  if(newBadge){
    setTimeout(()=>showLevelUpToast(newBadge), 800);
  } else if(isNewDiscovery){
    setTimeout(()=>toast("⭐ NEW LEGEND DISCOVERED",""), 800);
  }
  // Re-check XI unlock flag (Hall of Fame XI tab + first_seen pulse rely on it)
  checkXIUnlock();

  if(raw) toast("✓ "+savedName,"");
}

function clearSlot(){
  if(active===null)return;
  slots[active].name=""; slots[active].dbName="";
  if(captainIdx === active) captainIdx = null;
  save(); closeSlotModal(); render(); updateCounter();
  livePreview();
}

// INIT

// ══════════════════════════════════════════
// FORMATIONS
// ══════════════════════════════════════════
const FORMATIONS = {
  '442': [
    {pos:"GK", x:.50,y:.90},{pos:"RB",x:.88,y:.68},{pos:"CB",x:.62,y:.68},
    {pos:"CB",x:.38,y:.68},{pos:"LB",x:.12,y:.68},
    {pos:"RM",x:.88,y:.46},{pos:"CM",x:.62,y:.46},{pos:"CM",x:.38,y:.46},{pos:"LM",x:.12,y:.46},
    {pos:"ST",x:.62,y:.20},{pos:"ST",x:.38,y:.20}
  ],
  '433': [
    {pos:"GK",x:.50,y:.90},{pos:"RB",x:.88,y:.68},{pos:"CB",x:.62,y:.68},
    {pos:"CB",x:.38,y:.68},{pos:"LB",x:.12,y:.68},
    {pos:"RM",x:.78,y:.46},{pos:"CM",x:.50,y:.46},{pos:"LM",x:.22,y:.46},
    {pos:"RW",x:.78,y:.20},{pos:"ST",x:.50,y:.18},{pos:"LW",x:.22,y:.20}
  ],
  '352': [
    {pos:"GK",x:.50,y:.90},{pos:"CB",x:.75,y:.68},{pos:"CB",x:.50,y:.68},{pos:"CB",x:.25,y:.68},
    {pos:"RM",x:.88,y:.46},{pos:"CM",x:.68,y:.46},{pos:"DM",x:.50,y:.52},{pos:"CM",x:.32,y:.46},{pos:"LM",x:.12,y:.46},
    {pos:"ST",x:.62,y:.20},{pos:"ST",x:.38,y:.20}
  ],
  '532': [
    {pos:"GK",x:.50,y:.90},
    {pos:"RWB",x:.93,y:.64},{pos:"CB",x:.72,y:.70},{pos:"CB",x:.50,y:.72},{pos:"CB",x:.28,y:.70},{pos:"LWB",x:.07,y:.64},
    {pos:"RM",x:.75,y:.46},{pos:"CM",x:.50,y:.46},{pos:"LM",x:.25,y:.46},
    {pos:"ST",x:.62,y:.20},{pos:"ST",x:.38,y:.20}
  ],
  '4231': [
    {pos:"GK",x:.50,y:.90},{pos:"RB",x:.88,y:.70},{pos:"CB",x:.62,y:.72},
    {pos:"CB",x:.38,y:.72},{pos:"LB",x:.12,y:.70},
    {pos:"DM",x:.62,y:.54},{pos:"DM",x:.38,y:.54},
    {pos:"RW",x:.80,y:.36},{pos:"AM",x:.50,y:.32},{pos:"LW",x:.20,y:.36},
    {pos:"ST",x:.50,y:.18}
  ],
  '343': [
    {pos:"GK",x:.50,y:.90},{pos:"CB",x:.75,y:.70},{pos:"CB",x:.50,y:.72},{pos:"CB",x:.25,y:.70},
    {pos:"RM",x:.88,y:.48},{pos:"CM",x:.62,y:.48},{pos:"CM",x:.38,y:.48},{pos:"LM",x:.12,y:.48},
    {pos:"RW",x:.78,y:.20},{pos:"ST",x:.50,y:.18},{pos:"LW",x:.22,y:.20}
  ]
};

function setFormation(key){
  const f = FORMATIONS[key];
  if(!f) return;
  // Apply formation positions and positions, keep names
  f.forEach((fp,i)=>{
    if(slots[i]){
      slots[i].pos = fp.pos;
      slots[i].x   = fp.x;
      slots[i].y   = fp.y;
    }
  });
  // Highlight active button
  document.querySelectorAll('#formation-btns button').forEach(b=>{
    const active = b.textContent.replace(/-/g,'') === key ||
                   b.textContent === key.replace(/(\d)(\d)(\d)/,'$1-$2-$3') ||
                   b.textContent === key.replace(/(\d)(\d)(\d)(\d)/,'$1-$2-$3-$4') ||
                   b.textContent === key.replace('442','4-4-2').replace('433','4-3-3')
                     .replace('352','3-5-2').replace('532','5-3-2')
                     .replace('4231','4-2-3-1').replace('343','3-4-3');
    b.style.borderColor = active ? 'var(--green)' : '#333';
    b.style.color       = active ? 'var(--green)' : '#888';
  });
  render();
  livePreview();
}


// ══════════════════════════════════════════
// CHEMISTRY SYSTEM
// ══════════════════════════════════════════

const SQUAD_1966 = [
  "gordon banks","gordon west","ron springett",
  "george cohen","ray wilson","bobby moore","jack charlton","nobby stiles",
  "roger hunt","bobby charlton","geoff hurst","martin peters",
  "alan ball","jimmy greaves","terry paine","ian callaghan",
  "john connelly","peter bonetti","ron flowers","norman hunter",
  "gerry byrne","keith newton"
];

function chemNorm(s){ return s.toLowerCase().trim(); }

// ══════════════════════════════════════════
// CAPTAIN
// ══════════════════════════════════════════
function beginCaptainSelect(){
  const filled = slots.filter(s=>s.name && s.dbName).length;
  if(filled < 11){ toast("COMPLETE YOUR XI FIRST","warn"); return; }
  selectingCaptain = true;
  // Hide chemistry results while choosing
  const cr=document.getElementById('chem-results'); if(cr) cr.style.display='none';
  document.querySelectorAll(".pdot").forEach(el=>el.classList.remove("chem-era","chem-club","chem-both","chem-1966"));
  render();
  updateCaptainBtn();
  toast("TAP A PLAYER TO MAKE CAPTAIN","");
}

function cancelCaptainSelect(){
  selectingCaptain = false;
  render();
  updateCaptainBtn();
}

function assignCaptain(i){
  captainIdx = i;
  selectingCaptain = false;
  render();
  updateCaptainBtn();
  const nm = (slots[i].name||"").split(" ");
  toast("⚡ "+(nm[nm.length-1]||"CAPTAIN").toUpperCase()+" IS CAPTAIN","");
  livePreview();
}

function updateCaptainBtn(){
  const btn = document.getElementById("cap-btn");
  if(!btn) return;
  const filled = slots.filter(s=>s.name && s.dbName).length;

  if(filled < 11){
    // Hidden until XI is complete
    btn.style.display = "none";
    return;
  }
  btn.style.display = "block";

  if(selectingCaptain){
    btn.textContent = "✕ CANCEL CAPTAIN SELECT";
    btn.onclick = cancelCaptainSelect;
    btn.style.borderColor = "#666";
    btn.style.color = "#aaa";
  } else if(captainIdx !== null && slots[captainIdx] && slots[captainIdx].name){
    const nm = slots[captainIdx].name.split(" ");
    const surname = nm[nm.length-1] || "";
    btn.textContent = "⚡ CAPTAIN: " + surname + " (TAP TO CHANGE)";
    btn.onclick = beginCaptainSelect;
    btn.style.borderColor = "var(--gold)";
    btn.style.color = "var(--gold)";
  } else {
    btn.textContent = "⚡ SELECT CAPTAIN";
    btn.onclick = beginCaptainSelect;
    btn.style.borderColor = "var(--gold)";
    btn.style.color = "var(--gold)";
  }
}

// Live chemistry preview — recalculate whenever the XI changes
function livePreview(){
  if(typeof calculateChemistry === "function") calculateChemistry({live:true});
}

// Celebration after adding a player — flash dot + pulse linked + popup + count-up score.
// Called from saveSlot AFTER livePreview so lastChem is current.
function celebrateSlotAdd(newIdx, prevScore, prevBreakdown){
  const wrap = document.getElementById("wrap");
  if(!wrap) return;
  const newDot = wrap.querySelector('[data-idx="'+newIdx+'"]');

  // Detect new bonuses (diff vs previous breakdown)
  let newLines = [];
  if(lastChem && prevBreakdown){
    const prevSet = new Set(prevBreakdown);
    newLines = lastChem.breakdown.filter(l => !prevSet.has(l));
  }
  const scoreDelta = lastChem ? (lastChem.score - (prevScore || 0)) : 0;
  // Big combo = 2+ new bonuses OR big single jump (8+ pts)
  const bigCombo = (newLines.length >= 2) || (scoreDelta >= 8);

  // ── LAYER 1a: flash the new dot (0.25s) ──
  if(newDot){
    newDot.classList.remove("just-added");
    void newDot.offsetWidth;
    newDot.classList.add("just-added");
    setTimeout(()=>newDot && newDot.classList.remove("just-added"), 260);
  }

  // ── LAYER 1b: pulse any dot linked to the new one (0.4s) ──
  if(newDot){
    const chemClasses = ["chem-era","chem-club","chem-both","chem-1966"];
    const newHasChem = chemClasses.some(c => newDot.classList.contains(c));
    if(newHasChem){
      wrap.querySelectorAll(".pdot").forEach(el=>{
        if(el === newDot) return;
        const shares = chemClasses.some(c => el.classList.contains(c) && newDot.classList.contains(c));
        if(shares){
          el.classList.remove("chem-linked-pulse");
          void el.offsetWidth;
          el.classList.add("chem-linked-pulse");
          setTimeout(()=>el && el.classList.remove("chem-linked-pulse"), 420);
        }
      });
    }
  }

  // ── LAYER 2: popup diff of new bonuses vs previous ──
  if(newLines.length){
    showChemPopup(newLines.slice(0, 3), bigCombo);
  }

  // ── LAYER 3: count-up score (300ms) ──
  if(lastChem){
    animateScoreCountUp(prevScore || 0, lastChem.score);
  }

  // ── BIG COMBO: screen shake ──
  if(bigCombo){
    wrap.classList.remove("shake");
    void wrap.offsetWidth;
    wrap.classList.add("shake");
    setTimeout(()=>wrap && wrap.classList.remove("shake"), 360);
  }
}

function showChemPopup(lines, bigCombo){
  const pop = document.getElementById("chem-popup");
  if(!pop) return;
  pop.innerHTML = "";
  lines.forEach(text=>{
    const m = text.match(/^([^:]+):\s*\+(\d+)/);
    const short = m ? ("+" + m[2] + "  " + shortenBonusLabel(m[1])) : text;
    const line = document.createElement("div");
    line.className = "chem-pop-line" + (bigCombo ? " big-combo" : "");
    line.textContent = short;
    if(text.includes("1966")) line.style.color = "#ffd700";
    else if(text.includes("CLUB")) line.style.color = "#00ddff";
    else if(text.includes("ERA")) line.style.color = "#bbbbbb";
    else if(text.includes("CAPTAIN")) line.style.color = "#ffd700";
    else line.style.color = "#00ff88";
    pop.appendChild(line);
  });
  pop.classList.add("on");
  setTimeout(()=>pop.classList.remove("on"), 2500);
}

function shortenBonusLabel(raw){
  // "CLUB LINKS — 2x CHELSEA(x1)" -> "CLUB LINK (CHELSEA)"
  // "ERA COHESION (6/11 GOLDEN x1)" -> "ERA (GOLDEN)"
  // "CAPTAIN — MOORE (1966 CAPTAIN)" -> "CAPTAIN (MOORE)"
  const capMatch = raw.match(/CAPTAIN\s*[—-]\s*(\w+)/i);
  if(capMatch) return "CAPTAIN (" + capMatch[1] + ")";
  const eraMatch = raw.match(/(CLASSICS|GOLDEN|MODERN)/i);
  if(eraMatch) return "ERA (" + eraMatch[1].toUpperCase() + ")";
  const clubMatch = raw.match(/\b(MAN UTD|CHELSEA|ARSENAL|LIVERPOOL|MAN CITY|TOTTENHAM|EVERTON|LEEDS|NEWCASTLE|ASTON VILLA|WEST HAM|LEICESTER)\b/i);
  if(clubMatch) return "CLUB LINK (" + clubMatch[1].toUpperCase() + ")";
  if(/1966/.test(raw)) return "1966 LEGEND";
  return raw.trim().slice(0, 24);
}

function animateScoreCountUp(from, to){
  const el = document.getElementById("chem-score");
  if(!el) return;
  const complete = (lastChem && lastChem.complete);
  const suffix = complete ? " pts" : (" pts · " + (lastChem ? lastChem.filledCount : "") + "/11");
  if(from === to){
    el.textContent = to + suffix;
    return;
  }
  const duration = 600;
  const start = performance.now();
  function step(now){
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    const val = Math.round(from + (to - from) * eased);
    el.textContent = val + suffix;
    if(t < 1) requestAnimationFrame(step);
    else {
      el.style.transform = "scale(1.15)";
      setTimeout(()=>{ el.style.transition = "transform .2s ease"; el.style.transform = "scale(1)"; }, 60);
    }
  }
  requestAnimationFrame(step);
}

function formatXITime(){
  if(!xiStartTime) return null;
  const secs = Math.floor((Date.now() - xiStartTime) / 1000);
  const m = Math.floor(secs/60);
  const s = secs % 60;
  if(m===0) return s + " SEC";
  if(s===0) return m + " MIN";
  return m + " MIN " + s + " SEC";
}

function calculateChemistry(opts){
  opts = opts || {};
  const live = !!opts.live;
  const filled = slots.filter(s=>s.name && s.dbName);

  // In non-live (button press) mode, show warning if incomplete
  if(!live && filled.length < 11){ toast("COMPLETE YOUR XI FIRST","warn"); return; }

  // In live mode with 0 filled, just hide results and bail
  if(live && filled.length === 0){
    const cr=document.getElementById("chem-results");
    if(cr) cr.style.display="none";
    document.querySelectorAll(".pdot").forEach(el=>el.classList.remove("chem-era","chem-club","chem-both","chem-1966"));
    return;
  }

  // ── BUILD PLAYER DATA ──
  const players = filled.map(s=>{
    const p = DB.find(d=>d.n===s.dbName);
    return {
      name: s.dbName,
      normName: chemNorm(s.dbName),
      pos: s.pos,
      grp: POS_GROUP[s.pos]||"mf",
      era: p ? p.e : "G",
      clubs: p ? (p.c||[]) : [],
      primary: p && p.c && p.c[0] ? p.c[0] : "",
      is1966: SQUAD_1966.includes(chemNorm(s.dbName)),
      slotIdx: slots.findIndex(sl=>sl.dbName===s.dbName)
    };
  });

  // Club size tiers for rarity multiplier
  const TOP6 = ["man utd","arsenal","chelsea","liverpool","man city","tottenham"];
  const MID  = ["everton","newcastle","leeds","aston villa","west ham","blackburn",
                "nottingham forest","leicester","sunderland","middlesbrough","wolves"];
  function clubMult(club){
    if(!club) return 1;
    if(TOP6.includes(club)) return 1.0;
    if(MID.includes(club))  return 1.4;
    return 2.0; // small club
  }

  // Era rarity multipliers (based on DB proportions)
  const ERA_MULT = {C:1.5, G:1.0, M:1.4};

  let score = 0;
  const breakdown = [];

  // ── 1. ERA COHESION (max 30) ──
  const eraCounts = {C:0,G:0,M:0};
  players.forEach(p=> eraCounts[p.era]=(eraCounts[p.era]||0)+1);
  const dominantEra = Object.entries(eraCounts).sort((a,b)=>b[1]-a[1])[0];
  const dominantCount = dominantEra[1];
  const eraName = {C:"CLASSIC",G:"GOLDEN",M:"MODERN"}[dominantEra[0]];
  const eraMult = ERA_MULT[dominantEra[0]]||1;
  const eraPts = Math.min(30, Math.round((dominantCount/11)*30*eraMult));
  score += eraPts;
  breakdown.push("ERA COHESION (" + dominantCount + "/11 " + eraName + " x" + eraMult + "): +" + eraPts);

  // ── 2. CLUB CONNECTIONS (max 30) ──
  const clubGroups = {};
  players.forEach(p=>{
    if(p.primary){
      if(!clubGroups[p.primary]) clubGroups[p.primary]=[];
      clubGroups[p.primary].push(p.name);
    }
  });
  let clubPts = 0;
  const clubBonuses = [];
  Object.entries(clubGroups).forEach(([club,names])=>{
    if(names.length>=2){
      const pairs = names.length*(names.length-1)/2; // combinatorial pairs
      const mult = clubMult(club);
      const pts = Math.round(pairs * 4 * mult);
      clubPts += pts;
      clubBonuses.push(names.length + "x " + club.toUpperCase() + "(x" + mult + ")");
    }
  });
  const finalClubPts = Math.min(30, clubPts);
  score += finalClubPts;
  if(clubBonuses.length) breakdown.push("CLUB LINKS — " + clubBonuses.join(", ") + ": +" + finalClubPts);

  // ── 3. 1966 BONUS (max 25) ──
  const count1966 = players.filter(p=>p.is1966).length;
  // Check correct positions for 1966 players
  const POS_1966 = {
    "gordon banks":"GK","gordon west":"GK","ron springett":"GK",
    "george cohen":"RB","ray wilson":"LB","bobby moore":"CB","jack charlton":"CB",
    "nobby stiles":"CM","roger hunt":"ST","bobby charlton":"CM","geoff hurst":"ST",
    "martin peters":"MF","alan ball":"MF","jimmy greaves":"ST","terry paine":"MF",
    "ian callaghan":"MF","john connelly":"MF","peter bonetti":"GK","ron flowers":"DF",
    "norman hunter":"DF","gerry byrne":"DF","keith newton":"DF"
  };
  let correctPos1966 = 0;
  players.filter(p=>p.is1966).forEach(p=>{
    const histPos = POS_1966[p.normName];
    const grp = POS_GROUP[p.pos]||"mf";
    if(histPos){
      if(histPos===p.pos || (histPos==="DF"&&grp==="df") || (histPos==="MF"&&grp==="mf")) correctPos1966++;
    }
  });
  let pts1966 = 0;
  if(count1966>=1) pts1966 = count1966*2; // 2pts each
  if(count1966>=3) pts1966 += 2;   // bonus for 3+
  if(count1966>=6) pts1966 += 3;   // bonus for 6+
  if(count1966>=8) pts1966 += 4;   // bonus for 8+
  if(count1966===11) pts1966 += 6; // full squad bonus
  pts1966 += correctPos1966;       // +1 per correct position
  pts1966 = Math.min(25, pts1966);
  score += pts1966;
  if(count1966>0) breakdown.push("1966 LEGENDS (" + count1966 + " players, " + correctPos1966 + " correct pos): +" + pts1966);

  // ── 4. CAPTAIN BONUS (max 20) ──
  let captainPts = 0;
  let captainLabel = "";
  if(captainIdx !== null && slots[captainIdx] && slots[captainIdx].dbName){
    const capSlot = slots[captainIdx];
    const capPlayer = players.find(p=>p.name===capSlot.dbName);
    if(capPlayer){
      // Find dominant club (club with most players in XI, min 2)
      let dominantClub = null, dominantClubCount = 0;
      Object.entries(clubGroups).forEach(([club, names])=>{
        if(names.length >= 2 && names.length > dominantClubCount){
          dominantClub = club;
          dominantClubCount = names.length;
        }
      });
      // Count how many players share captain's primary club
      const shareClub = capPlayer.primary
        ? players.filter(p=>p.primary===capPlayer.primary).length
        : 1;

      let baseReason = "";
      if(capPlayer.is1966){
        captainPts = 15;
        baseReason = "1966 CAPTAIN";
      } else if(dominantClub && capPlayer.primary === dominantClub){
        captainPts = 12;
        baseReason = "LEADS " + dominantClub.toUpperCase() + " CORE";
      } else if(shareClub === 1 && capPlayer.primary){
        captainPts = 10;
        baseReason = "BRAVE SOLO — " + capPlayer.primary.toUpperCase();
      } else {
        captainPts = 5;
        baseReason = "STEADY SKIPPER";
      }
      // Halve if GK captain
      if(capPlayer.pos === "GK"){
        captainPts = Math.round(captainPts / 2);
        baseReason += " (GK)";
      }
      const capSurname = capSlot.name.split(" ").slice(-1)[0];
      captainLabel = "CAPTAIN — " + capSurname.toUpperCase() + " (" + baseReason + ")";
    }
  } else {
    captainLabel = "NO CAPTAIN";
  }
  score += captainPts;
  if(captainPts > 0) breakdown.push(captainLabel + ": +" + captainPts);

  // ── 5. BALANCE BONUS (max 10) ──
  const grpCounts = {gk:0,df:0,mf:0,fw:0};
  players.forEach(p=> grpCounts[p.grp]=(grpCounts[p.grp]||0)+1);
  let balancePts = 0;
  if(grpCounts.gk>=1) balancePts+=2;
  if(grpCounts.df>=3) balancePts+=2;
  if(grpCounts.mf>=2) balancePts+=2;
  if(grpCounts.fw>=1) balancePts+=2;
  if(grpCounts.gk>=1 && grpCounts.df>=3 && grpCounts.mf>=2 && grpCounts.fw>=1) balancePts+=2; // all groups present
  score += balancePts;
  if(balancePts > 0) breakdown.push("TEAM BALANCE: +" + balancePts);

  // ── 6. UNDERDOG BONUS (max 15) ──
  // Mutual exclusion: only if no club connections
  let underdogPts = 0;
  if(finalClubPts === 0){
    const top6Count = players.filter(p=>TOP6.includes(p.primary)).length;
    const uniqueClubs = new Set(players.map(p=>p.primary).filter(Boolean)).size;
    if(top6Count===0 && uniqueClubs>=7) underdogPts=15;
    else if(top6Count===0 && uniqueClubs>=5) underdogPts=10;
    else if(top6Count===0) underdogPts=6;
    else if(top6Count<=2) underdogPts=3;
    if(underdogPts>0) breakdown.push("UNDERDOG SPIRIT (" + top6Count + " TOP6, " + uniqueClubs + " clubs): +" + underdogPts);
  }
  score += underdogPts;

  // ── 7. SPECIAL COMBO (max 20) ──
  const nm = players.map(p=>p.normName);
  const has = (...names) => names.every(n=>nm.includes(chemNorm(n)));
  const hasN = (n,...names) => names.filter(name=>nm.includes(chemNorm(name))).length>=n;

  let specialTitle = null;
  let comboPts = 0;

  // TIER 1 — 20pts
  if(count1966===11){
    specialTitle="RAMSEY'S WINGLESS WONDERS"; comboPts=20;
  } else if(count1966>=8){
    specialTitle="RAMSEY'S WINGLESS WONDERS"; comboPts=18;
  } else if(hasN(3,"Paul Scholes","Nicky Butt","David Beckham","Gary Neville","Phil Neville")){
    specialTitle="CLASS OF 92"; comboPts=20;
  } else if(hasN(3,"Tony Adams","Lee Dixon","Nigel Winterburn","Steve Bould","Martin Keown")){
    specialTitle="ADAMS' BACK FOUR"; comboPts=18;
  } else if(has("Bobby Moore","Geoff Hurst","Martin Peters")){
    specialTitle="ACADEMY OF FOOTBALL"; comboPts=18;
  }
  // TIER 2 — 12pts
  else if(hasN(3,"John Terry","Frank Lampard","Ashley Cole","Wayne Bridge","Gary Cahill")){
    specialTitle="TERRY & LAMPARD ERA"; comboPts=12;
  } else if(hasN(3,"Steven Gerrard","Jamie Carragher","Michael Owen","Emile Heskey","Robbie Fowler")){
    specialTitle="GERRARD'S LIVERPOOL"; comboPts=12;
  } else if(has("Alan Shearer","Peter Beardsley","Les Ferdinand")){
    specialTitle="SHEARER'S TOON ARMY"; comboPts=12;
  } else if(has("Steven Gerrard","Frank Lampard","Paul Scholes")){
    specialTitle="THREE LIONS MIDFIELD"; comboPts=12;
  } else if(hasN(3,"Paul Gascoigne","Alan Shearer","David Seaman","Tony Adams","Stuart Pearce")){
    specialTitle="NEARLY MEN – EURO 96"; comboPts=12;
  } else if(has("Bryan Robson","Ray Wilkins","Mark Hughes")){
    specialTitle="CAPTAIN MARVEL'S UNITED"; comboPts=12;
  } else if(hasN(3,"Peter Shilton","Stuart Pearce","Des Walker","Neil Webb","Garry Birtles")){
    specialTitle="CLOUGH'S FOREST"; comboPts=12;
  } else if(count1966>=3){
    specialTitle="WORLD CHAMPIONS BACKBONE"; comboPts=8;
  }
  // TIER 3 — era/style based (5pts)
  else {
    const eras = Object.entries(eraCounts).filter(([,v])=>v>0).length;
    const top6Count2 = players.filter(p=>TOP6.includes(p.primary)).length;
    const uniqueClubs2 = new Set(players.map(p=>p.primary).filter(Boolean)).size;
    if(underdogPts>=15){
      specialTitle="THE UNDERDOGS"; comboPts=5;
    } else if(underdogPts>=10){
      specialTitle="TRUE FOOTBALL SCHOLAR"; comboPts=5;
    } else if(eras===3 && eraCounts.C>=2 && eraCounts.G>=2 && eraCounts.M>=2){
      specialTitle="MIXED ERAS – ENGLISH CHAOS"; comboPts=3;
    } else if(dominantCount>=9 && dominantEra[0]==="M"){
      specialTitle="MODERN ENGLAND RISING"; comboPts=5;
    } else if(dominantCount>=9 && dominantEra[0]==="G"){
      specialTitle="GOLDEN GENERATION"; comboPts=5;
    } else if(dominantCount>=9 && dominantEra[0]==="C"){
      specialTitle="CLASSIC BACKBONE"; comboPts=5;
    } else if(dominantEra[0]==="C"){
      specialTitle="CLASSIC ENGLAND LEGENDS"; comboPts=3;
    } else if(dominantEra[0]==="M"){
      specialTitle="NEXT GENERATION"; comboPts=3;
    } else {
      specialTitle="ENGLAND'S FINEST"; comboPts=2;
    }
  }
  score += comboPts;
  breakdown.push("COMBO — " + specialTitle + ": +" + comboPts);

  // ── STAR RATING ──
  let stars = "";
  let starLabel = "";
  if(score>=116){     stars="🏆"; starLabel="WORLD CLASS"; }
  else if(score>=96){ stars="⭐⭐⭐⭐⭐"; starLabel="FOOTY LEGEND"; }
  else if(score>=76){ stars="⭐⭐⭐⭐"; starLabel="FOOTBALL EXPERT"; }
  else if(score>=56){ stars="⭐⭐⭐"; starLabel="TRUE SUPPORTER"; }
  else if(score>=36){ stars="⭐⭐"; starLabel="FOOTBALL FAN"; }
  else {              stars="⭐"; starLabel="PUB REGULAR"; }

  // ── SHOW RESULTS ──
  const complete = filled.length === 11;
  const col = !complete ? "#888"
              : score>=96 ? "var(--green)"
              : score>=76 ? "var(--gold)"
              : "var(--red)";

  // Cache for locked screen + share text
  const capSurname = (captainIdx!==null && slots[captainIdx] && slots[captainIdx].name)
    ? slots[captainIdx].name.split(" ").slice(-1)[0].toUpperCase() : "";
  lastChem = {
    score, stars, starLabel, specialTitle, breakdown: breakdown.slice(),
    complete, filledCount: filled.length, col,
    captainPts, captainLabel, capSurname,
    timeStr: formatXITime()
  };

  const scoreEl = document.getElementById("chem-score");
  scoreEl.textContent = complete ? (score + " pts") : (score + " pts · " + filled.length + "/11");
  scoreEl.style.color = col;
  document.getElementById("chem-bar").style.background = col;
  document.getElementById("chem-bar").style.width = Math.min(100,score/1.5)+"%";

  const titleHead = complete
    ? "<div style='font-size:16px;margin-bottom:6px'>" + stars + "</div>"
    : "<div style='font-size:7px;color:#888;letter-spacing:2px;margin-bottom:6px'>PROVISIONAL · BUILD IN PROGRESS</div>";

  document.getElementById("chem-title").innerHTML =
    titleHead +
    "<div>" + specialTitle + "</div>" +
    (complete
      ? "<div style='font-size:7px;color:#888;margin-top:4px;letter-spacing:2px'>" + starLabel + "</div>"
      : "");
  document.getElementById("chem-title").style.color = col;

  // Add time played
  const timeStr = formatXITime();
  const timeHtml = timeStr
    ? "<div style='font-size:7px;color:#666;letter-spacing:2px;margin-top:10px;text-align:center'>⏱ " + timeStr + "</div>"
    : "";
  document.getElementById("chem-breakdown").innerHTML =
    breakdown.map(b=>"• "+b).join("<br>") + timeHtml;

  const results = document.getElementById("chem-results");
  results.style.borderColor = col;
  results.style.display = "block";
  setTimeout(()=>{ document.getElementById("chem-bar").style.width = Math.min(100,score/1.5)+"%"; },100);

  highlightChemDots(players);

  // Only scroll into view on explicit (non-live) press
  if(!live) results.scrollIntoView({behavior:"smooth",block:"nearest"});
}

// ══════════════════════════════════════════
// LOCK IN → LOCKED RESULTS SCREEN
// ══════════════════════════════════════════
function lockInXI(){
  const filled = slots.filter(s=>s.name && s.dbName);
  if(filled.length < 11){ toast("COMPLETE YOUR XI FIRST","warn"); return; }
  try {
    calculateChemistry();
    if(!lastChem) return;
    // ALWAYS save score to XI leaderboard (custom + blind both go here)
    saveXIHof(lastChem, window.isBlindDraftSession ? 'blind' : 'custom');
    // If this is a blind draft session, also save to legacy blind HOF
    // AND unlock the XI builder if not yet unlocked
    if(window.isBlindDraftSession){
      saveBlindHof(lastChem);
      if(localStorage.getItem('fl_xi_unlocked') !== '1'){
        localStorage.setItem('fl_xi_unlocked', '1');
        localStorage.setItem('fl_xi_unlock_pending', '1');
      }
    }
    go('s-xi-locked');
  } catch(err){
    console.error("lockInXI error:", err);
    toast("LOCK IN FAILED — "+err.message,"err");
  }
}


// Spam-click protection (caught by user feedback A)
lockInXI = withLock(lockInXI, 1000);
// XI Leaderboard — unified for both custom-built and blind-draft XIs
function saveXIHof(chem, mode){
  try {
    const key = 'fl_xi_hof';
    const list = safeParse(localStorage.getItem(key), []);
    list.push({
      score: chem.score,
      title: chem.specialTitle,
      stars: chem.stars,
      mode: mode || 'custom',  // 'custom' or 'blind'
      ts: Date.now()
    });
    list.sort((a,b)=>b.score - a.score);
    const trimmed = list.slice(0, 20); // keep top 20
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch(e){
    console.error('saveXIHof error:', e);
  }
}

// Blind draft HOF — separate from classic HOF
function saveBlindHof(chem){
  try {
    const key = 'fl_blind_hof';
    const list = safeParse(localStorage.getItem(key), []);
    list.push({
      score: chem.score,
      title: chem.specialTitle,
      stars: chem.stars,
      ts: Date.now()
    });
    list.sort((a,b)=>b.score - a.score);
    const trimmed = list.slice(0, 20); // keep top 20
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch(e){}
}

function unlockXI(){
  go('s-xi');
  // Re-render to restore dots and live chemistry
  setTimeout(()=>{ render(); updateCounter(); livePreview(); }, 0);
}

function renderLockedScreen(){
  if(!lastChem) return;
  const c = lastChem;

  try {
    renderLockedPitch();
  } catch(e){ console.error("renderLockedPitch error:", e); }

  // Fill in all the result elements — guard each one
  const setText = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  const setHtml = (id, val) => { const el=document.getElementById(id); if(el) el.innerHTML=val; };
  const setStyle = (id, prop, val) => { const el=document.getElementById(id); if(el) el.style[prop]=val; };

  setText("locked-score", c.score);
  setText("locked-stars", c.stars);
  setText("locked-title", c.specialTitle);
  setStyle("locked-title", "color", c.col);
  setText("locked-starlabel", c.starLabel);
  setText("locked-big-score", c.score);
  setStyle("locked-big-score", "color", c.col);

  const capBar = document.getElementById("locked-captain");
  if(capBar){
    if(c.captainPts > 0 && c.capSurname){
      capBar.style.display = "block";
      capBar.innerHTML = "⚡ CAPTAIN " + c.capSurname + " · +" + c.captainPts + " PTS";
    } else {
      capBar.style.display = "none";
    }
  }

  setHtml("locked-breakdown", c.breakdown.map(b=>"• "+b).join("<br>"));
  setText("locked-time", c.timeStr ? "⏱ " + c.timeStr : "");
  setStyle("locked-badge", "borderColor", c.col);
  setStyle("locked-badge", "color", c.col);

  // Show NEW DRAFT only when locked in after a blind draft
  const newDraftBtn = document.getElementById("new-draft-btn");
  if(newDraftBtn){
    newDraftBtn.style.display = window.isBlindDraftSession ? "block" : "none";
  }
}

function renderLockedPitch(){
  const canvas = document.getElementById("pitch-locked");
  const wrap = document.getElementById("wrap-locked");
  if(!canvas || !wrap) return;
  drawPitch(canvas);

  // Remove any existing dots
  wrap.querySelectorAll(".pdot-locked").forEach(e=>e.remove());

  // Add read-only copies of slots
  slots.forEach((s,i)=>{
    if(!s.name || !s.dbName) return;
    const el = document.createElement("div");
    const grp = POS_GROUP[s.pos] || "mf";
    let cls = "pdot pdot-locked grp-" + grp + " filled";
    if(i === captainIdx) cls += " captain";
    el.className = cls;
    el.style.left = (s.x*100) + "%";
    el.style.top  = (s.y*100) + "%";
    el.style.pointerEvents = "none";
    el.innerHTML =
      '<div class="pcircle">' + s.num + '</div>' +
      '<div class="pname">' + (s.name.split(" ").slice(-1)[0] || "") + '</div>';
    wrap.appendChild(el);
  });

  // Apply chem highlight classes using fresh player data
  const players = slots.filter(s=>s.name && s.dbName).map(s=>{
    const p = DB.find(d=>d.n===s.dbName);
    return {
      name: s.dbName, normName: chemNorm(s.dbName),
      pos: s.pos, grp: POS_GROUP[s.pos]||"mf",
      era: p ? p.e : "G",
      primary: p && p.c && p.c[0] ? p.c[0] : "",
      is1966: SQUAD_1966.includes(chemNorm(s.dbName))
    };
  });
  highlightLockedDots(players);
}

// Same logic as highlightChemDots but operating on locked wrap
function highlightLockedDots(players){
  const wrap = document.getElementById("wrap-locked");
  if(!wrap) return;
  const dots = wrap.querySelectorAll(".pdot-locked");
  dots.forEach(el=>el.classList.remove("chem-era","chem-club","chem-both","chem-1966"));

  const count1966 = players.filter(p=>p.is1966).length;
  const clubGroups = {};
  players.forEach(p=>{ if(p.primary){ (clubGroups[p.primary]=clubGroups[p.primary]||[]).push(p.name); } });
  // Era connection — any era with 2+ players counts, matching live preview
  const eraCounts = {C:0,G:0,M:0};
  players.forEach(p=> eraCounts[p.era]=(eraCounts[p.era]||0)+1);

  // Build filled slots → dot index map (dots are appended in slot order, skipping empty)
  let di = 0;
  slots.forEach((s,i)=>{
    if(!s.name || !s.dbName) return;
    const dotEl = dots[di++];
    if(!dotEl) return;
    const p = players.find(pl=>pl.name===s.dbName);
    if(!p) return;

    const sameClub = clubGroups[p.primary] && clubGroups[p.primary].length >= 2;
    const sameEra  = (eraCounts[p.era]||0) >= 2;

    if(count1966 >= 2 && p.is1966){
      dotEl.classList.add("chem-1966");
    } else if(sameClub && sameEra){
      dotEl.classList.add("chem-both");
    } else if(sameClub){
      dotEl.classList.add("chem-club");
    } else if(sameEra){
      dotEl.classList.add("chem-era");
    }
  });
}

function shareLockedResult(){
  if(!lastChem) return;
  const c = lastChem;
  // Show specialTitle only if it's a notable combo (TIER 1 or TIER 2 — historic teams)
  const NOTABLE_COMBOS = [
    "RAMSEY'S WINGLESS WONDERS","CLASS OF 92","ADAMS' BACK FOUR","ACADEMY OF FOOTBALL",
    "TERRY & LAMPARD ERA","GERRARD'S LIVERPOOL","SHEARER'S TOON ARMY","THREE LIONS MIDFIELD",
    "NEARLY MEN – EURO 96","CAPTAIN MARVEL'S UNITED","CLOUGH'S FOREST","WORLD CHAMPIONS BACKBONE"
  ];
  const showCombo = NOTABLE_COMBOS.includes(c.specialTitle);
  const lines = ["⚽ I built a " + c.score + " pts England XI"];
  // Empty line after main score
  lines.push("");
  // Optional details
  if(showCombo) lines.push(c.specialTitle);
  if(c.capSurname) lines.push("Captain: " + c.capSurname);
  // Empty line before CTA only if details were added
  if(showCombo || c.capSurname) lines.push("");
  lines.push("Think you can beat it? ⚽");
  // Build two versions: one with URL (for clipboard — users paste anywhere),
  // one without (for native share — Messenger auto-linkifies URLs in text,
  // causing duplication; card preview shows the link below anyway).
  const textWithUrl = lines.concat(["footylegendsquiz.co.uk"]).join("\n");
  const text = lines.join("\n");

  // Try native share, fall back to clipboard
  if(navigator.share){
    navigator.share({text: text, url: window.location.href}).catch(()=>{});
  } else if(navigator.clipboard){
    navigator.clipboard.writeText(textWithUrl).then(()=>{
      toast("✓ COPIED TO CLIPBOARD","");
    }).catch(()=>{
      fallbackCopy(textWithUrl);
      toast("✓ COPIED","");
    });
  } else {
    fallbackCopy(textWithUrl);
    toast("✓ COPIED","");
  }
}


function highlightChemDots(players){
  const wrap = document.getElementById("wrap");

  // Clear previous chemistry classes
  wrap.querySelectorAll(".pdot").forEach(el=>{
    el.classList.remove("chem-era","chem-club","chem-both","chem-1966");
  });

  // Count 1966 players
  const count1966 = players.filter(p=>p.is1966).length;

  // Find club groups (2+ players same primary club)
  const clubGroups = {};
  players.forEach(p=>{
    if(p.primary){
      if(!clubGroups[p.primary]) clubGroups[p.primary]=[];
      clubGroups[p.primary].push(p.name);
    }
  });
  const clubConnected = new Set();
  Object.values(clubGroups).forEach(names=>{
    if(names.length>=2) names.forEach(n=>clubConnected.add(n));
  });

  // Find era groups (2+ players same era)
  const eraCounts = {};
  players.forEach(p=>{ eraCounts[p.era]=(eraCounts[p.era]||0)+1; });
  const eraConnected = new Set();
  players.forEach(p=>{
    if((eraCounts[p.era]||0)>=2) eraConnected.add(p.name);
  });

  // Apply classes — priority: 1966 > both > club > era
  const touched = [];
  players.forEach(p=>{
    const idx = slots.findIndex(s=>s.dbName===p.name);
    const el = wrap.querySelector('[data-idx="'+idx+'"]');
    if(!el) return;

    if(p.is1966 && count1966>=2)
      el.classList.add("chem-1966");
    else if(clubConnected.has(p.name) && eraConnected.has(p.name))
      el.classList.add("chem-both");
    else if(clubConnected.has(p.name))
      el.classList.add("chem-club");
    else if(eraConnected.has(p.name))
      el.classList.add("chem-era");

    touched.push(el);
  });

  // Force repaint — mobile Chrome sometimes doesn't render box-shadow on
  // newly-classed elements until something else triggers a full repaint.
  // offsetHeight alone isn't enough on Chrome Android; we toggle a tiny
  // inline transform to force the GPU compositor to re-evaluate the paint.
  touched.forEach(el=>{
    el.style.transform = "translate(-50%,-50%) translateZ(0)";
    void el.offsetHeight;
    el.style.transform = "translate(-50%,-50%)";
  });
}


function updateCounter(){
  const filled = slots.filter(s=>s.name&&s.name.trim()).length;
  const counter = document.getElementById("xi-counter");
  const btn = document.getElementById("chem-btn");
  if(!counter||!btn) return;

  const wasComplete = counter._wasComplete === true;
  const isComplete  = (filled === 11);

  counter.textContent = filled+"/11";
  if(isComplete){
    counter.style.color="var(--green)";
    btn.disabled=false;
    btn.style.background="var(--gold)";
    btn.style.borderColor="var(--gold)";
    btn.style.color="#000";
    btn.style.cursor="pointer";
    btn.textContent = "🔥 LOCK IN TEAM";
    btn.classList.add("milestone-ready");
    // Reward — tiny celebration on the moment of completion
    if(!wasComplete){
      if(navigator.vibrate) navigator.vibrate([30,30,30,30,60]);
      toast("⚽ LINE-UP COMPLETE · READY TO LOCK IN","");
    }
  } else {
    counter.style.color = filled>=6 ? "var(--gold)" : "#444";
    btn.disabled=true;
    btn.style.background="#000";
    btn.style.borderColor="#222";
    btn.style.color="#333";
    btn.style.cursor="not-allowed";
    btn.textContent = "🔒 LOCK IN";
    btn.classList.remove("milestone-ready");
  }
  counter._wasComplete = isComplete;
  updateCaptainBtn();

  // Contextual hints
  const xiHint = document.getElementById('xi-hint');
  if(xiHint){
    // Show "tap a legend on the bench" only in blind mode AND when pitch isn't full
    const showBenchHint = window.isBlindDraftSession && filled < 11;
    xiHint.style.display = showBenchHint ? 'block' : 'none';
  }

  const capHint = document.getElementById('cap-hint');
  if(capHint){
    // Show captain explanation only when XI is complete AND captain not yet picked AND not selecting
    const showCapHint = isComplete && captainIdx === null && !selectingCaptain;
    capHint.style.display = showCapHint ? 'block' : 'none';
  }

  // Empty-state hint — only when no players placed AND not in blind draft
  // (blind draft has its own xi-hint about the bench).
  // Uses opacity+visibility for a soft fade in/out instead of harsh display toggle.
  const emptyHint = document.getElementById('xi-empty-hint');
  if(emptyHint){
    const showEmpty = filled === 0 && !window.isBlindDraftSession;
    emptyHint.style.opacity = showEmpty ? '.7' : '0';
    emptyHint.style.visibility = showEmpty ? 'visible' : 'hidden';
  }
}
window.addEventListener("load",()=>{ render(); updateCounter(); });

// Mobile keyboard handling — when keyboard appears, make sure the focused
// input is visible inside the shrunken viewport. visualViewport.resize fires
// for keyboard show/hide on iOS/Android Chrome.
if(window.visualViewport){
  const scrollActiveInputIntoView = () => {
    const modal = document.getElementById("modal");
    if(!modal || !modal.classList.contains("on")) return;
    const active = document.activeElement;
    if(!active) return;
    // Give the viewport a moment to settle
    setTimeout(()=>{
      try {
        // nearest = scroll parents as needed; use both so outer modal AND
        // mbox scroll together to bring input into the visible viewport
        active.scrollIntoView({behavior:"smooth", block:"center", inline:"nearest"});
      } catch(e){}
    }, 150);
  };
  window.visualViewport.addEventListener("resize", scrollActiveInputIntoView);
  // Also run when input gets focused — handles the case where keyboard was
  // already up before the input was selected
  document.addEventListener("focusin", (e)=>{
    if(!e.target || !e.target.matches) return;
    if(!e.target.matches("input, textarea, select")) return;
    scrollActiveInputIntoView();
  });
}

// Window resize — only re-render XI if XI screen is actually visible,
// and debounce to avoid thrashing when mobile chrome hides/shows toolbar
let _resizeT = null;
window.addEventListener("resize", ()=>{
  clearTimeout(_resizeT);
  _resizeT = setTimeout(()=>{
    const xi = document.getElementById('s-xi');
    if(xi && xi.classList.contains('on')){
      render();
      updateCounter();
    }
  }, 200);
});
