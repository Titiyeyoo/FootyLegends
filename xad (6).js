/* ════════════════════════════════════════════════════════════════════
   XI AFTER DARK — MODEL B engine
   ════════════════════════════════════════════════════════════════════
   Self-contained. Depends ONLY on DB (db.js) and go() (core.js).
   Does NOT touch chemistry, Hall of Fame, or the old Blind Draft.
   ETAP 1: SOLO LOCAL = ONE ROUND MACHINE.
   Teletext: CRT black + magenta/amber/cyan + monospace + P302.
   No audio, no animation, no scanlines — instant cuts.
   ════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ── TUNABLES & FLAGGED DECISIONS ─────────────────────────────────── */
const CFG = {
  USE_W3:       true,    // hidden synergy + memory bonus (Old Heads ratunek) — Sylwia lock 29.05
  ALLOW_REROLL: false,   // reroll jednej puli — off (solo ma "play again")
  USE_TIMER:    false,   // lock-out/timer to Etap 2 (Event Mode)

  POOL_SIZE: 30,
  POOL_QUOTA:  { GK:3, DF:10, MF:11, FW:6 },
  // Gracz WYBIERA formację. Każda = lista slotów z koordynatami x/y na boisku
  // (proporcje zerżnięte z buildera s-xi — to UX, który dawał odczucie "to moja jedenastka").
  // x: 0=lewa, 1=prawa. y: 0=góra (linia napastnika), 1=dół (bramka).
  // p = szeroka grupa do legalności puli (GK/DF/MF/FW). pos = etykieta na karcie (memory anchor).
  FORMATIONS: {
    "4-4-2": [
      {p:"GK",pos:"GK",x:.50,y:.90},
      {p:"DF",pos:"RB",x:.86,y:.66},{p:"DF",pos:"CB",x:.62,y:.68},{p:"DF",pos:"CB",x:.38,y:.68},{p:"DF",pos:"LB",x:.14,y:.66},
      {p:"MF",pos:"RM",x:.86,y:.44},{p:"MF",pos:"CM",x:.62,y:.46},{p:"MF",pos:"CM",x:.38,y:.46},{p:"MF",pos:"LM",x:.14,y:.44},
      {p:"FW",pos:"ST",x:.62,y:.20},{p:"FW",pos:"ST",x:.38,y:.20},
    ],
    "4-3-3": [
      {p:"GK",pos:"GK",x:.50,y:.90},
      {p:"DF",pos:"RB",x:.86,y:.66},{p:"DF",pos:"CB",x:.62,y:.68},{p:"DF",pos:"CB",x:.38,y:.68},{p:"DF",pos:"LB",x:.14,y:.66},
      {p:"MF",pos:"CM",x:.74,y:.48},{p:"MF",pos:"CM",x:.50,y:.46},{p:"MF",pos:"CM",x:.26,y:.48},
      {p:"FW",pos:"RW",x:.80,y:.20},{p:"FW",pos:"ST",x:.50,y:.18},{p:"FW",pos:"LW",x:.20,y:.20},
    ],
    "3-5-2": [
      {p:"GK",pos:"GK",x:.50,y:.90},
      {p:"DF",pos:"CB",x:.74,y:.68},{p:"DF",pos:"CB",x:.50,y:.70},{p:"DF",pos:"CB",x:.26,y:.68},
      {p:"MF",pos:"RM",x:.88,y:.46},{p:"MF",pos:"CM",x:.66,y:.46},{p:"MF",pos:"CM",x:.50,y:.52},{p:"MF",pos:"CM",x:.34,y:.46},{p:"MF",pos:"LM",x:.12,y:.46},
      {p:"FW",pos:"ST",x:.62,y:.20},{p:"FW",pos:"ST",x:.38,y:.20},
    ],
    "4-2-3-1": [
      {p:"GK",pos:"GK",x:.50,y:.90},
      {p:"DF",pos:"RB",x:.86,y:.68},{p:"DF",pos:"CB",x:.62,y:.70},{p:"DF",pos:"CB",x:.38,y:.70},{p:"DF",pos:"LB",x:.14,y:.68},
      {p:"MF",pos:"DM",x:.62,y:.54},{p:"MF",pos:"DM",x:.38,y:.54},
      {p:"MF",pos:"RW",x:.80,y:.34},{p:"MF",pos:"AM",x:.50,y:.32},{p:"MF",pos:"LW",x:.20,y:.34},
      {p:"FW",pos:"ST",x:.50,y:.16},
    ],
    "5-3-2": [
      {p:"GK",pos:"GK",x:.50,y:.90},
      {p:"DF",pos:"RWB",x:.92,y:.62},{p:"DF",pos:"CB",x:.71,y:.70},{p:"DF",pos:"CB",x:.50,y:.72},{p:"DF",pos:"CB",x:.29,y:.70},{p:"DF",pos:"LWB",x:.08,y:.62},
      {p:"MF",pos:"CM",x:.72,y:.46},{p:"MF",pos:"CM",x:.50,y:.46},{p:"MF",pos:"CM",x:.28,y:.46},
      {p:"FW",pos:"ST",x:.62,y:.20},{p:"FW",pos:"ST",x:.38,y:.20},
    ],
    "4-4-1-1": [
      {p:"GK",pos:"GK",x:.50,y:.90},
      {p:"DF",pos:"RB",x:.86,y:.66},{p:"DF",pos:"CB",x:.62,y:.68},{p:"DF",pos:"CB",x:.38,y:.68},{p:"DF",pos:"LB",x:.14,y:.66},
      {p:"MF",pos:"RM",x:.86,y:.46},{p:"MF",pos:"CM",x:.62,y:.48},{p:"MF",pos:"CM",x:.38,y:.48},{p:"MF",pos:"LM",x:.14,y:.46},
      {p:"FW",pos:"SS",x:.50,y:.34},{p:"FW",pos:"ST",x:.50,y:.16},
    ],
  },
  MIN_C: 5, MIN_M: 5,
  MAX_DEEPCUT_RATIO: 0.40,

  // W1 base
  STAR_PTS: 10, NARR_PLAYER_PTS: 7, DEEP_CUT_PTS: 6,
  // W2 narrative bonus
  W2_K: 40, W2_COMPL: 0.6, W2_SHARE: 0.4, W2_SPEC_BASE: 20, W2_SPEC_AMT: 0.5,
  // W3 hidden synergy + memory bonus
  W3_ERA_9:18, W3_ERA_7:12, W3_ERA_5:6, W3_CAP:30, W3_MEMORY_PER:2, W3_MEMORY_CAP:10,

  THRESHOLDS: { england:6, club:4, egg:4 },
};

