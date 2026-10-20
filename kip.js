/* Kip: the kinesin study guide for the BIOL 130 interactive modules.
   Kinesin is the motor protein that walks along microtubules carrying cargo to where it needs to go.
   Kip carries your questions to the right page of the notes.
   Works offline: answers come from the course glossary, the prof's review questions and chapter summaries
   in studydata.js. Optionally, a Claude API key (stored only in this browser) lets Kip answer in its own words. */
(function(){
"use strict";
const STUDY = window.STUDY || {modules:[],glossary:[],review:[],exam:{}};
const PAGE_MOD = (document.documentElement.getAttribute("data-module")||"").trim(); // "m3" on module pages, "" on hub
const EXAM_KEY = "biol130-exam-v1", REVIEW_KEY = "biol130-review-v1", APIKEY = "kip-claude-key", MODELKEY="kip-model";
const lsGet = (k,d)=>{ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } };
const lsSet = (k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const modById = id => STUDY.modules.find(m=>m.id===id);

/* ---------- Kip drawing: a kinesin-1 dimer drawn like a textbook figure ----------
   two motor heads on the track, neck linkers, a coiled-coil stalk, light chains, and a cargo vesicle */
function kipSVG(size=64, opts={}){
  const walk = opts.walk ? " kip-walk" : "";
  let coil=""; for(let i=0;i<6;i++){ const y=44+i*6; coil+=`M${i%2?55:65} ${y} C${i%2?55:65} ${y+3} ${i%2?65:55} ${y+3} ${i%2?65:55} ${y+6} `; }
  return `<svg class="kip-svg${walk}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <g class="kip-cargo"><circle cx="60" cy="22" r="19" fill="#eef7f3" stroke="#2f8f7a" stroke-width="2.2"/><circle cx="60" cy="22" r="15.5" fill="none" stroke="#2f8f7a" stroke-width=".9" stroke-dasharray="2.2 2"/>
      <circle cx="53.5" cy="21" r="2.3" fill="#173b34"/><circle cx="66.5" cy="21" r="2.3" fill="#173b34"/><circle cx="54.2" cy="20.2" r=".7" fill="#fff"/><circle cx="67.2" cy="20.2" r=".7" fill="#fff"/></g>
    <g class="kip-body"><ellipse cx="54" cy="44" rx="4" ry="2.6" fill="#9fd0bf"/><ellipse cx="66" cy="44" rx="4" ry="2.6" fill="#9fd0bf"/>
      <path d="${coil}" stroke="#2a8a76" stroke-width="2.2" fill="none"/><path d="${coil}" stroke="#7cc6b2" stroke-width="2.2" fill="none" transform="translate(120,0) scale(-1,1)"/></g>
    <g class="kip-leg kip-leg-a"><path d="M58 80 Q52 86 48 94" stroke="#2a8a76" stroke-width="2.4" fill="none"/><path d="M36 98 C36 88 58 88 58 98 C58 106 36 106 36 98 Z" fill="#3fb39b" stroke="#24786a" stroke-width="1.8"/></g>
    <g class="kip-leg kip-leg-b"><path d="M62 80 Q68 86 72 94" stroke="#2a8a76" stroke-width="2.4" fill="none"/><path d="M62 98 C62 88 84 88 84 98 C84 106 62 106 62 98 Z" fill="#5cc4ad" stroke="#24786a" stroke-width="1.8"/></g>
  </svg>`;
}
window.KIP_SVG = kipSVG;

/* ---------- styles ---------- */
const css = `
.kip-dock{position:fixed;left:14px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:45;width:250px;height:100px;pointer-events:none;border-radius:12px;font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
.kip-dock::before{content:"";position:absolute;inset:18px 0 0 0;border-radius:12px;background:rgba(250,252,250,.82);border:1px solid rgba(47,143,122,.22);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 8px 24px -14px rgba(20,48,43,.45)}
.kip-dock .kip-mt{position:absolute;left:10px;right:10px;bottom:10px;height:11px;pointer-events:auto;cursor:pointer;display:flex;gap:1px;padding:0;border-radius:6px}
.kip-dock .kip-mt i{flex:1;border-radius:5px;background:#bfe0d4}.kip-dock .kip-mt i:nth-child(2n){background:#8fcab6}
.kip-dock .kip-end{position:absolute;bottom:24px;font-size:10px;color:#4b7d71;letter-spacing:.04em;opacity:.85}
.kip-dock .kip-end.minus{left:12px}.kip-dock .kip-end.plus{right:12px}
.kip-me{position:absolute;bottom:14px;left:0;width:78px;height:78px;padding:0;border:0;background:none;cursor:grab;pointer-events:auto;touch-action:none;transition:opacity .4s}
.kip-me:active{cursor:grabbing}.kip-me svg{display:block;transition:transform .25s}.kip-me.left svg{transform:scaleX(-1)}
.kip-me:focus-visible{outline:2px solid #2f8f7a;outline-offset:2px;border-radius:10px}
.kip-cap{position:absolute;left:0;bottom:104px;font-size:10.5px;line-height:1.3;color:#2c5c51;background:rgba(255,255,255,.92);border:1px solid #cfe6dd;border-radius:6px;padding:3px 7px;white-space:nowrap;opacity:0;transform:translateY(4px);transition:opacity .3s,transform .3s;pointer-events:none}
.kip-dock.show-cap .kip-cap,.kip-dock:hover .kip-cap{opacity:1;transform:none}
.kip-panel{position:fixed;left:18px;bottom:calc(104px + env(safe-area-inset-bottom,0px));z-index:60;width:min(390px,calc(100vw - 36px));height:min(580px,calc(100vh - 130px));background:#fbfefd;color:#1f2a28;border:1px solid #bfe0d6;border-radius:18px;box-shadow:0 18px 50px rgba(15,50,42,.28);display:none;flex-direction:column;overflow:hidden;font-family:"Source Sans 3",system-ui,sans-serif;font-size:15.5px;line-height:1.45}
.kip-panel.open{display:flex}
.kip-hd{display:flex;align-items:center;gap:10px;padding:10px 12px;background:linear-gradient(180deg,#e3f5ee,#d3eee4);border-bottom:1px solid #bfe0d6}
.kip-hd b{font-family:"Source Serif 4",Georgia,serif;font-size:1.12rem;color:#173b34;display:block;line-height:1.1}
.kip-hd span{font-size:.8rem;color:#3d6b61}
.kip-hd .kip-x,.kip-hd .kip-gear{margin-left:auto;background:none;border:0;font-size:1.25rem;cursor:pointer;color:#3d6b61;padding:4px 8px;border-radius:8px}
.kip-hd .kip-gear{margin-left:auto;font-size:1.05rem}.kip-hd .kip-x{margin-left:0}
.kip-hd button:hover{background:rgba(63,179,155,.15)}
.kip-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;background:#fbfefd}
.kip-msg{max-width:92%;padding:9px 12px;border-radius:14px;word-wrap:break-word}
.kip-msg.kip{background:#e8f6f1;border:1px solid #cbe9de;border-bottom-left-radius:4px;align-self:flex-start}
.kip-msg.me{background:#2f8f7a;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
.kip-msg p{margin:0 0 6px}.kip-msg p:last-child{margin:0}
.kip-msg ul{margin:4px 0 6px;padding-left:18px}
.kip-card{background:#fff;border:1px solid #d6ece5;border-radius:10px;padding:8px 10px;margin-top:6px}
.kip-card .t{font-weight:700;color:#173b34}
.kip-card .src{font-size:.78rem;color:#5b7d75;margin:1px 0 4px}
.kip-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.kip-actions a,.kip-actions button{font:600 .82rem "Source Sans 3",system-ui,sans-serif;border:1px solid #9fd0bf;background:#fff;color:#1f6b5b;border-radius:12px;padding:3px 9px;cursor:pointer;text-decoration:none}
.kip-actions a:hover,.kip-actions button:hover{background:#e8f6f1}
.kip-opt{display:block;width:100%;text-align:left;margin:5px 0 0;padding:7px 10px;border:1px solid #cbe9de;background:#fff;border-radius:9px;cursor:pointer;font:inherit;color:#1f2a28}
.kip-opt:hover:not([disabled]){border-color:#3fb39b}
.kip-opt.right{background:#e2f2e7;border-color:#2a7648}.kip-opt.wrong{background:#f7e4e2;border-color:#a53838}
.kip-chips{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px 0;background:#fbfefd}
.kip-chips button{font:600 .82rem "Source Sans 3",system-ui,sans-serif;border:1px solid #9fd0bf;background:#f1faf7;color:#1f6b5b;border-radius:14px;padding:4px 10px;cursor:pointer}
.kip-chips button:hover{background:#e3f5ee}
.kip-in{display:flex;gap:6px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));border-top:1px solid #d6ece5;background:#fbfefd}
.kip-in input{flex:1;min-width:0;border:1px solid #bfe0d6;border-radius:12px;padding:8px 11px;font:inherit;background:#fff;color:#1f2a28}
.kip-in input:focus{outline:2px solid #3fb39b;outline-offset:0}
.kip-in button{border:0;background:#2f8f7a;color:#fff;border-radius:12px;padding:0 14px;font:700 .95rem "Source Sans 3",system-ui,sans-serif;cursor:pointer}
.kip-set{padding:12px;border-bottom:1px solid #d6ece5;background:#f4fbf8;font-size:.9rem;display:none}
.kip-set.open{display:block}
.kip-set input{width:100%;margin:6px 0;border:1px solid #bfe0d6;border-radius:8px;padding:6px 8px;font:inherit}
.kip-set .row{display:flex;gap:6px;flex-wrap:wrap}
.kip-set button{border:1px solid #9fd0bf;background:#fff;border-radius:8px;padding:4px 10px;cursor:pointer;font:600 .85rem "Source Sans 3",system-ui,sans-serif;color:#1f6b5b}
.kip-typing{display:inline-flex;gap:3px}.kip-typing i{width:6px;height:6px;border-radius:50%;background:#3fb39b;animation:kipdot 1s infinite}.kip-typing i:nth-child(2){animation-delay:.15s}.kip-typing i:nth-child(3){animation-delay:.3s}
@keyframes kipdot{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}
.kip-walk .kip-leg-a{animation:kipstepA .7s ease-in-out infinite;transform-origin:60px 80px}
.kip-walk .kip-leg-b{animation:kipstepB .7s ease-in-out infinite;transform-origin:60px 80px}
.kip-walk .kip-body,.kip-walk .kip-cargo{animation:kipbob .45s ease-in-out infinite alternate}
@keyframes kipstepA{0%,100%{transform:rotate(-12deg) translateY(0)}25%{transform:rotate(0) translateY(-5px)}50%{transform:rotate(14deg) translateY(0)}}
@keyframes kipstepB{0%,100%{transform:rotate(14deg) translateY(0)}50%{transform:rotate(-12deg) translateY(0)}75%{transform:rotate(0) translateY(-5px)}}
@keyframes kipbob{from{transform:translateY(0)}to{transform:translateY(-2.5px)}}
@media (prefers-color-scheme: dark){
 .kip-panel{background:#14201d;color:#e2eeea;border-color:#2e4a43}
 .kip-log,.kip-chips,.kip-in{background:#14201d}
 .kip-hd{background:linear-gradient(180deg,#1d332d,#192b27);border-color:#2e4a43}.kip-hd b{color:#d9f2ea}.kip-hd span{color:#9cc4b9}
 .kip-msg.kip{background:#1d332d;border-color:#2e4a43}
 .kip-card,.kip-opt,.kip-in input,.kip-actions a,.kip-actions button{background:#182824;border-color:#2e4a43;color:#d9f2ea}
 .kip-card .t{color:#d9f2ea}.kip-card .src{color:#9cc4b9}
 .kip-chips button{background:#1d332d;border-color:#2e4a43;color:#bfe7da}
 .kip-set{background:#192b27;border-color:#2e4a43}.kip-set input{background:#14201d;color:#e2eeea;border-color:#2e4a43}
 .kip-dock::before{background:rgba(20,32,29,.85);border-color:#2e4a43} .kip-dock .kip-mt i{background:#2e5a4f} .kip-dock .kip-mt i:nth-child(2n){background:#3f7a6b} .kip-dock .kip-end{color:#8fc4b6} .kip-cap{background:rgba(20,32,29,.94);color:#cfe9e1;border-color:#2e4a43} .kip-cargo circle:first-child{fill:#1d332d}
 .kip-opt.right{background:#17311f}.kip-opt.wrong{background:#3a1e1e}
}
@media (max-width:600px){ body{padding-bottom:70px} .kip-dock{width:128px;height:64px;left:6px;bottom:calc(6px + env(safe-area-inset-bottom,0px))} .kip-dock::before{inset:14px 0 0 0;background:rgba(250,252,250,.7)} .kip-dock .kip-mt{left:6px;right:6px;bottom:6px;height:8px} .kip-dock .kip-end{display:none} .kip-me{width:50px;height:50px;bottom:8px} .kip-me svg{width:50px;height:50px} .kip-cap{display:none} .kip-panel{left:8px;right:8px;width:auto;bottom:calc(84px + env(safe-area-inset-bottom,0px));height:min(70vh,560px)} }
@media (prefers-reduced-motion: reduce){ .kip-walk *{animation:none!important} }
`;

/* ---------- text search over the course material ---------- */
const STOP = new Set("a an the of and or to in on for is are was were be been being it its this that these those with by as at from what which who whom whose why how when where does do did can could should would will shall may might must about into than then there their they them your you i me my we our us not no yes vs versus between difference differ explain describe define definition mean means meaning tell give show please kip help some any all each other also more most very just like".split(" "));
const SYN = {"na+":"sodium","k+":"potassium","h+":"proton","ca2+":"calcium","atp":"atp","er":"endoplasmic","rer":"rough","ser":"smooth","mrna":"mrna","trna":"trna","rrna":"rrna","dna":"dna","rna":"rna","pol":"polymerase","ii":"ii","mito":"mitochondria","mitochondrion":"mitochondria","nucleoli":"nucleolus","cytoplasmic":"cytoplasm","phospholipids":"phospholipid","hydrophilic":"hydrophilic","pump":"pump"};
function stem(w){
  if(SYN[w]) return SYN[w];
  if(w.length>5 && w.endsWith("ies")) return w.slice(0,-3)+"y";
  if(w.length>5 && /(sses|xes|ches|shes)$/.test(w)) return w.slice(0,-2);
  if(w.length>4 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) return w.slice(0,-1);
  if(w.length>6 && w.endsWith("ing")) return w.slice(0,-3);
  if(w.length>6 && w.endsWith("ed")) return w.slice(0,-2);
  return w;
}
function toks(s){
  return String(s).toLowerCase().replace(/⁺/g,"+").replace(/²/g,"2").replace(/′/g,"'").replace(/<[^>]+>/g," ")
    .replace(/[^a-z0-9+' ]+/g," ").split(/\s+/).filter(w=>w && !STOP.has(w)).map(stem).filter(w=>w.length>1||/\d/.test(w));
}
const DOCS = [];
function addDoc(d){ d.tt=toks(d.title); d.bt=toks(d.text); d.norm=" "+d.tt.join(" ")+" "; DOCS.push(d); }
(STUDY.glossary||[]).forEach(g=>addDoc({kind:"term",title:g.n,text:g.d,mod:g.mod,page:g.p,ch:g.ch,key:g.k}));
(STUDY.review||[]).forEach((r,i)=>addDoc({kind:"review",title:r.q,text:r.a,mod:r.mod,page:r.p,ch:r.ch,idx:i}));
(STUDY.modules||[]).forEach(m=>(m.chapters||[]).forEach((c,i)=>addDoc({kind:"chapter",title:c.title,text:(c.blurb||"")+" "+(c.summary||""),mod:m.id,page:c.pages,ch:i})));
const DF = {}; DOCS.forEach(d=>new Set([...d.tt,...d.bt]).forEach(t=>DF[t]=(DF[t]||0)+1));
const idf = t => Math.log(1 + DOCS.length/((DF[t]||0)+0.5));
function search(q, n=4){
  const qt=[...new Set(toks(q))]; if(!qt.length) return [];
  const qnorm=" "+toks(q).join(" ")+" ";
  const res=DOCS.map(d=>{
    let s=0, hit=0;
    qt.forEach(t=>{ const inT=d.tt.includes(t), cb=d.bt.filter(x=>x===t).length; if(inT||cb) hit++; s+=idf(t)*((inT?3:0)+Math.min(2,cb)*0.6); });
    if(d.kind==="term" && d.tt.length && qnorm.includes(d.norm)) s+=6+2*d.tt.length;
    if(d.kind==="term" && d.tt.length===qt.length && d.tt.every(t=>qt.includes(t))) s+=6;
    if(d.kind==="review") s*=0.92;
    if(d.kind==="chapter") s*=0.7;
    if(PAGE_MOD && d.mod===PAGE_MOD) s*=1.12;
    s*= (0.5+0.5*hit/qt.length);
    return {d,s};
  }).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);
  return res.slice(0,n);
}
window.KIP_SEARCH = search;

/* ---------- links ---------- */
function chapterLink(mod, ch){
  const m=modById(mod); if(!m || ch==null || !m.ready) return null;
  return `${m.file}#ch=${ch+1}`;
}
function goChapter(mod, ch){
  if(mod===PAGE_MOD && typeof window.renderChapter==="function"){ window.RUN=null; try{ window.renderChapter(ch,0); }catch(e){ location.hash="ch="+(ch+1); } close(); return; }
  const url=chapterLink(mod,ch); if(url) location.href=url;
}
window.KIP_GO_CHAPTER = goChapter;
function srcLine(d){
  const m=modById(d.mod); const bits=[];
  if(m) bits.push(`Module ${m.n}${m.short?": "+m.short:""}`);
  if(d.page) bits.push(String(d.page).startsWith("p")?`notes ${d.page}`:`notes p. ${d.page}`);
  return bits.join(", ");
}

/* ---------- UI ---------- */
let panel, log, input, setBox, fab, built=false, history=[];
/* ---------- the dock: Kip walks a short microtubule in the corner. Drag him, push him, or click the track. ---------- */
function dock(){
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const d=document.createElement("div"); d.className="kip-dock";
  d.innerHTML=`<div class="kip-cap">Kip · kinesin-1 · drag me, or tap me to ask</div><span class="kip-end minus">−</span><span class="kip-end plus">+</span><div class="kip-mt" title="Microtubule: click to send Kip there">${"<i></i>".repeat(18)}</div><button class="kip-me" aria-label="Kip, your study guide. Click to ask a question; arrow keys move him.">${kipSVG(78)}</button>`;
  const me=d.querySelector(".kip-me"), mt=d.querySelector(".kip-mt"), cap=d.querySelector(".kip-cap"), svg=()=>me.querySelector("svg");
  let x=10, v=0, target=null, drag=null, moved=false, steps=0, last=performance.now(), idleT=0, mode="idle", fade=0;
  const MIN=4, W=()=>d.clientWidth-me.clientWidth-4;
  const capText=()=>{ cap.textContent = steps ? `Kip · ${steps} step${steps===1?"":"s"} × 8 nm · ${steps} ATP used` : "Kip · kinesin-1 · drag me, or tap me to ask"; };
  function place(){ me.style.left=Math.round(x)+"px"; }
  function walking(on){ svg().classList.toggle("kip-walk",!!on); }
  function face(dir){ if(dir) me.classList.toggle("left",dir<0); }
  let acc=0; function count(dx){ acc+=Math.abs(dx); while(acc>=9){ acc-=9; steps++; } capText(); }
  function tick(t){
    const dt=Math.min(.05,(t-last)/1000); last=t;
    if(!drag){
      if(target!=null){ const dx=target-x, sp=90*dt; if(Math.abs(dx)<=sp){ x=target; target=null; walking(false); } else { x+=Math.sign(dx)*sp; face(Math.sign(dx)); count(sp); walking(true); } idleT=0; }
      else if(Math.abs(v)>8){ const ox=x; x+=v*dt; v*=Math.pow(.12,dt); if(x<0||x>W()){ x=Math.max(0,Math.min(W(),x)); v=-v*.4; } face(Math.sign(v)); count(x-ox); walking(true); idleT=0; }
      else if(!reduce && !(panel&&panel.classList.contains("open"))){ v=0; idleT+=dt;
        if(mode==="idle" && idleT>4){ mode="plus"; }
        if(mode==="plus"){ const sp=18*dt; x+=sp; face(1); count(sp); walking(true); if(x>=W()){ x=W(); mode="fadeout"; walking(false); fade=0; } }
        else if(mode==="fadeout"){ fade+=dt; me.style.opacity=String(Math.max(0,1-fade/0.5)); if(fade>1.2){ x=MIN; place(); mode="fadein"; fade=0; } }
        else if(mode==="fadein"){ fade+=dt; me.style.opacity=String(Math.min(1,fade/0.5)); if(fade>=.5){ me.style.opacity="1"; mode="idle"; idleT=0; } }
        else walking(false);
      } else { v=0; walking(false); }
    }
    x=Math.max(MIN,Math.min(W(),x)); place(); requestAnimationFrame(tick);
  }
  function stopIdle(){ if(mode!=="idle"){ mode="idle"; me.style.opacity="1"; } idleT=0; }
  me.addEventListener("pointerdown",e=>{ me.setPointerCapture(e.pointerId); drag={sx:e.clientX, x0:x, lx:e.clientX, lt:performance.now(), vx:0}; moved=false; stopIdle(); target=null; v=0; });
  me.addEventListener("pointermove",e=>{ if(!drag) return; const dx=e.clientX-drag.sx; if(Math.abs(dx)>4) moved=true; if(!moved) return;
    const nx=Math.max(0,Math.min(W(),drag.x0+dx)); count(nx-x); face(Math.sign(e.clientX-drag.lx)); x=nx; walking(true);
    const now=performance.now(); drag.vx=(e.clientX-drag.lx)/Math.max(1,(now-drag.lt))*1000; drag.lx=e.clientX; drag.lt=now; place(); d.classList.add("show-cap"); });
  me.addEventListener("pointerup",()=>{ if(!drag) return; const vx=drag.vx; drag=null; d.classList.remove("show-cap");
    if(moved){ v=Math.max(-500,Math.min(500,vx)); if(Math.abs(v)<20) walking(false); } else { panel&&panel.classList.contains("open")?close():open(); } });
  me.addEventListener("click",e=>{ if(e.detail===0){ panel&&panel.classList.contains("open")?close():open(); } });
  me.addEventListener("keydown",e=>{ if(e.key==="ArrowLeft"||e.key==="ArrowRight"){ e.preventDefault(); stopIdle(); target=Math.max(0,Math.min(W(),x+(e.key==="ArrowRight"?40:-40))); } });
  mt.addEventListener("pointerdown",e=>{ const r=d.getBoundingClientRect(); stopIdle(); v=0; target=Math.max(0,Math.min(W(),e.clientX-r.left-me.clientWidth/2)); });
  setTimeout(()=>{ d.classList.add("show-cap"); setTimeout(()=>d.classList.remove("show-cap"),5000); },900);
  place(); requestAnimationFrame(tick);
  return d;
}
function build(){
  if(built) return; built=true;
  const st=document.createElement("style"); st.textContent=css; document.head.append(st);
  fab=dock();
  panel=document.createElement("section"); panel.className="kip-panel"; panel.setAttribute("aria-label","Kip study guide chat");
  panel.innerHTML=`<div class="kip-hd">${kipSVG(40)}<div><b>Kip</b><span>your kinesin study guide</span></div><button class="kip-gear" title="Settings" aria-label="Settings">⚙</button><button class="kip-x" aria-label="Close">×</button></div>
   <div class="kip-set"></div><div class="kip-log" aria-live="polite"></div><div class="kip-chips"></div>
   <form class="kip-in"><input type="text" placeholder="Ask about anything in BIOL 130…" aria-label="Ask Kip a question" autocomplete="off"><button type="submit">Ask</button></form>`;
  document.body.append(fab,panel);
  log=panel.querySelector(".kip-log"); input=panel.querySelector("input"); setBox=panel.querySelector(".kip-set");
  panel.querySelector(".kip-x").addEventListener("click",close);
  panel.querySelector(".kip-gear").addEventListener("click",toggleSettings);
  panel.querySelector("form").addEventListener("submit",e=>{ e.preventDefault(); const q=input.value.trim(); if(!q) return; input.value=""; ask(q); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape" && panel.classList.contains("open")) close(); });
  chips();
  greet();
}
function chips(){
  const box=panel.querySelector(".kip-chips"); box.innerHTML="";
  [["Quiz me",()=>quiz()],["What should I study?",()=>ask("What should I study?")],["What can you do?",()=>ask("What can you do?")]].forEach(([t,f])=>{ const b=document.createElement("button"); b.type="button"; b.textContent=t; b.addEventListener("click",f); box.append(b); });
}
function open(prefill){ build(); panel.classList.add("open"); if(prefill){ ask(prefill); } setTimeout(()=>input.focus(),50); }
function close(){ if(panel) panel.classList.remove("open"); }
function say(html, who="kip"){ const d=document.createElement("div"); d.className="kip-msg "+who; d.innerHTML=html; log.append(d); log.scrollTop=log.scrollHeight; return d; }
function greet(){
  const m=modById(PAGE_MOD);
  say(`<p>Hi, I'm <b>Kip</b>. I'm a kinesin: the motor protein that walks along microtubules carrying cargo to where it needs to go. Here, the cargo is your questions.</p><p>${m?`You're in Module ${m.n}. Ask me about any term or idea from it (or any other module), or tap <b>Quiz me</b>.`:"Ask me about any term or idea from BIOL 130, or tap <b>Quiz me</b>."}</p>`);
}
function cardHTML(d, withText=true){
  const link=chapterLink(d.mod,d.ch);
  return `<div class="kip-card"><div class="t">${esc(d.title)}</div><div class="src">${esc(srcLine(d))}</div>${withText?`<div>${esc(d.text)}</div>`:""}
    <div class="kip-actions">${link?`<a href="${link}" data-mod="${d.mod}" data-ch="${d.ch}" class="kip-go">Open the chapter</a>`:""}</div></div>`;
}
function wireLinks(el){ el.querySelectorAll("a.kip-go").forEach(a=>a.addEventListener("click",e=>{ if(a.dataset.mod===PAGE_MOD && typeof window.renderChapter==="function"){ e.preventDefault(); goChapter(a.dataset.mod,+a.dataset.ch); } })); }
function relatedButtons(list){
  if(!list.length) return "";
  return `<div class="kip-actions" style="margin-top:8px"><span style="font-size:.8rem;color:#5b7d75;align-self:center">Related:</span>${list.map(x=>`<button type="button" data-q="${esc(x.d.title)}">${esc(x.d.title.length>48?x.d.title.slice(0,46)+"…":x.d.title)}</button>`).join("")}</div>`;
}
function wireRelated(el){ el.querySelectorAll("button[data-q]").forEach(b=>b.addEventListener("click",()=>ask(b.dataset.q))); }

function ask(q){
  build(); if(!panel.classList.contains("open")) panel.classList.add("open");
  say(esc(q),"me");
  history.push({role:"user",content:q}); history=history.slice(-8);
  const lq=q.toLowerCase().trim();
  if(/^(hi|hey|hello|yo|hii+)\b/.test(lq) && lq.length<20) return reply(`<p>Hi! What are you working on? You can ask me something like "what is a nucleoside" or "difference between pinocytosis and phagocytosis".</p>`);
  if(/\b(thanks|thank you|ty)\b/.test(lq) && lq.length<30) return reply(`<p>Any time. Good luck with the studying.</p>`);
  if(/what can you do|how do you work|^help$/.test(lq)) return reply(`<p>I can:</p><ul><li>Explain any term or idea from Modules ${STUDY.modules.filter(m=>m.ready).map(m=>m.n).join(", ")}, with the page in your notes</li><li>Compare two terms ("difference between X and Y")</li><li>Quiz you with one question at a time</li><li>Tell you what to study, based on your mini exam and midterm results</li></ul><p>I search your course material, so I stick to what's in BIOL 130. ${getKey()?"You've added a Claude key, so I'll also explain things in my own words.":"With a Claude API key (⚙ above) I can also explain things in my own words."}</p>`);
  if(/quiz me|test me|ask me a question|practice question/.test(lq)) return quiz();
  if(/what should i (study|review|learn|focus)|weak|relearn|struggl/.test(lq)) return reply(studyPlan());
  return answer(q);
}
function reply(html){ const el=say(html); wireLinks(el); wireRelated(el); history.push({role:"assistant",content:el.textContent.slice(0,600)}); return el; }

function answer(q){
  const hits=search(q,6);
  const cmp=/differen|compare|vs\.?|versus|\bor\b/.test(q.toLowerCase());
  if(getKey()) return aiAnswer(q,hits);
  if(!hits.length || hits[0].s<2.2){
    return reply(`<p>I couldn't find that in the BIOL 130 material. Try a key word from your notes (for example "osmosis", "promoter" or "valence electrons"), or ask about one term at a time.</p>`);
  }
  const top=hits[0];
  let html="";
  if(cmp){
    const terms=hits.filter(x=>x.d.kind==="term").slice(0,2);
    if(terms.length===2 && terms[1].s>terms[0].s*0.35){
      html=`<p>Here are both, side by side:</p>${cardHTML(terms[0].d)}${cardHTML(terms[1].d)}`;
      return reply(html+relatedButtons(hits.filter(x=>!terms.includes(x)).slice(0,2)));
    }
  }
  html = top.d.kind==="review" ? `<p>Your prof asks this on the review sheet. Here's the answer:</p>${cardHTML(top.d)}` : cardHTML(top.d);
  const rel=hits.slice(1).filter(x=>x.s>top.s*0.3 && x.d.title!==top.d.title).slice(0,3);
  return reply(html+relatedButtons(rel));
}

/* ---------- quiz ---------- */
function quiz(){
  const pool=[]; const mods = PAGE_MOD && STUDY.exam[PAGE_MOD] ? [PAGE_MOD] : Object.keys(STUDY.exam||{});
  mods.forEach(m=>(STUDY.exam[m]||[]).forEach(q=>pool.push({...q,mod:m})));
  if(!pool.length) return reply("<p>I don't have questions loaded on this page.</p>");
  const q=pool[Math.floor(Math.random()*pool.length)];
  const el=say(`<p><b>${esc(q.q)}</b></p>`);
  const opts=q.opts.map((o,i)=>({o,i})).sort(()=>Math.random()-.5);
  opts.forEach(({o})=>{ const b=document.createElement("button"); b.type="button"; b.className="kip-opt"; b.textContent=o[0];
    b.addEventListener("click",()=>{ el.querySelectorAll(".kip-opt").forEach(x=>x.disabled=true);
      const right=q.opts.find(x=>x[1]);
      if(o[1]){ b.classList.add("right"); reply(`<p><b>Yes!</b> ${esc(o[2]||"")}</p><div class="kip-actions"><button type="button" data-q="quiz me">Another one</button></div>`); }
      else { b.classList.add("wrong"); el.querySelectorAll(".kip-opt").forEach(x=>{ if(x.textContent===right[0]) x.classList.add("right"); });
        const link=chapterLink(q.mod,q.ch);
        reply(`<p><b>Not quite.</b> ${esc(o[2]||"")}</p><p>The answer is: <b>${esc(right[0])}</b>. ${esc(right[2]||"")}</p><div class="kip-actions">${link?`<a class="kip-go" href="${link}" data-mod="${q.mod}" data-ch="${q.ch}">Review that chapter</a>`:""}<button type="button" data-q="quiz me">Another one</button></div>`); }
      log.scrollTop=log.scrollHeight; });
    el.append(b); });
  log.scrollTop=log.scrollHeight;
}

/* ---------- study plan from saved results ---------- */
function weakTopics(){
  const ex=lsGet(EXAM_KEY,{}), rv=lsGet(REVIEW_KEY,{}), out={};
  const add=(mod,ch,right,total)=>{ const k=mod+":"+ch; out[k]=out[k]||{mod,ch,right:0,total:0,shaky:0}; out[k].right+=right; out[k].total+=total; };
  Object.keys(ex).forEach(src=>{ const r=ex[src]; if(r && r.topics) Object.keys(r.topics).forEach(k=>{ const [mod,ch]=k.split(":"); add(mod,+ch,r.topics[k].right,r.topics[k].total); }); });
  (STUDY.review||[]).forEach((r,i)=>{ const s=rv[i]; if((s==="shaky"||s==="no") && r.ch!=null){ const k=r.mod+":"+r.ch; out[k]=out[k]||{mod:r.mod,ch:r.ch,right:0,total:0,shaky:0}; out[k].shaky+= s==="no"?2:1; } });
  return Object.values(out).map(t=>({...t,score: t.total? t.right/t.total : 1, weight:(t.total? (1-t.right/t.total)*t.total:0)+t.shaky})).filter(t=>t.weight>0).sort((a,b)=>b.weight-a.weight);
}
window.KIP_WEAK = weakTopics;
function studyPlan(){
  const w=weakTopics().slice(0,5);
  if(!w.length) return `<p>I don't have any results for you yet. Take a <b>mini exam</b> in any module, or rate yourself on the prof's review questions on the <b>Midterm prep</b> page, and I'll tell you exactly what to go back to.</p>`;
  return `<p>Based on your results, I'd go back to these first:</p><ul>${w.map(t=>{ const m=modById(t.mod), c=m&&m.chapters[t.ch]; const link=chapterLink(t.mod,t.ch);
      const why = t.total ? `${t.right} of ${t.total} right` : ""; const sh = t.shaky? `${t.total?", ":""}marked shaky on the review sheet`:"";
      return `<li>${link?`<a class="kip-go" href="${link}" data-mod="${t.mod}" data-ch="${t.ch}">`:""}Module ${m?m.n:"?"}: ${esc(c?c.title:"chapter "+(t.ch+1))}${link?"</a>":""} <span style="color:#5b7d75">(${why}${sh})</span></li>`; }).join("")}</ul><p>Then retake the exam to see if it stuck.</p>`;
}

/* ---------- optional: answers in Kip's own words with a Claude API key ---------- */
function getKey(){ try{ return localStorage.getItem(APIKEY)||""; }catch(e){ return ""; } }
function toggleSettings(){
  setBox.classList.toggle("open");
  const k=getKey();
  setBox.innerHTML=`<b>Answers in Kip's own words (optional)</b><p style="margin:4px 0">By default Kip searches your course material. If you add a Claude API key, Kip will also write explanations in plain language, still based on your notes. The key is saved only in this browser and sent only to Anthropic. Don't do this on a shared computer.</p>
   ${k?`<p style="margin:4px 0">A key is saved (ending …${esc(k.slice(-4))}).</p><div class="row"><button type="button" data-a="rm">Remove key</button></div>`:`<input type="password" placeholder="sk-ant-..." aria-label="Claude API key"><div class="row"><button type="button" data-a="save">Save key</button></div>`}`;
  const sv=setBox.querySelector('[data-a="save"]'); if(sv) sv.addEventListener("click",()=>{ const v=setBox.querySelector("input").value.trim(); if(!/^sk-/.test(v)){ alert("That doesn't look like a Claude API key."); return; } try{ localStorage.setItem(APIKEY,v); }catch(e){} toggleSettings(); toggleSettings(); say("<p>Key saved. I'll explain things in my own words now.</p>"); });
  const rm=setBox.querySelector('[data-a="rm"]'); if(rm) rm.addEventListener("click",()=>{ try{ localStorage.removeItem(APIKEY); }catch(e){} toggleSettings(); toggleSettings(); say("<p>Key removed. Back to searching your notes.</p>"); });
}
function md(s){ return esc(s).replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/^\s*[-•]\s+(.*)$/gm,"<li>$1</li>").replace(/(<li>.*<\/li>\n?)+/g,m=>"<ul>"+m.replace(/\n/g,"")+"</ul>").split(/\n{2,}/).map(p=>p.startsWith("<ul>")?p:`<p>${p.replace(/\n/g,"<br>")}</p>`).join(""); }
async function aiAnswer(q,hits){
  const wait=say(`<span class="kip-typing"><i></i><i></i><i></i></span>`);
  const ctx=hits.slice(0,6).map(x=>`[${x.d.kind==="review"?"Prof review question":x.d.kind==="term"?"Glossary":"Chapter"}] ${x.d.title} (${srcLine(x.d)}): ${x.d.text}`).join("\n");
  const m=modById(PAGE_MOD);
  const system=`You are Kip, a friendly kinesin motor protein who is a study guide for BIOL 130 (Introductory Cell Biology, University of Waterloo). The student is ${m?`working in Module ${m.n} (${m.title})`:"on the course home page"}. Answer using the course material provided in <notes>; if the notes don't cover it, say so briefly and give a short standard textbook answer, clearly marked as beyond the notes. Be plain, warm and concise: 2 to 6 sentences, or a short list when comparing. Use the course's terms. Mention the notes page when given. No em dashes. Never make up page numbers.`;
  const msgs=history.slice(0,-1).slice(-6).map(h=>({role:h.role,content:h.content}));
  msgs.push({role:"user",content:`<notes>\n${ctx||"(no matching notes found)"}\n</notes>\n\nQuestion: ${q}`});
  try{
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":getKey(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:(lsGet(MODELKEY,null)||"claude-haiku-5-5"),max_tokens:700,system,messages:msgs})});
    const data=await r.json();
    wait.remove();
    if(!r.ok) throw new Error((data&&data.error&&data.error.message)||("HTTP "+r.status));
    const text=(data.content||[]).filter(c=>c.type==="text").map(c=>c.text).join("\n").trim();
    const top=hits[0];
    const el=reply(md(text)+(top&&top.s>2.2?`<div class="src" style="font-size:.8rem;color:#5b7d75;margin-top:6px">From: ${esc(top.d.title)}, ${esc(srcLine(top.d))}</div><div class="kip-actions">${chapterLink(top.d.mod,top.d.ch)?`<a class="kip-go" href="${chapterLink(top.d.mod,top.d.ch)}" data-mod="${top.d.mod}" data-ch="${top.d.ch}">Open the chapter</a>`:""}</div>`:""));
    return el;
  }catch(err){
    wait.remove();
    say(`<p>I couldn't reach Claude (${esc(err.message||err)}). Here's what your notes say instead:</p>`);
    const k=getKey(); try{ localStorage.removeItem(APIKEY); }catch(e){}
    const res=answer(q); try{ localStorage.setItem(APIKEY,k); }catch(e){}
    return res;
  }
}

window.KIP = { open, close, ask, quiz, search, weakTopics };
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",build); else build();
})();
