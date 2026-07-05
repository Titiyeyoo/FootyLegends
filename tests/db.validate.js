// Footy Legends — walidator bazy db.js (uruchom: node tests/db.validate.js)
// Sprawdza, czy KAZDY zawodnik ma komplet pol i poprawne wartosci — siatka bezpieczenstwa
// przed cichym bledem (dodasz gracza bez pola / z literowka w erze i cos sie wywali).
// Narzedzie deweloperskie: zero wplywu na produkcje, zero danych gracza, zero PII.
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.join(__dirname, "..");

// zaladuj var DB (czyste dane, bez zaslepek przegladarki)
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "db.js"), "utf8"), sandbox, { filename: "db.js" });
const DB = sandbox.DB;

const VALID_E   = new Set(["C","G","M"]);
const VALID_P   = new Set(["DF","FW","GK","MF"]);
const VALID_POS = new Set(["AM","CB","CM","DM","GK","LB","LM","LW","RB","RM","RW","ST"]);

let errors = [], warns = [];
function err(i, msg){ errors.push("  \u2717 [#"+i+"] "+msg); }
function warn(msg){ warns.push("  ! "+msg); }

if(!Array.isArray(DB)){ console.log("\u2717 DB nie jest tablica!"); process.exit(1); }

const names = {};        // wykrywanie duplikatow
const posGroup = {};     // pos -> zbior grup p (spojnosc)

DB.forEach((pl, i) => {
  const who = pl && pl.n ? pl.n : "(bez nazwy)";
  if(!pl || typeof pl !== "object"){ err(i, "wpis nie jest obiektem"); return; }
  // n
  if(typeof pl.n !== "string" || !pl.n.trim()) err(i, "brak/pusta nazwa 'n'");
  else { const key = pl.n.toLowerCase(); if(names[key]) err(i, "DUPLIKAT nazwy: \""+pl.n+"\" (tez #"+names[key]+")"); else names[key] = i; }
  // a (aliasy)
  if(!Array.isArray(pl.a)) err(i, who+": 'a' (aliasy) nie jest tablica");
  else if(pl.a.length === 0) warn(who+": pusta lista aliasow 'a'");
  // e (era)
  if(!VALID_E.has(pl.e)) err(i, who+": zle 'e' (era) = "+JSON.stringify(pl.e)+" (dozwolone C/G/M)");
  // p (grupa)
  if(!VALID_P.has(pl.p)) err(i, who+": zle 'p' (grupa) = "+JSON.stringify(pl.p)+" (dozwolone DF/FW/GK/MF)");
  // pos
  if(!VALID_POS.has(pl.pos)) err(i, who+": zle 'pos' = "+JSON.stringify(pl.pos));
  // c (kluby)
  if(!Array.isArray(pl.c)) err(i, who+": 'c' (kluby) nie jest tablica");
  else if(pl.c.length === 0) warn(who+": brak klubow 'c'");
  // spojnosc pos <-> grupa
  if(VALID_POS.has(pl.pos) && VALID_P.has(pl.p)){
    (posGroup[pl.pos] = posGroup[pl.pos] || new Set()).add(pl.p);
  }
});

// pos, ktore trafia do >1 grupy -> podejrzana niespojnosc
Object.keys(posGroup).forEach(pos => {
  if(posGroup[pos].size > 1) warn("pozycja '"+pos+"' wystepuje w roznych grupach: "+[...posGroup[pos]].join(", "));
});

console.log("\n== WALIDACJA db.js ==  ("+DB.length+" zawodnikow)");
console.log("\nMapa pozycja -> grupa (obserwowana):");
Object.keys(posGroup).sort().forEach(pos => console.log("  "+pos.padEnd(3)+" -> "+[...posGroup[pos]].join(",")));

if(warns.length){ console.log("\nOSTRZEZENIA ("+warns.length+"):"); warns.forEach(w => console.log(w)); }
if(errors.length){ console.log("\nBLEDY ("+errors.length+"):"); errors.forEach(e => console.log(e)); }

console.log("\n────────────────────────────");
console.log((errors.length===0 ? "\u2713 BAZA OK" : "\u2717 SA BLEDY")+"  —  bledy: "+errors.length+", ostrzezenia: "+warns.length+"\n");
process.exit(errors.length===0 ? 0 : 1);
