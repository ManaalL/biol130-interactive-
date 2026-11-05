/* Study modes for every BIOL 130 module page: Read (pre-read the notes), Prep (5 minutes before class),
   Learn (the interactive chapters) and Check (after class). Loaded after the page's own script; it uses the
   page's CHAPTERS, T, P and helpers (h, $, $$, rich, plate, termChips, bindTerms, bindRich, renderChapter, go). */
(function(){
if (typeof CHAPTERS==="undefined" || !window.SRS) return;
const MOD = document.documentElement.dataset.module || ("m"+((location.pathname.match(/module-(\d+)/)||[])[1]||"0"));
const NUM = MOD.slice(1);
const META = (window.STUDY&&STUDY.modules||[]).find(m=>m.id===MOD) || {};
const BANK = ((window.STUDY&&STUDY.exam&&STUDY.exam[MOD])||[]);
const REV = ((window.STUDY&&STUDY.review)||[]).filter(r=>r.mod===MOD);
const esc = s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const strip = s=>String(s||"").replace(/<[^>]+>/g,"").replace(/\[\[[a-z0-9-]+\|([^\]]+)\]\]/g,"$1");
const pickN=(a,n)=>shuffle(a).slice(0,n);

/* ---------- styles ---------- */
const css = `
.modebar{border-top:1px solid var(--rule);background:color-mix(in srgb,var(--accent) 4%,var(--paper))}
.modebar .in{max-width:1240px;margin:0 auto;padding:6px 20px;display:flex;align-items:center;gap:6px;overflow-x:auto;scrollbar-width:none}
.modebar .in::-webkit-scrollbar{display:none}
.modebar .lbl{font:600 .7rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--ink2);white-space:nowrap;margin:0 2px 0 8px}
.modebar .lbl:first-child{margin-left:0}
.modebar .md{background:none;border:1px solid transparent;border-radius:6px;padding:5px 11px;cursor:pointer;color:var(--ink);font:600 .92rem var(--sans);white-space:nowrap}
.modebar .md:hover{background:var(--chip)}
.modebar .md[aria-current="true"]{background:var(--accent);color:var(--accentInk);border-color:var(--accent)}
.modebar .sep{width:1px;height:20px;background:var(--rule);flex:none;margin:0 4px}
.modebar a.out{margin-left:auto;color:var(--accent);font-weight:600;font-size:.9rem;text-decoration:none;white-space:nowrap;padding:5px 8px}
.modebar a.out+a.out{margin-left:0}
.modebar .dot{display:inline-block;min-width:18px;padding:0 5px;border-radius:9px;background:var(--accent);color:var(--accentInk);font:700 .72rem/18px var(--sans);text-align:center;margin-left:4px}
.rd-intro{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:18px;margin-bottom:18px}
.rd-box{background:var(--paper);border:1px solid var(--rule);border-radius:6px;padding:16px 18px}
.rd-box h3{font-size:1.05rem;margin-bottom:8px}
.rd-box ol,.rd-box ul{margin:0;padding-left:20px}
.rd-box li{margin:3px 0}
.rd-toc a{color:var(--ink);text-decoration:none;display:flex;gap:8px;align-items:baseline;padding:3px 0;border-bottom:1px dashed var(--rule)}
.rd-toc a:hover{color:var(--accent)}
.rd-toc .pp{margin-left:auto;color:var(--ink2);font-size:.85rem;white-space:nowrap}
.rd-toc .ok{color:var(--ok);font-weight:700;font-size:.85rem}
.rd-ch{margin:34px 0 10px;scroll-margin-top:130px}
.rd-step{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:22px;align-items:start;margin:0 0 22px;padding-bottom:22px;border-bottom:1px solid var(--rule)}
.rd-step.nofig{grid-template-columns:minmax(0,1fr);max-width:860px}
.rd-step h3{font-size:1.15rem;margin-bottom:6px}
.rd-try{background:var(--chip);border-radius:6px;padding:10px 14px;margin:8px 0 0}
.rd-try summary{cursor:pointer;font-weight:600;color:var(--accent)}
.rd-sim{display:flex;gap:10px;align-items:center;background:var(--accentSoft);border-radius:6px;padding:10px 14px;margin:0 0 22px;max-width:860px}
.rd-layout{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:34px;align-items:start}
.rd-side{position:sticky;top:150px;display:flex;flex-direction:column;gap:2px;border-left:2px solid var(--rule);padding-left:12px;max-height:calc(100vh - 170px);overflow:auto}
.rd-side a{color:var(--ink2);text-decoration:none;font-size:.88rem;padding:4px 6px;border-radius:4px;line-height:1.3}
.rd-side a:hover{color:var(--ink);background:var(--chip)}
.rd-side a.on{color:var(--accent);font-weight:700;background:var(--accentSoft)}
@media (max-width:1050px){.rd-layout{grid-template-columns:minmax(0,1fr)}.rd-side{display:none}}
.rd-body{max-width:820px;font-size:1.04rem}
.rd-body>p,.rd-body>ul{margin:0 0 .7em}
.rd-body ul{padding-left:22px}
.rd-body li{margin:3px 0}
.rd-h{font-size:1.12rem;margin:22px 0 8px;display:flex;gap:10px;align-items:baseline}
.rd-pg{font:600 .78rem var(--sans);color:var(--ink2);letter-spacing:.04em}
.rd-fig{margin:12px 0 18px;max-width:760px}
.rd-mem{background:var(--accentSoft);border-left:4px solid var(--accent);border-radius:4px;padding:8px 12px;margin:8px 0 12px;font-weight:600}
.rd-tw{overflow-x:auto;margin:8px 0 14px}
.rd-table{border-collapse:collapse;font-size:.95rem;min-width:60%}
.rd-table th,.rd-table td{border:1px solid var(--rule);padding:6px 10px;text-align:left;vertical-align:top}
.rd-table th{background:var(--chip)}
.rd-end{background:var(--paper);border:1px solid var(--rule);border-left:4px solid var(--accent);border-radius:6px;padding:14px 18px;margin:6px 0 10px}
.md-pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.md-card{background:var(--paper);border:1px solid var(--rule);border-radius:6px;padding:14px 16px;cursor:pointer;text-align:left;font:inherit;color:inherit;display:flex;flex-direction:column;gap:4px}
.md-card:hover{border-color:var(--accent)}
.md-card .k{font-weight:700;color:var(--accent);font-size:.85rem}
.md-card b{font-family:var(--serif);font-size:1.08rem;color:var(--head)}
.md-card .st{font-size:.85rem;color:var(--ink2)}
.md-card.next{border-color:var(--accent);box-shadow:0 0 0 2px var(--accentSoft)}
.md-lead{max-width:760px;color:var(--ink2);margin:0 0 16px}
.md-wrap{max-width:860px}
.md-steps{display:flex;gap:6px;margin:0 0 14px}
.md-steps i{flex:1;height:4px;border-radius:2px;background:var(--rule)}
.md-steps i.on{background:var(--accent)}
.md-q{font-weight:650;font-size:1.06rem;margin:4px 0 12px}
.md-opt{display:block;width:100%;text-align:left;padding:10px 14px;margin:0 0 8px;border:1px solid var(--rule);border-radius:6px;background:var(--paper);color:var(--ink);font:inherit;cursor:pointer}
.md-opt:hover:not([disabled]){border-color:var(--accent)}
.md-opt.sel{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
.md-opt.right{border-color:var(--ok);background:var(--okSoft)}
.md-opt.wrong{border-color:var(--bad);background:var(--badSoft)}
.md-fb{margin:8px 0 0;padding:10px 14px;border-radius:6px;background:var(--chip)}
.md-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:14px}
.md-dump{width:100%;min-height:180px;padding:12px 14px;border:1px solid var(--rule);border-radius:6px;font:inherit;background:var(--paper);color:var(--ink);resize:vertical}
.md-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start}
.md-check label{display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px dashed var(--rule);cursor:pointer}
.md-terms dt{font-weight:700;color:var(--head);margin-top:8px}
.md-terms dd{margin:2px 0 0;color:var(--ink)}
.md-listen li{margin:6px 0}
.md-timer{font:700 1.1rem var(--sans);color:var(--accent);font-variant-numeric:tabular-nums}
.md-big{font-family:var(--serif);font-size:2.2rem;color:var(--head);font-weight:650;line-height:1}
.md-tag{display:inline-block;font-size:.75rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);margin-bottom:4px}
@media (max-width:900px){.rd-intro,.rd-step,.md-two{grid-template-columns:minmax(0,1fr)}}
@media (max-width:640px){.modebar .in{padding:6px 12px}.modebar .lbl{display:none}header.top{position:static}}
`;
document.head.append(h("style",{},css));

/* ---------- the mode bar ---------- */
const bar = h("div",{class:"modebar"}); const bin = h("div",{class:"in"}); bar.append(bin);
const MODES=[["read","Read","Before class"],["prep","Prep",null],["story","Learn","Class"],["check","Check","After class"]];
MODES.forEach(([v,label,grp])=>{ if(grp){ if(bin.children.length) bin.append(h("span",{class:"sep"})); bin.append(h("span",{class:"lbl"},grp)); } bin.append(h("button",{class:"md","data-mode":v,onclick:()=>openMode(v)},label)); });
const dueN = SRS.due().length;
bin.append(h("a",{class:"out",href:"review.html"},"Daily review",dueN?h("span",{class:"dot"},String(dueN)):null));
bin.append(h("a",{class:"out",href:"diagrams.html#"+MOD},"Diagrams"));
const SCENE={m1:"cell",m2:"protein",m3:"membrane",m4:"dna",m5:"protein",m6:"mito",m7:"mito",m8:"chloro",m9:"gpcr",m10:"cyto",m11:"fork"};
bin.append(h("a",{class:"out",href:"lab3d.html#"+(SCENE[MOD]||"cell")},"3D lab"));
$("header.top").append(bar);
function setMode(v){ $$(".modebar .md").forEach(b=>b.setAttribute("aria-current",String(b.dataset.mode===v))); }

/* ---------- hook into the page's router and chapter engine ---------- */
const _go = window.go;
window.go = function(view){
  if (view==="read"||view==="prep"||view==="check"){ openMode(view); return; }
  setMode(view==="story"?"story":"");
  _go(view);
};
const _render = window.renderChapter;
window.renderChapter = function(ci,si){ setMode("story"); return _render(ci,si); };
const _finish = window.finishChapter;
window.finishChapter = function(ci){
  const ch=CHAPTERS[ci]; _finish(ci);
  seedChapter(ci);   // what you just learned starts coming back in the daily review
};
function seedChapter(ci){
  const ch=CHAPTERS[ci]; if(!ch) return;
  BANK.forEach(q=>{ if(q.ch===ci) SRS.add(SRS.id.exam(MOD,q),{mod:MOD,kind:"x",ch:ci}); });
  (ch.terms||[]).forEach(k=>{ if(T[k]) SRS.add(SRS.id.term(MOD,k),{mod:MOD,kind:"t",ch:ci,k}); });
  REV.forEach(r=>{ if(r.ch===ci) SRS.add(SRS.id.rev(MOD,r),{mod:MOD,kind:"r",ch:ci},2); });
}
function openMode(v, ci){
  stopLoops(); exploreHook=null; RUN=null; tc.classList.remove("show"); tip.style.display="none";
  $$(".tab").forEach(t=>t.setAttribute("aria-current","false"));
  setMode(v);
  if (v==="story"){ _go("story"); return; }
  if (v==="read") readView(ci); else if (v==="prep") (ci==null?pickView("prep"):prepView(ci)); else if (v==="check") (ci==null?pickView("check"):checkView(ci));
}
function banner(title, pages){
  return h("div",{class:"banner"}, h("span",{class:"num"},NUM), h("span",{class:"ttl"},title), pages?h("span",{class:"pg"},pages):null);
}
function chNum(ci){ return `${NUM}.${ci+1}`; }
function status(ci){
  const id=CHAPTERS[ci].id, out=[];
  const r=SRS.marks("read",MOD)[id], p=SRS.marks("prep",MOD)[id], c=SRS.marks("check",MOD)[id], l=P.ch[id];
  if(r) out.push("read"); if(p) out.push("prepped"); if(l&&l.done) out.push("learned "+Math.round((l.best||0)*100)+"%"); if(c) out.push("checked "+Math.round(c.score*100)+"%");
  return out;
}
function nextChapter(kind){
  const marks=SRS.marks(kind,MOD);
  for(let i=0;i<CHAPTERS.length;i++) if(!marks[CHAPTERS[i].id]) return i;
  return 0;
}

/* ---------- READ ---------- */
let READ=null, readLoading=null;
function loadRead(){
  if (READ!==null) return Promise.resolve(READ);
  if (readLoading) return readLoading;
  readLoading=new Promise(res=>{ const s=document.createElement("script"); s.src="read/"+MOD+".js?v="+((window.STUDY&&STUDY.built)||"");
    s.onload=()=>{ READ=(window.READ_DATA&&window.READ_DATA.mod===MOD)?window.READ_DATA:false; res(READ); };
    s.onerror=()=>{ READ=false; res(false); }; document.head.append(s); });
  return readLoading;
}
function figFrom(ci,si,cap){
  const st=CHAPTERS[ci]&&CHAPTERS[ci].steps[si]; if(!st||!st.fig) return null;
  try{ const svg=st.fig(); return svg?plate(svg, cap||st.cap):null; }catch(e){ return null; }
}
function listEl(items){ return h("ul",{}, items.map(it=> typeof it==="string" ? h("li",{html:rich(it)}) : (it.ul? h("li",{style:"list-style:none"}, listEl(it.ul)) : null))); }
function blockEl(bk, ci){
  if (bk.h) return h("h3",{class:"rd-h"}, bk.h, bk.pg?h("span",{class:"rd-pg"},"p. "+bk.pg):null);
  if (bk.p) return h("p",{html:rich(bk.p)});
  if (bk.ul) return listEl(bk.ul);
  if (bk.fig){ const f=figFrom(bk.fig[0],bk.fig[1],bk.cap); return f?h("div",{class:"rd-fig"},f):null; }
  if (bk.qa) return h("details",{class:"rd-try"}, h("summary",{},"Question: ", h("span",{html:rich(bk.qa[0])})), h("p",{style:"margin:6px 0 0",html:"<b>Answer:</b> "+rich(bk.qa[1])}));
  if (bk.mem) return h("div",{class:"rd-mem",html:rich(bk.mem)});
  if (bk.table){ const t=h("table",{class:"rd-table"}); if(bk.table.head) t.append(h("thead",{},h("tr",{},bk.table.head.map(c=>h("th",{html:rich(String(c))}))))); t.append(h("tbody",{},bk.table.rows.map(r=>h("tr",{},r.map(c=>h("td",{html:rich(String(c))})))))); return h("div",{class:"rd-tw"},t); }
  if (bk.sim){ const st=CHAPTERS[bk.sim[0]]&&CHAPTERS[bk.sim[0]].steps[bk.sim[1]]; if(!st) return null;
    return h("div",{class:"rd-sim"}, h("span",{},h("b",{},"Interactive: "),st.title), h("button",{class:"btn ghost",style:"margin-left:auto",onclick:()=>{RUN=null; renderChapter(bk.sim[0],bk.sim[1]);}},"Open it")); }
  return null;
}
function readView(target){
  const app=$("#app"); app.innerHTML=""; window.scrollTo(0,0);
  app.append(h("p",{class:"muted"},"Loading the notes…"));
  loadRead().then(data=>renderRead(data,target));
}
function renderRead(data,target){
  const app=$("#app"); app.innerHTML="";
  const first=(CHAPTERS[0].pages||"").match(/\d+/), last=(CHAPTERS[CHAPTERS.length-1].pages||"").match(/(\d+)\D*$/);
  app.append(banner("Read the notes", first&&last?`Course notes pp. ${first[0]}–${last[1]}`:null));
  const intro=h("div",{class:"rd-intro"});
  const out=META.outcomes||[];
  const left=h("div",{class:"rd-box"}, h("h3",{},"Before you start"),
    h("p",{class:"muted small",style:"margin:0 0 8px"},"Skim this before the lecture so the new words are already familiar when you hear them. Read for the big picture first; details stick better once you have a frame to hang them on. Click any underlined term for its definition."),
    out.length? h("div",{}, h("b",{},"By the end of this module you should be able to:"), h("ol",{}, out.map(o=>h("li",{},o)))) : null);
  const toc=h("div",{class:"rd-box rd-toc"}, h("h3",{},"Contents"));
  const marks=SRS.marks("read",MOD);
  CHAPTERS.forEach((ch,ci)=>toc.append(h("a",{href:"#",onclick:e=>{e.preventDefault(); document.getElementById("rd-"+ci).scrollIntoView({behavior:"smooth"});}},
     h("span",{},`${chNum(ci)} ${ch.title}`), marks[ch.id]?h("span",{class:"ok"},"read"):null, h("span",{class:"pp"},ch.pages||""))));
  intro.append(left,toc); app.append(intro);
  const lay=h("div",{class:"rd-layout"}), col=h("div",{class:"rd-col"}), side=h("nav",{class:"rd-side","aria-label":"Chapters"});
  lay.append(col,side); app.append(lay);
  CHAPTERS.forEach((ch,ci)=>side.append(h("a",{href:"#","data-ci":ci,onclick:e=>{e.preventDefault(); document.getElementById("rd-"+ci).scrollIntoView({behavior:"smooth"});}},`${chNum(ci)} ${ch.title}`)));
  if ("IntersectionObserver" in window){ const sio=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ const ci=e.target.id.slice(3); $$("a",side).forEach(a=>a.classList.toggle("on",a.dataset.ci===ci)); } }),{rootMargin:"-30% 0px -60% 0px"}); setTimeout(()=>$$(".rd-sec",col).forEach(x=>sio.observe(x)),0); }
  CHAPTERS.forEach((ch,ci)=>{
    const sec=h("section",{id:"rd-"+ci,class:"rd-sec"});
    sec.append(h("h2",{class:"rd-ch"},`${chNum(ci)} ${ch.title}`), h("p",{class:"muted"},`${ch.blurb} `, h("span",{class:"small"},`Course notes ${ch.pages||""}`)));
    const rc=data&&data.chapters&&data.chapters.find(c=>c.ch===ci);
    if (rc){
      const body=h("div",{class:"rd-body"});
      rc.blocks.forEach(bk=>{ let el=null; try{ el=blockEl(bk,ci); }catch(e){ el=null; } if(el) body.append(el); });
      sec.append(body);
    } else {
      ch.steps.forEach((st,si)=>{
        if ((st.type==="brief"||st.type==="review") && st.text){
          const fig=figFrom(ci,si);
          sec.append(h("div",{class:"rd-step"+(fig?"":" nofig")}, fig, h("div",{}, h("h3",{},st.title), h("div",{html:rich(st.text)}))));
        } else if (st.type==="mcq" && st.q && st.opts){
          const ok=st.opts.find(o=>o[1]);
          sec.append(h("details",{class:"rd-try"}, h("summary",{},"Try it: "+strip(st.q).slice(0,140)), h("div",{html:rich(st.q)}),
            h("p",{style:"margin:6px 0 0"}, h("b",{},"Answer: "), strip(ok[0]), h("span",{class:"muted"}, ok[2]?" "+strip(ok[2]):""))));
        } else if (st.type==="custom"){
          sec.append(h("div",{class:"rd-sim"}, h("span",{},h("b",{},"Interactive: "),st.title), h("button",{class:"btn ghost",style:"margin-left:auto",onclick:()=>{RUN=null; renderChapter(ci,si);}},"Open it")));
        }
      });
    }
    const end=h("div",{class:"rd-end"}, h("p",{style:"margin:0 0 8px"},h("b",{},"In short: "),ch.wrap||""), termChips(ch.terms||[]),
      h("div",{class:"md-row"}, h("button",{class:"btn",onclick:()=>openMode("prep",ci)},"Prep this chapter"), h("button",{class:"btn ghost",onclick:()=>{RUN=null; renderChapter(ci,0);}},"Learn it interactively"), h("button",{class:"btn ghost",onclick:()=>openMode("check",ci)},"Check yourself")));
    sec.append(end); col.append(sec);
    if ("IntersectionObserver" in window){ const io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)){ SRS.mark("read",MOD,ch.id); io.disconnect(); } },{threshold:.6}); io.observe(end); }
  });
  bindTerms(app); bindRich(app);
  if (target!=null){ const el=document.getElementById("rd-"+target); if(el) setTimeout(()=>el.scrollIntoView(),30); }
}

