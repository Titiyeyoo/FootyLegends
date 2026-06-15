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
  },
  MIN_C: 5, MIN_M: 5,
  MAX_DEEPCUT_RATIO: 0.40,

  // W1 base
  STAR_PTS: 10, NARR_PLAYER_PTS: 7, DEEP_CUT_PTS: 6,
  // W2 narrative bonus
  W2_K: 40, W2_COMPL: 0.6, W2_SHARE: 0.4, W2_SPEC_BASE: 20, W2_SPEC_AMT: 0.5,
  // W3 hidden synergy + memory bonus
  W3_ERA_9:18, W3_ERA_7:12, W3_ERA_5:6, W3_CAP:30, W3_MEMORY_PER:2, W3_MEMORY_CAP:10,

  THRESHOLDS: { england:6, club:4, egg:4, theme:6 },
};

const FORM_HINT = {
  "4-4-2":"The classic", "4-3-3":"On the front foot", "3-5-2":"Italia 90 vibes",
  "4-2-3-1":"Southgate shape", "5-3-2":"Shut up shop",
};

/* 15 recognizable stars (brief lock) */
const STARS = new Set([
  "David Beckham","Steven Gerrard","Frank Lampard","Wayne Rooney",
  "Harry Kane","Alan Shearer","Paul Gascoigne","Bobby Moore",
  "Bobby Charlton","Gary Lineker","Jude Bellingham","Bukayo Saka",
  "Michael Owen","John Terry","Rio Ferdinand",
]);

