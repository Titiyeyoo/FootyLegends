// Footy Legends — testy silnika typów (uruchom: node tests/engine.test.js)
// Laduje PRAWDZIWY silnik z xad.js (nie kopie) w piaskownicy node z zaslepkami przegladarki,
// i testuje przez PUBLICZNY interfejs flRadarData() (ktory wola flFanType/flFanTypePair wewnatrz).
// Zero wplywu na produkcje, zero danych gracza, zero PII — tylko logika.
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.join(__dirname, "..");

const stub = new Proxy(function(){}, { get(){return stub;}, apply(){return stub;}, construct(){return stub;}, set(){return true;} });
const S = {
  console, Math, JSON, Date, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN, isFinite, RegExp, Set, Map,
  setTimeout(){}, clearTimeout(){}, requestAnimationFrame(){}, addEventListener(){}, removeEventListener(){},
  document: stub, navigator: {}, location: {},
  localStorage: { _d:{}, getItem(k){return this._d[k]!=null?this._d[k]:null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];} }
};
S.window = S; S.self = S; vm.createContext(S);
vm.runInContext(fs.readFileSync(path.join(ROOT,"db.js"),"utf8"), S, {filename:"db.js"});
vm.runInContext(fs.readFileSync(path.join(ROOT,"xad.js"),"utf8"), S, {filename:"xad.js"});

// ── wstrzyknij profil (srednie na skład) i policz przez silnik ──
function read(games, avg, fav){
  avg = avg||{};
  const pr = {
    v:1, games,
    pickSum:{ C:(avg.history||0)*games, G:0, M:(avg.modern||0)*games, stars:(avg.stars||0)*games, deep:(avg.scout||0)*games, attack:0, defense:0 },
    conc:{ topClubXI:(avg.loyalty||0)*games },
    recent:[], favPlayers:(fav||{}), stories:{}
  };
  S.localStorage.setItem("fl_profile", JSON.stringify(pr));
  return S.flRadarData();
}

let pass=0, fail=0;
function eq(got, want, name){ if(got===want){pass++;console.log("  \u2713 "+name);} else {fail++;console.log("  \u2717 "+name+"  (dostano "+JSON.stringify(got)+", oczek. "+JSON.stringify(want)+")");} }
function ok(got, name){ if(got){pass++;console.log("  \u2713 "+name);} else {fail++;console.log("  \u2717 "+name+"  (dostano "+JSON.stringify(got)+")");} }

console.log("\n== 0. silnik zaladowany ==");
ok(typeof S.flRadarData==="function", "flRadarData wystawione");
ok(S.DB && S.DB.length===804, "DB = 804 graczy");

console.log("\n== 1. formujacy (<10 gier) ==");
{ const d=read(5,{history:9}); eq(d.pair.primary,"forming","pair.primary forming"); eq(d.pair.forming,true,"forming flag"); eq(d.type,"forming","type forming"); }

console.log("\n== 2. wywazony -> ALL-ROUNDER (balanced), bez secondary ==");
{ const d=read(30,{history:7.7,modern:3.3,stars:0.8,scout:4.2,loyalty:2.7});
  eq(d.pair.primary,"balanced","primary balanced"); eq(d.pair.secondary,null,"brak secondary");
  eq(d.pair.allRounder,true,"allRounder true"); eq(d.type,"balanced","type balanced"); }

console.log("\n== 3. modern-heavy -> NEW SCHOOL (modern) ==");
{ const d=read(30,{history:3,modern:8,stars:1,scout:3,loyalty:2});
  eq(d.pair.primary,"modern","primary modern"); eq(d.pair.allRounder,false,"nie all-rounder"); eq(d.type,"modern","type modern"); }

console.log("\n== 4. throwback + loyalist -> primary history, secondary loyalty ==");
{ const d=read(30,{history:10,modern:2,stars:1,scout:3,loyalty:4});
  eq(d.pair.primary,"history","primary history"); eq(d.pair.secondary,"loyalty","secondary loyalty (>0.8)"); }

console.log("\n== 5. star-hunter -> primary stars ==");
{ const d=read(30,{history:6,modern:3,stars:4,scout:3,loyalty:2}); eq(d.pair.primary,"stars","primary stars"); }

console.log("\n== 6. jedno zrodlo prawdy: allRounder == (primary===balanced) ==");
{ const a=read(30,{history:10,modern:2,stars:1,scout:3,loyalty:2}); const b=read(30,{history:7.7,modern:3.3,stars:0.8,scout:4.2,loyalty:2.7});
  eq(a.pair.allRounder,(a.pair.primary==="balanced"),"wyrazny: spojne"); eq(b.pair.allRounder,(b.pair.primary==="balanced"),"balanced: spojne");
  ok(a.pair.primaryScore>0,"primaryScore>0 dla wyraznego typu"); }

console.log("\n== 7. LEGENDS X/804 (kolekcja z favPlayers) ==");
{ const d=read(30,{modern:5},{a:1,b:2,c:1,d:1,e:3}); eq(d.usedPlayers,5,"usedPlayers = liczba unikalnych"); eq(d.dbTotal,804,"dbTotal z DB.length"); }

console.log("\n────────────────────────────");
console.log((fail===0?"\u2713 WSZYSTKO OK":"\u2717 SA BLEDY")+"  —  pass: "+pass+", fail: "+fail+"\n");
process.exit(fail===0?0:1);