/* ---------- chapter picker for Prep / Check ---------- */
function pickView(kind){
  const app=$("#app"); app.innerHTML=""; window.scrollTo(0,0);
  if (kind==="prep"){
    app.append(banner("Prep: 5 minutes before class"));
    app.append(h("p",{class:"md-lead"},"Pick the chapter your next lecture covers. You'll guess at three questions before you've learned it (trying first, even when you're wrong, makes the lecture stick), see the big picture and key terms, then get a few questions to listen for in class."));
  } else {
    app.append(banner("Check: after class"));
    app.append(h("p",{class:"md-lead"},"Pick the chapter you just covered. First write down everything you remember without looking, then compare with the notes, then a short quiz. Anything you miss or aren't sure about goes into your daily review so it comes back."));
  }
  const nx=nextChapter(kind);
  const grid=h("div",{class:"md-pick"});
  CHAPTERS.forEach((ch,ci)=>{
    const st=status(ci);
    grid.append(h("button",{class:"md-card"+(ci===nx?" next":""),onclick:()=>openMode(kind,ci)},
      h("span",{class:"k"},`Chapter ${chNum(ci)}${ci===nx?" · up next":""}`), h("b",{},ch.title), h("span",{class:"muted small"},ch.pages||""),
      h("span",{class:"st"}, st.length?st.join(" · "):"not started")));
  });
  app.append(grid);
}