/* ── 13 NARRATIVES (osobna warstwa, exact match z db.js `n`) ──────── */
const DEVIL_SVG = '<svg style="width:1em;height:1em;display:inline-block;vertical-align:middle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" shape-rendering="crispEdges"><rect x="2" y="1" width="1" height="1" fill="#8f1c12"/><rect x="15" y="1" width="1" height="1" fill="#8f1c12"/><rect x="2" y="2" width="1" height="1" fill="#8f1c12"/><rect x="3" y="2" width="1" height="1" fill="#8f1c12"/><rect x="14" y="2" width="1" height="1" fill="#8f1c12"/><rect x="15" y="2" width="1" height="1" fill="#8f1c12"/><rect x="3" y="3" width="1" height="1" fill="#8f1c12"/><rect x="4" y="3" width="1" height="1" fill="#8f1c12"/><rect x="5" y="3" width="1" height="1" fill="#8f1c12"/><rect x="12" y="3" width="1" height="1" fill="#8f1c12"/><rect x="13" y="3" width="1" height="1" fill="#8f1c12"/><rect x="14" y="3" width="1" height="1" fill="#8f1c12"/><rect x="3" y="4" width="1" height="1" fill="#8f1c12"/><rect x="4" y="4" width="1" height="1" fill="#8f1c12"/><rect x="5" y="4" width="1" height="1" fill="#e0382b"/><rect x="6" y="4" width="1" height="1" fill="#e0382b"/><rect x="7" y="4" width="1" height="1" fill="#e0382b"/><rect x="8" y="4" width="1" height="1" fill="#e0382b"/><rect x="9" y="4" width="1" height="1" fill="#e0382b"/><rect x="10" y="4" width="1" height="1" fill="#e0382b"/><rect x="11" y="4" width="1" height="1" fill="#e0382b"/><rect x="12" y="4" width="1" height="1" fill="#e0382b"/><rect x="13" y="4" width="1" height="1" fill="#8f1c12"/><rect x="14" y="4" width="1" height="1" fill="#8f1c12"/><rect x="4" y="5" width="1" height="1" fill="#e0382b"/><rect x="5" y="5" width="1" height="1" fill="#e0382b"/><rect x="6" y="5" width="1" height="1" fill="#e0382b"/><rect x="7" y="5" width="1" height="1" fill="#e0382b"/><rect x="8" y="5" width="1" height="1" fill="#e0382b"/><rect x="9" y="5" width="1" height="1" fill="#e0382b"/><rect x="10" y="5" width="1" height="1" fill="#e0382b"/><rect x="11" y="5" width="1" height="1" fill="#e0382b"/><rect x="12" y="5" width="1" height="1" fill="#e0382b"/><rect x="13" y="5" width="1" height="1" fill="#e0382b"/><rect x="3" y="6" width="1" height="1" fill="#e0382b"/><rect x="4" y="6" width="1" height="1" fill="#e0382b"/><rect x="5" y="6" width="1" height="1" fill="#e0382b"/><rect x="6" y="6" width="1" height="1" fill="#e0382b"/><rect x="7" y="6" width="1" height="1" fill="#e0382b"/><rect x="8" y="6" width="1" height="1" fill="#e0382b"/><rect x="9" y="6" width="1" height="1" fill="#e0382b"/><rect x="10" y="6" width="1" height="1" fill="#e0382b"/><rect x="11" y="6" width="1" height="1" fill="#e0382b"/><rect x="12" y="6" width="1" height="1" fill="#e0382b"/><rect x="13" y="6" width="1" height="1" fill="#e0382b"/><rect x="14" y="6" width="1" height="1" fill="#e0382b"/><rect x="3" y="7" width="1" height="1" fill="#e0382b"/><rect x="4" y="7" width="1" height="1" fill="#e0382b"/><rect x="5" y="7" width="1" height="1" fill="#ffe680"/><rect x="6" y="7" width="1" height="1" fill="#ffe680"/><rect x="7" y="7" width="1" height="1" fill="#e0382b"/><rect x="8" y="7" width="1" height="1" fill="#e0382b"/><rect x="9" y="7" width="1" height="1" fill="#e0382b"/><rect x="10" y="7" width="1" height="1" fill="#e0382b"/><rect x="11" y="7" width="1" height="1" fill="#ffe680"/><rect x="12" y="7" width="1" height="1" fill="#ffe680"/><rect x="13" y="7" width="1" height="1" fill="#e0382b"/><rect x="14" y="7" width="1" height="1" fill="#e0382b"/><rect x="3" y="8" width="1" height="1" fill="#e0382b"/><rect x="4" y="8" width="1" height="1" fill="#e0382b"/><rect x="5" y="8" width="1" height="1" fill="#ffe680"/><rect x="6" y="8" width="1" height="1" fill="#ffe680"/><rect x="7" y="8" width="1" height="1" fill="#e0382b"/><rect x="8" y="8" width="1" height="1" fill="#e0382b"/><rect x="9" y="8" width="1" height="1" fill="#e0382b"/><rect x="10" y="8" width="1" height="1" fill="#e0382b"/><rect x="11" y="8" width="1" height="1" fill="#ffe680"/><rect x="12" y="8" width="1" height="1" fill="#ffe680"/><rect x="13" y="8" width="1" height="1" fill="#e0382b"/><rect x="14" y="8" width="1" height="1" fill="#e0382b"/><rect x="3" y="9" width="1" height="1" fill="#e0382b"/><rect x="4" y="9" width="1" height="1" fill="#e0382b"/><rect x="5" y="9" width="1" height="1" fill="#e0382b"/><rect x="6" y="9" width="1" height="1" fill="#e0382b"/><rect x="7" y="9" width="1" height="1" fill="#e0382b"/><rect x="8" y="9" width="1" height="1" fill="#e0382b"/><rect x="9" y="9" width="1" height="1" fill="#e0382b"/><rect x="10" y="9" width="1" height="1" fill="#e0382b"/><rect x="11" y="9" width="1" height="1" fill="#e0382b"/><rect x="12" y="9" width="1" height="1" fill="#e0382b"/><rect x="13" y="9" width="1" height="1" fill="#e0382b"/><rect x="14" y="9" width="1" height="1" fill="#e0382b"/><rect x="4" y="10" width="1" height="1" fill="#e0382b"/><rect x="5" y="10" width="1" height="1" fill="#e0382b"/><rect x="6" y="10" width="1" height="1" fill="#e0382b"/><rect x="7" y="10" width="1" height="1" fill="#e0382b"/><rect x="8" y="10" width="1" height="1" fill="#e0382b"/><rect x="9" y="10" width="1" height="1" fill="#e0382b"/><rect x="10" y="10" width="1" height="1" fill="#e0382b"/><rect x="11" y="10" width="1" height="1" fill="#e0382b"/><rect x="12" y="10" width="1" height="1" fill="#e0382b"/><rect x="13" y="10" width="1" height="1" fill="#e0382b"/><rect x="4" y="11" width="1" height="1" fill="#8f1c12"/><rect x="5" y="11" width="1" height="1" fill="#e0382b"/><rect x="6" y="11" width="1" height="1" fill="#e0382b"/><rect x="7" y="11" width="1" height="1" fill="#e0382b"/><rect x="8" y="11" width="1" height="1" fill="#e0382b"/><rect x="9" y="11" width="1" height="1" fill="#e0382b"/><rect x="10" y="11" width="1" height="1" fill="#e0382b"/><rect x="11" y="11" width="1" height="1" fill="#e0382b"/><rect x="12" y="11" width="1" height="1" fill="#e0382b"/><rect x="13" y="11" width="1" height="1" fill="#8f1c12"/><rect x="4" y="12" width="1" height="1" fill="#e0382b"/><rect x="5" y="12" width="1" height="1" fill="#8f1c12"/><rect x="6" y="12" width="1" height="1" fill="#8f1c12"/><rect x="7" y="12" width="1" height="1" fill="#8f1c12"/><rect x="8" y="12" width="1" height="1" fill="#8f1c12"/><rect x="9" y="12" width="1" height="1" fill="#8f1c12"/><rect x="10" y="12" width="1" height="1" fill="#8f1c12"/><rect x="11" y="12" width="1" height="1" fill="#8f1c12"/><rect x="12" y="12" width="1" height="1" fill="#8f1c12"/><rect x="13" y="12" width="1" height="1" fill="#e0382b"/><rect x="5" y="13" width="1" height="1" fill="#e0382b"/><rect x="6" y="13" width="1" height="1" fill="#e0382b"/><rect x="7" y="13" width="1" height="1" fill="#e0382b"/><rect x="8" y="13" width="1" height="1" fill="#e0382b"/><rect x="9" y="13" width="1" height="1" fill="#e0382b"/><rect x="10" y="13" width="1" height="1" fill="#e0382b"/><rect x="11" y="13" width="1" height="1" fill="#e0382b"/><rect x="12" y="13" width="1" height="1" fill="#e0382b"/><rect x="6" y="14" width="1" height="1" fill="#e0382b"/><rect x="7" y="14" width="1" height="1" fill="#e0382b"/><rect x="8" y="14" width="1" height="1" fill="#e0382b"/><rect x="9" y="14" width="1" height="1" fill="#e0382b"/><rect x="10" y="14" width="1" height="1" fill="#e0382b"/><rect x="11" y="14" width="1" height="1" fill="#e0382b"/><rect x="7" y="15" width="1" height="1" fill="#e0382b"/><rect x="8" y="15" width="1" height="1" fill="#e0382b"/><rect x="9" y="15" width="1" height="1" fill="#e0382b"/><rect x="10" y="15" width="1" height="1" fill="#e0382b"/><rect x="8" y="16" width="1" height="1" fill="#8f1c12"/><rect x="9" y="16" width="1" height="1" fill="#8f1c12"/></svg>';
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

  bornleaders:{name:"BORN LEADERS",desc:"The leaders who wore the armband for club and country.",emoji:"🎖️",cat:"theme",iconic:3,players:["Peter Shilton","Joe Hart","Bobby Moore","Tony Adams","John Terry","Rio Ferdinand","Stuart Pearce","Terry Butcher","Harry Maguire","Bryan Robson","Steven Gerrard","David Beckham","Paul Ince","David Platt","Harry Kane","Alan Shearer","Wayne Rooney","Gary Lineker","Kevin Keegan"]},

  nearlymen:{name:"THE NEARLY MEN",desc:"World-class talent that never lifted a league title — anywhere.",emoji:"🥈",cat:"theme",iconic:3,players:["Nigel Martyn","David James","Robert Green","Jamie Carragher","Ledley King","Stuart Pearce","Phil Jagielka","Steven Gerrard","Matthew Le Tissier","Jamie Redknapp","Darren Anderton","Kieron Dyer","Jermaine Jenas","Rob Lee","Les Ferdinand","Emile Heskey","Peter Crouch","Stan Collymore","Darren Bent","Theo Walcott"]},
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
let TARGET_SLOT = null;       // indeks konkretnego slotu klikniętego na boisku → następny wybór trafia DOKŁADNIE tu
let LAST_SHARE = null;        // dane ostatniego revealu do karty share (wynik, tytuł, sloty)

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
  DEALT = false; POS_FILTER = null; TARGET_SLOT = null;
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
  if(!dice){ POOL=buildPool(); REROLL_USED=false; DEALT=true; POS_FILTER=null; TARGET_SLOT=null; render(); flash(""); const sx=el("s-xad"); const pin=()=>{ if(sx) sx.scrollTop=0; const pl=el("xad-pool"); if(pl) pl.scrollTop=0; try{ window.scrollTo(0,0); }catch(e){} }; pin(); requestAnimationFrame(pin); setTimeout(pin,380); return; }
  ROLLING = true;
  if(btn) btn.classList.add("rolling");
  dice.classList.add("rolling");                 // kostka się trzęsie/obraca
  // po krótkim rzucie — rozdaj
  setTimeout(()=>{
    POOL = buildPool();
    REROLL_USED = false;
    DEALT = true; POS_FILTER = null; TARGET_SLOT = null;
    ROLLING = false;
    dice.classList.remove("rolling");
    if(btn) btn.classList.remove("rolling");
    render(); flash("");
    // mobile: od razu skurcz boisko, żeby kaskada nazwisk była widoczna bez scrollowania
    const pitchCol = el("s-xad") ? el("s-xad").querySelector(".xad-col-pitch") : null;
    if(pitchCol) pitchCol.classList.add("shrunk");
    // każdy deal startuje od góry (spójnie 1. roll i Play Again) — inaczej GK ucina pula.
    // boisko jest sticky i kurczy się animacją (.shrunk ~0.3s) → przypinamy górę KILKA RAZY,
    // aż layout się ustabilizuje (jeden reset łapał zły moment na Samsungu → pula przewinięta).
    const sx = el("s-xad");
    const pinTop = ()=>{
      if(sx) sx.scrollTop = 0;
      const pl = el("xad-pool"); if(pl) pl.scrollTop = 0;   // pula ma własny scroll na mobile → trzeba ją też przypiąć
      try{ window.scrollTo(0,0); }catch(e){}
    };
    pinTop(); requestAnimationFrame(pinTop);
    setTimeout(pinTop,120); setTimeout(pinTop,380); setTimeout(pinTop,700);
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
  FORMATION = f; TARGET_SLOT = null;
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
  let slot = null;
  // 1) jeśli gracz kliknął konkretny slot i pasuje grupa → trafia DOKŁADNIE tam
  if(TARGET_SLOT!=null && SLOTS[TARGET_SLOT] && !SLOTS[TARGET_SLOT].player && SLOTS[TARGET_SLOT].p===p.p){
    slot = SLOTS[TARGET_SLOT];
  } else {
    slot = SLOTS.find(s=>s.p===p.p && !s.player);          // fallback: pierwszy wolny w grupie
  }
  if(!slot){ if(typeof toast==="function") toast("⚠ "+FORMATION+" — NO "+p.p+" SLOT FREE"); return; }
  slot.player = p; flash("");
  TARGET_SLOT = null; POS_FILTER = null;                   // po wyborze: zdejmij cel i filtr
  render(true, p.n);                                       // animuj wskoczenie tego zawodnika
}
function removeFromSlot(i){
  if(!SLOTS[i].player) return;
  SLOTS[i].player = null; flash(""); render();
}
// klik w PUSTY slot → CELUJ w ten konkretny slot (następny wybór trafia tu) + filtruj pulę do jego grupy
function targetSlot(i){
  if(!DEALT) return;
  const s = SLOTS[i]; if(!s || s.player) return;
  if(TARGET_SLOT===i){ TARGET_SLOT = null; POS_FILTER = null; }   // ponowny klik w ten sam slot zdejmuje cel
  else { TARGET_SLOT = i; POS_FILTER = s.p; }
  render();
}
function filterBySlot(grp){
  if(!DEALT) return;
  POS_FILTER = (POS_FILTER===grp) ? null : grp;
  render();
}
function clearFilter(){ POS_FILTER = null; TARGET_SLOT = null; render(); }

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
  const draftEl = el("xad-draft"); if(draftEl) draftEl.classList.toggle("predeal", !DEALT);
  // .shrunk spójnie zależne od DEALT (a nie tylko raz w drawSquad) → po Play Again boisko nie zostaje pełnowymiarowe
  const _pc = el("s-xad") ? el("s-xad").querySelector(".xad-col-pitch") : null;
  if(_pc) _pc.classList.toggle("shrunk", DEALT);
  const foot = el("xad-predeal-foot");
  if(foot){ const n = getXadStories().size;
    foot.innerHTML = n===0 ? "Hidden stories<br>waiting to be found"
                   : n===1 ? "1 story discovered"
                           : n+" stories discovered"; }
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
    const isFilterTarget = TARGET_SLOT===i && !s.player;
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
      node.onclick = DEALT ? (() => targetSlot(i)) : (() => { try{ window.xadDraw(); }catch(e){} });
    }
    pitchEl.appendChild(node);
  });
  setText("xad-count", picked());
  // akcje (lock/reroll) tylko po rozdaniu
  const actions = el("xad-actions");
  if(actions) actions.style.display = DEALT ? "" : "none";
  const lb = el("xad-lock-btn");
  if(lb){
    const ready = picked() === 11;
    lb.disabled = !ready;
    lb.textContent = ready ? "✓ XI COMPLETE · LOCK IN" : "⚽ LOCK IN";
    lb.classList.toggle("ready", ready);
  }
  const rb = el("xad-reroll-btn");
  if(rb){
    rb.disabled = REROLL_USED;
    rb.textContent = REROLL_USED ? "🎲 RE-ROLL USED" : "🎲 RE-ROLL (1×)";
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
  const catPrio = {theme:4, egg:3, club:2, england:1};
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
const ARCH_UNDERDOG_EMOJI = "🐶";
// ── PULE TYTUŁÓW (losowane przy odsłonięciu; nazwa stała, opis zmienny ≥3) ──
const NARR_TAGLINES = {
  heroes66:["The only XI to ever bring it home.","World Cup winners — nothing left to prove.","1966. The day England conquered the world."],
  italia90:["Gazza's tears. A nation hooked.","So close. Never forgotten.","The summer England fell in love again."],
  euro96:["The summer it nearly came home.","Three Lions, one unforgettable summer.","Football's coming home — almost."],
  golden:["All that talent. All those quarter-finals.","England's modern greats, all at once.","The most gifted XI never to win it all."],
  southgate:["The team that made England believe again.","Finals reached, penalties survived, hope restored.","Waistcoats, semi-finals and second chances."],
  class92:["You can't win anything with kids. They did.","Fergie's fledglings who won the lot.","Born at United, winners for life."],
  forest:["Champions of Europe. Back to back.","A provincial club that conquered a continent.","Clough's miracle in red."],
  blackburn:["Shearer, Sutton and a shock title.","Champions of England against the odds.","The title nobody saw coming."],
  newcastle:["All-out attack. No title. All heart.","Keegan's cavaliers, entertainers to the last.","Played without fear — or a defence."],
  foxes:["5000-1. The greatest story football ever told.","The miracle that broke every odd.","Leicester. League champions. Believe it."],
  liverpool:["The boot-room kings who ruled Europe.","A machine that just kept winning.","This is Anfield — and everyone knew it."],
  eagles:["Palace's brightest crop in a generation.","Young, fearless, on the rise.","Selhurst's new golden boys."],
  citydynasty:["Pep's relentless blue machine.","Sky-blue dominance, year after year.","Turned winning into routine."],
  crazygang:["Wimbledon's misfits who shocked the giants.","No fear. No respect. Just the Crazy Gang.","The roughest, toughest, unlikeliest winners."],
  bornleaders:["11 captains. 11 personalities. One dressing room.","Every single one wore the armband.","Too many leaders. Not enough orders."],
  nearlymen:["Great enough to remember. Unlucky enough to miss the title.","World-class. Trophyless. Unforgettable.","So good. So close. So cruel."],
  mixed:["No era, no theme — just your gut.","Your own blend. No rulebook.","A team only you would pick."],
};
const ARCH_TAGLINES = {
  club:["Built on one club\'s backbone.","One badge runs through this XI.","Loyalty in eleven shirts."],
  era_C:["Old-school to the core.","Before your time — and proud of it.","They don\'t make them like this anymore."],
  era_G:["When the game felt golden.","The era everyone misses.","Peak football, bottled."],
  era_M:["Built for the modern game.","The new breed, all together.","Today\'s football in eleven names."],
  underdog:["No big clubs. No problem.","Not a single giant in sight.","Proof you don\'t need the elite."],
};
function narrTagline(key){ const a=NARR_TAGLINES[key]; return (a&&a.length)?a[rnd(a.length)]:""; }
function archTagline(arch){
  if(!arch) return "";
  let pool=null;
  if(arch.kind==="club") pool=ARCH_TAGLINES.club;
  else if(arch.kind==="underdog") pool=ARCH_TAGLINES.underdog;
  else if(arch.kind==="era") pool=ARCH_TAGLINES["era_"+arch.key];
  return (pool&&pool.length)?pool[rnd(pool.length)]:"";
}                  // underdog — żaden z top6 w składzie

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

// MIXED: brak rdzenia → drugi człon z CAŁEGO składu (łagodniejszy próg: klub ≥4, era ≥5).
function mixedRest(xiPlayers){
  const clubs={}; xiPlayers.forEach(p=>{const c=p.c&&p.c[0]; if(c) clubs[c]=(clubs[c]||0)+1;});
  let tc=null,tcn=0; for(const c in clubs){ if(clubs[c]>tcn){tcn=clubs[c];tc=c;} }
  if(tcn>=4) return ALSO_CLUB_PHRASES[rnd(ALSO_CLUB_PHRASES.length)](titleClub(tc));
  const eras={}; xiPlayers.forEach(p=>eras[p.e]=(eras[p.e]||0)+1);
  let te=null,ten=0; for(const e in eras){ if(eras[e]>ten){ten=eras[e];te=e;} }
  if(ten>=5) return ALSO_ERA_PHRASES[rnd(ALSO_ERA_PHRASES.length)](ALSO_ERA_LABEL[te]||"the Golden Era");
  return "";
}

/* Etap 1 — Legacy: trwały zapis odkrytych historii XI After Dark (localStorage) */
function getXadStories(){ try{ return new Set(JSON.parse(localStorage.getItem("fl_xad_stories")||"[]")); }catch(e){ return new Set(); } }
function addXadStory(key){ try{ const s=getXadStories(); if(s.has(key)) return false; s.add(key); localStorage.setItem("fl_xad_stories", JSON.stringify([...s])); return true; }catch(e){ return false; } }
/* Saved Squads — 1 narracja = 1 najlepszy skład. Pierwszy zawsze zapisany; potem tylko wyższy wynik nadpisuje. */
function getXadSquads(){ try{ return JSON.parse(localStorage.getItem("fl_xad_squads")||"{}"); }catch(e){ return {}; } }
function saveXadSquad(key, score, name){
  if(!key) return;
  try{
    const all = getXadSquads();
    const prev = all[key];
    if(prev && score <= prev.score) return;            // pierwszy zawsze; później tylko lepszy
    all[key] = {
      key:key, name:name||key, formation:FORMATION, score:score, savedAt:Date.now(),
      slots: SLOTS.map(s => { const p=s.player; return p ? {
        pos:s.pos, x:s.x, y:s.y, grp:(GRP[p.p]||""), era:(ERA_DOT[p.e]||""),
        name:lastName(p.n), club:clubLabel(p)
      } : null; })
    };
    localStorage.setItem("fl_xad_squads", JSON.stringify(all));
  }catch(e){}
}

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
  bornleaders:{e:"🎖️",n:"BORN LEADERS",tier:"rare"},
  nearlymen:{e:"🥈",n:"THE NEARLY MEN",tier:"rare"},
};
const STORY_RARITY_LINE = { legendary:"Fewer than 1% of squads find this", rare:"A rare discovery", common:"" };
function showXadPopup(storyKey, tac){
  const info = storyKey ? STORY_INFO[storyKey] : null;
  if(!info && !tac) return;
  let inner = '';
  if(info){
    const rl = STORY_RARITY_LINE[info.tier] || "";
    inner += '<div class="xsp-top">NEW ENTRY ADDED<br>TO YOUR LEGACY</div>'+
             '<div class="xsp-emoji">'+(storyKey==="class92"?DEVIL_SVG:info.e)+'</div>'+
             '<div class="xsp-name">'+info.n+'</div>';
    if(tac){
      inner += '<div class="xsp-tac">'+
                 '<div class="xsp-tac-label">'+tac.icon+' '+tac.label+'</div>'+
                 '<div class="xsp-tac-desc">'+tac.desc+'</div>'+
               '</div>';
    }
    if(rl) inner += '<div class="xsp-rar">'+rl+'</div>';
  }else{
    inner += '<div class="xsp-top">ACHIEVEMENT UNLOCKED</div>'+
             '<div class="xsp-emoji">'+tac.icon+'</div>'+
             '<div class="xsp-name">'+tac.label+'</div>'+
             '<div class="xsp-tac-desc">'+tac.desc+'</div>';
  }
  let ov = document.getElementById("xad-story-pop");
  if(!ov){ ov = document.createElement("div"); ov.id = "xad-story-pop"; document.body.appendChild(ov); }
  ov.innerHTML = '<div class="xsp-card">'+inner+'</div>';
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

  // nagłówek + podtytuł — LICZONE RAZ, używane i w revealu, i w karcie (LAST_SHARE.story)
  // dzięki temu karta pokazuje DOKŁADNIE ten sam (raz wylosowany) werdykt co reveal
  const capFirst = s2 => s2 ? s2.charAt(0).toUpperCase()+s2.slice(1) : s2;
  let storyName="", storyEmoji="", storyDesc="", storyRest="";
  if(det.main){
    const M = NARRATIVES[det.main];
    const mythic = isMythic(det.main, det.counts[det.main]);
    storyName = M.name; storyEmoji = M.emoji;
    storyDesc = narrTagline(det.main) || M.desc || "";
    storyRest = also ? capFirst(also.clause)+"." : "";
    if(mythic) html += '<div class="xad-tag">Mythic</div>';
    html += '<div class="xad-headline'+(mythic?" mythic":"")+'">'+(det.main==="class92"?DEVIL_SVG:M.emoji)+' '+M.name+'</div>';
    if(storyDesc) html += '<div class="xad-flavor">'+storyDesc+'</div>';
    if(storyRest) html += '<div class="xad-flavor-rest">'+storyRest+'</div>';
  }else if(archetype){
    storyName = archetype.name; storyEmoji = archetype.emoji;
    storyDesc = archTagline(archetype) || "";
    storyRest = also ? capFirst(also.clause)+"." : (interpretRest(xiPlayers, null) || "");
    html += '<div class="xad-headline">'+archetype.emoji+' '+archetype.name+'</div>';
    if(storyDesc) html += '<div class="xad-flavor">'+storyDesc+'</div>';
    if(storyRest) html += '<div class="xad-flavor-rest">'+storyRest+'</div>';
  }else{
    storyName = "MIXED XI"; storyEmoji = "🌍";
    storyDesc = narrTagline("mixed") || interpretRest(xiPlayers, null) || eraDescriptor(xiPlayers);
    const mr = mixedRest(xiPlayers);
    storyRest = mr ? capFirst(mr)+"." : "";
    html += '<div class="xad-mixedname">MIXED XI</div>';
    if(storyDesc) html += '<div class="xad-flavor">'+storyDesc+'</div>';
    if(storyRest) html += '<div class="xad-flavor-rest">'+storyRest+'</div>';
  }
  // Etap 1/4 — zapis odkrycia + dane do licznika i celebracji
  let storyKey = det.main ? det.main : (archetype ? "arch_"+archetype.kind : null);
  let storyIsNew = false;
  try{ if(storyKey) storyIsNew = addXadStory(storyKey); }catch(e){}
  try{ if(storyKey) saveXadSquad(storyKey, score, det.main ? NARRATIVES[det.main].name : (archetype ? archetype.name : storyKey)); }catch(e){}
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
  try{
    var ERA_CARD={C:"#c060ff",G:"#ffb030",M:"#30c0ff"};
    var POS_CARD={GK:"#ffdd00",DF:"#88ff44",MF:"#ff6600",FW:"#ff2200"};
    var cardColor=function(p){
      if(narrPlayers.has(p.n)) return "#ffd740";                 // rdzeń narracji → złoto
      if(archCore(p)) return "#ff7ae0";                          // rdzeń archetypu → magenta
      if(alsoMembers && alsoMembers.has(p.n)) return (also.kind==="club") ? "#30e0e0" : (ERA_CARD[also.key]||"#ffffff");
      if(!also && p.e===domEra && eraCount[domEra]>=5) return ERA_CARD[p.e]||"#ffffff";
      return POS_CARD[p.p]||"#ffffff";                           // reszta → kolor pozycji
    };
    // która WARSTWA glow (1:1 z logiką revealu wyżej) — karta rysuje koło dokładnie jak reveal
    var cardLink=function(p){
      if(narrPlayers.has(p.n)) return "narr";
      if(archCore(p)) return "arch";
      if(alsoMembers && alsoMembers.has(p.n)) return (also.kind==="club") ? "also-club" : ("era-"+also.key.toLowerCase());
      if(!also && p.e===domEra && eraCount[domEra]>=5) return "era-"+p.e.toLowerCase();
      return "grey";
    };
    LAST_SHARE = {
      score: score,
      formation: FORMATION,
      story: { key:(storyKey||"mixed"), name:storyName, emoji:storyEmoji, desc:storyDesc, rest:storyRest },
      slots: SLOTS.map(function(s){
        if(!s.player) return null;
        var p=s.player;
        return {x:s.x, y:s.y, pos:s.pos, grp:s.p, name:lastName(p.n), era:p.e, color:cardColor(p), link:cardLink(p), shirt66:(is66 && core66.has(p.n))};
      })
    };
  }catch(e){}
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
  const tac = tacMatches === 10 ? {label:"TACTICAL PURIST", icon:"🧠", desc:"Perfect positional discipline"}
            : tacMatches >= 8  ? {label:"WELL ORGANISED", icon:"📋", desc:"Strong positional discipline"}
            : null;
  if((storyIsNew && storyKey) || tac){
    try{ if((storyIsNew && storyKey) || tacMatches===10){ if(typeof confettiBurst === "function") setTimeout(confettiBurst, 280); } }catch(e){}
    try{ showXadPopup(storyIsNew ? storyKey : null, tac); }catch(e){}
  }
  // ── Ujawnienie historii: NIE startuje samo (leciałoby pod popupem z odznaką).
  //    Czeka na pierwsze kliknięcie gracza (po przeczytaniu narracji/zamknięciu odznaki). ──
  try{ xadArmStoryReveal(); }catch(e){}
}

