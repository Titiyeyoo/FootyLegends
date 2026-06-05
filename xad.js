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
      {p:"DF",pos:"RB",x:.92,y:.62},{p:"DF",pos:"CB",x:.71,y:.70},{p:"DF",pos:"CB",x:.50,y:.72},{p:"DF",pos:"CB",x:.29,y:.70},{p:"DF",pos:"LB",x:.08,y:.62},
      {p:"MF",pos:"CM",x:.72,y:.46},{p:"MF",pos:"CM",x:.50,y:.46},{p:"MF",pos:"CM",x:.28,y:.46},
      {p:"FW",pos:"ST",x:.62,y:.20},{p:"FW",pos:"ST",x:.38,y:.20},
    ],
    "4-4-1-1": [
      {p:"GK",pos:"GK",x:.50,y:.90},
      {p:"DF",pos:"RB",x:.86,y:.66},{p:"DF",pos:"CB",x:.62,y:.68},{p:"DF",pos:"CB",x:.38,y:.68},{p:"DF",pos:"LB",x:.14,y:.66},
      {p:"MF",pos:"RM",x:.86,y:.46},{p:"MF",pos:"CM",x:.62,y:.48},{p:"MF",pos:"CM",x:.38,y:.48},{p:"MF",pos:"LM",x:.14,y:.46},
      {p:"FW",pos:"ST",x:.50,y:.34},{p:"FW",pos:"ST",x:.50,y:.16},
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
  heroes66:{name:"1966 HEROES",desc:"The only England side ever to lift the World Cup",emoji:"🏆",cat:"england",iconic:5,players:["Gordon Banks","George Cohen","Ray Wilson","Nobby Stiles","Jack Charlton","Bobby Moore","Alan Ball","Geoff Hurst","Roger Hunt","Bobby Charlton","Martin Peters","Jimmy Greaves","Norman Hunter","Peter Bonetti","Gerry Byrne","Ian Callaghan","Terry Cooper","Keith Newton","Alan Mullery","Brian Labone","Francis Lee","Colin Bell","Allan Clarke","Emlyn Hughes"]},
  italia90:{name:"ITALIA 90",desc:"Gazza's tears and a nation hooked",emoji:"😢",cat:"england",iconic:3,players:["Peter Shilton","Gary Lineker","Paul Gascoigne","Stuart Pearce","Chris Waddle","Des Walker","Terry Butcher","Peter Beardsley","David Platt","Mark Wright","John Barnes","Steve McMahon","Steve Hodge","Trevor Steven","Paul Parker"]},
  euro96:{name:"EURO 96",desc:"The summer football nearly came home",emoji:"🎤",cat:"england",iconic:4,players:["David Seaman","Alan Shearer","Teddy Sheringham","Tony Adams","Darren Anderton","Steve McManaman","Paul Ince","Gareth Southgate","Gary Neville","Sol Campbell","Stuart Pearce","Paul Gascoigne","David Platt","Steve Stone","Robbie Fowler","Nick Barmby"]},
  golden:{name:"GOLDEN GENERATION",desc:"England's most talented generation never to win it all",emoji:"⭐",cat:"england",iconic:2,players:["David Beckham","Steven Gerrard","Frank Lampard","John Terry","Rio Ferdinand","Ashley Cole","Wayne Rooney","Michael Owen","Michael Carrick","Joe Cole","Paul Scholes","Gary Neville","Emile Heskey","Sol Campbell","Wes Brown","Owen Hargreaves","Phil Neville","David James","Gareth Barry","Jermain Defoe","Wayne Bridge","Glen Johnson"]},
  southgate:{name:"SOUTHGATE ERA",desc:"The team that made England believe again",emoji:"🦁",cat:"england",iconic:1,players:["Jordan Pickford","Kyle Walker","John Stones","Harry Maguire","Kieran Trippier","Luke Shaw","Declan Rice","Jordan Henderson","Jude Bellingham","Mason Mount","Phil Foden","Bukayo Saka","Raheem Sterling","Harry Kane","Marcus Rashford","Jack Grealish","Trent Alexander-Arnold","Marc Guehi","Conor Gallagher"]},

  class92:{name:"CLASS OF 92",desc:"United's academy graduates who shaped a generation",emoji:"😈",cat:"club",iconic:5,players:["David Beckham","Paul Scholes","Gary Neville","Phil Neville","Nicky Butt"]},
  forest:{name:"FOREST EUROPEAN KINGS",desc:"Clough's back-to-back European champions",emoji:"⚫",cat:"club",iconic:4,players:["Peter Shilton","Chris Woods","Viv Anderson","Larry Lloyd","Trevor Francis","Tony Woodcock","Garry Birtles","Ian Bowyer","Stan Bowles","Frank Clark","David Needham","Gary Mills"]},
  blackburn:{name:"BLACKBURN 95",desc:"Blackburn's title-winning outsiders",emoji:"🔵",cat:"club",iconic:3,players:["Alan Shearer","Chris Sutton","Tim Flowers","Tim Sherwood","Graeme Le Saux","Stuart Ripley","Jason Wilcox","David Batty","Mike Newell","Paul Warhurst","Graham Fenton","Tony Gale","Mark Atkins","Lee Makel","Paul Harford","Bobby Mimms"]},
  newcastle:{name:"NEWCASTLE ENTERTAINERS",desc:"Keegan's fearless entertainers",emoji:"⚪",cat:"club",iconic:3,players:["Peter Beardsley","Les Ferdinand","Rob Lee","Steve Watson","Steve Howey","Warren Barton","Robbie Elliott","Darren Peacock","David Batty","Lee Clark","Paul Kitson","Darren Huckerby","Ruel Fox","Steve Harper","John Beresford","Scott Sellars","Paul Brayson","Chris Holland"]},
  foxes:{name:"FOXES 2016",desc:"Leicester's miracle-season champions",emoji:"🦊",cat:"club",iconic:5,players:["Jamie Vardy","Danny Drinkwater","Marc Albrighton","Danny Simpson","Ben Chilwell","Nathan Dyer"]},
  liverpool:{name:"LIVERPOOL DYNASTY",desc:"The boot-room dynasty that ruled Europe",emoji:"🔴",cat:"club",iconic:2,players:["Phil Neal","Phil Thompson","Ray Clemence","Emlyn Hughes","Ray Kennedy","Terry McDermott","David Johnson","Tommy Smith","Ian Callaghan","Larry Lloyd","Robbie Fowler","Steve McManaman","Jamie Redknapp","David James","Neil Ruddock","Stan Collymore","Paul Ince","Steven Gerrard","Jamie Carragher","Stephen Warnock","Scott Carson","John Scales"]},
  eagles:{name:"EAGLES RISING",desc:"Crystal Palace's most exciting young crop in years",emoji:"🦅",cat:"club",iconic:4,players:["Dean Henderson","Marc Guehi","Tyrick Mitchell","Joel Ward","Adam Wharton","Eberechi Eze","Nathaniel Clyne","Will Hughes","Eddie Nketiah","Ben Chilwell"]},
  citydynasty:{name:"CITY DYNASTY",desc:"Guardiola's relentless blue machine",emoji:"💙",cat:"club",iconic:3,players:["Phil Foden","John Stones","Kyle Walker","Jack Grealish","Kalvin Phillips","Raheem Sterling","Fabian Delph","James Milner","Joe Hart","Rico Lewis","James Trafford","Nico O'Reilly"]},

  crazygang:{name:"CRAZY GANG ENERGY",desc:"Wimbledon's fearless misfits",emoji:"⚡",cat:"egg",iconic:5,players:["Dave Beasant","Dennis Wise","John Fashanu","Alan Cork","Wally Downes","Eric Young","Andy Thorn","Brian Gayle","Carlton Fairweather"]},
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
  // ekran powitalny: pełne puste boisko (zdejmij ewentualny shrunk z poprzedniej rundy)
  const pitchCol = el("s-xad") ? el("s-xad").querySelector(".xad-col-pitch") : null;
  if(pitchCol) pitchCol.classList.remove("shrunk");
  render(); flash("");
}
// "ROLL THE SQUAD" → rzut kostką (animacja), losuj pulę, kaskada pojawiania, ekran powitalny znika
let ROLLING = false;
function drawSquad(){
  if(ROLLING || DEALT) return;
  const dice = el("xad-dice");
  const btn = el("xad-pick-btn");
  // bez animacji (fallback) gdy brak elementów
  if(!dice){ POOL=buildPool(); REROLL_USED=false; DEALT=true; POS_FILTER=null; render(); flash(""); return; }
  ROLLING = true;
  if(btn) btn.classList.add("rolling");
  dice.classList.add("rolling");                 // kostka się trzęsie/obraca
  // po krótkim rzucie — rozdaj
  setTimeout(()=>{
    POOL = buildPool();
    REROLL_USED = false;
    DEALT = true; POS_FILTER = null;
    ROLLING = false;
    dice.classList.remove("rolling");
    if(btn) btn.classList.remove("rolling");
    render(); flash("");
    // mobile: od razu skurcz boisko, żeby kaskada nazwisk była widoczna bez scrollowania
    const pitchCol = el("s-xad") ? el("s-xad").querySelector(".xad-col-pitch") : null;
    if(pitchCol) pitchCol.classList.add("shrunk");
    // kaskada: zawodnicy w puli pojawiają się jeden po drugim
    cascadePool();
  }, 520);
}
// kaskada pojawiania kart w puli — dodaje klasę po kolei (CSS robi fade/slide), widocznie od 1. do ostatniego
function cascadePool(){
  const cards = el("xad-pool") ? el("xad-pool").querySelectorAll(".xad-card") : [];
  cards.forEach((c,i)=>{
    c.classList.add("dealt-in");
    c.style.animationDelay = (i*60)+"ms";       // ~1.8s na całą pulę 30 — widać sypanie po kolei
  });
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
  // ekran powitalny (kostka + ROLL THE SQUAD + tekst) — widoczny tylko przed rozdaniem
  const welcome = el("xad-welcome");
  if(welcome) welcome.style.display = DEALT ? "none" : "";
  // POOL (lista nazwisk)
  const poolEl = el("xad-pool"); poolEl.innerHTML = "";
  if(!DEALT){
    poolEl.innerHTML = '<div class="xad-poolempty">Roll the squad to deal your players.</div>';
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
  const lb = el("xad-lock-btn");
  if(lb){
    const wasReady = lb.classList.contains("ready");
    const ready = picked() === 11;
    lb.disabled = !ready;
    lb.textContent = ready ? "✓ XI COMPLETE · LOCK IN" : "⚽ LOCK IN";
    lb.classList.toggle("ready", ready);
    // moment kompletu → przewiń podświetlony LOCK IN do widoku (nie chowa się pod scrollem)
    if(ready && !wasReady){ try{ lb.scrollIntoView({behavior:"smooth", block:"center"}); }catch(e){} }
  }
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

/* ── INTERPRETACJA RESZTY SKŁADU ──────────────────────────────────────
   Patrzy na graczy SPOZA rdzenia narracji i opisuje ich najmocniejszą cechą.
   Nie na siłę: jeśli reszta to zbieranina → "chaos". Deterministyczne + losowy wariant językowy.
   B+: gdy JEST narracja, opis reszty ma formę "obok rdzenia" (alongside/backed) — żeby nie
   brzmiał jak opis całej drużyny i nie kłócił się z erą narracji (np. Forest 1979 + "new breed").
   Gdy MIXED (brak narracji), opisy mogą być swobodne — nie ma z czym się kłócić. */
const REST_PHRASES_SUPPORT = {  // przy narracji — zawsze "obok głównej historii"
  era_c:   ["with old-school names alongside","backed by a few throwback faces","with some classic blood in support"],
  era_g:   ["with golden-era icons alongside","backed by some Premier League royalty","with peak-years names in support"],
  era_m:   ["with a modern cast alongside","backed by some newer blood","with today's lot in support"],
  legends: ["with a few legends alongside","backed by some big names","with icons dotted in support"],
  chaos:   ["with a mixed cast alongside","backed by a bit of everything","with an odd supporting cast"],
};
const REST_PHRASES = {  // przy MIXED — swobodne, bo nie ma głównej historii do kłótni
  era_c:    ["backed by old-school English grit","with a backbone of classic English names","surrounded by throwback legends","proper old-school stuff","a right throwback this lot"],
  era_g:    ["powered by the golden generation","with golden-era icons alongside","strengthened by Premier League royalty","peak Premier League right here","the golden lads all over this"],
  era_m:    ["bolstered by the modern game","with today's stars filling in","backed by a modern supporting cast","the new breed stepping up","today's lot doing the business"],
  legends:  ["surrounded by English legends","backed by some of the game's biggest names","with icons dotted across the pitch","some proper legends in there","the real deal, this lot"],
  sameEra:  ["united by a single generation","all cut from the same era","sharing one footballing age"],
  chaos:    ["with a chaotic collection of football icons","held together by glorious randomness","backed by a supporting cast from all over","with a gloriously mismatched bench","a right old mishmash","where did this lot come from"],
};
function pickPhrase(key, support){
  const bank = support ? REST_PHRASES_SUPPORT : REST_PHRASES;
  const arr = bank[key] || bank.chaos || REST_PHRASES.chaos;
  return arr[rnd(arr.length)];
}
// zwraca opis reszty (graczy spoza rdzenia narracji) — albo całego XI gdy brak narracji
function interpretRest(xiPlayers, mainK){
  const core = mainK ? new Set(NARRATIVES[mainK].players) : new Set();
  const rest = xiPlayers.filter(p => !core.has(p.n));
  if(rest.length === 0) return "";                  // cała XI to rdzeń — nic nie dopisujemy
  const support = !!mainK;                           // jest narracja → forma "obok rdzenia"
  const n = rest.length;
  const majority = Math.ceil(n/2);                  // "większość reszty"
  // policz cechy reszty
  const eraCount = {C:0,G:0,M:0};
  let stars=0;
  rest.forEach(p=>{
    eraCount[p.e]++;
    if(STARS.has(p.n)) stars++;
  });
  const domEra = Object.keys(eraCount).sort((a,b)=>eraCount[b]-eraCount[a])[0];
  const domEraN = eraCount[domEra];
  // priorytet cech (wiarygodne dane): legendy → spójna era → chaos
  // (one-club men celowo pominięte — wymaga tagowania, c.length w bazie zawodne)
  if(stars >= majority && stars >= 3) return pickPhrase("legends", support);
  if(domEraN >= majority && domEraN >= 3){
    return pickPhrase("era_"+domEra.toLowerCase(), support);
  }
  return pickPhrase("chaos", support);
}

/* ── ARCHETYPY (krok 1: darmowe — baza już je wie) ────────────────────
   Pojawiają się gdy NIE ma narracji klubowej/turniejowej (zamiast nudnego MIXED).
   Club Tribute: 5+ z jednego klubu. Same Era: 8+ z jednej epoki. Klub > era gdy oba.
   Nazwy różne dla każdego (slogany z charakterem), losowany 1 wariant. */
const ARCH_ERA_NAMES = {
  C: ["THE OLD GUARD","THROWBACK XI","THE OLD SCHOOL","VINTAGE XI"],
  G: ["THE GOLDEN AGE","GOLDEN-ERA XI","THE GOLDEN GENERATION","PEAK YEARS XI"],
  M: ["THE MODERN BREED","NEW-SCHOOL XI","THE NEW WAVE","TODAY'S BREED"],
};
const ARCH_CLUB_TEMPLATES = [
  c => "THE "+c+" CORE",
  c => c+" HEARTLAND",
  c => "BUILT AT "+c,
  c => "A "+c+" TRIBUTE",
  c => c+" THROUGH AND THROUGH",
];
const ARCH_CLUB_EMOJI = "🛡️";                     // Club Tribute — tarcza/herb (budowane wokół klubu)
const ARCH_ERA_EMOJI = { C:"📺", G:"⭐", M:"⚡" };   // Same Era — znak epoki (retro TV / złota gwiazda / nowoczesna energia)
const ARCH_UNDERDOG_NAMES = ["THE UNDERDOGS","NO BIG CLUBS HERE","THE MINNOWS","PURE UNDERDOG XI","THE LITTLE GUYS"];
const ARCH_UNDERDOG_EMOJI = "🐶";                  // underdog — żaden z top6 w składzie

/* ── ALSO NOTICED — interpretacja CAŁEJ XI: druga połowa zdania o składzie ──
   Progi jako UDZIAŁ w reszcie (nie magiczne liczby) — adaptują się do wielkości rdzenia/formacji. */
const CLUB_BACKBONE_SHARE = 0.55;   // klub = mocny kręgosłup reszty   (~4 z 6-7)
const ERA_DOMINANCE_SHARE = 0.85;   // era  = niemal CAŁA reszta epoki   (~6 z 6-7)
const ALSO_ERA_LABEL = { C:"the Old Guard", G:"the Golden Era", M:"the Modern Era" };
const ALSO_ERA_PHRASES = [
  e => "surrounded by players from "+e,
  e => "backed by "+e,
  e => "with "+e+" running through the squad",
  e => "heavily shaped by "+e,
];
const ALSO_CLUB_PHRASES = [
  c => "with a strong "+c+" backbone",
  c => "built on a "+c+" spine",
  c => "with "+c+" running through the team",
  c => "supported by a "+c+" core",
];
// Title Case w płynącym zdaniu (nie krzykliwe CAPS), z zachowaniem akronimów (QPR itp.)
const CLUB_WORD_UPPER = new Set(["qpr","wba","psv","mk","afc"]);
function titleClub(c){
  return String(c).split(" ").map(w => CLUB_WORD_UPPER.has(w) ? w.toUpperCase() : (w.charAt(0).toUpperCase()+w.slice(1))).join(" ");
}
const TOP6 = new Set(["man utd","liverpool","arsenal","chelsea","man city","tottenham"]);
// koszulka Anglii z krzyżem św. Jerzego (1:1 z Footy Legends, nagłówek LEGENDARY XI) — easter egg 1966
const ENGLAND_SHIRT_SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M 5 6 L 8 4 L 9 5 L 12 6 L 15 5 L 16 4 L 19 6 L 20 9 L 17 10 L 17 19 L 7 19 L 7 10 L 4 9 Z" fill="#fff" stroke="#000" stroke-width="0.8"/><rect x="13" y="6" width="2" height="13" fill="#c8102e"/><rect x="11" y="10" width="6" height="2" fill="#c8102e"/></svg>';
function clubDisplay(c){ return String(c).toUpperCase(); }
// zwraca {name, emoji, club|era} albo null — tylko gdy brak narracji
function detectArchetype(xiPlayers){
  // Club Tribute: najliczniejszy klub w XI
  const clubs = {};
  xiPlayers.forEach(p => p.c.forEach(c => clubs[c]=(clubs[c]||0)+1));
  let topClub=null, topClubN=0;
  for(const c in clubs){ if(clubs[c]>topClubN){ topClubN=clubs[c]; topClub=c; } }
  // Same Era: najliczniejsza epoka
  const eras = {}; xiPlayers.forEach(p => eras[p.e]=(eras[p.e]||0)+1);
  let topEra=null, topEraN=0;
  for(const e in eras){ if(eras[e]>topEraN){ topEraN=eras[e]; topEra=e; } }
  // Underdog: ŻADEN gracz nie należy do top6 (każdy gracz — sprawdzamy czy choć jeden jego klub to top6)
  // Underdog: co najwyżej 1 gracz z top6 jako GŁÓWNY klub (c[0]).
  // Liczymy po c[0] (nie historii), bo epizod w gigancie nie czyni z kogoś gwiazdy top6.
  // Próg ≤1 (nie 0), bo kolejność klubów w bazie bywa myląca (ktoś z krótkim epizodem w top6
  // jako pierwszy klub) — jeden taki nie psuje ducha "składu bez gigantów".
  const top6Count = xiPlayers.filter(p => TOP6.has(p.c[0])).length;
  // kolejność: Club Tribute (klub w przewadze) > Underdog (zero top6) > Same Era
  if(topClubN >= 5){
    const tpl = ARCH_CLUB_TEMPLATES[rnd(ARCH_CLUB_TEMPLATES.length)];
    return {name: tpl(clubDisplay(topClub)), emoji: ARCH_CLUB_EMOJI, kind:"club", key:topClub, count:topClubN};
  }
  if(top6Count <= 1){
    return {name: ARCH_UNDERDOG_NAMES[rnd(ARCH_UNDERDOG_NAMES.length)], emoji: ARCH_UNDERDOG_EMOJI, kind:"underdog", key:null, count:0};
  }
  if(topEraN >= 8){
    const arr = ARCH_ERA_NAMES[topEra];
    return {name: arr[rnd(arr.length)], emoji: ARCH_ERA_EMOJI[topEra]||"⭐", kind:"era", key:topEra, count:topEraN};
  }
  return null;
}

/* ── REVEAL ───────────────────────────────────────────────────────── */
/* ── ALSO NOTICED: druga spójność w RESZCIE składu (poza rdzeniem). INTERPRETACJA, nie nagroda.
   Bramka (w lockXI): rdzeń główny = 4–5. Tu reszta: KLUB(c[0]) ≥ CLUB_BACKBONE_SHARE  LUB
   ERA ≥ ERA_DOMINANCE_SHARE udziału reszty. Tie-break klub > era. Jedna obserwacja. Zero punktów.
   Zwraca .clause = druga połowa zdania (małą literą, bez emoji — emoji jest przy tytule). */
function detectAlso(xiPlayers, coreSet, excludeClub){
  const rest = xiPlayers.filter(p => !coreSet.has(p.n));
  const R = rest.length;
  if(R < 4) return null;
  const clubs = {};
  rest.forEach(p => { const c = p.c && p.c[0]; if(c && c!==excludeClub) clubs[c]=(clubs[c]||0)+1; });
  let topClub=null, topClubN=0;
  for(const c in clubs){ if(clubs[c]>topClubN){ topClubN=clubs[c]; topClub=c; } }
  const eras = {}; rest.forEach(p => eras[p.e]=(eras[p.e]||0)+1);
  let topEra=null, topEraN=0;
  for(const e in eras){ if(eras[e]>topEraN){ topEraN=eras[e]; topEra=e; } }
  if(topClubN >= R*CLUB_BACKBONE_SHARE){
    const members = new Set(rest.filter(p => p.c[0]===topClub).map(p=>p.n));
    const clause = ALSO_CLUB_PHRASES[rnd(ALSO_CLUB_PHRASES.length)](titleClub(topClub));
    return {kind:"club", key:topClub, count:topClubN, members, clause};
  }
  if(topEraN >= R*ERA_DOMINANCE_SHARE){
    const members = new Set(rest.filter(p => p.e===topEra).map(p=>p.n));
    const clause = ALSO_ERA_PHRASES[rnd(ALSO_ERA_PHRASES.length)](ALSO_ERA_LABEL[topEra] || "the Golden Era");
    return {kind:"era", key:topEra, count:topEraN, members, clause};
  }
  return null;
}

/* Etap 1 — Legacy: trwały zapis odkrytych historii XI After Dark (localStorage) */
function getXadStories(){ try{ return new Set(JSON.parse(localStorage.getItem("fl_xad_stories")||"[]")); }catch(e){ return new Set(); } }
function addXadStory(key){ try{ const s=getXadStories(); if(s.has(key)) return false; s.add(key); localStorage.setItem("fl_xad_stories", JSON.stringify([...s])); return true; }catch(e){ return false; } }

/* Etap 4 — popup odkrycia (kolekcjonerski). tier: rarity tylko jako NAGRODA dla rzadkich. */
const STORY_INFO = {
  heroes66:{e:"🏆",n:"1966 HEROES",tier:"legendary"},
  italia90:{e:"😢",n:"ITALIA 90",tier:"legendary"},
  euro96:{e:"🎤",n:"EURO 96",tier:"common"},
  golden:{e:"⭐",n:"GOLDEN GENERATION",tier:"common"},
  southgate:{e:"🦁",n:"SOUTHGATE ERA",tier:"common"},
  class92:{e:"😈",n:"CLASS OF 92",tier:"common"},
  forest:{e:"⚫",n:"FOREST EUROPEAN KINGS",tier:"legendary"},
  blackburn:{e:"🔵",n:"BLACKBURN 95",tier:"common"},
  newcastle:{e:"⚪",n:"NEWCASTLE ENTERTAINERS",tier:"common"},
  foxes:{e:"🦊",n:"FOXES 2016",tier:"common"},
  liverpool:{e:"🔴",n:"LIVERPOOL DYNASTY",tier:"rare"},
  eagles:{e:"🦅",n:"EAGLES RISING",tier:"common"},
  citydynasty:{e:"💙",n:"CITY DYNASTY",tier:"common"},
  crazygang:{e:"⚡",n:"CRAZY GANG ENERGY",tier:"legendary"},
  arch_club:{e:"🛡️",n:"CLUB TRIBUTE",tier:"rare"},
  arch_era:{e:"⏳",n:"SAME ERA XI",tier:"common"},
  arch_underdog:{e:"🐶",n:"UNDERDOG XI",tier:"legendary"},
};
const STORY_RARITY_LINE = { legendary:"Fewer than 1% of squads find this", rare:"A rare discovery", common:"" };
function showStoryDiscovery(key){
  const info = STORY_INFO[key]; if(!info) return;
  const rl = STORY_RARITY_LINE[info.tier] || "";
  const rar = rl ? '<div class="xsp-rar">'+rl+'</div>' : '';
  let ov = document.getElementById("xad-story-pop");
  if(!ov){ ov = document.createElement("div"); ov.id = "xad-story-pop"; document.body.appendChild(ov); }
  ov.innerHTML =
    '<div class="xsp-card">'+
      '<div class="xsp-top">NEW ENTRY ADDED<br>TO YOUR LEGACY</div>'+
      '<div class="xsp-emoji">'+info.e+'</div>'+
      '<div class="xsp-name">'+info.n+'</div>'+ rar +
    '</div>';
  ov.className = "show";
  const close = ()=>{ ov.className = ""; };
  ov.onclick = close;
}

function lockXI(){
  const xiPlayers = SLOTS.map(s=>s.player);
  const xiNames = xiPlayers.map(p=>p.n);
  const det = detect(xiNames);

  let score = w1(xiPlayers);
  if(det.main) score += w2(det.main, det.counts[det.main]);
  if(CFG.USE_W3) score += w3(xiPlayers, det.counts);
  // ── DYSCYPLINA TAKTYCZNA: +3 za zawodnika na dokładnej pozycji slotu (bez GK), max +30 ──
  let tacMatches = 0;
  SLOTS.forEach(s => { if(s.p !== "GK" && s.player && s.player.pos === s.pos) tacMatches++; });
  const tacBonus = tacMatches * 3;
  score += tacBonus;
  score = Math.round(score);

  let html = "";
  // archetyp liczymy tylko gdy brak narracji (jak dotąd)
  let archetype = det.main ? null : detectArchetype(xiPlayers);

  // ── ALSO NOTICED: rdzeń główny (narracja LUB club-tribute) musi mieć 4–5 graczy ──
  let coreSet = new Set(), mainClub = null;
  if(det.main){
    NARRATIVES[det.main].players.forEach(n => { if(xiNames.includes(n)) coreSet.add(n); });
  }else if(archetype && archetype.kind==="club"){
    mainClub = archetype.key;
    xiPlayers.forEach(p => { if(p.c.includes(mainClub)) coreSet.add(p.n); });
  }
  const also = (coreSet.size>=4 && coreSet.size<=5) ? detectAlso(xiPlayers, coreSet, mainClub) : null;

  // nagłówek (król zostaje duży)
  if(det.main){
    const M = NARRATIVES[det.main];
    const mythic = isMythic(det.main, det.counts[det.main]);
    if(mythic) html += '<div class="xad-tag">Mythic</div>';
    html += '<div class="xad-headline'+(mythic?" mythic":"")+'">'+M.emoji+' '+M.name+'</div>';
  }else if(archetype){
    html += '<div class="xad-headline">'+archetype.emoji+' '+archetype.name+'</div>';
  }else{
    html += '<div class="xad-mixedname">MIXED XI</div>';
  }
  // podtytuł = INTERPRETACJA całej XI: opis narracji + (", " druga połowa = klauzula ALSO). Jedno zdanie.
  const capFirst = s2 => s2 ? s2.charAt(0).toUpperCase()+s2.slice(1) : s2;
  if(det.main){
    const desc = NARRATIVES[det.main].desc || "";
    if(desc) html += '<div class="xad-flavor">'+desc+(also ? ", "+also.clause : "")+'.</div>';
    else { const rest = interpretRest(xiPlayers, det.main); if(rest) html += '<div class="xad-flavor">'+rest+'</div>'; }
  }else if(archetype && also){
    html += '<div class="xad-flavor">'+capFirst(also.clause)+'.</div>';
  }else if(archetype){
    const rest = interpretRest(xiPlayers, null);
    if(rest) html += '<div class="xad-flavor">'+rest+'</div>';
  }else{
    const rest = interpretRest(xiPlayers, null);
    html += '<div class="xad-flavor">'+(rest || eraDescriptor(xiPlayers))+'</div>';
  }
  // Etap 1/4 — zapis odkrycia + dane do licznika i celebracji
  let storyKey = det.main ? det.main : (archetype ? "arch_"+archetype.kind : null);
  let storyIsNew = false;
  try{ if(storyKey) storyIsNew = addXadStory(storyKey); }catch(e){}
  const storiesFound = getXadStories().size;
  html += '<div class="xad-score">'+score+'</div>';
  html += '<div class="xad-lineup-note">LINED UP '+FORMATION+'</div>';

  // BOISKO z jedenastką + GLOW POWIĄZAŃ (widać wzrokiem DLACZEGO to ta historia)
  const eraCount = {}; xiPlayers.forEach(p=>eraCount[p.e]=(eraCount[p.e]||0)+1);
  const domEra = Object.keys(eraCount).sort((a,b)=>eraCount[b]-eraCount[a])[0];
  const narrPlayers = det.main ? new Set(NARRATIVES[det.main].players) : new Set();
  // EASTER EGG 1966: gdy odblokowana narracja heroes66 — rdzeń dostaje koszulkę Anglii zamiast koła
  const is66 = det.main === "heroes66";
  const core66 = is66 ? new Set(NARRATIVES.heroes66.players) : new Set();
  // rdzeń archetypu (gdy brak narracji): gracze z klubu-tribute lub z dominującej ery archetypu
  const archCore = (p) => {
    if(!archetype) return false;
    if(archetype.kind==="club") return p.c.includes(archetype.key);
    if(archetype.kind==="era")  return p.e===archetype.key;
    return false;
  };
  // ALSO NOTICED na boisku: reszta-spójność świeci swoim kolorem (klub=cyan, era=kolor ery), słabiej niż rdzeń
  const alsoMembers = also ? also.members : null;
  const alsoLink = also ? (also.kind==="club" ? "link-also-club" : "link-era era-"+also.key.toLowerCase()) : "";
  html += '<div class="xad-pitch xad-pitch-reveal'+(is66?" pitch-66":"")+'"><div class="xad-penalty"></div><div class="xad-sixyard"></div>';
  SLOTS.forEach(s=>{
    const p=s.player;
    // EASTER EGG: gracz z rdzenia '66 → koszulka Anglii z krzyżem św. Jerzego (zamiast koła)
    if(is66 && core66.has(p.n)){
      html += '<div class="pdot p66 filled" style="left:'+(s.x*100)+'%;top:'+(s.y*100)+'%">'+
                '<div class="shirt66">'+ENGLAND_SHIRT_SVG+'</div>'+
                '<div class="pname">'+escXad(lastName(p.n))+'</div>'+
                '<div class="pclub">'+escXad(clubLabel(p))+'</div>'+
              '</div>';
      return;
    }
    // warstwa 1: rdzeń narracji → złoty, rdzeń archetypu → magenta
    // warstwa 2: ALSO NOTICED (reszta-spójność) → cyan (klub) / kolor ery (era)
    // warstwa 3 (gdy brak ALSO): reszta z dominującej ery → delikatny glow ery
    let link = "";
    if(narrPlayers.has(p.n)) link = " link-narr";
    else if(archCore(p)) link = " link-arch";
    else if(alsoMembers && alsoMembers.has(p.n)) link = " "+alsoLink;
    else if(!also && p.e===domEra && eraCount[domEra]>=5) link = " link-era era-"+p.e.toLowerCase();
    html += '<div class="pdot '+GRP[p.p]+' filled'+link+'" style="left:'+(s.x*100)+'%;top:'+(s.y*100)+'%">'+
              '<div class="pcircle">'+s.pos+'<span class="eradot '+(ERA_DOT[p.e]||"")+'"></span></div>'+
              '<div class="pname">'+escXad(lastName(p.n))+'</div>'+
              '<div class="pclub">'+escXad(clubLabel(p))+'</div>'+
            '</div>';
  });
  html += '</div>';
  // Etap 5 — pasek postępu (proporcjonalny; BEZ liczby totalu — zachowuje tajemnicę skali)
  const _tot = Object.keys(STORY_INFO).length;
  const _pct = Math.max(0, Math.min(100, Math.round(storiesFound/_tot*100)));
  html += '<div class="xad-legacy-progress">'+
          '<div class="xlp-lbl">LEGACY PROGRESS</div>'+
          '<div class="xlp-bar"><div class="xlp-fill" style="width:'+_pct+'%"></div></div>'+
          '<div class="xlp-count">'+storiesFound+' '+(storiesFound===1?'STORY':'STORIES')+' FOUND</div></div>';
  el("xad-reveal-body").innerHTML = html;
  showXadScreen("xad-reveal");
  // Etap 4 — celebracja NOWEGO odkrycia (konfetti + popup), reuse confettiBurst z game.js
  if(storyIsNew && storyKey){
    try{ if(typeof confettiBurst === "function") setTimeout(confettiBurst, 280); }catch(e){}
    try{ showStoryDiscovery(storyKey); }catch(e){}
  }
}

/* ── SCREEN SWITCHING (within #s-xad) ─────────────────────────────── */
function showXadScreen(id){
  ["xad-draft","xad-reveal"].forEach(s=>{
    const e=el(s); if(e) e.style.display = (s===id)?"":"none";
  });
  // #s-xad ma własny scroll (overflow-y:auto na mobile) → trzeba zresetować JEGO scrollTop, nie window.
  const sx = el("s-xad");
  const toTop = ()=>{ window.scrollTo(0,0); if(sx) sx.scrollTop = 0; };
  toTop();
  requestAnimationFrame(toTop);
}

/* ── ENTRY POINT (called by go('s-xad') / menu button) ────────────── */
function openXAD(){
  if(typeof DB==="undefined" || !DB.length){ if(typeof toast==="function") toast("DB NOT LOADED","err"); return; }
  go('s-xad');
  openDraftEmpty();      // puste boisko + ROLL THE SQUAD
}
// (sticky-scroll usunięty: boisko zostaje małe na stałe po rozdaniu — koniec dygotania.
//  Pełne, duże boisko jest tylko w reveal jako nagroda.)

/* expose to global for onclick handlers + go() hook */
window.openXAD       = openXAD;
window.xadDraw       = drawSquad;       // "PICK MY 30"
window.xadReroll     = rerollPool;      // "RE-ROLL UNPICKED (1x)"
window.xadLockXI     = lockXI;
window.xadClearFilter= clearFilter;     // "SHOW ALL 30"
window.xadPlayAgain  = openDraftEmpty;  // po reveal → puste boisko + PICK MY 30

})();
