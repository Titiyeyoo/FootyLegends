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
  const clEsc = s => (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;");
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

  window.openClassic = function(){
    clBuildSlots();   // czysty start za każdym razem (pusty skład)
    CL.target=null; CL.sugg=[];
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
    if($("cl-count")) $("cl-count").textContent = "YOUR XI · "+filled+"/11";
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
    CL.target = (CL.target===i)?null:i; CL.sugg=[]; clRender();
    if(CL.target!=null){ const inp=$("cl-input"); if(inp){ inp.value=""; setTimeout(()=>inp.focus(),60); } }
  };
  window.clClear = function(){ if(CL.target==null) return; CL.slots[CL.target].player=null; CL.sugg=[]; clRender(); };

  function renderSearch(){
    const panel=$("cl-search");
    if(!panel) return;
    if(CL.target==null){ panel.style.display="none"; if($("cl-sugg")) $("cl-sugg").innerHTML=""; return; }
    panel.style.display="block";
    const slot=CL.slots[CL.target];
    if($("cl-search-label")) $("cl-search-label").innerHTML =
      '<span class="cl-lbl">Add '+slot.pos+(slot.player?' <span class="cl-clear" onclick="clClear()">✕ remove '+clLast(slot.player.n)+'</span>':'')+'</span>'+
      '<span class="cl-close" onclick="clCloseSearch()">✕ CLOSE</span>';
  }
  window.clCloseSearch = function(){ CL.target=null; CL.sugg=[]; clRender(); };

  window.clSearch = function(v){
    const q=(v||"").trim().toLowerCase();
    const box=$("cl-sugg"); if(!box) return;
    if(CL.target==null){ box.innerHTML=""; return; }
    if(q.length<3){ box.innerHTML=''; CL.sugg=[]; return; }
    const slot=CL.slots[CL.target], picked=pickedNames();
    let res=(window.DB||[]).filter(p => p.p===slot.p && !picked.has(p.n) && p.n.toLowerCase().includes(q));
    const sur=n=>{ const t=n.toLowerCase().split(/\s+/); return t[t.length-1]; };
    const rank=n=>{ n=n.toLowerCase(); return n.startsWith(q)?0:(sur(n).startsWith(q)?1:2); };
    res.sort((a,b)=> (rank(a.n)-rank(b.n)) || a.n.localeCompare(b.n));
    CL.sugg = res.slice(0,5);
    if(!CL.sugg.length){ box.innerHTML='<div class="cl-hint">no match</div>'; return; }
    box.innerHTML = CL.sugg.map((p,idx)=>
      '<div class="cl-sg" onclick="clPickIdx('+idx+')"><span class="cl-sg-n">'+p.n+'</span><span class="cl-sg-c">'+clClub(p)+'</span></div>').join('');
  };

  window.clPickIdx = function(idx){
    if(CL.target==null) return;
    const p=CL.sugg[idx]; if(!p) return;
    CL.slots[CL.target].player=p; CL.target=null; CL.sugg=[];
    clRender();
  };

  // ── tytuł edytowalny ("MY ENGLAND XI" / "PAWEL'S ENGLAND XI") ──
  function clRenderTitle(){
    const el=document.getElementById("cl-view-title"); if(!el) return;
    let nm=''; try{ nm=(localStorage.getItem('fl_classic_name')||'').trim(); }catch(e){}
    el.textContent = nm ? (nm.toUpperCase()+"'S ENGLAND XI") : "MY ENGLAND XI";
  }
  window.clEditName = function(){
    let cur=''; try{ cur=(localStorage.getItem('fl_classic_name')||''); }catch(e){}
    const v = prompt("Your name (blank = MY ENGLAND XI):", cur);
    if(v===null) return;
    try{ localStorage.setItem('fl_classic_name', v.trim().slice(0,14)); }catch(e){}
    clRenderTitle();
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
    CL.target=null; CL.sugg=[];
    const sc=document.getElementById("s-classic"); if(sc) sc.classList.add("viewing");
    clRenderTitle();
    renderShirts();
    // wygenerowany podpis tej XI — ta sama detekcja co w After Dark
    const story = (typeof window.xadStoryFor==="function") ? window.xadStoryFor(xi) : null;
    const sEl=$("cl-view-story");
    if(sEl) sEl.innerHTML = story
      ? '<div class="cl-story-name">'+story.emoji+' '+clEsc(story.name)+'</div>'
        +(story.desc?'<div class="cl-story-desc">'+clEsc(story.desc)+'</div>':'')
        +(story.rest?'<div class="cl-story-rest">'+clEsc(story.rest)+'</div>':'')
      : '';
    try{ window.scrollTo(0,0); }catch(e){}
  };
  window.clEditXI = function(){
    const sc=document.getElementById("s-classic"); if(sc) sc.classList.remove("viewing");
    clRender();
  };

  // expose state read for chunk 2 (shirts/share)
  window.clGetXI = function(){ return { formation:CL.formation, slots:CL.slots.map(s=>({pos:s.pos,p:s.p,x:s.x,y:s.y,player:s.player})) }; };
})();
