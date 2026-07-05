// Footy Legends — testy rozpoznawania odpowiedzi Quick Quiz (uruchom: node tests/match.test.js)
// Laduje PRAWDZIWE funkcje (norm/tryMatch/findAlmost/lev) z core.js w piaskowce node.
// NIE kopia — testuje kod produkcyjny, wiec nie moze sie rozjechac. Zero PII, zero produkcji.
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.join(__dirname, "..");

const stub = new Proxy(function(){}, { get(){return stub;}, apply(){return stub;}, construct(){return stub;}, set(){return true;} });
const S = {
  console, Math, JSON, Date, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN, isFinite, RegExp, Set, Map,
  setTimeout(){}, clearTimeout(){}, addEventListener(){}, removeEventListener(){},
  document: stub, navigator: {}, location: {}, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }
};
S.window = S; S.self = S; vm.createContext(S);
vm.runInContext(fs.readFileSync(path.join(ROOT,"core.js"),"utf8"), S, {filename:"core.js"});

// pula testowa (tryMatch czyta z G.pool)
S.G = { pool: [
  {n:"Bobby Charlton", a:["bobby charlton","bobby"]},
  {n:"Jack Charlton",  a:["jack charlton","jack"]},
  {n:"Frank Lampard",  a:["lampard","frank lampard","lamps"]},
  {n:"Steven Gerrard", a:["gerrard","steven gerrard","stevie g"]},
  {n:"Gary Neville",   a:["gary neville"]},
  {n:"Phil Neville",   a:["phil neville"]},
  {n:"Marc Guehi",     a:["guehi","marc guehi"]}
]};
const { norm, tryMatch, findAlmost, lev } = S;

let pass=0, fail=0;
function eq(got,want,name){ if(got===want){pass++;console.log("  \u2713 "+name);} else {fail++;console.log("  \u2717 "+name+"  (dostano "+JSON.stringify(got)+", oczek. "+JSON.stringify(want)+")");} }
function ok(got,name){ if(got){pass++;console.log("  \u2713 "+name);} else {fail++;console.log("  \u2717 "+name+"  (dostano "+JSON.stringify(got)+")");} }
function nul(got,name){ if(got===null){pass++;console.log("  \u2713 "+name);} else {fail++;console.log("  \u2717 "+name+"  (dostano "+JSON.stringify(got)+")");} }
const M = (s,f)=>tryMatch(s, f||new Set());

console.log("\n== norm() — normalizacja ==");
eq(norm("LAMPARD"),"lampard","lowercase");
eq(norm("Gu\u00e9hi"),"guehi","zdejmuje akcenty");
eq(norm("O'Brien"),"obrien","usuwa interpunkcje");
eq(norm("  Frank  Lampard!  "),"frank lampard","trim + zwija spacje");
eq(norm(""),"","pusty");

console.log("\n== tryMatch() — podstawy ==");
{ const r=M("Frank Lampard"); ok(r&&r.ok,"pelne imie"); eq(r&&r.player.n,"Frank Lampard","-> Lampard"); }
{ const r=M("lamps"); ok(r&&r.ok&&r.player.n==="Frank Lampard","ksywka (lamps)"); }
ok(M("LAMPARD")&&M("LAMPARD").ok,"wielkie litery");
nul(M("Cristiano Ronaldo"),"nieznany -> null");
nul(M("a"),"za krotkie -> null");
nul(M("Frank Lampard", new Set(["Frank Lampard"])),"juz znaleziony -> null");

console.log("\n== tryMatch() — nazwiska niejednoznaczne ==");
{ const r=M("Charlton"); ok(r&&r.ambiguous,"Charlton -> ambiguous (Bobby+Jack)"); }
{ const r=M("Charlton", new Set(["Bobby Charlton"])); ok(r&&r.ok&&r.player.n==="Jack Charlton","po znalezieniu Bobby'ego -> Jack"); }

console.log("\n== tryMatch() — REALNE cechy produkcji ==");
{ const r=M("Neville Gary"); ok(r&&r.ok&&r.player.n==="Gary Neville","odwrocona kolejnosc 2 slow"); }
{ const r=M("Guehi"); ok(r&&r.ok&&r.player.n==="Marc Guehi","akcent: Guehi -> Marc Guehi"); }

console.log("\n== findAlmost() / lev() — literowki ==");
ok(findAlmost("lampaard", new Set()),"literowka (1 znak) -> prawie");
ok(!findAlmost("xyzqwert", new Set()),"kompletnie inne -> nie");
ok(!findAlmost("la", new Set()),"za krotkie -> nie");
eq(lev("kitten","sitting"),3,"lev(kitten,sitting)=3");

console.log("\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
console.log((fail===0?"\u2713 WSZYSTKO OK":"\u2717 SA BLEDY")+"  \u2014  pass: "+pass+", fail: "+fail+"\n");
process.exit(fail===0?0:1);
