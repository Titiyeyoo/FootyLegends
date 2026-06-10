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
  const clEsc = s => (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;");
  let CL = { formation:"4-4-2", slots:[], target:null, sugg:[] };

  const $ = id => document.getElementById(id);
  const clLast = n => { const s=(n||"").trim().split(/\s+/); return s[s.length-1]; };
  const clClub = p => (p.c && p.c[0] ? p.c[0] : "").toUpperCase();

  function clBuildSlots(){
    CL.slots = CL_FORMATIONS[CL.formation].map(s => ({p:s.p,pos:s.pos,x:s.x,y:s.y,player:null}));
  }
  function pickedNames(){ return new Set(CL.slots.filter(s=>s.player).map(s=>s.player.n)); }

  window.openClassic = function(){
    if(!CL.slots.length) clBuildSlots();   // zachowaj XI przy powrocie z menu
    CL.target=null; CL.sugg=[];
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
        html+='<div class="'+cls+'" style="'+style+'" onclick="clTap('+i+')">'+
              '<div class="pcircle">'+s.pos+'</div>'+
              (s.player?'<div class="pname">'+clEsc(clLast(s.player.n))+'</div>':'')+
              '</div>';
      });
      $("cl-pitch").innerHTML=html;
    }
    // search panel + done
    renderSearch();
    if($("cl-done")) $("cl-done").style.display = (filled===11) ? "block" : "none";
  }

  window.clTap = function(i){
    CL.target = (CL.target===i)?null:i; CL.sugg=[]; clRender();
    if(CL.target!=null){
      const inp=$("cl-input");
      if(inp){ inp.value=""; setTimeout(()=>{ inp.focus(); const sp=$("cl-search"); if(sp&&sp.scrollIntoView) sp.scrollIntoView({block:"start"}); },60); }
    }
  };
  window.clClear = function(){ if(CL.target==null) return; CL.slots[CL.target].player=null; CL.sugg=[]; clRender(); };

  function renderSearch(){
    const panel=$("cl-search");
    if(!panel) return;
    if(CL.target==null){ panel.style.display="none"; if($("cl-sugg")) $("cl-sugg").innerHTML=""; return; }
    panel.style.display="block";
    const slot=CL.slots[CL.target];
    if($("cl-search-label")) $("cl-search-label").innerHTML = "Add "+slot.pos+" — type a name"+(slot.player?' <span class="cl-clear" onclick="clClear()">✕ remove '+clLast(slot.player.n)+'</span>':'');
  }

  window.clSearch = function(v){
    const q=(v||"").trim().toLowerCase();
    const box=$("cl-sugg"); if(!box) return;
    if(CL.target==null){ box.innerHTML=""; return; }
    if(q.length<3){ box.innerHTML = q.length ? '<div class="cl-hint">keep typing…</div>' : ''; CL.sugg=[]; return; }
    const slot=CL.slots[CL.target], picked=pickedNames();
    let res=(window.DB||[]).filter(p => p.p===slot.p && !picked.has(p.n) && p.n.toLowerCase().includes(q));
    res.sort((a,b)=>{ const as=a.n.toLowerCase().startsWith(q)?0:1, bs=b.n.toLowerCase().startsWith(q)?0:1; return (as-bs) || a.n.localeCompare(b.n); });
    CL.sugg = res.slice(0,5);
    if(!CL.sugg.length){ box.innerHTML='<div class="cl-hint">no match — try the surname</div>'; return; }
    box.innerHTML = CL.sugg.map((p,idx)=>
      '<div class="cl-sg" onclick="clPickIdx('+idx+')"><span class="cl-sg-n">'+p.n+'</span><span class="cl-sg-c">'+clClub(p)+'</span></div>').join('');
  };

  window.clPickIdx = function(idx){
    if(CL.target==null) return;
    const p=CL.sugg[idx]; if(!p) return;
    CL.slots[CL.target].player=p; CL.target=null; CL.sugg=[];
    clRender();
  };

  // expose state read for chunk 2 (shirts/share)
  window.clGetXI = function(){ return { formation:CL.formation, slots:CL.slots.map(s=>({pos:s.pos,p:s.p,x:s.x,y:s.y,player:s.player})) }; };
})();
