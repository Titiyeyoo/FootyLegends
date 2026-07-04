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
  // Classic 1960–1990
  "Bobby Moore","Bobby Charlton","Gary Lineker","Gordon Banks","Kevin Keegan",
  // Golden 1990–2010
  "Alan Shearer","Wayne Rooney","Steven Gerrard","Frank Lampard","David Beckham",
  // Modern 2010–
  "Harry Kane","Jude Bellingham","Bukayo Saka","Phil Foden","Declan Rice",
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
  goalscorers:{name:"GOALSCORERS",desc:"The deadliest finishers English football has produced.",emoji:"⚽",cat:"theme",iconic:2,players:["Harry Kane","Alan Shearer","Jimmy Greaves","Wayne Rooney","Roger Hunt","Frank Lampard","Bobby Charlton","Martin Peters","Raich Carter","John Barnes","Steve Bruce","Stuart Pearce","Jack Charlton","Phil Neal","John Terry"]},
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
// ── CRASH RECOVERY (2a): zapis/czyszczenie niedokonczonego draftu ──
var FL_DRAFT_SCHEMA = 1; // bumpnij TYLKO gdy zmieni sie ksztalt zapisu -> stare zapisy odrzucane (nie mylic z FL_VERSION)
// zapisuje pelne obiekty zawodnikow (niezalezne od aktualnej bazy) + schemat + wersja + znacznik czasu
function flSaveDraft(){
  try{
    if(!DEALT) return;
    var filled = SLOTS.filter(function(s){return s.player;}).length;
    if(filled<1){ flClearDraft(); return; } // pusty draft -> skasuj ewentualny stary zapis
    var blob = {
      sv: FL_DRAFT_SCHEMA,
      v: (typeof FL_VERSION!=="undefined"?FL_VERSION:""),
      ts: Date.now(),
      formation: FORMATION,
      rerollUsed: REROLL_USED,
      pool: POOL,
      slots: SLOTS.map(function(s){ return s.player || null; })
    };
    localStorage.setItem("fl_xad_draft", JSON.stringify(blob));
  }catch(e){}
}
function flClearDraft(){ try{ localStorage.removeItem("fl_xad_draft"); }catch(e){} }