/* ---------- shared question widget ---------- */
function mcq(host, q, opts){
  // q: {q, opts:[[text,ok,why]]}; opts: {confidence:bool, onDone(ok, sure)}
  const order=shuffle(q.opts.map((o,i)=>i));
  host.append(h("div",{class:"md-q",html:rich(q.q)}));
  const list=h("div"); host.append(list);
  let sel=null, done=false;
  const confirmRow=h("div",{class:"md-row"});
  const finish=(sure)=>{
    if(done||sel==null) return; done=true; confirmRow.remove();
    const ok=!!q.opts[sel][1];
    $$(".md-opt",list).forEach(b=>{ b.disabled=true; const i=+b.dataset.i; if(q.opts[i][1]) b.classList.add("right"); else if(i===sel) b.classList.add("wrong"); });
    const right=q.opts.find(o=>o[1]);
    host.append(h("div",{class:"md-fb",html:`<b>${ok?(sure===false?"Right, though you weren't sure.":"Right."):"Not quite."}</b> ${ok?(q.opts[sel][2]||""):("The answer is: "+strip(right[0])+". "+(q.opts[sel][2]||"")+" "+(right[2]||""))}${q.p?` <span class="muted small">(Notes p. ${esc(q.p)})</span>`:""}`}));
    opts.onDone&&opts.onDone(ok,sure);
  };
  order.forEach(i=>{ list.append(h("button",{class:"md-opt","data-i":i,onclick:e=>{ if(done) return; sel=i; $$(".md-opt",list).forEach(b=>b.classList.toggle("sel",b===e.currentTarget)); if(!opts.confidence) finish(null); else confirmRow.style.display="flex"; }},h("span",{html:rich(q.opts[i][0])}))); });
  if(opts.confidence){ confirmRow.style.display="none"; confirmRow.append(h("span",{class:"muted small"},"How sure are you?"), h("button",{class:"btn",onclick:()=>finish(true)},"Sure"), h("button",{class:"btn ghost",onclick:()=>finish(false)},"Guessing")); host.append(confirmRow); }
  bindRich(host);
}
function termQuestion(k){
  const t=T[k]; if(!t) return null;
  const others=Object.keys(T).filter(x=>x!==k && T[x].n!==t.n);
  const same=others.filter(x=>T[x].g===t.g), pool=(same.length>=3?same:others);
  const wrong=pickN(pool,3);
  let d=t.d; const nm=t.n.replace(/\s*\(.*?\)\s*/g,"").trim();
  if(nm.length>2) d=d.replace(new RegExp(nm.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),"_____");
  return {q:`Which term matches this? <span style="font-weight:400">“${esc(d)}”</span>`, opts:[[t.n,1,""]].concat(wrong.map(x=>[T[x].n,0,""])), p:t.p, k};
}
function stepper(host,n,cur){ const s=h("div",{class:"md-steps"}); for(let i=0;i<n;i++) s.append(h("i",{class:i<=cur?"on":""})); host.append(s); }

