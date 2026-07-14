/* ════════════════════════════════════════════════════════════════════
   CLASSIC XI — freeform "build your dream England XI" builder
   Type a name → 3+ letters → up to 5 DB matches (filtered by slot position),
   narrows live as you type. No pool, no narrative, no score. Reuses window.DB.
   Self-contained — does not touch XI After Dark.
   ════════════════════════════════════════════════════════════════════ */
(function(){
  const CL_FORMATIONS = {
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
  };

  const GRP = {GK:"grp-gk",DF:"grp-df",MF:"grp-mf",FW:"grp-fw"};
  const ERA_DOT = {C:"era-c", G:"era-g", M:"era-m"};
  const clEsc = s => String(s==null?"":s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  // koszulka Anglii — identyczna jak w After Dark (krzyż św. Jerzego)
  const ENGLAND_SHIRT_SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M 5 6 L 8 4 L 9 5 L 12 6 L 15 5 L 16 4 L 19 6 L 20 9 L 17 10 L 17 19 L 7 19 L 7 10 L 4 9 Z" fill="#fff" stroke="#000" stroke-width="0.8"/><rect x="13" y="6" width="2" height="13" fill="#c8102e"/><rect x="11" y="10" width="6" height="2" fill="#c8102e"/></svg>';
  let CL = { formation:"4-4-2", slots:[], target:null, sugg:[] };

  const $ = id => document.getElementById(id);
  const clLast = n => { const s=(n||"").trim().split(/\s+/); return s[s.length-1]; };
  const clClub = p => (p.c && p.c[0] ? p.c[0] : "").toUpperCase();

  function clBuildSlots(){
    CL.slots = CL_FORMATIONS[CL.formation].map(s => ({p:s.p,pos:s.pos,x:s.x,y:s.y,player:null}));
  }
  function pickedNames(){ return new Set(CL.slots.filter(s=>s.player).map(s=>s.player.n)); }

  // migracja: dawniej w fl_classic_name siedzialo IMIE (doklejalismy "'S ENGLAND XI").
  // Teraz to nazwa druzyny — stare imie zamieniamy raz na pelny tytul, zeby nic nie zniknelo.
  try{
    if(!localStorage.getItem("fl_name_migrated")){
      var _old=(localStorage.getItem("fl_classic_name")||"").trim();
      if(_old) localStorage.setItem("fl_classic_name", _old.toUpperCase()+"'S ENGLAND XI");
      localStorage.setItem("fl_name_migrated","1");
    }
  }catch(e){}

  window.openClassic = function(){
    try{ clCleanExit(); }catch(e){}
    CL.formation="4-4-2";   // czysty start: formacja TEZ wraca do domyslnej (nie tylko sklad)
    clBuildSlots();   // czysty start za każdym razem (pusty skład)
    CL.target=null; CL.sugg=[];
    // filtry TEZ wracaja do zera — inaczej "MODERN" zostawal zaznaczony po powrocie z menu
    CL.fEra={}; CL.fPos=""; CL.fClub="";
    CL_SRC=null; CL_ORIG={}; CL_SAVED_ID=null;
    try{
      var _i=$("cl-input"); if(_i) _i.value="";
      var _c=$("cl-club");  if(_c) _c.value="";
      var _p=$("cl-pos");   if(_p) _p.value="";
    }catch(e){}
    const sc=document.getElementById("s-classic"); if(sc) sc.classList.remove("viewing");
    if(typeof go==="function") go("s-classic");
    clRender();
  };

  function clChangeFormation(f){
    if(!CL_FORMATIONS[f]) return;
    // zachowaj wybranych po grupie pozycji (nadmiar przepada, jeśli mniej slotów)
    const carry={GK:[],DF:[],MF:[],FW:[]};
    CL.slots.forEach(s=>{ if(s.player) carry[s.p].push(s.player); });
    CL.formation=f; clBuildSlots(); CL.target=null; CL.sugg=[];
    CL.slots.forEach(s=>{ if(carry[s.p] && carry[s.p].length) s.player=carry[s.p].shift(); });
    clRender();
  }
  window.clChangeFormation = clChangeFormation;

  function clRender(){
    // formation bar
    if($("cl-formbar")) $("cl-formbar").innerHTML = Object.keys(CL_FORMATIONS).map(f =>
      '<button class="cl-form'+(f===CL.formation?' on':'')+'" onclick="clChangeFormation(\''+f+'\')">'+f+'</button>').join('');
    // count
    const filled = CL.slots.filter(s=>s.player).length;
    if($("cl-count")){
      var _t = "YOUR XI · "+filled+"/11";
      // Po starcie z kolekcji: powiedz wprost, ze gracz dostal szkielet.
      if(CL_SRC && CL_SRC.k!=="surprise" && CL_SRC.n && filled===CL_SRC.n){
        _t = CL_SRC.name+" · "+CL_SRC.n+" players loaded";
      } else if(CL_SRC && CL_SRC.k!=="surprise" && CL_SRC.n){
        _t = CL_SRC.name+" · "+filled+"/11";
      }
      $("cl-count").textContent = _t;
    }
    // pitch — reuse After Dark pitch (.xad-pitch + .pdot/.pcircle/.pname)
    if($("cl-pitch")){
      let html='<div class="xad-penalty"></div><div class="xad-sixyard"></div>';
      CL.slots.forEach((s,i)=>{
        const sel=(CL.target===i);
        const cls="pdot "+GRP[s.p]+(s.player?" filled":" empty")+(sel&&!s.player?" filtering":"");
        const style="left:"+(s.x*100)+"%;top:"+(s.y*100)+"%";
        const eradot = s.player ? '<span class="eradot '+(ERA_DOT[s.player.e]||'')+'"></span>' : '';
        html+='<div class="'+cls+'" style="'+style+'" onclick="clTap('+i+')">'+
              '<div class="pcircle">'+s.pos+eradot+'</div>'+
              (s.player?'<div class="pname">'+clEsc(clLast(s.player.n))+'</div>':'')+
              '</div>';
      });
      $("cl-pitch").innerHTML=html;
    }
    // search panel + done
    renderSearch();
    if($("cl-done")) $("cl-done").style.display = (filled===11) ? "block" : "none";
    const sc=document.getElementById("s-classic");
    if(sc) sc.classList.toggle("searching", CL.target!=null);
  }

  window.clTap = function(i){
    CL.target = (CL.target===i)?null:i; clRender();
  };
  window.clCancelPick = function(){ CL.target=null; clRender(); };
  window.clClear = function(){ if(CL.target==null) return; CL.slots[CL.target].player=null; CL.sugg=[]; clRender(); };

  function renderSearch(){
    const panel=$("cl-search");
    if(!panel) return;
    panel.style.display="block";
    const lbl=$("cl-search-label");
    if(lbl){
      if(CL.target==null){
        lbl.innerHTML='<span class="cl-lbl cl-lbl-idle">PLAYER POOL <span class="cl-lbl-dim">· tap a spot on the pitch</span></span>';
      } else {
        const slot=CL.slots[CL.target];
        // REMOVE w naglowku panelu (nie fixed na srodku ekranu)
        lbl.innerHTML='<span class="cl-lbl">ADDING <b>'+slot.pos+'</b></span>'+
          (slot.player ? '<button class="cl-act cl-act-rm" onclick="clClear()">REMOVE</button>' : '');
      }
    }
    clRenderList();
  }
  window.clCloseSearch = function(){ CL.target=null; CL.sugg=[]; clRender(); };

  CL.fEra = CL.fEra || {};
  window.clToggleEra = function(e, el){ CL.fEra[e]=!CL.fEra[e]; if(el) el.classList.toggle("on"); clRenderList(); };
  window.clSetPos = function(v){ CL.fPos=v||""; clRenderList(); };
  window.clSetClub = function(v){ CL.fClub=(v||"").trim().toLowerCase(); clRenderList(); };
  window.clSearch = function(){ clRenderList(); };

  /* ── TOP PICKS: kozacy na pozycje (weryfikowani wobec db.js) ──
     Grupy scalone: RW+RM = RIGHT, LW+LM = LEFT, CM+DM+AM = MID.
     Kolejnosc = kolejnosc wyswietlania; pierwsza 10 miesza ery (C/G/M). */
  var CL_TOPGRP = {GK:"GK",CB:"CB",LB:"LB",RB:"RB",CM:"MID",DM:"MID",AM:"MID",LW:"LEFT",LM:"LEFT",RW:"RIGHT",RM:"RIGHT",ST:"ST"};
  var CL_TOP = {
    GK:["Gordon Banks","Peter Shilton","David Seaman","Jordan Pickford","Ray Clemence","Joe Hart","Nick Pope","Peter Bonetti","Aaron Ramsdale","David James"],
    CB:["Bobby Moore","Tony Adams","Rio Ferdinand","John Stones","John Terry","Billy Wright","Harry Maguire","Sol Campbell","Terry Butcher","Marc Guehi","Des Walker","Gary Cahill"],
    LB:["Ashley Cole","Stuart Pearce","Luke Shaw","Kenny Sansom","Ray Wilson","Ben Chilwell","Graeme Le Saux","Danny Rose","Wayne Bridge"],
    RB:["Gary Neville","Kyle Walker","Trent Alexander-Arnold","George Cohen","Kieran Trippier","Lee Dixon","Reece James","Danny Mills","Gary Stevens"],
    MID:["Bobby Charlton","Steven Gerrard","Stanley Matthews","Paul Gascoigne","Jude Bellingham","Frank Lampard","Declan Rice","Bryan Robson","Phil Foden","Paul Scholes","Glenn Hoddle","Duncan Edwards","Cole Palmer","Alan Ball","Matthew Le Tissier","Kobbie Mainoo","Nobby Stiles","Paul Ince","Peter Beardsley","Michael Carrick","Jack Grealish","Ray Wilkins"],
    LEFT:["John Barnes","Chris Waddle","Raheem Sterling","Steve McManaman","Anthony Gordon","Peter Barnes","Jadon Sancho","Ashley Young","Harvey Barnes","Adam Lallana"],
    RIGHT:["David Beckham","Bukayo Saka","Steve Coppell","Aaron Lennon","Shaun Wright-Phillips","Theo Walcott","Trevor Steven","Noni Madueke","Darren Anderton","Jarrod Bowen","James Milner","Andros Townsend"],
    ST:["Alan Shearer","Gary Lineker","Harry Kane","Wayne Rooney","Jimmy Greaves","Jamie Vardy","Geoff Hurst","Michael Owen","Tom Finney","Marcus Rashford","Kevin Keegan","Nat Lofthouse","Teddy Sheringham","Ollie Watkins","Ian Wright","Robbie Fowler"]
  };
  var CL_TOPRANK = null;
  // grupa z dropdowna POS (GK/DF/MF/FW) -> ktore listy TOP PICKS scalic
  var CL_POSGRP = {GK:["GK"], DF:["CB","LB","RB"], MF:["MID","LEFT","RIGHT"], FW:["ST"]};
  function clTopRank(pos){
    if(!CL_TOPRANK){
      CL_TOPRANK = {};
      for(var g in CL_TOP){
        CL_TOPRANK[g] = {};
        for(var i=0;i<CL_TOP[g].length;i++) CL_TOPRANK[g][CL_TOP[g][i]] = i;
      }
    }
    return CL_TOPRANK[CL_TOPGRP[pos]] || {};
  }
  // gdy user filtruje po POS, TOP PICKS maja isc za FILTREM (a nie za slotem)
  function clTopRankFor(fPos){
    var groups = CL_POSGRP[fPos]; if(!groups) return null;
    var r = {}, i = 0;
    groups.forEach(function(g){
      (CL_TOP[g]||[]).forEach(function(n){ if(r[n]==null) r[n] = i++; });
    });
    return r;
  }

  /* ══ NEW XI — Empty / Surprise Me / Collections ══════════════════
     Kolekcje odblokowuja sie przez odkrycie narracji w After Dark.
     Kolekcja wypelnia czym moze — reszta slotow zostaje PUSTA (gracz dokancza). */
  var CL_SRC = null;   // {k, name} — z czego wystartowano; null = empty
  var CL_ORIG = {};    // nazwiska z oryginalnej narracji (do przyszlych podswietlen)

  function clDiscovered(){
    try{ return new Set(JSON.parse(localStorage.getItem("fl_xad_stories")||"[]")); }catch(e){ return new Set(); }
  }
  // Surprise: tiery z kolejnosci TOP PICKS. A=0-3 (70%), B=4-7 (25%), C=8+ (5%).
  function clTierPick(pos, used){
    var grp = CL_TOP[CL_TOPGRP[pos]] || [];
    var byName = {}; (window.DB||[]).forEach(function(p){ byName[p.n]=p; });
    var A=[],B=[],C=[];
    grp.forEach(function(n,i){
      var p=byName[n]; if(!p || used.has(n)) return;
      if(i<4) A.push(p); else if(i<8) B.push(p); else C.push(p);
    });
    var r=Math.random(), pool;
    if(r<0.70 && A.length) pool=A;
    else if(r<0.95 && B.length) pool=B;
    else pool = C.length?C:(B.length?B:A);
    if(!pool || !pool.length) pool = A.concat(B,C);
    if(!pool.length){
      // awaryjnie: ktokolwiek z bazy na te pozycje
      var any=(window.DB||[]).filter(function(p){ return p.pos===pos && !used.has(p.n); });
      if(!any.length) return null;
      return any[Math.floor(Math.random()*any.length)];
    }
    return pool[Math.floor(Math.random()*pool.length)];
  }
  // retro modal zamiast natywnego confirm() — natywny nie pasuje do stylu gry
  function clConfirm(title, msg, onOk){
    const ov=document.createElement('div'); ov.className='cl-modal-ov';
    ov.innerHTML='<div class="cl-modal">'
      +'<div class="cl-modal-t">'+title+'</div>'
      +'<div class="cl-modal-hint" style="margin:0 0 18px">'+msg+'</div>'
      +'<div class="cl-modal-btns"><button class="btn cl-modal-cancel">CANCEL</button><button class="btn cl-modal-ok">START</button></div>'
      +'</div>';
    document.body.appendChild(ov);
    function close(){ try{ document.body.removeChild(ov); }catch(e){} }
    ov.querySelector('.cl-modal-cancel').onclick=close;
    ov.querySelector('.cl-modal-ok').onclick=function(){ close(); onOk(); };
    ov.onclick=function(e){ if(e.target===ov) close(); };
  }
  window.clNewXI = function(kind, key){
    var cur = CL.slots.filter(function(s){return s.player;}).length;
    if(cur > 0){
      clConfirm("START A NEW XI?", "Current XI will be discarded.", function(){ clDoNewXI(kind,key); });
      return;
    }
    clDoNewXI(kind,key);
  };
  function clDoNewXI(kind, key){
    clBuildSlots();
    CL.target=null; CL.sugg=[]; CL_SRC=null; CL_ORIG={}; CL_SAVED_ID=null;
    if(kind==="surprise"){
      var used=new Set();
      CL.slots.forEach(function(s){
        var p=clTierPick(s.pos, used);
        if(p){ s.player=p; used.add(p.n); }
      });
      CL_SRC={k:"surprise", name:"SURPRISE XI", n:CL.slots.filter(function(s){return s.player;}).length};
    } else if(kind==="collection" && key){
      var N=(window.FL_NARRATIVES||{})[key];
      var info=(window.FL_STORY_INFO||{})[key];
      if(N && N.players){
        var byName={}; (window.DB||[]).forEach(function(p){ byName[p.n]=p; });
        var pool=N.players.map(function(n){ return byName[n]; }).filter(Boolean);
        var used2=new Set(), loaded=0;
        // najpierw dokladne dopasowanie pozycji, potem grupa (RW~RM itd.)
        CL.slots.forEach(function(s){
          if(s.player) return;
          var hit=pool.filter(function(p){ return !used2.has(p.n) && p.pos===s.pos; })[0];
          if(hit){ s.player=hit; used2.add(hit.n); CL_ORIG[hit.n]=1; loaded++; }
        });
        CL.slots.forEach(function(s){
          if(s.player) return;
          var g=CL_TOPGRP[s.pos];
          var hit=pool.filter(function(p){ return !used2.has(p.n) && CL_TOPGRP[p.pos]===g; })[0];
          if(hit){ s.player=hit; used2.add(hit.n); CL_ORIG[hit.n]=1; loaded++; }
        });
        CL_SRC={k:key, name:(info&&info.n)||key.toUpperCase(), n:loaded};
      }
    }
    clCloseNew();
    clRender();
  }
  window.clOpenNew = function(){
    var box=$("cl-new-menu"); if(!box) return;
    var bd=$("cl-new-bd"); if(bd) bd.style.display="block";
    var disc=clDiscovered();
    var all=(window.FL_XAD_STORIES||[]).filter(function(s){
      var N=(window.FL_NARRATIVES||{})[s.k];
      return N && N.players && N.players.length;   // tylko te z lista graczy
    });
    var unlocked=all.filter(function(s){ return disc.has(s.k); });
    var locked=all.filter(function(s){ return !disc.has(s.k); });
    var h='<div class="cl-new-h">START WITH</div>'+
      '<button class="cl-new-i" onclick="clNewXI(\'empty\')">○ EMPTY XI</button>'+
      '<button class="cl-new-i" onclick="clNewXI(\'surprise\')">🎲 SURPRISE ME</button>';
    var sv=clLoadSaved();
    if(sv.length){
      h+='<div class="cl-new-h">YOUR SAVED XI</div>';
      sv.slice(0,CL_SAVE_MAX).forEach(function(x){
        var n=(x.players||[]).filter(Boolean).length;
        h+='<button class="cl-new-i cl-new-s" onclick="clOpenSaved(\''+x.id+'\')">💾 '+clEsc(clTitleOf(x.name))+' <span class="cl-new-dim">'+x.formation+'</span></button>';
      });
      h+='<button class="cl-new-i cl-new-mng" onclick="clManageSaved()">⚙ MANAGE SAVED</button>';
    }
    if(unlocked.length){
      h+='<div class="cl-new-h">COLLECTIONS</div>';
      unlocked.forEach(function(s){
        h+='<button class="cl-new-i cl-new-u" onclick="clNewXI(\'collection\',\''+s.k+'\')">⭐ '+s.n+'</button>';
      });
    }
    if(locked.length){
      h+='<div class="cl-new-h cl-new-h2">LOCKED · discover in XI AFTER DARK</div>';
      locked.forEach(function(s){
        h+='<div class="cl-new-i cl-new-l">🔒 '+s.n+'</div>';
      });
    }
    box.innerHTML=h;
    box.style.display="block";
  };
  window.clCloseNew = function(){
    var b=$("cl-new-menu"); if(b) b.style.display="none";
    var bd=$("cl-new-bd"); if(bd) bd.style.display="none";
  };

  /* ══ SAVED XI — magazyn, nie kolekcja. Szkoda stracic sklad, nic wiecej. ══
     Format przenosny (same nazwiska) — odporny na zmiany w db.js i gotowy,
     gdyby kiedys doszedl serwer. Limit 10; przy 11. gracz sam decyduje kogo usunac. */
  var CL_SAVE_MAX = 10;
  // tytul skladu = to samo, co widac na ekranie finalnym ("TOKA'S ENGLAND XI" / "MY ENGLAND XI")
  function clTitleOf(nm){ nm=(nm||"").trim(); return nm ? nm.toUpperCase() : "MY ENGLAND XI"; }
  function clLoadSaved(){
    try{ var a=JSON.parse(localStorage.getItem("fl_saved_xi")||"[]"); return Array.isArray(a)?a:[]; }catch(e){ return []; }
  }
  function clStoreSaved(list){
    try{ localStorage.setItem("fl_saved_xi", JSON.stringify(list)); return true; }catch(e){ return false; }
  }
  // wczytanie: nieznanych graczy POMIJAMY (slot zostaje pusty) — zero wysypki po audycie bazy
  window.clOpenSaved = function(id){
    var list=clLoadSaved(), item=null;
    for(var i=0;i<list.length;i++){ if(list[i].id===id){ item=list[i]; break; } }
    if(!item) return;
    var go2=function(){
      if(CL_FORMATIONS[item.formation]) CL.formation=item.formation;
      clBuildSlots();
      CL.target=null; CL.sugg=[]; CL_SRC=null; CL_ORIG={};
      var byName={}; (window.DB||[]).forEach(function(p){ byName[p.n]=p; });
      (item.players||[]).forEach(function(n,idx){
        if(!n || !CL.slots[idx]) return;
        var p=byName[n]; if(p) CL.slots[idx].player=p;   // brak w bazie -> slot pusty
      });
      try{ localStorage.setItem("fl_classic_name", (item.name||"")); }catch(e){}
      CL_SAVED_ID = item.id;
      clCloseNew();
      clRender(); clRenderTitle();
    };
    var cur=CL.slots.filter(function(s){return s.player;}).length;
    if(cur>0) clConfirm("OPEN SAVED XI?", "Current XI will be discarded.", go2);
    else go2();
  };
  var CL_SAVED_ID = null;   // id otwartego zapisu (do nadpisania)

  window.clSaveXI = function(){
    var list=clLoadSaved();
    var players=CL.slots.map(function(s){ return s.player?s.player.n:null; });
    var name=""; try{ name=(localStorage.getItem("fl_classic_name")||"").trim(); }catch(e){}
    var doSave=function(id){
      var rec={ id:id||("xi_"+Date.now()), name:name, formation:CL.formation,
                players:players, src:(CL_SRC&&CL_SRC.k!=="surprise")?CL_SRC.k:null, ts:Date.now() };
      var idx=-1;
      for(var i=0;i<list.length;i++){ if(list[i].id===rec.id){ idx=i; break; } }
      if(idx>=0) list[idx]=rec; else list.unshift(rec);
      if(clStoreSaved(list)){ CL_SAVED_ID=rec.id; clToast("✓ XI SAVED", "find it in NEW XI → YOUR SAVED XI"); }
    };
    // otwarty zapis -> pytamy: nadpisac czy nowy
    if(CL_SAVED_ID){
      var known=list.some(function(x){ return x.id===CL_SAVED_ID; });
      if(known){
        clChoice("SAVE XI", "Update the one you opened, or keep both?",
          "UPDATE", function(){ doSave(CL_SAVED_ID); },
          "SAVE AS NEW", function(){ clSaveNew(list, doSave); });
        return;
      }
    }
    clSaveNew(list, doSave);
  };
  function clSaveNew(list, doSave){
    if(list.length >= CL_SAVE_MAX){
      clManageSaved(true);   // pelno — gracz sam wybiera kogo usunac
      return;
    }
    doSave(null);
  }
  window.clDeleteSaved = function(id){
    var list=clLoadSaved().filter(function(x){ return x.id!==id; });
    clStoreSaved(list);
    if(CL_SAVED_ID===id) CL_SAVED_ID=null;
    clManageSaved(false, true);
  };
  // lista zapisow: otworz / usun. full=true -> komunikat, ze trzeba zwolnic miejsce
  window.clManageSaved = function(full, keepOpen){
    var old=document.querySelector(".cl-saved-ov"); if(old){ try{ document.body.removeChild(old); }catch(e){} }
    var list=clLoadSaved();
    if(!list.length && keepOpen) return;
    var ov=document.createElement('div'); ov.className='cl-modal-ov cl-saved-ov';
    var rows = list.length ? list.map(function(x){
      var d=new Date(x.ts||Date.now());
      var dd=("0"+d.getDate()).slice(-2), mm=("0"+(d.getMonth()+1)).slice(-2);
      return '<div class="cl-sv-row">'+
        '<button class="cl-sv-open" onclick="clOpenSaved(\''+x.id+'\')">'+
          '<span class="cl-sv-n">'+clEsc(clTitleOf(x.name))+'</span>'+
          '<span class="cl-sv-m">'+x.formation+' · '+dd+'/'+mm+'/'+d.getFullYear()+'</span>'+
        '</button>'+
        '<button class="cl-sv-del" onclick="clDeleteSaved(\''+x.id+'\')">REMOVE</button>'+
      '</div>';
    }).join('') : '<div class="cl-modal-hint" style="padding:14px 0">no saved XI yet</div>';
    ov.innerHTML='<div class="cl-modal cl-saved">'
      +'<div class="cl-modal-t">SAVED XI</div>'
      +(full?'<div class="cl-modal-hint" style="margin:0 0 12px;color:#ff8b8b">'+CL_SAVE_MAX+' saved — remove one to make room.</div>':'')
      +'<div class="cl-sv-list">'+rows+'</div>'
      +'<div class="cl-modal-btns" style="margin-top:14px"><button class="btn cl-modal-cancel">CLOSE</button></div>'
      +'</div>';
    document.body.appendChild(ov);
    function close(){ try{ document.body.removeChild(ov); }catch(e){} }
    ov.querySelector('.cl-modal-cancel').onclick=close;
    ov.onclick=function(e){ if(e.target===ov) close(); };
  };
  // modal z dwoma akcjami
  function clChoice(title,msg,aTxt,aFn,bTxt,bFn){
    var ov=document.createElement('div'); ov.className='cl-modal-ov';
    ov.innerHTML='<div class="cl-modal"><div class="cl-modal-t">'+title+'</div>'
      +'<div class="cl-modal-hint" style="margin:0 0 18px">'+msg+'</div>'
      +'<div class="cl-modal-btns"><button class="btn cl-modal-cancel">'+aTxt+'</button><button class="btn cl-modal-ok">'+bTxt+'</button></div></div>';
    document.body.appendChild(ov);
    function close(){ try{ document.body.removeChild(ov); }catch(e){} }
    ov.querySelector('.cl-modal-cancel').onclick=function(){ close(); aFn(); };
    ov.querySelector('.cl-modal-ok').onclick=function(){ close(); bFn(); };
    ov.onclick=function(e){ if(e.target===ov) close(); };
  }
  function clToast(txt, sub){
    var t=document.createElement('div'); t.className='cl-toast';
    t.innerHTML='<div class="cl-toast-t">'+txt+'</div>'+(sub?'<div class="cl-toast-s">'+sub+'</div>':'');
    document.body.appendChild(t);
    setTimeout(function(){ try{ document.body.removeChild(t); }catch(e){} }, 2600);
  }

  function clRenderList(){
    const box=$("cl-sugg"); if(!box) return;
    const q=(($("cl-input")||{}).value||"").trim().toLowerCase();
    const eras=Object.keys(CL.fEra).filter(function(k){return CL.fEra[k];});
    const picked=pickedNames();
    let res=(window.DB||[]).filter(function(p){
      if(picked.has(p.n)) return false;
      // szukanie po NAZWISKU lub KLUBIE — jedno pole zamiast dwoch
      if(q){
        var hitName = p.n.toLowerCase().indexOf(q)>=0;
        var hitClub = (p.c||[]).some(function(c){ return c.toLowerCase().indexOf(q)>=0; });
        if(!hitName && !hitClub) return false;
      }
      if(CL.fPos && p.p!==CL.fPos) return false;
      if(CL.fClub && !(p.c||[]).some(function(c){return c.indexOf(CL.fClub)>=0;})) return false;
      if(eras.length && eras.indexOf(p.e)<0) return false;
      return true;
    });
    const sur=function(n){ const t=n.toLowerCase().split(/\s+/); return t[t.length-1]; };
    const rank=function(n){ n=n.toLowerCase(); return q?(n.indexOf(q)===0?0:(sur(n).indexOf(q)===0?1:2)):0; };
    // TOP PICKS: bez wpisanego zapytania kozacy ida na gore.
    // Jesli user ustawil filtr POS — TOP PICKS ida za FILTREM (a nie za slotem).
    var slotPos = (CL.target!=null && CL.slots[CL.target]) ? CL.slots[CL.target].pos : null;
    var topR = null;
    if(!q){
      if(CL.fPos) topR = clTopRankFor(CL.fPos);
      else if(slotPos) topR = clTopRank(slotPos);
    }
    var topOf = function(n){ return (topR && topR[n]!=null) ? topR[n] : 999; };
    res.sort(function(a,b){
      if(topR){
        var ta=topOf(a.n), tb=topOf(b.n);
        if(ta!==tb) return ta-tb;
      }
      return (rank(a.n)-rank(b.n)) || a.n.localeCompare(b.n);
    });
    const total=res.length;
    CL.sugg = res.slice(0,120);
    if(!CL.sugg.length){ box.innerHTML='<div class="cl-empty">no match</div>'; return; }
    var nTop = 0;
    if(topR){ for(var t=0;t<CL.sugg.length;t++){ if(topOf(CL.sugg[t].n)!==999) nTop++; else break; } }
    var rows = CL.sugg.map(function(p,idx){
      var head = "";
      if(topR && idx===0 && nTop)      head = '<div class="cl-sec-h">★ TOP PICKS</div>';
      if(topR && nTop && idx===nTop)   head = '<div class="cl-sec-h cl-sec-h2">ALL PLAYERS</div>';
      return head +
        '<div class="cl-sg'+(topR&&idx<nTop?' cl-sg-top':'')+'" onclick="clPickIdx('+idx+')">'+
        '<span class="cl-sg-era" style="background:'+(ERA_HEX[p.e]||"#888")+'"></span>'+
        '<span class="cl-sg-n">'+p.n+'</span>'+
        '<span class="cl-sg-c">'+clClub(p)+'</span>'+
        '<span class="cl-sg-p">'+(p.pos||p.p)+'</span>'+
        '</div>';
    }).join('');
    if(total>120) rows += '<div class="cl-more">+ '+(total-120)+' more — refine with search or filters</div>';
    box.innerHTML = rows;
  }

  window.clPickIdx = function(idx){
    if(CL.target==null) return;
    const p=CL.sugg[idx]; if(!p) return;
    CL.slots[CL.target].player=p; CL.target=null; CL.sugg=[];
    // wyczysc wyszukiwarke — inaczej zostaja litery + "no match" po wskoczeniu gracza
    try{
      const inp=document.getElementById("cl-input");
      if(inp) inp.value="";
      const sg=document.getElementById("cl-sugg");
      if(sg) sg.innerHTML="";
    }catch(e){}
    clRender();
  };

  // ── tytuł edytowalny ("MY ENGLAND XI" / "PAWEL'S ENGLAND XI") ──
  function clRenderTitle(){
    const el=document.getElementById("cl-view-title"); if(!el) return;
    let nm=''; try{ nm=(localStorage.getItem('fl_classic_name')||'').trim(); }catch(e){}
    // Nazwa skladu = dokladnie to, co gracz wpisal. Gra nic nie doklada.
    el.textContent = nm ? nm.toUpperCase() : "MY ENGLAND XI";
  }
  window.clEditName = function(){
    let cur=''; try{ cur=(localStorage.getItem('fl_classic_name')||''); }catch(e){}
    const ov=document.createElement('div'); ov.className='cl-modal-ov';
    ov.innerHTML='<div class="cl-modal">'
      +'<div class="cl-modal-t">NAME YOUR XI</div>'
      +'<input id="cl-modal-input" class="cl-modal-in" type="text" maxlength="14" placeholder="YOUR NAME" />'
      +'<div class="cl-modal-btns"><button class="btn cl-modal-cancel">CANCEL</button><button class="btn cl-modal-ok">OK</button></div>'
      +'<div class="cl-modal-hint">blank = MY ENGLAND XI</div>'
      +'</div>';
    document.body.appendChild(ov);
    const inp=ov.querySelector('#cl-modal-input'); inp.value=cur;
    setTimeout(function(){ try{ inp.focus(); }catch(e){} },50);
    function close(){ try{ document.body.removeChild(ov); }catch(e){} }
    function save(){ const v=inp.value.trim().slice(0,24); try{ localStorage.setItem('fl_classic_name', v); }catch(e){} close(); clRenderTitle(); }
    ov.querySelector('.cl-modal-cancel').onclick=close;
    ov.querySelector('.cl-modal-ok').onclick=save;
    inp.onkeydown=function(e){ if(e.key==='Enter') save(); };
    ov.onclick=function(e){ if(e.target===ov) close(); };
  };

  // ── KAWAŁEK 2: widok składu w koszulkach Anglii ──
  function renderShirts(){
    const el=$("cl-view-pitch"); if(!el) return;
    let html='<div class="xad-penalty"></div><div class="xad-sixyard"></div>';
    CL.slots.forEach(s=>{
      if(!s.player) return;
      html+='<div class="pdot p66 filled" style="left:'+(s.x*100)+'%;top:'+(s.y*100)+'%">'+
            '<div class="shirt66">'+ENGLAND_SHIRT_SVG+'<span class="eradot '+(ERA_DOT[s.player.e]||'')+'"></span></div>'+
            '<div class="pname">'+clEsc(clLast(s.player.n))+'</div>'+
            '</div>';
    });
    el.innerHTML=html;
  }
  window.clViewXI = function(){
    const xi = CL.slots.filter(s=>s.player).map(s=>s.player);
    if(xi.length<11) return;
    try{ clCleanExit(); }catch(e){}
    CL.target=null; CL.sugg=[];
    const sc=document.getElementById("s-classic"); if(sc) sc.classList.add("viewing");
    clRenderTitle();
    renderShirts();
    // wygenerowany podpis tej XI — ta sama detekcja co w After Dark
    const story = (typeof window.xadStoryFor==="function") ? window.xadStoryFor(xi) : null;
    clStoryKey = story ? story.key : "mixed";
    const sEl=$("cl-view-story");
    if(sEl) sEl.innerHTML = story
      ? '<div class="cl-story-name">'+story.emoji+' '+clEsc(story.name)+'</div>'
        +(story.desc?'<div class="cl-story-desc">'+clEsc(story.desc)+'</div>':'')
        +(story.rest?'<div class="cl-story-rest">'+clEsc(story.rest)+'</div>':'')
      : '';
    try{ window.scrollTo(0,0); }catch(e){}
  };
  window.clEditXI = function(){
    try{ clCleanExit(); }catch(e){}
    const sc=document.getElementById("s-classic"); if(sc) sc.classList.remove("viewing");
    clRender();
  };

  // ── CLEAN VIEW: chowa przyciski Share/Save do czystego zrzutu (gracz robi zwykly screenshot) ──
  var CL_CLEAN=false;
  window.clCleanView=function(){
    var sc=document.getElementById("s-classic"); if(!sc||CL_CLEAN) return;
    CL_CLEAN=true;
    try{ flTrack("clean_view",{mode:"classic"}); }catch(e){}
    try{ sc.querySelectorAll("[data-clean-hide]").forEach(function(e){ e.dataset.prevDisp=e.style.display||""; e.style.display="none"; }); }catch(e){}
    var wm=document.getElementById("cl-watermark"); if(wm) wm.style.display="block";
    var h=document.getElementById("cl-clean-hint"); if(h&&h.parentNode) h.remove();
    h=document.createElement("div"); h.id="cl-clean-hint";
    h.style.cssText="position:fixed;bottom:18px;left:0;right:0;text-align:center;color:#e9c46a;font-size:9px;letter-spacing:2px;z-index:99999;transition:opacity .6s;font-family:inherit;pointer-events:none";
    h.textContent="TAKE A SCREENSHOT \u00b7 TAP TO EXIT";
    document.body.appendChild(h);
    setTimeout(function(){ if(h) h.style.opacity="0"; }, 1600);
    setTimeout(function(){ if(h&&h.parentNode) h.remove(); }, 2300);
    setTimeout(function(){ document.addEventListener("click", clCleanExit, {once:true}); }, 350);
  };
  function clCleanExit(){
    var sc=document.getElementById("s-classic");
    if(sc){ try{ sc.querySelectorAll("[data-clean-hide]").forEach(function(e){ e.style.display=(e.dataset.prevDisp!==undefined?e.dataset.prevDisp:""); }); }catch(e){} }
    var wm=document.getElementById("cl-watermark"); if(wm) wm.style.display="none";
    var h=document.getElementById("cl-clean-hint"); if(h&&h.parentNode) h.remove();
    CL_CLEAN=false;
  }

  // expose state read for chunk 2 (shirts/share)
  window.clGetXI = function(){ return { formation:CL.formation, slots:CL.slots.map(s=>({pos:s.pos,p:s.p,x:s.x,y:s.y,player:s.player})) }; };

  // ── KAWAŁEK 3: Footy Legends Card (premium, canvas → PNG) ──
  const ERA_HEX={C:"#c060ff",G:"#ffb030",M:"#30c0ff"};
  /* ── Zaczepki per narracja (Classic) — tekst do POSTU przy SHARE (link osobno) ── */
  let clStoryKey = "mixed";
  const CL_HOOKS = {
    heroes66:   "Every England XI lives in 1966's shadow. Mine doesn't. Build one that beats it. \ud83d\udc47",
    italia90:   "Italia 90 still hurts. My XI is built to finally win it. Disagree? Build yours. \ud83d\udc47",
    euro96:     "One summer, almost. My England XI finishes the job. Beat it. \ud83d\udc47",
    golden:     "Beckham. Gerrard. Lampard. Overrated, or robbed? Build a better England XI. \ud83d\udc47",
    southgate:  "Finals reached, penalties survived, still no trophy. My XI ends that. Show me yours. \ud83d\udc47",
    class92:    "Class of '92 raised everyone. My XI proves it. Disagree? Build your own. \ud83d\udc47",
    forest:     "Clough did it twice. My XI honours that. Build a better one. \ud83d\udc47",
    blackburn:  "Money can't buy what Blackburn '95 had. My XI agrees. Beat it. \ud83d\udc47",
    newcastle:  "Entertain or win? Newcastle picked entertain. My XI picks both. Build a better one. \ud83d\udc47",
    foxes:      "The greatest underdog story in football. My XI carries it. Beat it. \ud83d\udc47",
    liverpool:  "Liverpool set the standard. My XI meets it. Show me better. \ud83d\udc47",
    eagles:     "Everyone sleeps on this Palace crop. My XI doesn't. Disagree? Build yours. \ud83d\udc47",
    citydynasty:"Love them or hate them, City set the bar. My XI clears it. Beat it. \ud83d\udc47",
    crazygang:  "Talent loses to nerve. My XI lives by it. Build a better one. \ud83d\udc47",
    bornleaders:"Eleven captains. No passengers. Think yours has stronger leaders? Build it. \ud83d\udc47",
    nearlymen:  "World-class, trophy-less. Talent wasn't the problem. Disagree? Build yours. \ud83d\udc47",
    mixed:      "No rules. No nostalgia. Just my England XI. Beat it. \ud83d\udc47",
    _default:   "My England XI. Think you can build a better one? \ud83d\udc47"
  };
  function clHookText(){ return CL_HOOKS[clStoryKey] || CL_HOOKS._default; }

  function clCardTitle(){ let nm=""; try{ nm=(localStorage.getItem("fl_classic_name")||"").trim(); }catch(e){} return nm ? (nm.toUpperCase()+"'S ENGLAND XI") : "MY ENGLAND XI"; }
  function clCardNo(){ let n=1; try{ n=parseInt(localStorage.getItem("fl_classic_card_no")||"1",10)||1; }catch(e){} return n; }
  function clBumpCardNo(){ try{ localStorage.setItem("fl_classic_card_no", String(clCardNo()+1)); }catch(e){} }
  function clPad3(n){ n=String(n); while(n.length<3) n="0"+n; return n; }
  function clRoundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function clWrap(ctx,text,maxW,maxLines){ const words=(text||"").split(" "); const lines=[]; let line=""; for(let i=0;i<words.length;i++){ const t=line?line+" "+words[i]:words[i]; if(ctx.measureText(t).width>maxW && line){ lines.push(line); line=words[i]; } else line=t; } if(line) lines.push(line); return lines.slice(0, maxLines||3); }

  function clBuildCard(cb){
    const xi = CL.slots.filter(s=>s.player);
    if(xi.length<11) return;
    const story = (typeof window.xadStoryFor==="function") ? window.xadStoryFor(xi.map(s=>s.player)) : null;
    const FL=window.FLCard; const P=FL.PITCH;
    const cv=FL.newCanvas(); const ctx=cv.getContext("2d");
    FL.frame(ctx,{ url:"footylegendsquiz.co.uk" });
    FL.drawHero(ctx,{ emoji:(story&&story.emoji)||"", name:(story&&story.name)||"", tagline:(story&&story.desc)||"", rest:(story&&story.rest)||"", devil:(story&&story.key==="class92") });
    FL.drawScore(ctx,{ kicker: clCardTitle(), score:null });
    FL.drawPitch(ctx);
    const sized = ENGLAND_SHIRT_SVG.replace("<svg ", '<svg width="120" height="120" ');
    const img=new Image();
    function drawPlayers(haveImg){
      const shW=117, shH=117;
      xi.forEach(function(s){
        const cx=P.x+s.x*P.w, cy=P.y+s.y*P.h;
        // #1 cień osadzenia na trawie
        ctx.save(); ctx.shadowColor="rgba(0,0,0,0.6)"; ctx.shadowBlur=15; ctx.shadowOffsetY=3;
        ctx.beginPath(); ctx.ellipse(cx, cy+52, 26, 7, 0, 0, Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fill(); ctx.restore();
        if(haveImg){ ctx.drawImage(img, cx-shW/2, cy-shH/2-4, shW, shH); }
        else { ctx.fillStyle="#fff"; FL.roundRect(ctx,cx-26,cy-30,52,56,8); ctx.fill(); ctx.fillStyle="#c8102e"; ctx.fillRect(cx-4,cy-30,8,56); ctx.fillRect(cx-26,cy-6,52,8); }
        const eh=ERA_HEX[s.player.e]; if(eh){ ctx.beginPath(); ctx.arc(cx+33,cy-43,12,0,Math.PI*2); ctx.fillStyle=eh; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.stroke(); }
        // #4 długie nazwiska: wyższy minimalny font (równy rząd), pełne nazwisko
        let nm=clLast(s.player.n); let fs=28; ctx.font="bold "+fs+"px Arial, sans-serif";
        while(ctx.measureText(nm).width>132 && fs>19){ fs--; ctx.font="bold "+fs+"px Arial, sans-serif"; }
        ctx.textAlign="center"; ctx.lineJoin="round";
        var ny = cy+shH/2+14;  // blizej wlasnej koszulki -> nie wchodzi na koszulke nizszego rzedu
        // #2 ciemny kontur pod nazwiskiem
        ctx.lineWidth=4; ctx.strokeStyle="rgba(0,0,0,0.85)"; ctx.strokeText(nm, cx, ny);
        ctx.fillStyle="#ffffff"; ctx.fillText(nm, cx, ny);
      });
      cv.toBlob(function(blob){ if(blob) cb(blob); }, "image/png");
    }
    img.onload=function(){ drawPlayers(true); };
    img.onerror=function(){ drawPlayers(false); };
    img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(sized);
  }
  window.clShareCard=function(){ try{flTrack("share",{mode:"classic"});}catch(e){}
    clBuildCard(function(blob){
      const file=new File([blob],"my-england-xi.png",{type:"image/png"});
      const data={files:[file], title:"My England XI", text:clHookText(), url:"https://footylegendsquiz.co.uk"};
      try{ if(navigator.canShare && navigator.canShare({files:[file]}) && navigator.share){ navigator.share(data).catch(function(){}); return; } }catch(e){}
      const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="my-england-xi.png"; document.body.appendChild(a); a.click(); a.remove();
    });
  };
  window.clSaveCard=function(){
    clBuildCard(function(blob){
      const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="my-england-xi.png"; document.body.appendChild(a); a.click(); a.remove();
    });
  };

})();