const FORM_HINT = {
  "4-4-2":"The classic", "4-3-3":"On the front foot", "3-5-2":"Italia 90 vibes",
  "4-2-3-1":"Southgate shape", "5-3-2":"Shut up shop", "4-4-1-1":"Proper English",
};

/* 15 recognizable stars (brief lock) */
const STARS = new Set([
  "David Beckham","Steven Gerrard","Frank Lampard","Wayne Rooney",
  "Harry Kane","Alan Shearer","Paul Gascoigne","Bobby Moore",
  "Bobby Charlton","Gary Lineker","Jude Bellingham","Bukayo Saka",
  "Michael Owen","John Terry","Rio Ferdinand",
]);

/* ── 13 NARRATIVES (osobna warstwa, exact match z db.js `n`) ──────── */
const NARRATIVES = {
  heroes66:{name:"1966 HEROES",emoji:"🏆",cat:"england",iconic:5,players:["Gordon Banks","George Cohen","Ray Wilson","Nobby Stiles","Jack Charlton","Bobby Moore","Alan Ball","Geoff Hurst","Roger Hunt","Bobby Charlton","Martin Peters","Jimmy Greaves","Norman Hunter","Peter Bonetti","Gerry Byrne","Ian Callaghan","Terry Cooper","Keith Newton","Alan Mullery","Brian Labone","Francis Lee","Colin Bell","Allan Clarke","Emlyn Hughes"]},
  italia90:{name:"ITALIA 90",emoji:"😢",cat:"england",iconic:3,players:["Peter Shilton","Gary Lineker","Paul Gascoigne","Stuart Pearce","Chris Waddle","Des Walker","Terry Butcher","Peter Beardsley","David Platt","Mark Wright","John Barnes","Steve McMahon","Steve Hodge","Trevor Steven","Paul Parker"]},
  euro96:{name:"EURO 96",emoji:"🎤",cat:"england",iconic:4,players:["David Seaman","Alan Shearer","Teddy Sheringham","Tony Adams","Darren Anderton","Steve McManaman","Paul Ince","Gareth Southgate","Gary Neville","Sol Campbell","Stuart Pearce","Paul Gascoigne","David Platt","Steve Stone","Robbie Fowler","Nick Barmby"]},
  golden:{name:"GOLDEN GENERATION",emoji:"⭐",cat:"england",iconic:2,players:["David Beckham","Steven Gerrard","Frank Lampard","John Terry","Rio Ferdinand","Ashley Cole","Wayne Rooney","Michael Owen","Michael Carrick","Joe Cole","Paul Scholes","Gary Neville","Emile Heskey","Sol Campbell","Wes Brown","Owen Hargreaves","Phil Neville","David James","Gareth Barry","Jermain Defoe","Wayne Bridge","Glen Johnson"]},
  southgate:{name:"SOUTHGATE ERA",emoji:"🦁",cat:"england",iconic:1,players:["Jordan Pickford","Kyle Walker","John Stones","Harry Maguire","Kieran Trippier","Luke Shaw","Declan Rice","Jordan Henderson","Jude Bellingham","Mason Mount","Phil Foden","Bukayo Saka","Raheem Sterling","Harry Kane","Marcus Rashford","Jack Grealish","Trent Alexander-Arnold","Marc Guehi","Conor Gallagher"]},

  class92:{name:"CLASS OF 92",emoji:"🔴",cat:"club",iconic:5,players:["David Beckham","Paul Scholes","Gary Neville","Phil Neville","Nicky Butt"]},
  forest:{name:"FOREST EUROPEAN KINGS",emoji:"⚫",cat:"club",iconic:4,players:["Peter Shilton","Chris Woods","Viv Anderson","Larry Lloyd","Trevor Francis","Tony Woodcock","Garry Birtles","Ian Bowyer","Stan Bowles","Frank Clark","David Needham","Gary Mills"]},
  blackburn:{name:"BLACKBURN 95",emoji:"🔵",cat:"club",iconic:3,players:["Alan Shearer","Chris Sutton","Tim Flowers","Tim Sherwood","Graeme Le Saux","Stuart Ripley","Jason Wilcox","David Batty","Mike Newell","Paul Warhurst","Graham Fenton","Tony Gale","Mark Atkins","Lee Makel","Paul Harford","Bobby Mimms"]},
  newcastle:{name:"NEWCASTLE ENTERTAINERS",emoji:"⚪",cat:"club",iconic:3,players:["Peter Beardsley","Les Ferdinand","Rob Lee","Steve Watson","Steve Howey","Warren Barton","Robbie Elliott","Darren Peacock","David Batty","Lee Clark","Paul Kitson","Darren Huckerby","Ruel Fox","Steve Harper","John Beresford","Scott Sellars","Paul Brayson","Chris Holland"]},
  foxes:{name:"FOXES 2016",emoji:"🦊",cat:"club",iconic:5,players:["Jamie Vardy","Danny Drinkwater","Marc Albrighton","Danny Simpson","Demarai Gray","Ben Chilwell","Nathan Dyer"]},
  liverpool:{name:"LIVERPOOL DYNASTY",emoji:"🔴",cat:"club",iconic:2,players:["Phil Neal","Phil Thompson","Ray Clemence","Emlyn Hughes","Ray Kennedy","Terry McDermott","David Johnson","Tommy Smith","Ian Callaghan","Larry Lloyd","Robbie Fowler","Steve McManaman","Jamie Redknapp","David James","Neil Ruddock","Stan Collymore","Paul Ince","Steven Gerrard","Jamie Carragher","Stephen Warnock","Scott Carson","John Scales"]},

  crazygang:{name:"CRAZY GANG ENERGY",emoji:"⚡",cat:"egg",iconic:5,players:["Dave Beasant","Dennis Wise","John Fashanu","Alan Cork","Wally Downes","Eric Young","Andy Thorn","Brian Gayle","Carlton Fairweather"]},
};
const TREBLE99_EXTRAS = ["Teddy Sheringham","Andy Cole","Wes Brown"];