/* ---------- PREP ---------- */
function prepView(ci){
  const ch=CHAPTERS[ci]; const app=$("#app");
  const qs=pickN(BANK.filter(q=>q.ch===ci),3);
  let step=0, qi=0;
  function render(){
    app.innerHTML=""; window.scrollTo(0,0);
    app.append(banner(`Prep · ${chNum(ci)} ${ch.title}`, `Course notes ${ch.pages||""}`));
    const w=h("div",{class:"md-wrap"}); app.append(w); stepper(w,3,step);
    if(step===0){
      w.append(h("span",{class:"md-tag"},`Step 1 of 3 · Guess first (${qi+1} of ${Math.max(1,qs.length)})`));
      if(!qs.length){ step=1; render(); return; }
      if(qi===0) w.append(h("p",{class:"muted"},"You haven't learned this yet, and that's the point. Take your best guess. Trying to answer before the lecture makes the right answer stick better when you hear it, even if your guess is wrong."));
      const box=h("div",{class:"panel"}); w.append(box);
      mcq(box,qs[qi],{onDone:()=>{ box.append(h("div",{class:"md-row"}, h("button",{class:"btn",onclick:()=>{ if(qi+1<qs.length){qi++;} else step=1; render(); }}, qi+1<qs.length?"Next guess":"See the big picture"))); }});
    } else if(step===1){
      w.append(h("span",{class:"md-tag"},"Step 2 of 3 · The big picture"));
      const firstFig=ch.steps.find(s=>s.fig&&s.text);
      const two=h("div",{class:"md-two"});
      let fig=null; try{ if(firstFig) fig=plate(firstFig.fig(), firstFig.cap); }catch(e){}
      const keys=(ch.terms||[]).filter(k=>T[k]).slice(0,7);
      two.append(fig||h("div"), h("div",{}, h("h2",{style:"font-size:1.3rem;margin-bottom:6px"},ch.title), h("p",{},ch.blurb), h("p",{class:"muted"},ch.wrap||""),
        h("h3",{style:"font-size:1rem;margin-top:10px"},"Words you'll hear"), h("dl",{class:"md-terms"}, keys.flatMap(k=>[h("dt",{},T[k].n), h("dd",{},T[k].d)]))));
      w.append(two, h("div",{class:"md-row"}, h("button",{class:"btn",onclick:()=>{step=2; render();}},"What to listen for")));
    } else {
      w.append(h("span",{class:"md-tag"},"Step 3 of 3 · Listen for these in class"));
      const rq=REV.filter(r=>r.ch===ci).slice(0,4);
      const prompts = rq.length? rq.map(r=>r.q) : [`What is the main idea of "${ch.title}"?`, ...(ch.terms||[]).filter(k=>T[k]).slice(0,2).map(k=>`What is ${T[k].n.toLowerCase()}, and why does it matter here?`)];
      w.append(h("p",{class:"muted"},"Try to answer each of these in your head during the lecture. After class, Check will ask you about them."),
        h("ol",{class:"md-listen panel",style:"padding-left:34px"}, prompts.map(p=>h("li",{},p))));
      SRS.mark("prep",MOD,ch.id);
      w.append(h("div",{class:"md-row"}, h("button",{class:"btn",onclick:()=>readView(ci)},"Read this chapter's notes"), h("button",{class:"btn ghost",onclick:()=>openMode("prep")},"Prep another chapter")));
      w.append(h("p",{class:"muted small",style:"margin-top:14px"},"Prep saved. After class, come back and open Check for this chapter."));
    }
    bindTerms(app); bindRich(app);
  }
  render();
}

