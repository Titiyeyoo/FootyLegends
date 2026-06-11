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

  // ── KAWAŁEK 3: Footy Legends Card (premium, canvas → PNG) ──
  const ERA_HEX={C:"#c060ff",G:"#ffb030",M:"#30c0ff"};
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
    const title = clCardTitle();
    const W=1080,H=1350;
    const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
    const ctx=cv.getContext("2d");
    // tło: gradient zieleni + delikatna siatka + smugi światła + winieta
    let bg=ctx.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#0a1f0c"); bg.addColorStop(1,"#051206");
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="rgba(255,255,255,0.03)"; ctx.lineWidth=1;
    for(let gx=0;gx<W;gx+=54){ ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
    for(let gy=0;gy<H;gy+=54){ ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }
    let lsg=ctx.createLinearGradient(0,0,W,H*0.5); lsg.addColorStop(0,"rgba(130,210,150,0.10)"); lsg.addColorStop(0.55,"rgba(130,210,150,0)");
    ctx.fillStyle=lsg; ctx.fillRect(0,0,W,H);
    let vg=ctx.createRadialGradient(W/2,H*0.42,200,W/2,H*0.42,H*0.72); vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(0,0,0,0.55)");
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
    // panel z cieniem + złota krawędź (głębia)
    const M=34;
    ctx.save(); ctx.shadowColor="rgba(0,0,0,0.55)"; ctx.shadowBlur=40; ctx.shadowOffsetY=10;
    let pg=ctx.createLinearGradient(0,M,0,H-M); pg.addColorStop(0,"#103016"); pg.addColorStop(1,"#0a2210");
    ctx.fillStyle=pg; clRoundRect(ctx,M,M,W-2*M,H-2*M,26); ctx.fill(); ctx.restore();
    ctx.strokeStyle="#c9a73a"; ctx.lineWidth=4; clRoundRect(ctx,M,M,W-2*M,H-2*M,26); ctx.stroke();
    ctx.strokeStyle="rgba(232,200,96,0.5)"; ctx.lineWidth=1.5; clRoundRect(ctx,M+10,M+10,W-2*M-20,H-2*M-20,20); ctx.stroke();
    ctx.textAlign="center";
    // kicker (marka) + nagłówek nowoczesny
    ctx.fillStyle="#c9a73a"; ctx.font="bold 26px Arial, sans-serif"; ctx.fillText("F O O T Y   L E G E N D S   C A R D", W/2, 112);
    ctx.fillStyle="#ffffff"; let hs=66; ctx.font="900 "+hs+"px Arial, sans-serif";
    while(ctx.measureText(title).width>W-210 && hs>34){ hs--; ctx.font="900 "+hs+"px Arial, sans-serif"; }
    ctx.fillText(title, W/2, 182);
    ctx.strokeStyle="#c9a73a"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(W/2-120,208); ctx.lineTo(W/2+120,208); ctx.stroke();
    // boisko osadzone na panelu
    const pW=820, pX=(W-pW)/2, pY=248, pH=690;
    ctx.save(); ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=24; ctx.shadowOffsetY=8;
    let pgr=ctx.createRadialGradient(pX+pW/2,pY+pH*0.32,40,pX+pW/2,pY+pH*0.32,pW*0.9); pgr.addColorStop(0,"#1c5417"); pgr.addColorStop(1,"#0c2c0c");
    ctx.fillStyle=pgr; clRoundRect(ctx,pX,pY,pW,pH,14); ctx.fill(); ctx.restore();
    ctx.save(); clRoundRect(ctx,pX,pY,pW,pH,14); ctx.clip();
    for(let i=0;i<10;i++){ ctx.fillStyle = i%2 ? "rgba(255,255,255,0.025)":"rgba(0,0,0,0.04)"; ctx.fillRect(pX,pY+i*(pH/10),pW,pH/10); }
    ctx.strokeStyle="rgba(255,255,255,0.28)"; ctx.lineWidth=3; ctx.strokeRect(pX+8,pY+8,pW-16,pH-16);
    ctx.beginPath(); ctx.arc(pX+pW/2,pY+8,pW*0.13,0,Math.PI); ctx.stroke();
    const bxW=pW*0.5,bxH=pH*0.16; ctx.strokeRect(pX+(pW-bxW)/2,pY+pH-bxH-8,bxW,bxH);
    const syW=pW*0.24,syH=pH*0.07; ctx.strokeRect(pX+(pW-syW)/2,pY+pH-syH-8,syW,syH);
    ctx.restore();
    // koszulki + kropki ery + nazwiska (po załadowaniu SVG koszulki)
    const sized = ENGLAND_SHIRT_SVG.replace("<svg ", '<svg width="86" height="86" ');
    const img=new Image();
    function drawPlayers(haveImg){
      const shW=82, shH=82;
      xi.forEach(function(s){
        const cx=pX+s.x*pW, cy=pY+s.y*pH;
        if(haveImg){ ctx.drawImage(img, cx-shW/2, cy-shH/2-4, shW, shH); }
        else { ctx.fillStyle="#fff"; clRoundRect(ctx,cx-26,cy-30,52,56,8); ctx.fill(); ctx.fillStyle="#c8102e"; ctx.fillRect(cx-4,cy-30,8,56); ctx.fillRect(cx-26,cy-6,52,8); }
        const eh=ERA_HEX[s.player.e]; if(eh){ ctx.beginPath(); ctx.arc(cx+24,cy-30,9,0,Math.PI*2); ctx.fillStyle=eh; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.stroke(); }
        let nm=clLast(s.player.n); let fs=24; ctx.font="bold "+fs+"px Arial, sans-serif";
        while(ctx.measureText(nm).width>120 && fs>13){ fs--; ctx.font="bold "+fs+"px Arial, sans-serif"; }
        ctx.fillStyle="#ffffff"; ctx.textAlign="center"; ctx.fillText(nm, cx, cy+shH/2+10);
      });
      // PODPIS (serce karty): nazwa + tytuł + drugi człon
      ctx.textAlign="center"; let y=pY+pH+64;
      if(story){
        ctx.fillStyle="#e8c860"; let ns=46; const nameTxt=(story.emoji?story.emoji+" ":"")+story.name;
        ctx.font="900 "+ns+"px Arial, sans-serif";
        while(ctx.measureText(nameTxt).width>W-200 && ns>26){ ns--; ctx.font="900 "+ns+"px Arial, sans-serif"; }
        ctx.fillText(nameTxt, W/2, y); y+=46;
        if(story.desc){ ctx.fillStyle="#ffffff"; ctx.font="500 28px Arial, sans-serif"; clWrap(ctx,story.desc,W-260,2).forEach(function(ln){ ctx.fillText(ln,W/2,y); y+=34; }); }
        if(story.rest){ ctx.fillStyle="rgba(185,210,190,0.85)"; ctx.font="italic 23px Arial, sans-serif"; clWrap(ctx,story.rest,W-260,2).forEach(function(ln){ ctx.fillText(ln,W/2,y); y+=29; }); }
      }
      // stopka
      ctx.fillStyle="#ffffff"; ctx.font="bold 32px Arial, sans-serif"; ctx.fillText("CAN YOU BUILD A BETTER XI?", W/2, H-116);
      ctx.fillStyle="#c9a73a"; ctx.font="bold 26px Arial, sans-serif"; ctx.fillText("footylegendsquiz.co.uk", W/2, H-76);
      ctx.textAlign="right"; ctx.fillStyle="rgba(201,167,58,0.6)"; ctx.font="bold 20px Arial, sans-serif"; ctx.fillText("NO. "+clPad3(clCardNo()), W-58, H-52); ctx.textAlign="center";
      cv.toBlob(function(blob){ if(blob) cb(blob); }, "image/png");
    }
    img.onload=function(){ drawPlayers(true); };
    img.onerror=function(){ drawPlayers(false); };
    img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(sized);
  }
  window.clShareCard=function(){
    clBuildCard(function(blob){
      const file=new File([blob],"my-england-xi.png",{type:"image/png"});
      const data={files:[file], title:"My England XI", text:"Can you build a better XI? footylegendsquiz.co.uk"};
      try{ if(navigator.canShare && navigator.canShare({files:[file]}) && navigator.share){ navigator.share(data).catch(function(){}); clBumpCardNo(); return; } }catch(e){}
      const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="my-england-xi.png"; document.body.appendChild(a); a.click(); a.remove(); clBumpCardNo();
    });
  };
  window.clSaveCard=function(){
    clBuildCard(function(blob){
      const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="my-england-xi.png"; document.body.appendChild(a); a.click(); a.remove(); clBumpCardNo();
    });
  };

})();