function openDraftFresh(){
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
function openDraftEmpty(){
  var saved = flGetSavedDraft();
  if(saved){ try{ flTrack("recovery_offered",{filled:saved.slots.filter(function(x){return x;}).length}); }catch(e){} flShowRecoverPrompt(saved); return; }
  openDraftFresh();
}
// ── CRASH RECOVERY (2b): odczyt, odtworzenie, prompt ──
function flGetSavedDraft(){
  try{
    var raw = localStorage.getItem("fl_xad_draft");
    if(!raw) return null;
    var b = JSON.parse(raw);
    if(!b || b.sv!==FL_DRAFT_SCHEMA || !b.pool || !b.slots){ flClearDraft(); return null; } // inny schemat / zly ksztalt
    if(!b.ts || (Date.now()-b.ts) > 86400000){ flClearDraft(); return null; }               // starsze niz 24h
    if(b.slots.filter(function(x){return x;}).length < 1){ flClearDraft(); return null; }     // pusty
    return b;
  }catch(e){ flClearDraft(); return null; }
}
function flRestoreDraft(b){
  try{
    // WALIDACJA (bezpieczenstwo + integralnosc): odtwarzaj tylko zawodnikow istniejacych w aktualnej bazie,
    // i uzywaj obiektu z DB (nie z localStorage) -> renderowane nazwisko zawsze czyste, usunieci/spreparowani wypadaja.
    var valid={};
    if(typeof DB!=="undefined" && DB){ for(var vi=0; vi<DB.length; vi++){ if(DB[vi]&&DB[vi].n) valid[DB[vi].n]=DB[vi]; } }
    function fromDB(p){ return (p&&p.n&&valid[p.n]) ? valid[p.n] : null; }
    FORMATION = (b.formation||"4-4-2");
    REROLL_USED = !!b.rerollUsed;
    POOL = (b.pool||[]).map(fromDB).filter(function(x){return x;});
    buildSlots();
    for(var i=0;i<SLOTS.length && i<b.slots.length;i++){ var pl=fromDB(b.slots[i]); if(pl) SLOTS[i].player = pl; }
    DEALT = true; POS_FILTER = null; TARGET_SLOT = null;
    setText("xad-form-label", FORMATION);
    showXadScreen("xad-draft");
    var pitchCol = el("s-xad") ? el("s-xad").querySelector(".xad-col-pitch") : null;
    if(pitchCol) pitchCol.classList.remove("shrunk");
    render(); flash("");
  }catch(e){ flClearDraft(); openDraftFresh(); }
}
function flShowRecoverPrompt(saved){
  var host = el("s-xad");
  if(!host){ flClearDraft(); openDraftFresh(); return; }
  showXadScreen("xad-draft");
  var old = document.getElementById("xad-recover"); if(old) old.remove();
  var filled = saved.slots.filter(function(x){return x;}).length;
  var ov = document.createElement("div");
  ov.id = "xad-recover";
  ov.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:rgba(6,10,6,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px";
  ov.innerHTML =
    '<div style="color:#e9c46a;font-size:13px;letter-spacing:3px;margin-bottom:16px">UNFINISHED XI</div>'+
    '<div style="color:#d8d8d8;font-size:12px;line-height:1.8;max-width:290px;margin-bottom:28px">You left '+filled+' of 11 in the middle of a draft.<br>Pick up where you left off?</div>'+
    '<button id="xad-recover-yes" class="xad-bigbtn xad-rollbtn" style="margin-bottom:14px">CONTINUE DRAFT</button>'+
    '<button id="xad-recover-no" style="background:none;border:0;color:#8a8576;font-size:11px;letter-spacing:1px;text-decoration:underline;cursor:pointer;padding:10px">START OVER</button>';
  host.appendChild(ov);
  var yes=document.getElementById("xad-recover-yes"), no=document.getElementById("xad-recover-no");
  if(yes) yes.onclick = function(){ if(ov.parentNode) ov.remove(); try{flTrack("recovery_continued",{filled:filled});}catch(e){} flRestoreDraft(saved); };
  if(no)  no.onclick  = function(){ if(ov.parentNode) ov.remove(); try{flTrack("recovery_discarded",{filled:filled});}catch(e){} flClearDraft(); openDraftFresh(); };
}
// "ROLL THE SQUAD" → rzut kostką (animacja), losuj pulę, kaskada pojawiania, ekran powitalny znika
let ROLLING = false;
// ── YOUR FOOTBALL LIFE: realny czas budowania (okno: pierwszy pick → Lock In) ──
var FL_BUILD_START = 0; // znacznik pierwszego picka w biezacym drafcie (0 = brak)
function flAddPlayMs(ms){
  if(!ms || ms<0) return;
  ms = Math.min(ms, 1800000); // cap 30 min na jedno budowanie (ochrona przed przerwa)
  try{ var t=parseInt(localStorage.getItem("fl_play_ms")||"0",10)||0; localStorage.setItem("fl_play_ms",(t+ms)+""); }catch(e){}
}
function flGetPlayMs(){ try{ return parseInt(localStorage.getItem("fl_play_ms")||"0",10)||0; }catch(e){ return 0; } }
// linijka w stylu Football Managera — zastepuje surowe "N MATCHES"
function flFootballLife(games){
  if(!games || games<1) return '<div style="color:#c9c4b2;font-size:11px;letter-spacing:2px">YOUR STORY STARTS HERE</div>';
  var mood = games<10?"EARLY DAYS":games<25?"FINDING YOUR VOICE":games<50?"MAKING YOUR NAME":games<100?"A SEASON IN":games<200?"ONE OF THE FAITHFUL":"A LIFETIME IN THE GAME";
  var ms=flGetPlayMs(), tstr = ms>=1000 ? FL_UI.time(ms) : "";
  var html='<div style="color:#6f6c5e;font-size:9px;letter-spacing:3px;margin-bottom:7px">'+FL_UI.chapter+'</div>'
    +'<div style="color:#e9c46a;font-size:12px;letter-spacing:2px;line-height:1.9">'+mood+'</div>'
    +'<div style="color:#c9c4b2;font-size:10px;letter-spacing:1px;line-height:1.9">'+games+' '+FL_UI.games+'</div>';
  if(tstr) html+='<div style="color:#8a8576;font-size:10px;letter-spacing:1px;line-height:1.6">'+tstr+'</div>';
  return html;
}

function drawSquad(){
  if(ROLLING || DEALT) return;
  FL_BUILD_START = 0;
  flClearDraft(); // nowy roll -> stary niedokonczony draft juz nieaktualny
  try{ flTrack("lineup_started",{mode:"xad"}); }catch(e){}
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
  flSaveDraft();
}
// zmiana formacji w trakcie (mały przycisk, NIE ekran-bramka)
function changeFormation(f){
  const kept = SLOTS.filter(s=>s.player).map(s=>s.player);
  FORMATION = f; TARGET_SLOT = null;
  buildSlots();
  for(const p of kept){
    const slot = SLOTS.find(s=>!s.player && s.pos===p.pos) || SLOTS.find(s=>!s.player && s.p===p.p);   // most: dokładna pozycja, potem szeroka grupa
    if(slot) slot.player = p;
  }
  setText("xad-form-label", FORMATION);
  renderFormationBar();
  render(); flash("");
  flSaveDraft();
}
function placePlayer(p){
  if(inXI(p.n)) return;
  let slot = null;
  // 1) jeśli gracz kliknął konkretny slot i pasuje grupa → trafia DOKŁADNIE tam
  if(TARGET_SLOT!=null && SLOTS[TARGET_SLOT] && !SLOTS[TARGET_SLOT].player && (SLOTS[TARGET_SLOT].p===p.p || SLOTS[TARGET_SLOT].pos===p.pos)){
    slot = SLOTS[TARGET_SLOT];
  } else {
    slot = SLOTS.find(s=>!s.player && s.pos===p.pos) || SLOTS.find(s=>!s.player && s.p===p.p);          // most: dokładna pozycja, potem szeroka grupa
  }
  if(!slot){ if(typeof toast==="function") toast("⚠ "+FORMATION+" — NO "+p.p+" SLOT FREE"); return; }
  slot.player = p; flash("");
  if(picked()===1 && !FL_BUILD_START){ FL_BUILD_START = Date.now(); try{ flTrack("first_pick",{mode:"xad", slot:p.p, era:p.e}); }catch(e){} } // pierwszy pick po rollu (timer + lejek)
  TARGET_SLOT = null; POS_FILTER = null;                   // po wyborze: zdejmij cel i filtr
  render(true, p.n);                                       // animuj wskoczenie tego zawodnika
  flSaveDraft();
}
function removeFromSlot(i){
  if(!SLOTS[i].player) return;
  SLOTS[i].player = null; flash(""); render();
  flSaveDraft();
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

// ── TONIGHT'S DRAFT: czysty klimat przed rollem (angielski futbol, zero metryk/podpowiedzi) ──
var FL_TONIGHT = [
  "Football remembers.",
  "History is watching.",
  "Some legends never fade.",
  "Every squad tells a story.",
  "The badge stays the same.",
  "Ninety minutes. Eleven names.",
  "Somewhere in here, a masterpiece.",
  "Old rivalries never sleep.",
  "Not every hero wore the armband.",
  "The crowd remembers the shirt.",
  "Grass, floodlights and ghosts.",
  "Careers end. Legends don't.",
  "Trust your football instinct.",
  "Saturday afternoons, forever.",
  "Some names still echo.",
  "The story picks itself.",
  "Cold nights, warm memories.",
  "Heroes are made in the details.",
  "One more team. One more tale.",
  "The whistle's about to blow."
];
var TONIGHT_LINE = null;

// justJumped: nazwisko zawodnika, który właśnie wskoczył → dostaje klasę pop (pętla nagrody)
function render(animate, justJumped){
  // ekran powitalny (kostka + ROLL THE SQUAD + tekst) — widoczny tylko przed rozdaniem
  const welcome = el("xad-welcome");
  if(welcome) welcome.style.display = DEALT ? "none" : "";
  if(!DEALT){
    if(!TONIGHT_LINE) TONIGHT_LINE = FL_TONIGHT[Math.floor(Math.random()*FL_TONIGHT.length)];
    var _tg=document.querySelector(".xad-welcome-tag");
    if(_tg) _tg.innerHTML = '<div style="font-size:9px;letter-spacing:3px;color:#6f6c5e;margin-bottom:8px">TONIGHT\u2019S DRAFT</div>'
      + '<div style="font-size:14px;letter-spacing:.5px;color:#cdae6a;line-height:1.5">'+TONIGHT_LINE+'</div>';
  } else { TONIGHT_LINE = null; }
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
    // pula posegregowana wg DOKŁADNEJ pozycji, od bramki do ataku, prawa→lewa (jak na karcie FM)
    const order = {GK:0, RB:1, CB:2, LB:3, DM:4, RM:5, CM:6, LM:7, AM:8, RW:9, LW:10, ST:11};
    const grpFallback = {GK:0, DF:2, MF:6, FW:11};
    const ord = p => (order[p.pos]!=null ? order[p.pos] : (grpFallback[p.p]!=null ? grpFallback[p.p] : 50));
    let list = POOL.slice().sort((a,b)=> (ord(a)-ord(b)) || a.n.localeCompare(b.n));
    // filtr pozycji (klik w pusty slot) — pokazuje tylko tę grupę; pełna pula żyje w tle
    if(POS_FILTER){
      const tSlot = (TARGET_SLOT!=null) ? SLOTS[TARGET_SLOT] : null;
      list = list.filter(p => p.p===POS_FILTER || (tSlot && p.pos===tSlot.pos));
    }
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
        '<div class="pname'+(lastName(s.player.n).length>8?' pname-long':'')+'">'+escXad(lastName(s.player.n))+'</div>';
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
  era_c:    ["backed by proper English grit","with a backbone of classic English names","surrounded by hard-nosed legends","proper boots-and-mud stuff","a right rugged lot, this"],
  era_g:    ["powered by England's finest crop","with Premier League icons alongside","strengthened by Premier League royalty","the cream of the Premier League here","England's best all over this"],
  era_m:    ["bolstered by the current game","with this season's stars filling in","backed by a fresh supporting cast","the young guns stepping up","the latest lot doing the business"],
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
  newcastle:["All-out attack. No title. All heart.","Keegan's cavaliers, thrilling to the last.","Played without fear — or a defence."],
  foxes:["5000-1. The greatest story football ever told.","The miracle that broke every odd.","Leicester. League champions. Believe it."],
  liverpool:["The boot-room kings who ruled Europe.","A machine that just kept winning.","This is Anfield — and everyone knew it."],
  eagles:["Palace's brightest crop in a generation.","Young, fearless, on the rise.","Selhurst's new golden boys."],
  citydynasty:["Pep's relentless blue machine.","Sky-blue dominance, year after year.","Turned winning into routine."],
  crazygang:["Wimbledon's misfits who shocked the giants.","No fear. No respect. Just the Crazy Gang.","The roughest, toughest, unlikeliest winners."],
  bornleaders:["11 captains. 11 personalities. One dressing room.","Every single one wore the armband.","Too many leaders. Not enough orders."],
  nearlymen:["Great enough to remember. Unlucky enough to miss the title.","World-class. Trophyless. Unforgettable.","So good. So close. So cruel."],
  goalscorers:["If there was a goal in it, they found it.","Eleven players. One job. Score.","Born to put the ball in the net."],
  mixed:["No era, no theme — just your gut.","Your own blend. No rulebook.","A team only you would pick."],
};
const ARCH_TAGLINES = {
  club:["Built on one club\'s backbone.","One badge runs through this XI.","Loyalty in eleven shirts."],
  era_C:["Hard men, harder pitches.","Before your time — and proud of it.","They don't make them like this anymore."],
  era_G:["When England had it all.","The era everyone misses.","All that talent, all at once."],
  era_M:["Built for football as it is now.","The current crop, all together.","The here-and-now in eleven names."],
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
  goalscorers:{e:"⚽",n:"GOALSCORERS",tier:"legendary"},
};
try{
  window.FL_STORY_INFO = STORY_INFO;
  window.FL_XAD_STORIES = Object.keys(STORY_INFO).map(function(k){
    return { k:k, e:STORY_INFO[k].e, n:STORY_INFO[k].n, r:(STORY_INFO[k].tier||"common").toUpperCase() };
  });
}catch(e){}
const STORY_RARITY_LINE = { legendary:"", rare:"A rare discovery", common:"" };
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

/* ── FAN PROFILE LOGGER (Etap 1 — ciche logowanie gustu, lokalne + GA) ──
   To NIE jest logowanie konta. Cicho zapisuje gust gracza na JEGO urzadzeniu
   (localStorage). Liczymy pick (Twoje 11) i avail (pula 30) → gust = pick−avail. */
var FL_ATTACK  = {ST:1, AM:1, RW:1, LW:1};
var FL_DEFENSE = {GK:1, CB:1, RB:1, LB:1, DM:1};
var FL_AXES = ["C","G","M","stars","deep","attack","defense"];
function flCounts(arr){
  var c={C:0,G:0,M:0,stars:0,deep:0,attack:0,defense:0};
  for(var i=0;i<arr.length;i++){ var p=arr[i]; if(!p) continue;
    if(p.e==="C")c.C++; else if(p.e==="G")c.G++; else if(p.e==="M")c.M++;
    try{ if(STARS.has(p.n))c.stars++; }catch(e){}
    try{ if(isDeepCut(p.n))c.deep++; }catch(e){}
    if(FL_ATTACK[p.pos])c.attack++;
    if(FL_DEFENSE[p.pos])c.defense++;
  }
  return c;
}
function flConc(arr){
  var clubs={}, era={C:0,G:0,M:0};
  for(var i=0;i<arr.length;i++){ var p=arr[i]; if(!p) continue;
    if(p.c&&p.c.length){ clubs[p.c[0]]=(clubs[p.c[0]]||0)+1; }
    if(era[p.e]!=null) era[p.e]++;
  }
  var top=0,d=0; for(var k in clubs){ d++; if(clubs[k]>top) top=clubs[k]; }
  return {topClub:top, distinct:d, topEra:Math.max(era.C,era.G,era.M)};
}
function flLoad(){
  try{ var o=JSON.parse(localStorage.getItem("fl_profile")||"null"); if(o&&o.v===1) return o; }catch(e){}
  return {v:1,games:0,
    pickSum:{C:0,G:0,M:0,stars:0,deep:0,attack:0,defense:0},
    availSum:{C:0,G:0,M:0,stars:0,deep:0,attack:0,defense:0},
    recent:[], stories:{}, favPlayers:{},
    conc:{topClubXI:0,distinctXI:0,topEraXI:0,topClubPool:0,distinctPool:0,topEraPool:0}};
}
function flAxisVals(pick,avail,games,perP,perA){
  var o={}; for(var i=0;i<FL_AXES.length;i++){ var k=FL_AXES[i];
    var pk=pick[k]/(games*perP), av=avail[k]/(games*perA);
    o[k]=Math.round(100*(pk-av));
  } return o;
}
// ── MODEL SUMUJACY: staly "normalny sklad" (srednia neutralnego XI z symulacji) ──
// gracz tego nie widzi; sluzy tylko do odjecia tego, co formacja/pula daje "za darmo"
var FL_BASE = {history:7.7, modern:3.3, stars:0.8, scout:4.2, loyalty:2.7};
function flAvgCounts(pr){
  var g=pr.games||1;
  return {
    history: (pr.pickSum.C+pr.pickSum.G)/g,
    modern:  pr.pickSum.M/g,
    stars:   pr.pickSum.stars/g,
    scout:   pr.pickSum.deep/g,
    loyalty: (pr.conc?pr.conc.topClubXI:0)/g
  };
}
// skumulowany typ = os, na ktorej srednio przebijasz normalny sklad najbardziej. Bez progu 0.45, bez normalizacji.
function flFanType(pr){
  if(pr.games<10) return "forming";
  var a=flAvgCounts(pr), best="balanced", bv=1.0; // margines: >=1 gracz ponad norme na szczytowej osi
  for(var k in FL_BASE){ var ex=a[k]-FL_BASE[k]; if(ex>bv){ bv=ex; best=k; } }
  return best;
}
// SKUMULOWANY primary+secondary (dla profilu). primary prog 1.0 (jak flFanType), secondary prog 0.8.
// Zwraca komplet danych (score'y do ew. paska dominacji w przyszlosci) — UI wybiera co pokazac.
// allRounder to POCHODNA primary==="balanced" (jedno zrodlo prawdy, nie osobne pole do rozjazdu).
// UWAGA: flFanType (jeden typ) zostaje nietkniety -> karta share i event fan_profile bez zmian.
function flFanTypePair(pr){
  if(!pr || pr.games<10) return {primary:"forming", secondary:null, primaryScore:0, secondaryScore:0, allRounder:false, forming:true};
  var a=flAvgCounts(pr), arr=[];
  for(var k in FL_BASE){ arr.push({k:k, ex:a[k]-FL_BASE[k]}); }
  arr.sort(function(x,y){ return y.ex-x.ex; });
  var primary = (arr[0] && arr[0].ex > 1.0) ? arr[0].k : "balanced";
  var secondary = (primary!=="balanced" && arr[1] && arr[1].ex > 0.8) ? arr[1].k : null;
  return {
    primary: primary,
    secondary: secondary,
    primaryScore: arr[0] ? Math.round(arr[0].ex*100)/100 : 0,
    secondaryScore: arr[1] ? Math.round(arr[1].ex*100)/100 : 0,
    allRounder: (primary==="balanced"),
    forming: false
  };
}
// typ POJEDYNCZEJ 11-stki (po reveal): z samej kompozycji skladu vs normalny sklad
function flXIType(xiPlayers){
  var c=flCounts(xiPlayers), club=flConc(xiPlayers).topClub;
  var ex={ history:(c.C+c.G)-FL_BASE.history, modern:c.M-FL_BASE.modern, stars:c.stars-FL_BASE.stars, scout:c.deep-FL_BASE.scout, loyalty:club-FL_BASE.loyalty };
  var arr=[]; for(var k in ex) arr.push([k,ex[k]]); arr.sort(function(a,b){return b[1]-a[1];});
  var MARGIN=1.5; // wyraznie ponad normalny sklad
  var primary = arr[0][1]>=MARGIN ? arr[0][0] : "balanced";
  var secondary = (primary!=="balanced" && arr[1][1]>=MARGIN) ? arr[1][0] : null;
  return {primary:primary, secondary:secondary};
}
function logProfile(xiPlayers, pool, storyKey){
  try{
    if(!xiPlayers||!xiPlayers.length||!pool||!pool.length) return;
    var pk=flCounts(xiPlayers), av=flCounts(pool), pr=flLoad();
    var cx=flConc(xiPlayers), cp=flConc(pool);
    pr.games++;
    for(var i=0;i<FL_AXES.length;i++){ var k=FL_AXES[i]; pr.pickSum[k]+=pk[k]; pr.availSum[k]+=av[k]; }
    pr.recent.push({pk:FL_AXES.map(function(k){return pk[k];}), av:FL_AXES.map(function(k){return av[k];}), s:storyKey||"", lt:cx.topClub, la:cp.topClub});
    while(pr.recent.length>30) pr.recent.shift();
    if(storyKey) pr.stories[storyKey]=(pr.stories[storyKey]||0)+1;
    for(var j=0;j<xiPlayers.length;j++){ if(xiPlayers[j]){ var n=xiPlayers[j].n; pr.favPlayers[n]=(pr.favPlayers[n]||0)+1; } }
    if(!pr.conc) pr.conc={topClubXI:0,distinctXI:0,topEraXI:0,topClubPool:0,distinctPool:0,topEraPool:0};
    pr.conc.topClubXI+=cx.topClub; pr.conc.distinctXI+=cx.distinct; pr.conc.topEraXI+=cx.topEra;
    pr.conc.topClubPool+=cp.topClub; pr.conc.distinctPool+=cp.distinct; pr.conc.topEraPool+=cp.topEra;
    try{ localStorage.setItem("fl_profile", JSON.stringify(pr)); }catch(e){}
    try{ flTrack("fan_profile", {type:flFanType(pr), games:Math.min(pr.games,99)}); }catch(e){}
  }catch(e){}
}
window.flProfile = function(){
  var pr=flLoad();
  if(!pr.games){ console.log("Footy Legends: brak danych — zagraj kilka gier XI After Dark."); return; }
  var life=flAxisVals(pr.pickSum,pr.availSum,pr.games,11,30);
  var rp={C:0,G:0,M:0,stars:0,deep:0,attack:0,defense:0}, ra={C:0,G:0,M:0,stars:0,deep:0,attack:0,defense:0};
  pr.recent.forEach(function(r){ for(var i=0;i<FL_AXES.length;i++){ rp[FL_AXES[i]]+=r.pk[i]; ra[FL_AXES[i]]+=r.av[i]; } });
  var rg=pr.recent.length, roll= rg ? flAxisVals(rp,ra,rg,11,30) : life;
  console.log("⚽ FOOTY LEGENDS — Twoj profil kibica ("+pr.games+" gier)");
  console.log("TYP:", flFanType(pr));
  console.log("LIFETIME (pick−avail, pkt%):", life);
  console.log("OSTATNIE "+rg+" gier:", roll);
  if(pr.conc && pr.games){ var g=pr.games;
    var loyalty=Math.round(100*((pr.conc.topClubXI/g)/11 - (pr.conc.topClubPool/g)/30));
    var purity =Math.round(100*((pr.conc.topEraXI/g)/11  - (pr.conc.topEraPool/g)/30));
    console.log("v2 (surowe) — Loyalty(klub):", loyalty, "| Purity(era):", purity);
  }
  console.log("Ulubione historie:", pr.stories);
  return pr;
};

// ── DANE RADARU B (Vintage/Modern/Stars/DeepCuts/Loyalty) ─ lifetime + forma + fakty ──
var FL_ERANAME = {C:"Classic", G:"Golden", M:"Modern"};
var FL_TIERRANK = {common:1, rare:2, legendary:3, mythic:4};
function flPA(pkSum, avSum, gg){ if(!gg) return 0; return 100*((pkSum/(gg*11)) - (avSum/(gg*30))); }
// staly udzial "normalnego skladu" (FL_BASE / 11) — punkt zero radaru, zamiast zywej puli
var FL_FRAC = {vintage:7.7/11, modern:3.3/11, stars:0.8/11, deep:4.2/11, loyalty:2.7/11};
function flBaseVal(pkSum, frac, gg){ if(!gg) return 0; return 100*((pkSum/(gg*11)) - frac); }
window.flRadarData = function(){
  var pr=flLoad(), g=pr.games||0;
  var life={
    vintage: flBaseVal(pr.pickSum.C+pr.pickSum.G, FL_FRAC.vintage, g),
    modern:  flBaseVal(pr.pickSum.M, FL_FRAC.modern, g),
    stars:   flBaseVal(pr.pickSum.stars, FL_FRAC.stars, g),
    deep:    flBaseVal(pr.pickSum.deep, FL_FRAC.deep, g),
    loyalty: flBaseVal(pr.conc?pr.conc.topClubXI:0, FL_FRAC.loyalty, g)
  };
  var rec=pr.recent.slice(-25), rg=rec.length;
  var sV=0,sM=0,sSt=0,sDp=0,sLt=0;
  rec.forEach(function(r){
    sV+=(r.pk[0]+r.pk[1]); sM+=r.pk[2]; sSt+=r.pk[3]; sDp+=r.pk[4]; sLt+=(r.lt||0);
  });
  var form = rg ? {
    vintage: flBaseVal(sV,FL_FRAC.vintage,rg), modern: flBaseVal(sM,FL_FRAC.modern,rg),
    stars: flBaseVal(sSt,FL_FRAC.stars,rg), deep: flBaseVal(sDp,FL_FRAC.deep,rg), loyalty: flBaseVal(sLt,FL_FRAC.loyalty,rg)
  } : life;
  var favEra="—", best=-1;
  ["C","G","M"].forEach(function(e){ if(pr.pickSum[e]>best){best=pr.pickSum[e];favEra=FL_ERANAME[e];} });
  if(g===0) favEra="—";
  var mostPicked="—", fc=0;
  for(var n in pr.favPlayers){ if(pr.favPlayers[n]>fc){fc=pr.favPlayers[n];mostPicked=n;} }
  var storiesFound=0; for(var s in pr.stories) storiesFound++;
  var rarest="—", rr=0;
  for(var k in pr.stories){ var ti=(STORY_INFO[k]&&STORY_INFO[k].tier)||"common"; if((FL_TIERRANK[ti]||1)>rr){rr=FL_TIERRANK[ti];rarest=ti;} }
  var tier = g>=25?"official":(g>=10?"preliminary":"forming");
  return {games:g, formGames:rg, tier:tier, life:life, form:form, type:flFanType(pr), pair:flFanTypePair(pr),
          favEra:favEra, mostPicked:mostPicked, storiesFound:storiesFound, rarest:rarest,
          usedPlayers: Object.keys(pr.favPlayers||{}).length,
          dbTotal: (typeof DB!=="undefined" && DB && DB.length) ? DB.length : 804};
};

// ── EKRAN MY FOOTY LEGEND (radar B 5 osi, bez typu) ──
function flPoly(vals, cx, cy, R){
  var ang=[-90,-18,54,126,198], p=[];
  for(var i=0;i<5;i++){ var r=(Math.max(2,Math.min(100,vals[i]))/100)*R, a=ang[i]*Math.PI/180;
    p.push((cx+r*Math.cos(a)).toFixed(1)+","+(cy+r*Math.sin(a)).toFixed(1)); }
  return p.join(" ");
}
function buildRadarSVG(life, form, games){
  var cx=190, cy=148, R=104, ang=[-90,-18,54,126,198];
  var keys=["vintage","modern","stars","deep","loyalty"];
  var labels=["VINTAGE","MODERN","STARS","DEEP CUTS","LOYALTY"];
  var scale={vintage:1.0,modern:1.0,stars:2.6,deep:1.0,loyalty:1.3};
  function disp(o){ return keys.map(function(k){ return 50 + (o[k]||0)*scale[k]; }); }
  function vtx(d,i){ var v=Math.max(2,Math.min(100,d[i])), r=(v/100)*R, a=ang[i]*Math.PI/180; return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; }
  var svg='<svg viewBox="0 0 380 300" width="100%" xmlns="http://www.w3.org/2000/svg">';
  [0.25,0.5,0.75,1].forEach(function(f){
    var p=[]; for(var i=0;i<5;i++){ var a=ang[i]*Math.PI/180; p.push((cx+f*R*Math.cos(a)).toFixed(1)+","+(cy+f*R*Math.sin(a)).toFixed(1)); }
    svg+='<polygon points="'+p.join(" ")+'" fill="none" stroke="#565349" stroke-width="1.3"/>';
  });
  for(var i=0;i<5;i++){ var a=ang[i]*Math.PI/180; svg+='<line x1="'+cx+'" y1="'+cy+'" x2="'+(cx+R*Math.cos(a)).toFixed(1)+'" y2="'+(cy+R*Math.sin(a)).toFixed(1)+'" stroke="#4a4840" stroke-width="1.3"/>'; }
  var g=(games==null)?999:games, dl=disp(life);
  if(g>=10){
    svg+='<polygon points="'+flPoly(dl,cx,cy,R)+'" fill="rgba(233,196,106,0.26)" stroke="#e9c46a" stroke-width="2.5"/>';
    svg+='<polygon points="'+flPoly(disp(form),cx,cy,R)+'" fill="none" stroke="#e2554a" stroke-width="2" stroke-dasharray="5,4"/>';
  } else {
    // KONSTELACJA (szkic): ghost pelnego ksztaltu od gry 1 + kropki (STALA kolejnosc katowa) + domykanie bokow
    // ghost = blady przerywany zarys docelowego DNA -> "tu powstaje ksztalt", nie pustka/bug. Forma ukryta do 10.
    svg+='<polygon points="'+flPoly(dl,cx,cy,R)+'" fill="rgba(233,196,106,0.05)" stroke="#8a7d55" stroke-width="1.2" stroke-dasharray="3,4" opacity="0.55"/>';
    var order=[0,1,2,3,4]; // STALA kolejnosc (mierzalny eksperyment) — katowa VINTAGE->MODERN->STARS->DEEP->LOYALTY
    var nDots=Math.min(g,5), shown={};
    for(var d0=0; d0<nDots; d0++){ shown[order[d0]]=true; }
    var nEdges = g<=5 ? 0 : Math.min(g-5,5), edges=[[0,1],[1,2],[2,3],[3,4],[4,0]];
    for(var e=0;e<nEdges;e++){ var A=vtx(dl,edges[e][0]), B=vtx(dl,edges[e][1]);
      svg+='<line x1="'+A[0].toFixed(1)+'" y1="'+A[1].toFixed(1)+'" x2="'+B[0].toFixed(1)+'" y2="'+B[1].toFixed(1)+'" stroke="#e9c46a" stroke-width="2.4"/>'; }
    for(var k2 in shown){ var P=vtx(dl,+k2); svg+='<circle cx="'+P[0].toFixed(1)+'" cy="'+P[1].toFixed(1)+'" r="3.6" fill="#e9c46a"/>'; }
  }
  for(var j=0;j<5;j++){ var a2=ang[j]*Math.PI/180, lx=cx+(R+18)*Math.cos(a2), ly=cy+(R+18)*Math.sin(a2);
    var anc=Math.abs(Math.cos(a2))<0.35?"middle":(Math.cos(a2)>0?"start":"end");
    svg+='<text x="'+lx.toFixed(1)+'" y="'+(ly+4).toFixed(1)+'" fill="#c9c4b2" font-size="9" text-anchor="'+anc+'">'+labels[j]+'</text>'; }
  return svg+'</svg>';
}

function flRow(k,v){ return '<div style="color:#7d7a68;letter-spacing:1px">'+k+'</div><div style="color:#f3efe2">'+v+'</div>'; }
var FL_TYPE = {
  history:  {name:"THROWBACK",    sub:"the game was better in black and white"},
  modern:   {name:"NEW SCHOOL",   sub:"today's players, every time"},
  stars:    {name:"STAR HUNTER",  sub:"if they're famous, they're in"},
  scout:    {name:"SCOUT",        sub:"you remember who everyone forgot"},
  attack:   {name:"ATTACK FIRST", sub:"defence is the opponent's problem"},
  backbone: {name:"BACKBONE",     sub:"clean sheets win titles"},
  loyalty:  {name:"LOYALIST",     sub:"one club, eleven shirts"},
  balanced: {name:"ALL-ROUNDER",  sub:"the complete fan"}
};

// JEDNO ZRODLO TEKSTU UI — ekran I karta czerpia stad, zeby sie nie rozjechaly (GAMES vs MATCHES itd.)
var FL_UI = {
  games:    "GAMES",
  chapter:  "CURRENT CHAPTER",
  dnaTitle: "YOUR FOOTBALL DNA",
  // czas: MM:SS ponizej godziny, H:MM:SS powyzej, Xd Yh powyzej doby
  time: function(ms){
    var s = Math.floor((ms||0)/1000);
    var pad = function(n){ return (n<10?"0":"")+n; };
    if(s < 86400){
      var h=Math.floor(s/3600), m=Math.floor((s%3600)/60), ss=s%60;
      return h>0 ? (h+":"+pad(m)+":"+pad(ss)) : (pad(m)+":"+pad(ss));
    }
    var d=Math.floor(s/86400), hh=Math.floor((s%86400)/3600);
    return d+"d "+hh+"h";
  }
};
// escape do wstawiania w innerHTML (imie jest user-controlled) — NIE uzywac na canvasie
function flEsc(s){ return (""+s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
// wlasciciel profilu: imie w dopelniaczu (TOKA'S) albo "MY" gdy brak imienia — bez bledu gramatycznego
function flLegendOwner(){
  var n=null; try{ if(typeof getStoredName==="function") n=getStoredName(); }catch(e){}
  if(!n) return "MY";
  n=(""+n).trim();
  if(!n || n.toUpperCase()==="MY") return "MY";
  return n + (/[sS]$/.test(n) ? "\u2019" : "\u2019S");
}
// ── CLEAN VIEW: chowa UI do zrzutu ekranu (gracz robi zwykly screenshot telefonu) ──
var FL_CLEAN=false;
function flCleanView(){
  var b=document.getElementById("legend-body"); if(!b||FL_CLEAN) return;
  FL_CLEAN=true;
  try{ flTrack("clean_view",{mode:"legend"}); }catch(e){}
  try{ b.querySelectorAll("[data-clean-hide]").forEach(function(e){ e.style.display="none"; }); }catch(e){}
  var wm=document.getElementById("legend-watermark"); if(wm) wm.style.display="block";
  var h=document.getElementById("fl-clean-hint"); if(h&&h.parentNode) h.remove();
  h=document.createElement("div"); h.id="fl-clean-hint";
  h.style.cssText="position:fixed;bottom:18px;left:0;right:0;text-align:center;color:#e9c46a;font-size:9px;letter-spacing:2px;z-index:99999;transition:opacity .6s;font-family:inherit;pointer-events:none";
  h.textContent="TAKE A SCREENSHOT \u00b7 TAP TO EXIT";
  document.body.appendChild(h);
  setTimeout(function(){ if(h) h.style.opacity="0"; }, 1600);   // znika, zeby nie bylo jej na zrzucie
  setTimeout(function(){ if(h&&h.parentNode) h.remove(); }, 2300);
  setTimeout(function(){ document.addEventListener("click", flCleanExit, {once:true}); }, 350); // exit dopiero po tapie wlaczajacym
}
function flCleanExit(){
  var b=document.getElementById("legend-body");
  if(b){ try{ b.querySelectorAll("[data-clean-hide]").forEach(function(e){ e.style.display=""; }); }catch(e){} }
  var wm=document.getElementById("legend-watermark"); if(wm) wm.style.display="none";
  var h=document.getElementById("fl-clean-hint"); if(h&&h.parentNode) h.remove();
  FL_CLEAN=false;
}
window.flCleanView=flCleanView;
window.openLegend = function(silent){
  try{ flCleanExit(); }catch(e){}
  var b=document.getElementById("legend-body"); if(!b) return;
  var d=window.flRadarData?window.flRadarData():null;
  if(!d){ go("s-legend"); return; }
  if(!silent){ try{ flTrack("legend_open",{games:Math.min(d.games||0,99), revealed:(d.games>=10)?1:0, type:(d.games>=10?d.type:"forming")}); }catch(e){} }
  var tierTxt=d.tier==="official"?"OFFICIAL FOOTY DNA":(d.tier==="preliminary"?"PRELIMINARY PROFILE":"IDENTITY FORMING");
  var gate=d.games<10?("First identity in "+(10-d.games)+" matches"):(d.games<25?("Official profile in "+(25-d.games)+" matches"):"Identity established");
  var radar=d.games>0?buildRadarSVG(d.life,d.form,d.games):'<div style="padding:46px 0;color:#7d7a68;font-size:12px">Play a match to start your radar.</div>';
  var forming = d.games<10;
  var radarBlock = '<div class="legend-radar">'+radar+'</div>';
  var legBlock = forming ? '' : '<div class="legend-leg"><b style="color:#e9c46a">DNA</b> &middot; <b style="color:#e2554a">Form</b> ('+d.formGames+')</div>';
  var rar=(d.rarest&&d.rarest.length>1)?d.rarest.charAt(0).toUpperCase()+d.rarest.slice(1):d.rarest;
  var facts=flRow("ERA", d.games<5?"\u2014":d.favEra)
          + flRow("TOP PICK", d.games<5?"\u2014":d.mostPicked)
          + flRow("LEGENDS", d.usedPlayers+" / "+d.dbTotal)
          + flRow("STORIES", d.storiesFound)
          + flRow("RAREST", rar);
  var pair = d.pair || {primary:"balanced", secondary:null, allRounder:true};
  var isFormed = d.games>=10;
  var typeBlock;
  if(isFormed){
    var pName = pair.allRounder ? "ALL-ROUNDER" : (FL_TYPE[pair.primary]||FL_TYPE.balanced).name;
    var pSub  = pair.allRounder ? FL_TYPE.balanced.sub : (FL_TYPE[pair.primary]||FL_TYPE.balanced).sub;
    var secName = (!pair.allRounder && pair.secondary && FL_TYPE[pair.secondary]) ? FL_TYPE[pair.secondary].name : null;
    typeBlock = '<div style="margin:8px 0 4px">'
      + '<div style="color:#bcb6a2;font-size:9px;letter-spacing:4px">'+FL_UI.dnaTitle+'</div>'
      + '<div style="color:#ffd54a;font-size:20px;letter-spacing:1px;line-height:1.15;margin-top:8px">'+pName+'</div>'
      + (secName ? '<div style="color:#e9c46a;font-size:12px;letter-spacing:2px;margin-top:4px">+ '+secName+'</div>' : '')
      + '<div data-quote="placeholder" style="color:#8a8576;font-size:9px;letter-spacing:.5px;margin:10px 0 2px;line-height:1.6;font-style:italic">"'+pSub+'"</div>'
      + '</div>';
  } else {
    typeBlock = '<div style="margin:14px 0 4px;color:#7d7a68;font-size:10px;letter-spacing:1px;line-height:1.8">IDENTITY FORMING<br><span style="color:#5f5c4e;font-size:9px">type revealed in '+(10-d.games)+' matches</span></div>';
  }
  var shareBlock = isFormed
    ? '<button data-clean-hide onclick="flShareDnaCard()" style="font-family:inherit;margin-top:16px;border:1px solid #e9c46a;color:#e9c46a;background:transparent;border-radius:6px;font-size:11px;letter-spacing:1px;padding:11px 24px;cursor:pointer">SHARE MY DNA</button>'
    : '<div data-clean-hide style="margin-top:14px;font-size:9px;color:#5f5c4e;letter-spacing:1px;border:1px dashed #33312a;border-radius:6px;padding:10px 16px;display:inline-block">SHARE unlocks at 10 matches</div>';
  b.innerHTML=
    '<button class="btn-back" data-clean-hide onclick="go(\'s-title\')">MENU</button>'+
    '<div id="legend-clean-btn" data-clean-hide onclick="this.blur();flCleanView()" style="position:fixed;top:14px;right:14px;z-index:50;width:34px;height:34px;border:1px solid #6a6656;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:rgba(0,0,0,0.45);outline:none;-webkit-tap-highlight-color:transparent" tabindex="-1"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e9c46a" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.2"/></svg></div>'+
    '<div class="legend-title" style="margin-top:30px"><span onclick="try{changeName()}catch(e){}" style="cursor:pointer;border-bottom:2px dotted #7a7660">'+flEsc(flLegendOwner())+'</span> FOOTY LEGEND</div>'+
    '<div class="legend-tier">'+flFootballLife(d.games)+'</div>'+
    radarBlock+
    legBlock+
    typeBlock+
    '<div class="legend-rows" style="display:grid;grid-template-columns:max-content 1fr;column-gap:18px;row-gap:7px;font-size:12px;text-align:left;padding-top:10px">'+facts+'</div>'+
    shareBlock+
    '<div id="legend-watermark" style="display:none;margin-top:20px;color:#7a7660;font-size:9px;letter-spacing:2px">footylegendsquiz.co.uk</div>';
  go("s-legend");
};
window.updateLegendTile = function(){
  var el=document.getElementById("legend-desc"); if(!el||!window.flRadarData) return;
  var d=window.flRadarData();
  el.innerHTML=d.games<10?("identity forming &middot; "+d.games+"/10"):(d.games<25?("preliminary &middot; "+d.games+"/25"):("official footy DNA &middot; "+d.games+" matches"));
};
// po zmianie imienia: jesli ekran My Footy Legend jest otwarty, przerysuj tytul na zywo
(function(){
  var _ccn = window.confirmChangeName;
  if(typeof _ccn === "function"){
    window.confirmChangeName = function(){
      var r = _ccn.apply(this, arguments);
      try{
        var s = document.getElementById("s-legend");
        if(s && s.classList.contains("on") && typeof window.openLegend==="function") window.openLegend(true);
      }catch(e){}
      return r;
    };
  }
})();
function flLegendShareLine(d){
  if(!d||d.games<10) return "What's your footy DNA? Find out on Footy Legends.";
  var t=FL_TYPE[d.type]||FL_TYPE.balanced;
  return "My footy DNA: "+t.name+" \u2014 "+t.sub+". What's yours?";
}
window.shareLegend = function(){
  try{ flTrack("share",{mode:"legend"}); }catch(e){}
  var d=window.flRadarData?window.flRadarData():null;
  var url="https://footylegendsquiz.co.uk", line=flLegendShareLine(d);
  try{ if(navigator.share){ navigator.share({title:"My Footy Legend", text:line, url:url}); return; } }catch(e){}
  try{ navigator.clipboard.writeText(line+" "+url); if(typeof toast==="function") toast("Link copied",""); }catch(e){}
};

function flBuildDnaCard(cb){
  var FL=window.FLCard; if(!FL) return;
  var d=window.flRadarData?window.flRadarData():null; if(!d) return;
  var ty=FL_TYPE[d.type]||FL_TYPE.balanced;
  var cv=FL.newCanvas(), ctx=cv.getContext("2d"), W=FL.W, H=FL.H;
  FL.frame(ctx,{url:"footylegendsquiz.co.uk", tier:"legendary", noGlow:true});
  ctx.textAlign="center"; ctx.textBaseline="alphabetic";
  ctx.fillStyle="#e9c46a";
  var _own=flLegendOwner(), _title=(_own==="MY"?"MY":_own)+" FOOTY LEGEND", _ts=62;
  ctx.font="900 "+_ts+"px Arial, sans-serif";
  if(ctx.letterSpacing!==undefined) ctx.letterSpacing="2px";
  while(ctx.measureText(_title).width>W-150 && _ts>34){ _ts--; ctx.font="900 "+_ts+"px Arial, sans-serif"; }
  ctx.fillText(_title, W/2, 132);
  if(ctx.letterSpacing!==undefined) ctx.letterSpacing="1px";
  ctx.fillStyle="#bcb6a2"; ctx.font="bold 26px Arial, sans-serif";
  ctx.fillText("OFFICIAL FOOTY DNA  \u00b7  "+d.games+" "+FL_UI.games, W/2, 178);
  if(ctx.letterSpacing!==undefined) ctx.letterSpacing="0px";
  function hr(y){ ctx.strokeStyle="#2a2820"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(W/2-210,y); ctx.lineTo(W/2+210,y); ctx.stroke(); }
  // ── radar (wysrodkowany) ──
  var cx=W/2, cy=486, R=206, OFF=46, ang=[-90,-18,54,126,198];
  var keys=["vintage","modern","stars","deep","loyalty"], labels=["VINTAGE","MODERN","STARS","DEEP CUTS","LOYALTY"];
  var scale={vintage:1.0,modern:1.0,stars:2.6,deep:1.0,loyalty:1.3};
  function disp(o){ return keys.map(function(k){ return 50+(o[k]||0)*scale[k]; }); }
  function pt(v,a){ var r=(Math.max(2,Math.min(100,v))/100)*R, rad=a*Math.PI/180; return [cx+r*Math.cos(rad), cy+r*Math.sin(rad)]; }
  ctx.strokeStyle="#565349"; ctx.lineWidth=2;
  [0.25,0.5,0.75,1].forEach(function(f){ ctx.beginPath(); for(var i=0;i<5;i++){ var a=ang[i]*Math.PI/180, x=cx+f*R*Math.cos(a), y=cy+f*R*Math.sin(a); if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);} ctx.closePath(); ctx.stroke(); });
  ctx.strokeStyle="#4a4840";
  for(var i=0;i<5;i++){ var a=ang[i]*Math.PI/180; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+R*Math.cos(a),cy+R*Math.sin(a)); ctx.stroke(); }
  function poly(vals,fill,stroke,dash){ ctx.beginPath(); for(var i=0;i<5;i++){ var p=pt(vals[i],ang[i]); if(i===0)ctx.moveTo(p[0],p[1]); else ctx.lineTo(p[0],p[1]); } ctx.closePath();
    if(fill){ ctx.fillStyle=fill; ctx.fill(); }
    ctx.setLineDash(dash||[]); ctx.strokeStyle=stroke; ctx.lineWidth=4; ctx.stroke(); ctx.setLineDash([]); }
  poly(disp(d.life),"rgba(233,196,106,0.22)","#e9c46a",null);
  poly(disp(d.form),null,"#e2554a",[10,8]);
  ctx.font="bold 25px Arial, sans-serif"; ctx.textBaseline="middle";
  for(var j=0;j<5;j++){ var a2=ang[j]*Math.PI/180, lx=cx+(R+OFF)*Math.cos(a2), ly=cy+(R+OFF)*Math.sin(a2);
    ctx.textAlign = Math.abs(Math.cos(a2))<0.35?"center":(Math.cos(a2)>0?"left":"right");
    ctx.fillStyle="#c9c4b2"; ctx.fillText(labels[j], lx, ly); }
  ctx.textBaseline="alphabetic"; ctx.textAlign="center";
  hr(760);
  // ── type hero (OSTRO — bez glow) — primary + secondary z d.pair ──
  var _pair = d.pair || {primary:"balanced", secondary:null, allRounder:true};
  var _pName = _pair.allRounder ? "ALL-ROUNDER" : (FL_TYPE[_pair.primary]||FL_TYPE.balanced).name;
  var _pSub  = _pair.allRounder ? FL_TYPE.balanced.sub : (FL_TYPE[_pair.primary]||FL_TYPE.balanced).sub;
  var _sec   = (!_pair.allRounder && _pair.secondary && FL_TYPE[_pair.secondary]) ? FL_TYPE[_pair.secondary].name : null;
  ctx.fillStyle="#9d9987"; ctx.font="bold 24px Arial, sans-serif";
  if(ctx.letterSpacing!==undefined) ctx.letterSpacing="6px";
  ctx.fillText("YOU ARE", W/2, 822);
  if(ctx.letterSpacing!==undefined) ctx.letterSpacing="1px";
  ctx.fillStyle="#ffd54a"; var ns=90; ctx.font="900 "+ns+"px Arial, sans-serif";
  while(ctx.measureText(_pName).width>W-160 && ns>48){ ns--; ctx.font="900 "+ns+"px Arial, sans-serif"; }
  ctx.fillText(_pName, W/2, _sec?900:918);
  if(_sec){ ctx.fillStyle="#e9c46a"; ctx.font="900 40px Arial, sans-serif"; if(ctx.letterSpacing!==undefined) ctx.letterSpacing="2px"; ctx.fillText("+ "+_sec, W/2, 952); }
  if(ctx.letterSpacing!==undefined) ctx.letterSpacing="0px";
  ctx.fillStyle="#aca792"; ctx.font="italic 500 28px Arial, sans-serif";
  FL.wrap(ctx, '"'+_pSub+'"', W-220, 2).forEach(function(ln,k){ ctx.fillText(ln, W/2, (_sec?992:972)+k*36); });
  hr(1040);
  // ── stats (wysrodkowane wokol srodka) ──
  var rarTxt=(d.rarest&&d.rarest.length>1)?(d.rarest.charAt(0).toUpperCase()+d.rarest.slice(1)):d.rarest;
  var rows=[["ERA", d.games<5?"\u2014":d.favEra],["TOP PICK", d.games<5?"\u2014":d.mostPicked],["STORIES", ""+d.storiesFound],["RAREST", rarTxt]];
  var sy=1094, lineH=58, labelX=W/2-34, valueX=W/2+34;
  ctx.font="bold 30px Arial, sans-serif";
  for(var r=0;r<rows.length;r++){ var yy=sy+r*lineH;
    ctx.textAlign="right"; ctx.fillStyle="#9d9987"; ctx.fillText(rows[r][0], labelX, yy);
    ctx.textAlign="left"; ctx.fillStyle="#f3efe2"; ctx.fillText(rows[r][1], valueX, yy); }
  ctx.textAlign="center";
  cv.toBlob(function(blob){ if(blob) cb(blob); }, "image/png");
}
function flShareDnaCard(){
  try{ flTrack("share",{mode:"dna"}); }catch(e){}
  var d=window.flRadarData?window.flRadarData():null;
  var line=flLegendShareLine(d);
  flBuildDnaCard(function(blob){ window.FLCard.shareBlob(blob, "my-footy-dna.png", line, "https://footylegendsquiz.co.uk"); });
}
window.flShareDnaCard = flShareDnaCard;

function lockXI(){
  if(FL_BUILD_START){ flAddPlayMs(Date.now()-FL_BUILD_START); FL_BUILD_START=0; } // czas budowania tego XI
  flClearDraft(); // draft dokonczony -> nie ma czego odzyskiwac
  const xiPlayers = SLOTS.map(s=>s.player);
  const xiNames = xiPlayers.map(p=>p.n);
  const det = detect(xiNames);
  const xitype = flXIType(xiPlayers);

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
  let storyName="", storyEmoji="", storyDesc="", storyRest="", storyMythic=false;
  if(det.main){
    const M = NARRATIVES[det.main];
    const mythic = isMythic(det.main, det.counts[det.main]); storyMythic = mythic;
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
  try{
    var _tier = storyMythic ? "mythic" : (storyKey && STORY_INFO[storyKey] ? STORY_INFO[storyKey].tier : "none");
    flTrack("game_complete", {mode:"xad", score:score, story:storyKey||"none", tier:_tier, xi_type:xitype.primary+(xitype.secondary?"+"+xitype.secondary:"")});
    if(storyIsNew && storyKey) flTrack("story_discovered", {mode:"xad", story:storyKey, tier:_tier});
  }catch(e){}
  try{ logProfile(xiPlayers, POOL, storyKey); }catch(e){}
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
                '<div class="pname'+(lastName(p.n).length>8?' pname-long':'')+'">'+escXad(lastName(p.n))+'</div>'+
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
              '<div class="pname'+(lastName(p.n).length>8?' pname-long':'')+'">'+escXad(lastName(p.n))+'</div>'+
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
      story: { key:(storyKey||"mixed"), name:storyName, emoji:storyEmoji, desc:storyDesc, rest:storyRest, tier:((typeof STORY_INFO!=="undefined"&&STORY_INFO[storyKey]&&STORY_INFO[storyKey].tier)||"common"), mythic:storyMythic },
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
  var _xt = (xitype.primary==="balanced") ? {name:"ALL-ROUNDER"} : (FL_TYPE[xitype.primary]||{name:"ALL-ROUNDER"});
  var _xs = (xitype.secondary && FL_TYPE[xitype.secondary]) ? FL_TYPE[xitype.secondary].name : null;
  html += '<div style="margin:16px auto 4px;text-align:center">'
        + '<div style="font-size:8px;letter-spacing:3px;color:#7d7a68">YOU BUILT</div>'
        + '<div style="font-size:18px;letter-spacing:1px;color:#ffd54a;margin-top:6px;text-shadow:0 0 8px rgba(255,213,74,.25)">'+_xt.name+'</div>'
        + (_xs ? '<div style="font-size:10px;letter-spacing:1px;color:#8a8576;margin-top:4px">+ '+_xs+'</div>' : '')
        + '<div style="font-size:8px;letter-spacing:1px;color:#5f5c4e;margin-top:8px">ADDED TO YOUR FOOTY DNA</div>'
        + '</div>';
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
  // ── Ujawnienie historii: odpala się przy KAŻDEJ narracji. Gdy jest popup z odznaką
  //    (nowa narracja) — czeka na jego kliknięcie, żeby nie leciało pod spodem.
  //    Gdy popupu nie ma (narracja już odkryta) — startuje automatycznie. ──
  try{ xadArmStoryReveal((storyIsNew && storyKey) || !!tac); }catch(e){}
}

/* ── UJAWNIENIE HISTORII (story reveal): piłka pokazuje, KTO zbudował narrację ──
   rdzeń = narracja + archetyp (+ koszulki '66). Piłka skacze od dołu do góry i
   "zapala" kolejnych graczy. Auto po werdykcie + mała ikona ↻. Bez iskier/dźwięków. */
let STORY_RUN = 0;
let STORY_ARMED = null;
function xadDisarmStoryReveal(){
  if(STORY_ARMED){ document.removeEventListener("click", STORY_ARMED, true); STORY_ARMED=null; }
}
function xadArmStoryReveal(popupShown){
  var pitch=document.querySelector("#s-xad .xad-pitch-reveal");
  if(!pitch || pitch.querySelectorAll(".pdot.link-narr, .pdot.link-arch, .pdot.p66").length===0) return; // MIXED/brak rdzenia → nic
  xadDisarmStoryReveal();
  if(popupShown){
    // popup z odznaką zasłania boisko → start na pierwsze kliknięcie (zamknięcie odznaki)
    STORY_ARMED = function(){ xadDisarmStoryReveal(); try{ xadStoryReveal(false); }catch(e){} };
    document.addEventListener("click", STORY_ARMED, true);
  } else {
    // brak popupu → odpal automatycznie po werdykcie
    try{ xadStoryReveal(true); }catch(e){}
  }
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
  await xadWait(1125); if(run!==STORY_RUN) return;   // ~1.1 s sam rdzeń (o ćwiartkę krócej)
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
  FL.frame(ctx,{ url:"footylegendsquiz.co.uk", tier:(S.story&&S.story.tier)||"common", mythic:(S.story&&S.story.mythic)||false });
  FL.drawHero(ctx,{ emoji:(S.story&&S.story.emoji)||"", name:(S.story&&S.story.name)||"", tagline:(S.story&&S.story.desc)||"", rest:(S.story&&S.story.rest)||"", devil:(S.story&&S.story.key==="class92") });
  FL.drawScore(ctx,{ kicker:"XI AFTER DARK", score:S.score });
  FL.drawRarityFooter(ctx,{ tier:(S.story&&S.story.tier)||"common", mythic:(S.story&&S.story.mythic)||false });
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
  var sized = ENGLAND_SHIRT_SVG.replace("<svg ", '<svg width="120" height="120" ');
  var img=new Image();
  function draw(haveImg){
    S.slots.forEach(function(s){
      if(!s) return;
      var cx=P.x+s.x*P.w, cy=P.y+s.y*P.h;
      var st=LINK_STYLE[s.link]||LINK_STYLE.grey;
      // #1 cień osadzenia na trawie
      ctx.save(); ctx.shadowColor="rgba(0,0,0,0.55)"; ctx.shadowBlur=12; ctx.shadowOffsetY=2;
      ctx.beginPath(); ctx.ellipse(cx, cy+37, 22, 6, 0, 0, Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.55)"; ctx.fill(); ctx.restore();
      if(s.shirt66 && haveImg){
        ctx.drawImage(img, cx-58, cy-66, 117, 117);
      } else {
        var R=45, ccx=cx, ccy=cy-8;
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
        ctx.fillStyle="#ffffff"; ctx.font="bold 29px Arial, sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(s.pos, ccx, ccy); ctx.textBaseline="alphabetic";
      }
      var eh=ERA_CARD[s.era]; if(eh){ ctx.beginPath(); ctx.arc(cx+32,cy-42,12,0,Math.PI*2); ctx.fillStyle=eh; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.stroke(); }
      var nm=s.name, fs=28; ctx.font="bold "+fs+"px Arial, sans-serif";
      while(ctx.measureText(nm).width>138 && fs>15){ fs--; ctx.font="bold "+fs+"px Arial, sans-serif"; }
      ctx.textAlign="center"; ctx.lineJoin="round";
      // #2 ciemny kontur pod nazwiskiem (czytelność na każdym pasie)
      ctx.lineWidth=4; ctx.strokeStyle="rgba(0,0,0,0.85)"; ctx.strokeText(nm, cx, cy+66);
      ctx.fillStyle=(s.shirt66 ? "#ffffff" : st.pname); ctx.fillText(nm, cx, cy+66);
    });
    cv.toBlob(function(blob){ if(blob) cb(blob); }, "image/png");
  }
  img.onload=function(){ draw(true); };
  img.onerror=function(){ draw(false); };
  img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(sized);
}
function xadShareCard(){ try{flTrack("share",{mode:"xad"});}catch(e){} xadBuildCard(function(blob){
    var st=(LAST_SHARE&&LAST_SHARE.story)||{}, sc=(LAST_SHARE&&LAST_SHARE.score)||0;
    var lead=(st.name||"")+((st.name&&st.desc)?" \u2014 ":"")+(st.desc||"");
    var tail=(sc>=140)?(" "+sc+" pts. Beat that. \ud83d\udc47"):" Can you beat it? \ud83d\udc47";
    var txt=(lead?lead:"Can you beat this?")+tail;
    window.FLCard.shareBlob(blob, "xi-after-dark.png", txt, "https://footylegendsquiz.co.uk");
  }); }
function xadSaveCard(){ xadBuildCard(function(blob){ window.FLCard.saveBlob(blob, "xi-after-dark.png"); }); }
window.xadShareCard = xadShareCard;
window.xadSaveCard  = xadSaveCard;
window.xadPlayAgain  = function(){ try{flTrack("play_again",{mode:"xad"});}catch(e){} return openDraftEmpty.apply(this,arguments); };  // po reveal → puste boisko + PICK MY 30

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
    var _tier=opts.tier||"common", _myth=!!opts.mythic;
    var _bc   = _myth ? "#e0382b" : _tier==="legendary" ? "#ffd24a" : _tier==="rare" ? "#cdd6df" : "#c9a73a";
    var _glow = _myth ? "rgba(224,56,43,0.85)" : _tier==="legendary" ? "rgba(255,210,74,0.80)" : _tier==="rare" ? "rgba(205,214,223,0.55)" : null;
    var _inner= _myth ? "rgba(224,56,43,0.45)" : _tier==="legendary" ? "rgba(255,210,74,0.50)" : _tier==="rare" ? "rgba(205,214,223,0.45)" : "rgba(232,200,96,0.45)";
    if(_glow && !opts.noGlow){ ctx.save(); ctx.shadowColor=_glow; ctx.shadowBlur=34; ctx.strokeStyle=_bc; ctx.lineWidth=4; roundRect(ctx,M,M,W-2*M,H-2*M,28); ctx.stroke(); ctx.stroke(); ctx.restore(); }
    ctx.strokeStyle=_bc; ctx.lineWidth=(_myth||_tier==="legendary")?5:4; roundRect(ctx,M,M,W-2*M,H-2*M,28); ctx.stroke();
    ctx.strokeStyle=_inner; ctx.lineWidth=1.5; roundRect(ctx,M+10,M+10,W-2*M-20,H-2*M-20,22); ctx.stroke();
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
  var _devilRects=null;
  function devilRects(){
    if(_devilRects) return _devilRects;
    _devilRects=[];
    if(typeof DEVIL_SVG==="string"){
      var re=/<rect x="(\d+)" y="(\d+)" width="1" height="1" fill="(#[0-9a-fA-F]+)"\/>/g, m;
      while((m=re.exec(DEVIL_SVG))){ _devilRects.push([+m[1],+m[2],m[3]]); }
    }
    return _devilRects;
  }
  function drawDevil(ctx, cx, cy, size){
    var r=devilRects(); if(!r.length) return;
    var px=size/18, ox=cx-size/2, oy=cy-size/2;
    for(var i=0;i<r.length;i++){ ctx.fillStyle=r[i][2]; ctx.fillRect(ox+r[i][0]*px, oy+r[i][1]*px, px+0.6, px+0.6); }
  }
  function drawHero(ctx,o){
    o=o||{}; ctx.textAlign="center";
    var name=o.name||"";
    if(name && o.devil){
      // czerwony pikselowy diabeł (jak w grze) zamiast fioletowego emoji
      var ns=58; ctx.font="900 "+ns+"px Arial, sans-serif";
      while(ctx.measureText(name).width>W-240 && ns>32){ ns--; ctx.font="900 "+ns+"px Arial, sans-serif"; }
      var dsz=ns*0.92, gap=18, nameW=ctx.measureText(name).width, total=dsz+gap+nameW, sx=W/2-total/2;
      drawDevil(ctx, sx+dsz/2, 140-ns*0.34, dsz);
      ctx.fillStyle="#e8c860"; ctx.textAlign="left"; ctx.fillText(name, sx+dsz+gap, 140); ctx.textAlign="center";
    } else if(name){
      var emoji=o.emoji?o.emoji+" ":"";
      var full=emoji+name, ns2=58; ctx.font="900 "+ns2+"px Arial, sans-serif";
      while(ctx.measureText(full).width>W-150 && ns2>32){ ns2--; ctx.font="900 "+ns2+"px Arial, sans-serif"; }
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
      ctx.fillStyle="#c9a73a"; ctx.font="bold 28px Arial, sans-serif"; ctx.fillText(o.kicker||"", W/2, H-154);
      if(ctx.letterSpacing!==undefined) ctx.letterSpacing="0px";
      var sc=String(o.score);
      ctx.font="900 80px Arial, sans-serif"; var w1=ctx.measureText(sc).width;
      ctx.font="bold 38px Arial, sans-serif"; var w2=ctx.measureText("PTS").width;
      var gap=16, startX=W/2-(w1+gap+w2)/2;
      ctx.textAlign="left";
      ctx.fillStyle="#ffffff"; ctx.font="900 80px Arial, sans-serif"; ctx.fillText(sc, startX, H-80);
      ctx.fillStyle="#c9a73a"; ctx.font="bold 38px Arial, sans-serif"; ctx.fillText("PTS", startX+w1+gap, H-80);
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
  function drawRarityFooter(ctx,o){
    o=o||{}; var tier=o.tier||"common", myth=!!o.mythic;
    var found=0, tot=20;
    try{ tot=Object.keys(STORY_INFO).length; }catch(e){}
    try{ found=getXadStories().size; }catch(e){}
    var col = myth ? "#ff5a48" : tier==="legendary" ? "#ffd24a" : tier==="rare" ? "#cdd6df" : "#9a8c5a";
    var lbl = myth ? "MYTHIC STORY FOUND" : tier==="legendary" ? "LEGENDARY STORY FOUND" : tier==="rare" ? "RARE STORY FOUND" : "STORY FOUND";
    ctx.textAlign="center";
    if(ctx.letterSpacing!==undefined) ctx.letterSpacing="3px";
    ctx.fillStyle=col; ctx.font="bold 27px Arial, sans-serif"; ctx.fillText(lbl, W/2, H-236);
    ctx.fillStyle="#6f7d71"; ctx.font="bold 21px Arial, sans-serif"; ctx.fillText("LEGACY   \u00b7   "+found+" / "+tot, W/2, H-210);
    if(ctx.letterSpacing!==undefined) ctx.letterSpacing="0px";
    ctx.textAlign="center";
  }
  return { W:W, H:H, PITCH:PITCH, newCanvas:newCanvas, roundRect:roundRect, wrap:wrap, frame:frame, drawHero:drawHero, drawScore:drawScore, drawPitch:drawPitch, drawCaption:drawCaption, drawRarityFooter:drawRarityFooter, shareBlob:shareBlob, saveBlob:saveBlob };
})();

})();