/* ── DB helpers ───────────────────────────────────────────────────── */
const byName = {}; DB.forEach(p => byName[p.n] = p);
const rnd = n => Math.floor(Math.random()*n);
const shuffle = arr => { for(let i=arr.length-1;i>0;i--){const j=rnd(i+1);[arr[i],arr[j]]=[arr[j],arr[i]];} return arr; };
const clubLabel = p => (p.c && p.c[0] ? p.c[0] : "").toUpperCase();
const posLabel  = p => p.pos || p.p;   // FIX: karta pokazuje pos (AM/CB/ST) — memory anchor
const inAnyNarrative = name => Object.values(NARRATIVES).some(N => N.players.includes(name));
const isDeepCut = name => !STARS.has(name) && !inAnyNarrative(name);

// liczba slotów per szeroka grupa dla danej formacji (formacje to teraz tablice slotów)
function formCounts(f){
  const c = {GK:0,DF:0,MF:0,FW:0};
  CFG.FORMATIONS[f].forEach(s => c[s.p]++);
  return c;
}

/* ── POOL GENERATION — controlled chaos ───────────────────────────── */
function buildPool(){
  const quota = {...CFG.POOL_QUOTA};
  const pool = [];
  const used = new Set();
  const fits = p => quota[p.p] > 0;
  const add  = p => { pool.push(p); used.add(p.n); quota[p.p]--; };

  // 1) Dwa ziarna narracji
  const seedKeys = shuffle(Object.keys(NARRATIVES)).slice(0,2);
  seedKeys.forEach(k => {
    const N = NARRATIVES[k];
    const th = CFG.THRESHOLDS[N.cat];
    const want = th + 1 + rnd(2);
    const cands = shuffle(N.players.filter(n => byName[n] && !used.has(n)).map(n => byName[n]));
    let placed = 0;
    for (const p of cands){ if(placed>=th) break; if(!used.has(p.n)){ add(p); placed++; } }
    for (const p of cands){ if(placed>=want) break; if(!used.has(p.n) && fits(p)){ add(p); placed++; } }
  });

  // 2) Gwarancja 1-2 recognizable stars
  if (pool.filter(p => STARS.has(p.n)).length < 1){
    const starCands = shuffle([...STARS].filter(n => byName[n] && !used.has(n)).map(n => byName[n]));
    let need = 1 + rnd(2);
    for (const p of starCands){ if(need<=0) break; if(fits(p)){ add(p); need--; } }
  }

  // 3) Era-aware filler do POOL_SIZE
  const eraCount = e => pool.filter(p => p.e===e).length;
  const deepCount = () => pool.filter(p => isDeepCut(p.n)).length;
  let guard = 0;
  while (pool.length < CFG.POOL_SIZE && guard++ < 5000){
    const posOrder = Object.keys(quota).filter(k => quota[k] > 0).sort((a,b)=>quota[b]-quota[a]);
    if (!posOrder.length) break;
    const pos = posOrder[0];
    let preferEra = null;
    if (eraCount("C") < CFG.MIN_C) preferEra = "C";
    else if (eraCount("M") < CFG.MIN_M) preferEra = "M";
    const allowDeep = deepCount() < CFG.POOL_SIZE * CFG.MAX_DEEPCUT_RATIO;
    const pickFrom = (filterFn) => {
      const c = DB.filter(p => p.p===pos && !used.has(p.n) && filterFn(p));
      return c.length ? c[rnd(c.length)] : null;
    };
    let cand =
      (preferEra && (allowDeep
          ? pickFrom(p => p.e===preferEra)
          : pickFrom(p => p.e===preferEra && !isDeepCut(p.n)))) ||
      (!allowDeep ? pickFrom(p => !isDeepCut(p.n)) : null) ||
      pickFrom(() => true);
    if (!cand) { quota[pos] = 0; continue; }
    add(cand);
  }

  // 4) Asekuracja legalności WSZYSTKICH formacji (max zapotrzebowanie)
  const need = {GK:0,DF:0,MF:0,FW:0};
  for (const f in CFG.FORMATIONS){
    const fc = formCounts(f);
    for (const pos in need) need[pos] = Math.max(need[pos], fc[pos]);
  }
  for (const pos of Object.keys(need)){
    let have = pool.filter(p => p.p===pos).length;
    while (have < need[pos]){
      const c = DB.filter(p => p.p===pos && !used.has(p.n));
      if(!c.length) break;
      const p = c[rnd(c.length)];
      const swapPos = Object.keys(need).find(k => pool.filter(x=>x.p===k).length > need[k]+1 && k!==pos);
      if (pool.length >= CFG.POOL_SIZE && swapPos){
        const idx = pool.findIndex(x => x.p===swapPos && !STARS.has(x.n));
        if(idx>=0){ used.delete(pool[idx].n); pool.splice(idx,1); }
      }
      add(p); have++;
    }
  }
  return shuffle(pool);
}