/* ── UJAWNIENIE HISTORII (story reveal): piłka pokazuje, KTO zbudował narrację ──
   rdzeń = narracja + archetyp (+ koszulki '66). Piłka skacze od dołu do góry i
   "zapala" kolejnych graczy. Auto po werdykcie + mała ikona ↻. Bez iskier/dźwięków. */
let STORY_RUN = 0;
let STORY_ARMED = null;
function xadDisarmStoryReveal(){
  if(STORY_ARMED){ document.removeEventListener("click", STORY_ARMED, true); STORY_ARMED=null; }
}
function xadArmStoryReveal(){
  var pitch=document.querySelector("#s-xad .xad-pitch-reveal");
  if(!pitch || pitch.querySelectorAll(".pdot.link-narr, .pdot.link-arch, .pdot.p66").length===0) return; // MIXED/brak rdzenia → nic
  xadDisarmStoryReveal();
  STORY_ARMED = function(){ xadDisarmStoryReveal(); try{ xadStoryReveal(false); }catch(e){} };
  document.addEventListener("click", STORY_ARMED, true); // pierwsze kliknięcie gdziekolwiek → start (capture, raz)
}
function xadWait(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
function xadHop(ball,x0,y0,x1,y1,dur){
  ball.style.left=x0+"px"; ball.style.top=y0+"px"; ball.style.transform="translate(-50%,-50%)";
  var dx=x1-x0, dy=y1-y0, lift=Math.min(34, Math.max(14, Math.hypot(dx,dy)*0.28));
  var a=ball.animate([
    {transform:"translate(-50%,-50%)"},
    {transform:"translate(calc(-50% + "+(dx/2)+"px), calc(-50% + "+(dy/2 - lift)+"px))", offset:.5},
    {transform:"translate(calc(-50% + "+dx+"px), calc(-50% + "+dy+"px))"}
  ], {duration:dur, easing:"cubic-bezier(.34,.1,.45,1)"});
  return a.finished.then(function(){ ball.style.left=x1+"px"; ball.style.top=y1+"px"; ball.style.transform="translate(-50%,-50%)"; }).catch(function(){});
}
async function xadStoryReveal(auto){
  var rvEl = document.getElementById("xad-reveal");
  if(rvEl && rvEl.style.display==="none") return;   // reveal niewidoczny → nie animuj
  var pitch = document.querySelector("#s-xad .xad-pitch-reveal");
  if(!pitch) return;
  var core = Array.prototype.slice.call(pitch.querySelectorAll(".pdot.link-narr, .pdot.link-arch, .pdot.p66"));
  var allDots = Array.prototype.slice.call(pitch.querySelectorAll(".pdot.filled"));
  var rep = pitch.querySelector(".xad-story-replay");
  if(core.length===0){ if(rep) rep.remove(); return; }   // MIXED / brak rdzenia → nic, brak ikony
  if(!rep){
    rep = document.createElement("button");
    rep.className = "xad-story-replay"; rep.setAttribute("aria-label","Replay story");
    rep.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11a8 8 0 0 1 13.5-5.5L20 8"/><path d="M21 13a8 8 0 0 1-13.5 5.5L4 16"/><path d="M20 4v4h-4"/><path d="M4 20v-4h4"/></svg>';
    rep.onclick = function(){ xadStoryReveal(false); };
    pitch.appendChild(rep);
  }
  var rm = (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var run = ++STORY_RUN;
  var pr = pitch.getBoundingClientRect();
  var pts = core.map(function(d){
    var cell = d.querySelector(".pcircle, .shirt66") || d;
    var cr = cell.getBoundingClientRect();
    return {dot:d, x: cr.left - pr.left + cr.width/2, y: cr.top - pr.top + cr.height/2};
  }).sort(function(a,b){ return b.y - a.y; });   // od dołu (GK) do góry
  if(rm){ allDots.forEach(function(d){ d.classList.remove("story-dormant"); }); pts.forEach(function(pt){ pt.dot.classList.add("story-lit"); }); return; }
  // przygaszamy WSZYSTKICH (rdzeń + reszta), piłka zapala rdzeń; reszta wróci na końcu
  allDots.forEach(function(d){ d.classList.add("story-dormant"); d.classList.remove("story-lit"); });
  await xadWait(auto ? 850 : 180);   // cisza: werdykt i opis "siadają", DOPIERO potem ruch
  if(run!==STORY_RUN) return;
  var ball = pitch.querySelector(".xad-story-ball");
  if(!ball){ ball=document.createElement("div"); ball.className="xad-story-ball"; ball.innerHTML='<span class="xad-story-ball-i">\u26bd</span>'; pitch.appendChild(ball); }
  ball.style.opacity="0"; ball.style.left=pts[0].x+"px"; ball.style.top=pts[0].y+"px"; ball.style.transform="translate(-50%,-50%)";
  await xadWait(40); if(run!==STORY_RUN){ if(ball) ball.remove(); return; }
  ball.style.opacity="1";
  pts[0].dot.classList.remove("story-dormant"); pts[0].dot.classList.add("story-lit");
  await xadWait(160); if(run!==STORY_RUN){ if(ball) ball.remove(); return; }
  for(var i=1;i<pts.length;i++){
    if(run!==STORY_RUN){ if(ball) ball.remove(); return; }
    await xadHop(ball, pts[i-1].x, pts[i-1].y, pts[i].x, pts[i].y, 230);
    if(run!==STORY_RUN){ if(ball) ball.remove(); return; }
    pts[i].dot.classList.remove("story-dormant"); pts[i].dot.classList.add("story-lit");
    await xadWait(150);
  }
  await xadWait(260); if(run!==STORY_RUN){ if(ball) ball.remove(); return; }
  ball.style.opacity="0";        // piłka znika, rdzeń świeci sam = "oto dowody"
  await xadWait(320);
  if(ball) ball.remove();
  await xadWait(1500); if(run!==STORY_RUN) return;   // ~1.5 s sam rdzeń
  allDots.forEach(function(d){ d.classList.remove("story-dormant"); });   // reszta miękko wraca (transition .25s)
}

/* ── SCREEN SWITCHING (within #s-xad) ─────────────────────────────── */
function showXadScreen(id){
  if(typeof xadDisarmStoryReveal==="function") xadDisarmStoryReveal();
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
// CLASSIC: zwróć "historię" dowolnej XI używając tej samej detekcji co After Dark
window.xadStoryFor = function(xiPlayers){
  if(!xiPlayers || !xiPlayers.length) return null;
  const names = xiPlayers.map(p=>p.n);
  const det = detect(names);
  const capFirst = s2 => s2 ? s2.charAt(0).toUpperCase()+s2.slice(1) : s2;
  // drugi człon: detectAlso z RESZTY składu (rdzeń 4–5), tak samo jak w After Dark
  function restClause(coreSet, mainClub){
    const a = (coreSet.size>=4 && coreSet.size<=5) ? detectAlso(xiPlayers, coreSet, mainClub) : null;
    return a ? capFirst(a.clause)+"." : "";
  }
  if(det && det.main){
    const N = NARRATIVES[det.main];
    const coreSet = new Set(); N.players.forEach(n => { if(names.includes(n)) coreSet.add(n); });
    return {key:det.main, name:N.name, emoji:N.emoji, desc: narrTagline(det.main) || N.desc || "", rest: restClause(coreSet, null)};
  }
  const a = detectArchetype(xiPlayers);
  if(a){
    let coreSet = new Set(), mainClub = null;
    if(a.kind==="club"){ mainClub = a.key; xiPlayers.forEach(p => { if(p.c.includes(mainClub)) coreSet.add(p.n); }); }
    return {key:"arch_"+a.kind, name:a.name, emoji:a.emoji, desc: archTagline(a) || "", rest: restClause(coreSet, mainClub)};
  }
  const mr = mixedRest(xiPlayers);
  return {key:"mixed", name:"MIXED XI", emoji:"🌍", desc: narrTagline("mixed") || "Your own blend — no single story.", rest: mr ? capFirst(mr)+"." : ""};
};
function xadShareXI(){
  const S = LAST_SHARE; if(!S) return;
  const W=1080, H=1080;
  const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  const ctx=cv.getContext("2d");
  ctx.fillStyle="#0a0a0a"; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="#1c4a12"; ctx.lineWidth=6; ctx.strokeRect(20,20,W-40,H-40);
  ctx.textAlign="center";
  // wynik (duży) — najważniejszy
  ctx.fillStyle="#ffffff"; ctx.font="bold 150px Arial, sans-serif";
  ctx.fillText(String(S.score), W/2, 160);
  // tytuł (emoji + nazwa)
  ctx.fillStyle="#ffd600"; ctx.font="bold 46px Arial, sans-serif";
  ctx.fillText(((S.emoji?S.emoji+" ":"")+S.title), W/2, 235);
  // boisko
  const pW=505, pH=Math.round(pW*4/3), pX=(W-pW)/2, pY=250;
  const grd=ctx.createRadialGradient(pX+pW/2,pY+pH*0.3,30,pX+pW/2,pY+pH*0.3,pW);
  grd.addColorStop(0,"#15400c"); grd.addColorStop(1,"#0c2207");
  ctx.fillStyle=grd; ctx.fillRect(pX,pY,pW,pH);
  ctx.strokeStyle="#1c4a12"; ctx.lineWidth=4; ctx.strokeRect(pX,pY,pW,pH);
  ctx.strokeStyle="rgba(255,255,255,.18)"; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(pX,pY); ctx.lineTo(pX+pW,pY); ctx.stroke();
  ctx.beginPath(); ctx.arc(pX+pW/2,pY,pW*0.16,0,Math.PI); ctx.stroke();
  const bxW=pW*0.52,bxH=pH*0.17; ctx.strokeRect(pX+(pW-bxW)/2,pY+pH-bxH,bxW,bxH);
  const syW=pW*0.26,syH=pH*0.07; ctx.strokeRect(pX+(pW-syW)/2,pY+pH-syH,syW,syH);
  const COL={GK:"#ffdd00",DF:"#88ff44",MF:"#ff6600",FW:"#ff2200"};
  (S.slots||[]).forEach(function(s){
    if(!s) return;
    const cx=pX+s.x*pW, cy=pY+s.y*pH, col=COL[s.grp]||"#aaa", r=33;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle="#0a0a0a"; ctx.fill();
    ctx.save(); ctx.shadowColor=col; ctx.shadowBlur=28; ctx.lineWidth=6; ctx.strokeStyle=col;
    ctx.stroke(); ctx.stroke();     // mocna poświata jak w grze
    ctx.restore();
    ctx.fillStyle=col; ctx.font="bold 23px Arial, sans-serif"; ctx.textBaseline="middle";
    ctx.fillText(s.pos, cx, cy);
    ctx.textBaseline="alphabetic";
    // nazwisko — większe (to treść karty); zmniejsz tylko jeśli naprawdę długie
    let fs=27; ctx.font="bold "+fs+"px Arial, sans-serif";
    while(ctx.measureText(s.name).width>135 && fs>14){ fs--; ctx.font="bold "+fs+"px Arial, sans-serif"; }
    ctx.fillStyle="#ffffff"; ctx.fillText(s.name, cx, cy+r+27);
  });
  // stopka
  ctx.fillStyle="#ffd600"; ctx.font="bold 28px Arial, sans-serif";
  ctx.fillText("XI AFTER DARK", W/2, pY+pH+36);
  ctx.fillStyle="#ffffff"; ctx.font="bold 34px Arial, sans-serif";
  ctx.fillText("Can you beat "+S.score+"?", W/2, pY+pH+76);
  ctx.fillStyle="#c9a73a"; ctx.font="bold 22px Arial, sans-serif";
  ctx.fillText("footylegendsquiz.co.uk", W/2, pY+pH+110);
  // eksport + udostępnienie
  cv.toBlob(function(blob){
    if(!blob) return;
    const file=new File([blob],"xi-after-dark.png",{type:"image/png"});
    const data={files:[file], title:"XI After Dark", text:"Can you beat "+S.score+"? footylegendsquiz.co.uk"};
    try{ if(navigator.canShare && navigator.canShare({files:[file]}) && navigator.share){ navigator.share(data).catch(function(){}); return; } }catch(e){}
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="xi-after-dark.png"; document.body.appendChild(a); a.click(); a.remove();
  },"image/png");
}
window.xadShareXI    = xadShareXI;

/* ── KARTA After Dark na wspólnej oprawie FLCard (wynik raz + kolory odsłonięcia) ── */
function xadBuildCard(cb){
  var S=LAST_SHARE; if(!S) return;
  var FL=window.FLCard; if(!FL) return;
  var P=FL.PITCH;
  var cv=FL.newCanvas(); var ctx=cv.getContext("2d");
  FL.frame(ctx,{ url:"footylegendsquiz.co.uk" });
  FL.drawHero(ctx,{ emoji:(S.story&&S.story.emoji)||"", name:(S.story&&S.story.name)||"", tagline:(S.story&&S.story.desc)||"", rest:(S.story&&S.story.rest)||"" });
  FL.drawScore(ctx,{ kicker:"XI AFTER DARK", score:S.score });
  FL.drawPitch(ctx);
  var ERA_CARD={C:"#c060ff",G:"#ffb030",M:"#30c0ff"};
  // GLOW POWIĄZAŃ 1:1 z CSS revealu (skalowane do koła karty R=30; reveal: pcircle 38px)
  var LINK_STYLE={
    "narr":      {border:"#ffe680", glow:"rgba(255,215,64,.95)",  blur:40, bg:"rgba(40,30,0,.92)", hard:"rgba(255,215,64,.85)", pname:"#ffe680"},
    "arch":      {border:"#ff7ae0", glow:"rgba(255,90,210,.95)",  blur:40, bg:"rgba(40,0,32,.92)", hard:"rgba(255,90,210,.85)", pname:"#ff7ae0"},
    "era-c":     {border:"#c060ff", glow:"rgba(192,96,255,.7)",   blur:25, bg:"rgba(0,0,0,.8)",    hard:null, pname:"#c060ff"},
    "era-g":     {border:"#ffb030", glow:"rgba(255,176,48,.7)",   blur:25, bg:"rgba(0,0,0,.8)",    hard:null, pname:"#ffb030"},
    "era-m":     {border:"#30c0ff", glow:"rgba(48,192,255,.7)",   blur:25, bg:"rgba(0,0,0,.8)",    hard:null, pname:"#30c0ff"},
    "also-club": {border:"#22d8d8", glow:"rgba(34,216,216,.65)",  blur:28, bg:"rgba(0,0,0,.8)",    hard:null, pname:"#22d8d8"},
    "grey":      {border:"#6f6f6f", glow:"rgba(255,255,255,.12)", blur:16, bg:"rgba(0,0,0,.8)",    hard:null, pname:"#cfcfcf"}
  };
  var sized = ENGLAND_SHIRT_SVG.replace("<svg ", '<svg width="86" height="86" ');
  var img=new Image();
  function draw(haveImg){
    S.slots.forEach(function(s){
      if(!s) return;
      var cx=P.x+s.x*P.w, cy=P.y+s.y*P.h;
      var st=LINK_STYLE[s.link]||LINK_STYLE.grey;
      // #1 cień osadzenia na trawie
      ctx.save(); ctx.shadowColor="rgba(0,0,0,0.55)"; ctx.shadowBlur=12; ctx.shadowOffsetY=2;
      ctx.beginPath(); ctx.ellipse(cx, cy+22, 16, 4, 0, 0, Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.55)"; ctx.fill(); ctx.restore();
      if(s.shirt66 && haveImg){
        ctx.drawImage(img, cx-41, cy-49, 82, 82);
      } else {
        var R=30, ccx=cx, ccy=cy-8;
        ctx.beginPath(); ctx.arc(ccx,ccy,R,0,Math.PI*2); ctx.fillStyle=st.bg; ctx.fill();
        // subtelny połysk: światło z góry (radialny highlight ~16%, gaśnie w połowie koła)
        var gl=ctx.createRadialGradient(ccx, ccy-R*0.42, R*0.05, ccx, ccy-R*0.42, R*0.95);
        gl.addColorStop(0,"rgba(255,255,255,0.16)"); gl.addColorStop(0.72,"rgba(255,255,255,0)");
        ctx.save(); ctx.beginPath(); ctx.arc(ccx,ccy,R,0,Math.PI*2); ctx.clip();
        ctx.fillStyle=gl; ctx.fillRect(ccx-R,ccy-R,R*2,R*2); ctx.restore();
        ctx.save(); ctx.shadowColor=st.glow; ctx.shadowBlur=st.blur;
        ctx.lineWidth=4; ctx.strokeStyle=st.border;
        ctx.beginPath(); ctx.arc(ccx,ccy,R,0,Math.PI*2); ctx.stroke(); ctx.restore();
        if(st.hard){ ctx.lineWidth=4; ctx.strokeStyle=st.hard; ctx.beginPath(); ctx.arc(ccx,ccy,R+5,0,Math.PI*2); ctx.stroke(); }
        ctx.lineWidth=4; ctx.strokeStyle=st.border; ctx.beginPath(); ctx.arc(ccx,ccy,R,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle="#ffffff"; ctx.font="bold 20px Arial, sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(s.pos, ccx, ccy); ctx.textBaseline="alphabetic";
      }
      var eh=ERA_CARD[s.era]; if(eh){ ctx.beginPath(); ctx.arc(cx+24,cy-34,9,0,Math.PI*2); ctx.fillStyle=eh; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.stroke(); }
      var nm=s.name, fs=24; ctx.font="bold "+fs+"px Arial, sans-serif";
      while(ctx.measureText(nm).width>120 && fs>13){ fs--; ctx.font="bold "+fs+"px Arial, sans-serif"; }
      ctx.textAlign="center"; ctx.lineJoin="round";
      // #2 ciemny kontur pod nazwiskiem (czytelność na każdym pasie)
      ctx.lineWidth=4; ctx.strokeStyle="rgba(0,0,0,0.85)"; ctx.strokeText(nm, cx, cy+42);
      ctx.fillStyle=(s.shirt66 ? "#ffffff" : st.pname); ctx.fillText(nm, cx, cy+42);
    });
    cv.toBlob(function(blob){ if(blob) cb(blob); }, "image/png");
  }
  img.onload=function(){ draw(true); };
  img.onerror=function(){ draw(false); };
  img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(sized);
}
function xadShareCard(){ xadBuildCard(function(blob){ window.FLCard.shareBlob(blob, "xi-after-dark.png", "Can you beat this? \ud83d\udc47", "https://footylegendsquiz.co.uk"); }); }
function xadSaveCard(){ xadBuildCard(function(blob){ window.FLCard.saveBlob(blob, "xi-after-dark.png"); }); }
window.xadShareCard = xadShareCard;
window.xadSaveCard  = xadSaveCard;
window.xadPlayAgain  = openDraftEmpty;  // po reveal → puste boisko + PICK MY 30

/* ══ WSPÓLNA OPRAWA KARTY "Footy Legends Card" (Classic + After Dark) ══ */
window.FLCard = (function(){
  var W=1080, H=1350, PITCH={x:114,y:280,w:852,h:800};
  function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function wrap(ctx,text,maxW,maxLines){ var words=(text||"").split(" "),lines=[],line=""; for(var i=0;i<words.length;i++){ var t=line?line+" "+words[i]:words[i]; if(ctx.measureText(t).width>maxW && line){ lines.push(line); line=words[i]; } else line=t; } if(line) lines.push(line); return lines.slice(0, maxLines||3); }
  function newCanvas(){ var cv=document.createElement("canvas"); cv.width=W; cv.height=H; return cv; }
  function frame(ctx,opts){
    opts=opts||{};
    var url=opts.url||"footylegendsquiz.co.uk";
    var bg=ctx.createRadialGradient(W/2,H*0.06,200,W/2,H*0.06,H*0.95);
    bg.addColorStop(0,"#16291c"); bg.addColorStop(0.55,"#0a1610"); bg.addColorStop(1,"#03060a");
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    var stp=ctx.createRadialGradient(W/2,0,0,W/2,0,H*0.70);
    stp.addColorStop(0,"rgba(205,238,222,0.18)"); stp.addColorStop(1,"rgba(205,238,222,0)");
    ctx.fillStyle=stp; ctx.fillRect(0,0,W,H);
    var M=34;
    ctx.save(); ctx.shadowColor="rgba(0,0,0,0.6)"; ctx.shadowBlur=46; ctx.shadowOffsetY=12;
    var pg=ctx.createLinearGradient(0,M,0,H-M); pg.addColorStop(0,"#0a1410"); pg.addColorStop(1,"#05100b");
    ctx.fillStyle=pg; roundRect(ctx,M,M,W-2*M,H-2*M,28); ctx.fill(); ctx.restore();
    var vg=ctx.createRadialGradient(W/2,H*0.40,H*0.30,W/2,H*0.40,H*0.80);
    vg.addColorStop(0.55,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(0,0,0,0.62)");
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="#c9a73a"; ctx.lineWidth=4; roundRect(ctx,M,M,W-2*M,H-2*M,28); ctx.stroke();
    ctx.strokeStyle="rgba(232,200,96,0.45)"; ctx.lineWidth=1.5; roundRect(ctx,M+10,M+10,W-2*M-20,H-2*M-20,22); ctx.stroke();
    if(ctx.letterSpacing!==undefined) ctx.letterSpacing="1px";
    ctx.textAlign="right";
    ctx.fillStyle="#6f7d71"; ctx.font="bold 22px Arial, sans-serif"; ctx.fillText(url, W-48, H-44);
    if(ctx.letterSpacing!==undefined) ctx.letterSpacing="0px";
    ctx.textAlign="center";
  }
  function drawPitch(ctx){
    var pX=PITCH.x,pY=PITCH.y,pW=PITCH.w,pH=PITCH.h, cx=pX+pW/2, inset=14;
    ctx.save(); ctx.shadowColor="rgba(0,0,0,0.55)"; ctx.shadowBlur=44; ctx.shadowOffsetY=16;
    ctx.fillStyle="#1a5318"; roundRect(ctx,pX,pY,pW,pH,18); ctx.fill(); ctx.restore();
    ctx.save(); roundRect(ctx,pX,pY,pW,pH,18); ctx.clip();
    // dwukolorowe poziome pasy (koszenie)
    var bands=10, bh=pH/bands;
    for(var i=0;i<bands;i++){ ctx.fillStyle=(i%2===0)?"#1a5318":"#22641e"; ctx.fillRect(pX,pY+i*bh,pW,bh+1); }
    // światło z góry + cień u dołu (noc, subtelnie)
    var tl=ctx.createLinearGradient(0,pY,0,pY+pH);
    tl.addColorStop(0,"rgba(205,238,222,0.14)"); tl.addColorStop(0.42,"rgba(205,238,222,0)"); tl.addColorStop(0.60,"rgba(0,0,0,0)"); tl.addColorStop(1,"rgba(0,0,0,0.30)");
    ctx.fillStyle=tl; ctx.fillRect(pX,pY,pW,pH);
    // miękki refleks u góry (jeden, nie plamy)
    var sh=ctx.createRadialGradient(cx,pY+pH*0.22,0,cx,pY+pH*0.22,pW*0.55);
    sh.addColorStop(0,"rgba(210,240,210,0.10)"); sh.addColorStop(1,"rgba(210,240,210,0)");
    ctx.fillStyle=sh; ctx.fillRect(pX,pY,pW,pH);
    // winieta boiska
    var pv=ctx.createRadialGradient(cx,pY+pH*0.46,pW*0.30,cx,pY+pH*0.46,pW*0.80);
    pv.addColorStop(0,"rgba(3,18,6,0)"); pv.addColorStop(1,"rgba(3,18,6,0.50)");
    ctx.fillStyle=pv; ctx.fillRect(pX,pY,pW,pH);
    // ── linie ──
    ctx.strokeStyle="rgba(255,255,255,0.32)"; ctx.lineWidth=3.5; ctx.lineCap="round";
    roundRect(ctx,pX+inset,pY+inset,pW-2*inset,pH-2*inset,6); ctx.stroke();
    var R=pW*0.135, goalY=pY+pH-inset;
    // koło środkowe (półkole z linii połowy) + punkt środkowy
    ctx.beginPath(); ctx.arc(cx,pY+inset,R,0,Math.PI); ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,0.32)";
    ctx.beginPath(); ctx.arc(cx,pY+inset,2.6,0,Math.PI*2); ctx.fill();
    // pole karne + bramkowe (realne proporcje)
    var boxW=pW*0.56, boxD=pH*0.26, boxTop=goalY-boxD;
    ctx.strokeRect(cx-boxW/2,boxTop,boxW,boxD);
    var syW=pW*0.25, syD=pH*0.09; ctx.strokeRect(cx-syW/2,goalY-syD,syW,syD);
    // punkt karny + łuk "D" (liczony z punktu, tylko nad linią pola)
    var spotY=goalY-boxD*0.667;
    ctx.beginPath(); ctx.arc(cx,spotY,2.6,0,Math.PI*2); ctx.fill();
    var hh=spotY-boxTop;
    if(hh<R){ var a=Math.acos(hh/R); ctx.beginPath(); ctx.arc(cx,spotY,R,-Math.PI/2-a,-Math.PI/2+a); ctx.stroke(); }
    // łuki narożne (dolne narożniki przy bramce)
    var cr=pW*0.022;
    ctx.beginPath(); ctx.arc(pX+inset,goalY,cr,-Math.PI/2,0); ctx.stroke();
    ctx.beginPath(); ctx.arc(pX+pW-inset,goalY,cr,Math.PI,Math.PI*1.5); ctx.stroke();
    ctx.restore();
  }
  function drawHero(ctx,o){
    o=o||{}; ctx.textAlign="center";
    var name=o.name||"", emoji=o.emoji?o.emoji+" ":"";
    if(name){
      var full=emoji+name, ns=58; ctx.font="900 "+ns+"px Arial, sans-serif";
      while(ctx.measureText(full).width>W-150 && ns>32){ ns--; ctx.font="900 "+ns+"px Arial, sans-serif"; }
      ctx.fillStyle="#e8c860"; ctx.fillText(full, W/2, 140);
    }
    var y=190;
    if(o.tagline){ ctx.fillStyle="#ffffff"; ctx.font="500 36px Arial, sans-serif"; wrap(ctx,o.tagline,W-220,2).forEach(function(ln){ ctx.fillText(ln,W/2,y); y+=44; }); }
    if(o.rest){ y+=2; ctx.fillStyle="rgba(185,210,190,0.85)"; ctx.font="italic 30px Arial, sans-serif"; wrap(ctx,o.rest,W-240,2).forEach(function(ln){ ctx.fillText(ln,W/2,y); y+=37; }); }
  }
  function drawScore(ctx,o){
    o=o||{}; ctx.textAlign="center";
    var dy=H-188;
    ctx.strokeStyle="rgba(201,167,58,0.40)"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(W/2-140,dy); ctx.lineTo(W/2+140,dy); ctx.stroke();
    if(o.score!=null && o.score!==""){
      if(ctx.letterSpacing!==undefined) ctx.letterSpacing="8px";
      ctx.fillStyle="#c9a73a"; ctx.font="bold 28px Arial, sans-serif"; ctx.fillText(o.kicker||"", W/2, H-150);
      if(ctx.letterSpacing!==undefined) ctx.letterSpacing="0px";
      var sc=String(o.score);
      ctx.font="900 80px Arial, sans-serif"; var w1=ctx.measureText(sc).width;
      ctx.font="bold 38px Arial, sans-serif"; var w2=ctx.measureText("PTS").width;
      var gap=16, startX=W/2-(w1+gap+w2)/2;
      ctx.textAlign="left";
      ctx.fillStyle="#ffffff"; ctx.font="900 80px Arial, sans-serif"; ctx.fillText(sc, startX, H-82);
      ctx.fillStyle="#c9a73a"; ctx.font="bold 38px Arial, sans-serif"; ctx.fillText("PTS", startX+w1+gap, H-82);
      ctx.textAlign="center";
    } else {
      if(ctx.letterSpacing!==undefined) ctx.letterSpacing="3px";
      ctx.fillStyle="#e8c860"; ctx.font="900 44px Arial, sans-serif"; ctx.fillText(o.kicker||"", W/2, H-110);
      if(ctx.letterSpacing!==undefined) ctx.letterSpacing="0px";
    }
  }
  function drawCaption(ctx, story){
    if(!story) return;
    var y=PITCH.y+PITCH.h+64;
    ctx.textAlign="center";
    ctx.fillStyle="#e8c860"; var ns=46, nameTxt=(story.emoji?story.emoji+" ":"")+story.name;
    ctx.font="900 "+ns+"px Arial, sans-serif";
    while(ctx.measureText(nameTxt).width>W-200 && ns>26){ ns--; ctx.font="900 "+ns+"px Arial, sans-serif"; }
    ctx.fillText(nameTxt, W/2, y); y+=46;
    if(story.desc){ ctx.fillStyle="#ffffff"; ctx.font="500 28px Arial, sans-serif"; wrap(ctx,story.desc,W-260,2).forEach(function(ln){ ctx.fillText(ln,W/2,y); y+=34; }); }
    if(story.rest){ ctx.fillStyle="rgba(185,210,190,0.85)"; ctx.font="italic 23px Arial, sans-serif"; wrap(ctx,story.rest,W-260,2).forEach(function(ln){ ctx.fillText(ln,W/2,y); y+=29; }); }
  }
  function saveBlob(blob, fname){ fname=fname||"footy-legends-xi.png"; var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=fname; document.body.appendChild(a); a.click(); a.remove(); }
  function shareBlob(blob, fname, text, url){ fname=fname||"footy-legends-xi.png";
    try{ var file=new File([blob],fname,{type:"image/png"}); var data={files:[file], title:"Footy Legends", text:text||"footylegendsquiz.co.uk"}; if(url) data.url=url;
      if(navigator.canShare && navigator.canShare({files:[file]}) && navigator.share){ navigator.share(data).catch(function(){}); return; } }catch(e){}
    saveBlob(blob, fname);
  }
  return { W:W, H:H, PITCH:PITCH, newCanvas:newCanvas, roundRect:roundRect, wrap:wrap, frame:frame, drawHero:drawHero, drawScore:drawScore, drawPitch:drawPitch, drawCaption:drawCaption, shareBlob:shareBlob, saveBlob:saveBlob };
})();

})();