/* ---------- CHECK ---------- */
function checkView(ci){
  const ch=CHAPTERS[ci]; const app=$("#app");
  const exam=pickN(BANK.filter(q=>q.ch===ci),5);
  const tq=pickN((ch.terms||[]).filter(k=>T[k]),2).map(termQuestion).filter(Boolean);
  const qs=shuffle(exam.concat(tq));
  let step=0, qi=0, dump="", recalled=0, res=[]; let timer=null;
  function render(){
    if(timer){ clearInterval(timer); timer=null; }
    app.innerHTML=""; window.scrollTo(0,0);
    app.append(banner(`Check · ${chNum(ci)} ${ch.title}`, `Course notes ${ch.pages||""}`));
    const w=h("div",{class:"md-wrap"}); app.append(w); stepper(w,3,step);
    if(step===0){
      w.append(h("span",{class:"md-tag"},"Step 1 of 3 · Brain dump"));
      w.append(h("p",{},`Without looking at anything, write down everything you remember about `, h("b",{},ch.title), `: terms, steps, what connects to what. Bullet points are fine. Pulling it out of memory is what makes it stay.`));
      const ta=h("textarea",{class:"md-dump",placeholder:"Everything you remember…","aria-label":"Brain dump"}); ta.value=dump; ta.addEventListener("input",()=>dump=ta.value);
      const tm=h("span",{class:"md-timer"},"2:00"); let left=120;
      timer=setInterval(()=>{ left--; if(left<=0){ clearInterval(timer); timer=null; tm.textContent="Time's up. Finish your thought."; return; } tm.textContent=Math.floor(left/60)+":"+String(left%60).padStart(2,"0"); },1000);
      w.append(h("div",{class:"md-row",style:"margin:0 0 8px"}, h("span",{class:"muted small"},"Suggested time"), tm), ta,
        h("div",{class:"md-row"}, h("button",{class:"btn",onclick:()=>{step=1; render();}},"Compare with the notes"), h("button",{class:"btn ghost",onclick:()=>{dump=""; step=2; render();}},"Skip to the quiz")));
      setTimeout(()=>ta.focus(),50);
    } else if(step===1){
      w.append(h("span",{class:"md-tag"},"Step 2 of 3 · Compare"));
      const keys=(ch.terms||[]).filter(k=>T[k]);
      const low=dump.toLowerCase();
      const checks=h("div",{class:"md-check"});
      keys.forEach(k=>{ const nm=T[k].n.toLowerCase().replace(/\s*\(.*?\)\s*/g,"").trim(); const hit=nm&&low.includes(nm.split(" ")[0].length>3?nm:nm);
        const cb=h("input",{type:"checkbox"}); cb.checked=!!(hit&&dump); checks.append(h("label",{},cb,h("span",{},h("b",{},T[k].n),h("span",{class:"muted small"}," · "+T[k].d.slice(0,110)+(T[k].d.length>110?"…":""))))); });
      const mine=h("div",{class:"rd-box"}, h("h3",{},"What you wrote"), dump.trim()?h("div",{style:"white-space:pre-wrap"},dump):h("p",{class:"muted"},"(nothing written)"));
      const key=h("div",{class:"rd-box"}, h("h3",{},"Key points from the notes"), h("p",{},ch.wrap||ch.blurb),
        ...REV.filter(r=>r.ch===ci).slice(0,3).map(r=>h("details",{class:"rd-try"},h("summary",{},r.q),h("p",{style:"margin:6px 0 0"},r.a))));
      w.append(h("div",{class:"md-two"},mine,key), h("h3",{style:"margin:18px 0 6px;font-size:1.05rem"},"Tick each term you covered (or could have explained)"), checks,
        h("div",{class:"md-row"}, h("button",{class:"btn",onclick:()=>{ const boxes=$$("input",checks); recalled=boxes.filter(b=>b.checked).length;
          boxes.forEach((b,i)=>{ const k=keys[i]; SRS.grade(SRS.id.term(MOD,k),{mod:MOD,kind:"t",ch:ci,k}, b.checked?2:0); }); step=2; render(); }},"Start the quiz")));
    } else if(step===2 && qi<qs.length){
      w.append(h("span",{class:"md-tag"},`Step 3 of 3 · Quiz (${qi+1} of ${qs.length})`));
      const box=h("div",{class:"panel"}); w.append(box);
      const q=qs[qi];
      mcq(box,q,{confidence:true,onDone:(ok,sure)=>{
        res.push({q,ok,sure});
        const id=q.k?SRS.id.term(MOD,q.k):SRS.id.exam(MOD,q);
        SRS.grade(id,q.k?{mod:MOD,kind:"t",ch:ci,k:q.k}:{mod:MOD,kind:"x",ch:ci}, ok?(sure?2:1):0);
        box.append(h("div",{class:"md-row"}, h("button",{class:"btn",onclick:()=>{qi++; render();}}, qi+1<qs.length?"Next question":"See results")));
      }});
    } else {
      const right=res.filter(r=>r.ok).length, score=qs.length?right/qs.length:1;
      seedChapter(ci);
      SRS.mark("check",MOD,ch.id,{score,recalled});
      const shaky=res.filter(r=>!r.ok||r.sure===false);
      w.append(h("span",{class:"md-tag"},"Done"));
      w.append(h("div",{class:"md-row",style:"gap:30px;margin:6px 0 16px"},
        h("div",{},h("div",{class:"md-big"},`${right}/${qs.length}`),h("div",{class:"muted small"},"quiz")),
        h("div",{},h("div",{class:"md-big"},`${shaky.length}`),h("div",{class:"muted small"},"missed or guessed, scheduled for tomorrow"))));
      w.append(h("p",{}, score>=.8&&!shaky.length?"Solid. These will come back in a few days to keep them that way.":score>=.6?"Mostly there. The ones you missed or guessed come back tomorrow in your daily review.":"This one needs another pass. Go through the chapter interactively, then check again tomorrow."));
      if(shaky.length) w.append(h("ul",{}, shaky.map(r=>h("li",{},strip(r.q.q).slice(0,150), h("span",{class:"muted small"}, r.ok?" (guessed)":" (missed)")))));
      w.append(h("div",{class:"md-row"},
        score<.6?h("button",{class:"btn",onclick:()=>{RUN=null; renderChapter(ci,0);}},"Learn this chapter"):null,
        h("a",{class:"btn"+(score<.6?" ghost":""),href:"review.html"},"Go to daily review"),
        ci+1<CHAPTERS.length?h("button",{class:"btn ghost",onclick:()=>openMode("check",ci+1)},`Check ${chNum(ci+1)}`):null,
        h("button",{class:"btn ghost",onclick:()=>readView(ci)},"Reread the notes")));
    }
    bindTerms(app); bindRich(app);
  }
  render();
}

/* ---------- deep links: #read, #read=3, #prep=2, #check=2 ---------- */
function fromHash(){
  const m=location.hash.match(/^#(read|prep|check)(?:=(\d+))?$/);
  if(!m) return false;
  const ci=m[2]?Math.max(0,Math.min(CHAPTERS.length-1,+m[2]-1)):null;
  openMode(m[1],ci); return true;
}
window.addEventListener("hashchange",fromHash);
if(!fromHash()) setMode($$(".tab").find(t=>t.getAttribute("aria-current")==="true"&&t.dataset.go==="story")?"story":"");
window.MODES={open:openMode};
})();