/* ── GAME STATE ───────────────────────────────────────────────────── */
let POOL = [];
let SLOTS = [];
let FORMATION = "4-4-2";
let REROLL_USED = false;
let DEALT = false;            // czy pula została już wylosowana
let POS_FILTER = null;        // null = wszyscy; "GK"/"DF"/"MF"/"FW" = tylko ta grupa (klik w pusty slot)

function buildSlots(){
  // każdy slot: {p (grupa GK/DF/MF/FW), pos (etykieta), x, y, player}
  SLOTS = CFG.FORMATIONS[FORMATION].map(s => ({p:s.p, pos:s.pos, x:s.x, y:s.y, player:null}));
}
function picked(){ return SLOTS.filter(s=>s.player).length; }
function inXI(name){ return SLOTS.some(s=>s.player && s.player.n===name); }

// klik "XI AFTER DARK" → od razu draft: puste boisko 4-4-2 + przycisk PICK MY 30 (bez ekranu-bramki)
function openDraftEmpty(){
  POOL = [];
  REROLL_USED = false;
  DEALT = false; POS_FILTER = null;
  FORMATION = "4-4-2";
  buildSlots();
  setText("xad-form-label", FORMATION);
  showXadScreen("xad-draft");
  render(); flash("");
}
// "PICK MY 30" → losuj pulę, wypełnij, przycisk znika
function drawSquad(){
  POOL = buildPool();
  REROLL_USED = false;
  DEALT = true; POS_FILTER = null;
  render(); flash("");
}
// reroll raz na rundę: zachowaj wybranych, podmień RESZTĘ puli (wzorzec ze starego blind draft)
function rerollPool(){
  if(REROLL_USED || !DEALT) return;
  const keepNames = new Set(SLOTS.filter(s=>s.player).map(s=>s.player.n));
  const fresh = buildPool();
  // zachowaj wybranych z obecnej puli; resztę bierz ze świeżej (bez duplikatów)
  const kept = POOL.filter(p => keepNames.has(p.n));
  const keptSet = new Set(kept.map(p=>p.n));
  const fill = fresh.filter(p => !keptSet.has(p.n)).slice(0, CFG.POOL_SIZE - kept.length);
  POOL = shuffle(kept.concat(fill));
  REROLL_USED = true;
  render();
  if(typeof toast==="function") toast("🎲 RE-ROLL USED");
}
// zmiana formacji w trakcie (mały przycisk, NIE ekran-bramka)
function changeFormation(f){
  const kept = SLOTS.filter(s=>s.player).map(s=>s.player);
  FORMATION = f;
  buildSlots();
  for(const p of kept){
    const slot = SLOTS.find(s=>s.p===p.p && !s.player);   // dopasuj po szerokiej grupie
    if(slot) slot.player = p;
  }
  setText("xad-form-label", FORMATION);
  renderFormationBar();
  render(); flash("");
}
function placePlayer(p){
  if(inXI(p.n)) return;
  const slot = SLOTS.find(s=>s.p===p.p && !s.player);     // dopasuj po szerokiej grupie
  if(!slot){ if(typeof toast==="function") toast("⚠ "+FORMATION+" — NO "+p.p+" SLOT FREE"); return; }
  slot.player = p; flash("");
  POS_FILTER = null;                                       // po wyborze wraca pełny widok puli
  render(true, p.n);                                       // animuj wskoczenie tego zawodnika
}
function removeFromSlot(i){
  if(!SLOTS[i].player) return;
  SLOTS[i].player = null; flash(""); render();
}
// klik w PUSTY slot → filtruj pulę do tej grupy pozycji (pomoc w nawigacji, nie narzucanie kolejności)
function filterBySlot(grp){
  if(!DEALT) return;
  POS_FILTER = (POS_FILTER===grp) ? null : grp;            // ponowny klik w tę samą grupę zdejmuje filtr
  render();
}
function clearFilter(){ POS_FILTER = null; render(); }

/* ── RENDER ───────────────────────────────────────────────────────── */
function el(id){ return document.getElementById(id); }
function setText(id,t){ const e=el(id); if(e) e.textContent=t; }
function flash(t){ setText("xad-flash", t); }

// p.p (GK/DF/MF/FW) → klasa grupy w stylu gry (kolor pozycji ze starego My Legendary XI)
const GRP = {GK:"grp-gk", DF:"grp-df", MF:"grp-mf", FW:"grp-fw"};
const GRP_LABEL = {GK:"KEEPERS", DF:"DEFENDERS", MF:"MIDFIELDERS", FW:"FORWARDS"};
// era → mały akcent (kropka), NIE kolor koła
const ERA_DOT = {C:"era-c", G:"era-g", M:"era-m"};

// pasek formacji w trakcie draftu (zmiana kształtu bez wychodzenia)
function renderFormationBar(){
  const bar = el("xad-formbar"); if(!bar) return;
  bar.innerHTML = "";
  Object.keys(CFG.FORMATIONS).forEach(f => {
    const b = document.createElement("button");
    b.className = "xad-formbtn" + (f===FORMATION ? " on":"");
    b.textContent = f;
    b.onclick = () => changeFormation(f);
    bar.appendChild(b);
  });
}

// justJumped: nazwisko zawodnika, który właśnie wskoczył → dostaje klasę pop (pętla nagrody)
function render(animate, justJumped){
  // przycisk PICK MY 30 — widoczny tylko przed rozdaniem
  const pickBtn = el("xad-pick-btn");
  if(pickBtn) pickBtn.style.display = DEALT ? "none" : "";
  // POOL (lista nazwisk)
  const poolEl = el("xad-pool"); poolEl.innerHTML = "";
  if(!DEALT){
    poolEl.innerHTML = '<div class="xad-poolempty">Hit PICK MY 30 to deal your players.</div>';
  } else {
    // pula posegregowana wg pozycji: GK → DF → MF → FW (łatwiej szukać)
    const order = {GK:0, DF:1, MF:2, FW:3};
    let list = POOL.slice().sort((a,b)=> order[a.p]-order[b.p]);
    // filtr pozycji (klik w pusty slot) — pokazuje tylko tę grupę; pełna pula żyje w tle
    if(POS_FILTER) list = list.filter(p => p.p===POS_FILTER);
    // nagłówek filtra: ile pasuje + SHOW ALL
    const fl = el("xad-filterline");
    if(fl){
      if(POS_FILTER){
        const avail = list.filter(p=>!inXI(p.n)).length;
        fl.innerHTML = '<span class="ff">'+GRP_LABEL[POS_FILTER]+' ONLY · '+avail+' free</span> <button class="xad-showall" onclick="xadClearFilter()">✕ SHOW ALL 30</button>';
        fl.style.display = "";
      } else { fl.style.display = "none"; }
    }
    list.forEach(p => {
      const d = document.createElement("div");
      d.className = "xad-card "+GRP[p.p] + (inXI(p.n) ? " used":"");
      d.innerHTML = '<span class="dot '+(ERA_DOT[p.e]||"")+'"></span>'+
                    '<span class="nm">'+escXad(p.n)+'</span>'+
                    '<span class="meta">'+escXad(clubLabel(p))+'</span>'+
                    '<span class="pos">'+posLabel(p)+'</span>';
      if(!inXI(p.n)) d.onclick = () => placePlayer(p);
      poolEl.appendChild(d);
    });
  }
  // PITCH — żywe koła pozycjonowane wg x/y formacji (puste boisko widać od startu)
  const pitchEl = el("xad-pitch");
  pitchEl.innerHTML = '<div class="xad-penalty"></div><div class="xad-sixyard"></div>';
  SLOTS.forEach((s,i) => {
    const node = document.createElement("div");
    const isFilterTarget = POS_FILTER===s.p && !s.player;
    node.className = "pdot " + GRP[s.p] + (s.player ? " filled":" empty") + (isFilterTarget?" filtering":"");
    node.style.left = (s.x*100)+"%";
    node.style.top  = (s.y*100)+"%";
    if(s.player){
      const isPop = animate && justJumped && s.player.n===justJumped;
      node.innerHTML =
        '<div class="pcircle'+(isPop?" pop":"")+'">'+s.pos+
          '<span class="eradot '+(ERA_DOT[s.player.e]||"")+'"></span>'+
        '</div>'+
        '<div class="pname">'+escXad(lastName(s.player.n))+'</div>';
      node.onclick = () => removeFromSlot(i);
    }else{
      node.innerHTML = '<div class="pcircle">'+s.pos+'</div>';
      node.onclick = () => filterBySlot(s.p);     // klik pusty slot → filtruj pulę do tej grupy
    }
    pitchEl.appendChild(node);
  });
  setText("xad-count", picked());
  // akcje (lock/reroll) tylko po rozdaniu
  const actions = el("xad-actions");
  if(actions) actions.style.display = DEALT ? "" : "none";
  const lb = el("xad-lock-btn"); if(lb) lb.disabled = picked() !== 11;
  const rb = el("xad-reroll-btn");
  if(rb){
    rb.disabled = REROLL_USED;
    rb.textContent = REROLL_USED ? "🎲 RE-ROLL USED" : "🎲 RE-ROLL UNPICKED (1x)";
  }
  renderFormationBar();
}
// na boisku pokazujemy nazwisko (krótko); pełne imię i tak jest w puli
function lastName(full){
  const parts = String(full).trim().split(/\s+/);
  return parts.length>1 ? parts[parts.length-1] : full;
}
function escXad(s){
  if(typeof escapeHtml==="function") return escapeHtml(s);
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

/* ── NARRATIVE DETECTION ──────────────────────────────────────────── */
function detect(xiNames){
  const counts = {};
  for(const k in NARRATIVES) counts[k] = NARRATIVES[k].players.filter(n => xiNames.includes(n)).length;
  const catPrio = {egg:3, club:2, england:1};
  const qualified = Object.keys(NARRATIVES).filter(k => counts[k] >= CFG.THRESHOLDS[NARRATIVES[k].cat]);
  if(!qualified.length) return {main:null, flavor:null, counts};
  const better = (a,b) => {
    if(counts[a]!==counts[b]) return counts[a]-counts[b];
    const ca=catPrio[NARRATIVES[a].cat], cb=catPrio[NARRATIVES[b].cat];
    if(ca!==cb) return ca-cb;
    if(NARRATIVES[a].iconic!==NARRATIVES[b].iconic) return NARRATIVES[a].iconic-NARRATIVES[b].iconic;
    return NARRATIVES[b].players.length - NARRATIVES[a].players.length;
  };
  const sorted = qualified.slice().sort((a,b)=>better(b,a));
  const mainK = sorted[0];
  // flavor: >=3 i INNA kategoria niż main
  const rest = sorted.slice(1).filter(k => counts[k] >= 3 && NARRATIVES[k].cat !== NARRATIVES[mainK].cat);
  let flavorK = rest[0] || null;
  // Treble 99 = flavor only (within Class of 92)
  const xiSet = new Set(xiNames);
  const trebleExtras = TREBLE99_EXTRAS.filter(n => xiSet.has(n)).length;
  if((mainK==="class92" || counts.class92>=CFG.THRESHOLDS.club) && trebleExtras>=3 && !flavorK){
    flavorK = "treble99_special";
  }
  return {main:mainK, flavor:flavorK, counts};
}
function isMythic(narrK, count){
  if(!narrK || narrK==="treble99_special") return false;
  const total = NARRATIVES[narrK].players.length;
  const share = count/11, completion = count/total;
  return share >= 0.90 || (completion >= 1.0 && total <= 9 && share >= 0.55);
}

/* ── SCORING W1 + W2 + W3 ─────────────────────────────────────────── */
function w1(xiPlayers){
  let s=0;
  for(const p of xiPlayers){
    if(STARS.has(p.n)) s += CFG.STAR_PTS;
    else if(inAnyNarrative(p.n)) s += CFG.NARR_PLAYER_PTS;
    else s += CFG.DEEP_CUT_PTS;
  }
  return s;
}
function w2(mainK, count){
  if(!mainK || mainK==="treble99_special") return 0;
  const total = NARRATIVES[mainK].players.length;
  const completion = count/total, share = count/11;
  const spec = 1 + Math.max(0,(CFG.W2_SPEC_BASE-total)/CFG.W2_SPEC_BASE)*CFG.W2_SPEC_AMT;
  return (completion*CFG.W2_COMPL + share*CFG.W2_SHARE) * spec * CFG.W2_K;
}
function w3(xiPlayers, counts){
  // era-spójność: największa grupa jednej ery w XI
  const eras = {}; xiPlayers.forEach(p => eras[p.e]=(eras[p.e]||0)+1);
  const domEra = Math.max(...Object.values(eras));
  let eraPts = 0;
  if(domEra >= 9) eraPts = CFG.W3_ERA_9;
  else if(domEra >= 7) eraPts = CFG.W3_ERA_7;
  else if(domEra >= 5) eraPts = CFG.W3_ERA_5;
  // prawie-narracje: 3-4 trafień PONIŻEJ progu → +hit
  let almost = 0;
  for(const k in NARRATIVES){
    const th = CFG.THRESHOLDS[NARRATIVES[k].cat];
    const c = counts[k];
    if(c >= 3 && c < th) almost += c;
  }
  const hidden = Math.min(eraPts + almost, CFG.W3_CAP);
  const deepInXI = xiPlayers.filter(p => isDeepCut(p.n)).length;
  const memory = Math.min(deepInXI * CFG.W3_MEMORY_PER, CFG.W3_MEMORY_CAP);
  return hidden + memory;
}
function eraDescriptor(xiPlayers){
  const eras = new Set(xiPlayers.map(p=>p.e));
  if(eras.size===1){ return eras.has("C")?"Classic English XI":eras.has("M")?"Modern English XI":"Golden-Era XI"; }
  return "Generational Mix";
}

/* ── REVEAL ───────────────────────────────────────────────────────── */
function lockXI(){
  const xiPlayers = SLOTS.map(s=>s.player);
  const xiNames = xiPlayers.map(p=>p.n);
  const det = detect(xiNames);

  let score = w1(xiPlayers);
  if(det.main) score += w2(det.main, det.counts[det.main]);
  if(CFG.USE_W3) score += w3(xiPlayers, det.counts);
  score = Math.round(score);

  let html = "";
  if(det.main){
    const M = NARRATIVES[det.main];
    const mythic = isMythic(det.main, det.counts[det.main]);
    if(mythic) html += '<div class="xad-tag">Mythic</div>';
    html += '<div class="xad-headline'+(mythic?" mythic":"")+'">'+M.emoji+' '+M.name+'</div>';
    if(det.flavor){
      const fl = det.flavor==="treble99_special"
        ? "with Treble 99 backbone"
        : "with "+NARRATIVES[det.flavor].name+" backbone";
      html += '<div class="xad-flavor">'+fl+'</div>';
    }
  }else{
    html += '<div class="xad-mixedname">MIXED XI</div>';
    html += '<div class="xad-flavor">'+eraDescriptor(xiPlayers)+'</div>';
  }
  html += '<div class="xad-score">'+score+'</div>';
  html += '<div class="xad-lineup-note">LINED UP '+FORMATION+'</div>';

  // BOISKO z jedenastką (jak grafika składu z transmisji) — koła, nazwiska, kolory pozycji
  html += '<div class="xad-pitch xad-pitch-reveal"><div class="xad-penalty"></div><div class="xad-sixyard"></div>';
  SLOTS.forEach(s=>{
    const p=s.player;
    html += '<div class="pdot '+GRP[p.p]+' filled" style="left:'+(s.x*100)+'%;top:'+(s.y*100)+'%">'+
              '<div class="pcircle">'+s.pos+'<span class="eradot '+(ERA_DOT[p.e]||"")+'"></span></div>'+
              '<div class="pname">'+escXad(lastName(p.n))+'</div>'+
            '</div>';
  });
  html += '</div>';

  // lista uzupełniająca (pełne imię + klub + pozycja), od bramkarza w górę
  html += '<div class="xad-readout">';
  ["GK","DF","MF","FW"].forEach(grp=>{
    SLOTS.filter(s=>s.p===grp).forEach(s=>{
      const p=s.player;
      html += '<div class="xad-row '+GRP[p.p]+'"><span>'+escXad(p.n)+'</span><span class="rp">'+escXad(clubLabel(p))+' · '+posLabel(p)+'</span></div>';
    });
  });
  html += '</div>';
  el("xad-reveal-body").innerHTML = html;
  showXadScreen("xad-reveal");
}

/* ── SCREEN SWITCHING (within #s-xad) ─────────────────────────────── */
function showXadScreen(id){
  ["xad-draft","xad-reveal"].forEach(s=>{
    const e=el(s); if(e) e.style.display = (s===id)?"":"none";
  });
  window.scrollTo(0,0);
}

/* ── ENTRY POINT (called by go('s-xad') / menu button) ────────────── */
function openXAD(){
  if(typeof DB==="undefined" || !DB.length){ if(typeof toast==="function") toast("DB NOT LOADED","err"); return; }
  go('s-xad');
  openDraftEmpty();      // puste boisko + przycisk PICK MY 30
  setupStickyPitch();    // boisko kurczy się skokowo przy scrollu (mobile)
}

// sticky pitch: po przescrollowaniu progu boisko dostaje klasę .shrunk (skok do pół-ekrana)
let stickyBound = false;
function setupStickyPitch(){
  if(stickyBound) return;
  const THRESHOLD = 60;   // px scrolla zanim boisko się skurczy
  const onScroll = () => {
    const scroller = el("s-xad"); if(!scroller) return;
    const pitchCol = scroller.querySelector(".xad-col-pitch");
    if(!pitchCol) return;
    // scroll może być na #s-xad albo na oknie — bierzemy większy z dwóch
    const top = Math.max(scroller.scrollTop||0, window.scrollY||window.pageYOffset||0);
    if(top > THRESHOLD) pitchCol.classList.add("shrunk");
    else pitchCol.classList.remove("shrunk");
  };
  const scroller = el("s-xad");
  if(scroller) scroller.addEventListener("scroll", onScroll, {passive:true});
  window.addEventListener("scroll", onScroll, {passive:true});
  stickyBound = true;
}

/* expose to global for onclick handlers + go() hook */
window.openXAD       = openXAD;
window.xadDraw       = drawSquad;       // "PICK MY 30"
window.xadReroll     = rerollPool;      // "RE-ROLL UNPICKED (1x)"
window.xadLockXI     = lockXI;
window.xadClearFilter= clearFilter;     // "SHOW ALL 30"
window.xadPlayAgain  = openDraftEmpty;  // po reveal → puste boisko + PICK MY 30

})();
