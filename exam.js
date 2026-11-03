/* Mini exam engine shared by every BIOL 130 module and the midterm prep page.
   Questions: {id, mod, ch, q, opts:[[text, isCorrect, why]], p}
   Results are saved in localStorage under "biol130-exam-v1"[key] so Kip can suggest what to relearn. */
(function(){
"use strict";
const KEY="biol130-exam-v1";
const lsGet=(k,d)=>{ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } };
const lsSet=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const shuffle=a=>{ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const STUDY=()=>window.STUDY||{modules:[]};
const modById=id=>STUDY().modules.find(m=>m.id===id);
const PAGE_MOD=(document.documentElement.getAttribute("data-module")||"").trim();

const css=`
.ex{max-width:880px}
.ex-card{background:var(--paper,#fff);border:1px solid var(--rule,#d3d6d8);border-radius:10px;padding:20px 22px;margin-bottom:16px}
.ex h2{font-family:var(--serif,Georgia,serif);font-size:1.45rem;margin:0 0 8px;color:var(--head,#22272c)}
.ex h3{font-family:var(--serif,Georgia,serif);font-size:1.12rem;margin:0 0 8px;color:var(--head,#22272c)}
.ex p{margin:0 0 .7em}
.ex .muted{color:var(--ink2,#566168)}
.ex-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.ex-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:8px;border:1px solid var(--accent,#2f8f7a);background:var(--accent,#2f8f7a);color:var(--accentInk,#fff);font:600 1rem var(--sans,system-ui);cursor:pointer}
.ex-btn.ghost{background:transparent;color:var(--accent,#2f8f7a)}
.ex-btn[disabled]{opacity:.45;cursor:not-allowed}
.ex-prog{height:8px;background:var(--rule,#d3d6d8);border-radius:4px;overflow:hidden;margin:6px 0 14px}
.ex-prog i{display:block;height:100%;background:var(--accent,#2f8f7a);transition:width .3s}
.ex-q{font-size:1.12rem;font-weight:600;margin:6px 0 12px;line-height:1.4}
.ex-opt{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;padding:11px 14px;margin:0 0 8px;border:1.5px solid var(--rule,#d3d6d8);border-radius:9px;background:var(--paper,#fff);color:var(--ink,#1f2529);font:inherit;cursor:pointer;line-height:1.35}
.ex-opt:hover{border-color:var(--accent,#2f8f7a)}
.ex-opt .l{flex:none;width:24px;height:24px;border-radius:50%;border:1.5px solid var(--rule,#c9cfd2);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;color:var(--ink2,#566168)}
.ex-opt.sel{border-color:var(--accent,#2f8f7a);box-shadow:0 0 0 2px var(--accent,#2f8f7a) inset}
.ex-opt.sel .l{background:var(--accent,#2f8f7a);border-color:var(--accent,#2f8f7a);color:#fff}
.ex-dots{display:flex;flex-wrap:wrap;gap:5px;margin:12px 0 4px}
.ex-dots button{width:30px;height:30px;border-radius:7px;border:1px solid var(--rule,#d3d6d8);background:var(--paper,#fff);color:var(--ink2,#566168);font:600 .8rem var(--sans,system-ui);cursor:pointer;position:relative}
.ex-dots button.ans{background:var(--accentSoft,#e3f2ee);border-color:var(--accent,#2f8f7a);color:var(--ink,#1f2529)}
.ex-dots button.cur{outline:2px solid var(--accent,#2f8f7a);outline-offset:1px}
.ex-dots button.flag::after{content:"";position:absolute;top:-4px;right:-4px;width:9px;height:9px;border-radius:50%;background:#e0a12a;border:1.5px solid var(--paper,#fff)}
.ex-flag{background:none;border:1px solid var(--rule,#d3d6d8);border-radius:7px;padding:5px 10px;font:600 .85rem var(--sans,system-ui);color:var(--ink2,#566168);cursor:pointer}
.ex-flag.on{border-color:#e0a12a;color:#9a6a0a;background:#fdf3dc}
.ex-score{display:flex;gap:28px;flex-wrap:wrap;align-items:flex-end;margin:4px 0 10px}
.ex-big{font-family:var(--serif,Georgia,serif);font-size:3rem;line-height:1;color:var(--accent,#2f8f7a)}
.ex-topic{display:grid;grid-template-columns:minmax(0,1fr) 150px 52px;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--rule,#e2e6e8);font-size:.95rem}
.ex-topic .bar{height:10px;background:var(--rule,#d3d6d8);border-radius:5px;overflow:hidden}
.ex-topic .bar i{display:block;height:100%}
.ex-topic .n{text-align:right;font-variant-numeric:tabular-nums;color:var(--ink2,#566168)}
.ex-relearn{border-left:4px solid #d9822b;background:#fdf1e4;color:#3a2410;border-radius:0 8px 8px 0;padding:12px 14px;margin:10px 0}
.ex-relearn li{margin:0 0 8px}
.ex-relearn .ex-row{margin-top:4px}
.ex-mini{font:600 .84rem var(--sans,system-ui);border:1px solid #d9a46b;background:#fff;color:#8a4a10;border-radius:14px;padding:3px 10px;cursor:pointer;text-decoration:none}
.ex-mini:hover{background:#fff6ec}
.ex-rev details{border:1px solid var(--rule,#d3d6d8);border-radius:8px;margin:0 0 8px;background:var(--paper,#fff)}
.ex-rev summary{padding:9px 12px;cursor:pointer;display:flex;gap:10px;align-items:flex-start;line-height:1.35}
.ex-rev summary .mk{flex:none;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.8rem}
.ex-rev .mk.ok{background:#2a7648}.ex-rev .mk.no{background:#a53838}.ex-rev .mk.skip{background:#8a949a}
.ex-rev .body{padding:0 14px 12px 44px;font-size:.95rem}
.ex-rev .body .yours{color:#a53838}.ex-rev .body .right{color:#2a7648;font-weight:600}
.ex-tag{display:inline-block;font-size:.78rem;border:1px solid var(--rule,#d3d6d8);border-radius:10px;padding:1px 8px;color:var(--ink2,#566168);margin-left:6px}
.ex-modpick{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 14px}
.ex-modpick label{display:flex;gap:6px;align-items:center;border:1px solid var(--rule,#d3d6d8);border-radius:20px;padding:5px 12px;cursor:pointer;background:var(--paper,#fff);font-size:.92rem}
.ex-modpick input{accent-color:var(--accent,#2f8f7a)}
@media (prefers-color-scheme: dark){ .ex-relearn{background:#3a2a18;color:#f6dfc4;border-color:#d9822b} .ex-mini{background:#2a2016;color:#f3c58f} .ex-flag.on{background:#3a2f16;color:#f1cf86} }
@media (max-width:640px){ .ex-topic{grid-template-columns:minmax(0,1fr) 70px 44px} .ex-card{padding:16px} .ex-big{font-size:2.4rem} }
`;
let styled=false;
function style(){ if(styled) return; styled=true; const s=document.createElement("style"); s.textContent=css; document.head.append(s); }
function el(tag,attrs={},html=""){ const e=document.createElement(tag); for(const k in attrs){ if(k.startsWith("on")) e.addEventListener(k.slice(2),attrs[k]); else if(attrs[k]!=null&&attrs[k]!==false) e.setAttribute(k,attrs[k]); } if(html) e.innerHTML=html; return e; }
const topicKey=q=>q.mod+":"+q.ch;
function topicName(mod,ch){ const m=modById(mod); const c=m&&m.chapters&&m.chapters[ch]; return c?c.title:`Chapter ${ch+1}`; }
function topicLabel(mod,ch,multi){ const m=modById(mod); return (multi&&m?`M${m.n}: `:"")+topicName(mod,ch); }
function chapterURL(mod,ch){ const m=modById(mod); return m&&m.ready?`${m.file}#ch=${ch+1}`:null; }
function openChapter(mod,ch){
  if(mod===PAGE_MOD && typeof window.renderChapter==="function"){ window.RUN=null; window.renderChapter(ch,0); return; }
  const u=chapterURL(mod,ch); if(u) location.href=u;
}

/* pick n questions spread across chapters (round robin) */
function pick(items,n){
  if(n>=items.length) return shuffle(items);
  const by={}; shuffle(items).forEach(q=>{ (by[topicKey(q)]=by[topicKey(q)]||[]).push(q); });
  const keys=shuffle(Object.keys(by)), out=[];
  while(out.length<n){ let added=false; for(const k of keys){ if(by[k].length && out.length<n){ out.push(by[k].pop()); added=true; } } if(!added) break; }
  return shuffle(out);
}

function mount(root,cfg){
  style();
  const multi = new Set(cfg.items.map(q=>q.mod)).size>1;
  let qs=[], ans=[], flags=[], cur=0, mode="start", chosenMods=null;
  root.innerHTML=""; const wrap=el("div",{class:"ex"}); root.append(wrap);
  const saved=()=>lsGet(KEY,{})[cfg.key];

  function start(){
    mode="start"; wrap.innerHTML="";
    const s=saved(); const c=el("div",{class:"ex-card"});
    const avail = chosenMods? cfg.items.filter(q=>chosenMods.has(q.mod)) : cfg.items;
    c.innerHTML=`<h2>${esc(cfg.title)}</h2><p>${esc(cfg.intro||"")}</p>
      <p class="muted">Like a real test: no hints or feedback until you submit. You can skip, flag questions to come back to, and change answers before you hand it in. After that you get a breakdown by chapter and a list of exactly what to relearn.</p>
      ${s?`<p><b>Last attempt:</b> ${s.last}% &nbsp; <b>Best:</b> ${s.best}% &nbsp; <span class="muted">(${s.attempts} attempt${s.attempts>1?"s":""})</span></p>`:""}`;
    if(cfg.modulePicker){
      const mods=[...new Set(cfg.items.map(q=>q.mod))]; chosenMods=chosenMods||new Set(mods);
      const box=el("div",{class:"ex-modpick"});
      mods.forEach(id=>{ const m=modById(id); const n=cfg.items.filter(q=>q.mod===id).length; const lab=el("label"); const cb=el("input",{type:"checkbox"}); cb.checked=chosenMods.has(id);
        cb.addEventListener("change",()=>{ if(cb.checked) chosenMods.add(id); else chosenMods.delete(id); start(); }); lab.append(cb, document.createTextNode(`Module ${m?m.n:"?"} (${n})`)); box.append(lab); });
      c.append(el("p",{style:"margin:6px 0 0;font-weight:600"},"Include:"), box);
    }
    const row=el("div",{class:"ex-row"});
    (cfg.sizes||[10]).filter(n=>n<avail.length).forEach(n=>row.append(el("button",{class:"ex-btn",onclick:()=>begin(avail,n)},`${n} questions`)));
    row.append(el("button",{class:"ex-btn"+((cfg.sizes||[]).some(n=>n<avail.length)?" ghost":""),onclick:()=>begin(avail,avail.length),disabled:avail.length?null:"disabled"},`All ${avail.length} questions`));
    c.append(row);
    if(s && s.topics){ c.append(el("p",{class:"muted",style:"margin:12px 0 0"},"Your last breakdown is below.")); }
    wrap.append(c);
    if(s && s.topics) wrap.append(breakdownCard(s.topics,false));
  }
  function begin(pool,n){ qs=pick(pool,n).map(q=>({...q,order:shuffle(q.opts.map((o,i)=>i))})); ans=new Array(qs.length).fill(null); flags=new Array(qs.length).fill(false); cur=0; mode="q"; show(); window.scrollTo(0,root.getBoundingClientRect().top+window.scrollY-80); }
  function show(){
    wrap.innerHTML=""; const q=qs[cur]; const c=el("div",{class:"ex-card"});
    const answered=ans.filter(a=>a!=null).length;
    c.innerHTML=`<div class="ex-row" style="justify-content:space-between"><b>Question ${cur+1} of ${qs.length}</b><span class="muted">${answered} answered</span></div><div class="ex-prog"><i style="width:${answered/qs.length*100}%"></i></div><div class="ex-q">${esc(q.q)}</div>`;
    q.order.forEach((oi,k)=>{ const o=q.opts[oi]; const b=el("button",{class:"ex-opt"+(ans[cur]===oi?" sel":""),type:"button"},`<span class="l">${"ABCDEF"[k]}</span><span>${esc(o[0])}</span>`);
      b.addEventListener("click",()=>{ ans[cur]= ans[cur]===oi? null : oi; show(); }); c.append(b); });
    const fl=el("button",{class:"ex-flag"+(flags[cur]?" on":""),type:"button"}, flags[cur]?"Flagged":"Flag to come back");
    fl.addEventListener("click",()=>{ flags[cur]=!flags[cur]; show(); });
    const nav=el("div",{class:"ex-row",style:"justify-content:space-between;margin-top:10px"});
    const left=el("div",{class:"ex-row"}); left.append(el("button",{class:"ex-btn ghost",onclick:()=>{ if(cur>0){cur--;show();} },disabled:cur===0?"disabled":null},"Back"), fl);
    const right=el("div",{class:"ex-row"});
    if(cur<qs.length-1) right.append(el("button",{class:"ex-btn",onclick:()=>{cur++;show();}},ans[cur]==null?"Skip":"Next"));
    right.append(el("button",{class:cur<qs.length-1?"ex-btn ghost":"ex-btn",onclick:submit},"Submit exam"));
    nav.append(left,right); c.append(nav);
    const dots=el("div",{class:"ex-dots","aria-label":"Jump to question"});
    qs.forEach((_,i)=>{ const d=el("button",{class:(ans[i]!=null?"ans ":"")+(i===cur?"cur ":"")+(flags[i]?"flag":""),type:"button","aria-label":`Question ${i+1}`},String(i+1)); d.addEventListener("click",()=>{cur=i;show();}); dots.append(d); });
    c.append(dots);
    wrap.append(c);
  }
  function submit(){
    const un=ans.filter(a=>a==null).length, fl=flags.filter(Boolean).length;
    if((un||fl) && !confirm(`${un?`${un} unanswered`:""}${un&&fl?" and ":""}${fl?`${fl} flagged`:""}. Submit anyway?`)) return;
    const topics={}; let right=0;
    qs.forEach((q,i)=>{ const ok= ans[i]!=null && q.opts[ans[i]][1]; if(ok) right++; const k=topicKey(q); topics[k]=topics[k]||{right:0,total:0}; topics[k].total++; if(ok) topics[k].right++; });
    const pct=Math.round(right/qs.length*100);
    const all=lsGet(KEY,{}); const prev=all[cfg.key]||{best:0,attempts:0};
    all[cfg.key]={last:pct,best:Math.max(prev.best||0,pct),attempts:(prev.attempts||0)+1,topics,when:Date.now(),n:qs.length};
    lsSet(KEY,all);
    if(window.SRS) qs.forEach((q,i)=>{ if(q.mod==null) return; const ok= ans[i]!=null && q.opts[ans[i]][1]; SRS.grade(SRS.id.exam(q.mod,q),{mod:q.mod,kind:"x",ch:q.ch},ok?2:0); });
    results(right,pct,topics,prev);
  }
  function breakdownCard(topics,withActions){
    const c=el("div",{class:"ex-card"}); c.append(el("h3",{},"By chapter"));
    const keys=Object.keys(topics).sort((a,b)=>{ const [ma,ca]=a.split(":"), [mb,cb]=b.split(":"); return ma===mb? ca-cb : ma<mb?-1:1; });
    keys.forEach(k=>{ const [mod,ch]=k.split(":"); const t=topics[k], f=t.right/t.total;
      const col= f>=0.8?"#2a7648": f>=0.6?"#d9a12b":"#c0482f";
      const row=el("div",{class:"ex-topic"},`<span>${esc(topicLabel(mod,+ch,multi))}</span><span class="bar"><i style="width:${Math.max(4,f*100)}%;background:${col}"></i></span><span class="n">${t.right}/${t.total}</span>`);
      c.append(row); });
    return c;
  }
  function results(right,pct,topics,prev){
    mode="r"; wrap.innerHTML="";
    const s=saved(); const c=el("div",{class:"ex-card"});
    const msg= pct>=85?"Strong. You know this material well.": pct>=70?"Solid, with a few gaps to close.": pct>=50?"Getting there. Focus on the chapters below.":"This needs another pass. Start with the chapters below, weakest first.";
    c.innerHTML=`<h2>Results</h2><div class="ex-score"><div><div class="ex-big">${right}/${qs.length}</div><div class="muted">correct (${pct}%)</div></div><div><div class="ex-big" style="color:var(--head,#22272c)">${s.best}%</div><div class="muted">${prev.attempts? (pct>(prev.best||0)?"new personal best":"your best"):"your first score"}</div></div></div><p>${msg}</p>`;
    const weak=Object.keys(topics).map(k=>({k,...topics[k],f:topics[k].right/topics[k].total})).filter(t=>t.f<0.75).sort((a,b)=>a.f-b.f || (a.k<b.k?-1:1));
    if(weak.length){
      const box=el("div",{class:"ex-relearn"}); box.append(el("b",{},"Relearn these"));
      const ul=el("ul",{style:"margin:8px 0 0;padding-left:18px"});
      weak.forEach(t=>{ const [mod,ch]=t.k.split(":"); const li=el("li");
        const missed=qs.filter((q,i)=>topicKey(q)===t.k && !(ans[i]!=null && q.opts[ans[i]][1]));
        const pages=[...new Set(missed.map(q=>q.p).filter(Boolean))];
        li.innerHTML=`<b>${esc(topicLabel(mod,+ch,multi))}</b>: ${t.right} of ${t.total} right${pages.length?`. Notes ${pages.map(p=>"p. "+p).join(", ")}`:""}`;
        const r=el("div",{class:"ex-row"});
        if(chapterURL(mod,+ch)) r.append(el("button",{class:"ex-mini",type:"button",onclick:()=>openChapter(mod,+ch)},"Review the chapter"));
        if(window.KIP) r.append(el("button",{class:"ex-mini",type:"button",onclick:()=>window.KIP.ask(topicName(mod,+ch))},"Ask Kip about it"));
        li.append(r); ul.append(li); });
      box.append(ul); c.append(box);
    } else c.append(el("p",{style:"font-weight:600;color:#2a7648"},"Nothing below 75% in any chapter."));
    const row=el("div",{class:"ex-row",style:"margin-top:8px"});
    row.append(el("button",{class:"ex-btn",onclick:()=>begin(cfg.items.filter(q=>!chosenMods||chosenMods.has(q.mod)),qs.length)},"Retake with new questions"));
    const missedQs=qs.filter((q,i)=>!(ans[i]!=null && q.opts[ans[i]][1]));
    if(missedQs.length) row.append(el("button",{class:"ex-btn ghost",onclick:()=>{ qs=missedQs.map(q=>({...q,order:shuffle(q.opts.map((o,i)=>i))})); ans=new Array(qs.length).fill(null); flags=new Array(qs.length).fill(false); cur=0; show(); }},`Redo the ${missedQs.length} I missed`));
    row.append(el("button",{class:"ex-btn ghost",onclick:start},"Back to start"));
    c.append(row); wrap.append(c);
    wrap.append(breakdownCard(topics,true));
    const rv=el("div",{class:"ex-card ex-rev"}); rv.append(el("h3",{},"Every question, explained"));
    qs.forEach((q,i)=>{ const a=ans[i], ok=a!=null&&q.opts[a][1], ri=q.opts.findIndex(o=>o[1]);
      const d=el("details"); if(!ok) d.open=false;
      d.innerHTML=`<summary><span class="mk ${a==null?"skip":ok?"ok":"no"}">${a==null?"–":ok?"✓":"✗"}</span><span>${esc(q.q)}<span class="ex-tag">${esc(topicLabel(q.mod,q.ch,multi))}</span></span></summary>
        <div class="body">${a!=null&&!ok?`<p class="yours">Your answer: ${esc(q.opts[a][0])}. ${esc(q.opts[a][2]||"")}</p>`:""}${a==null?`<p class="muted">Skipped.</p>`:""}<p class="right">Answer: ${esc(q.opts[ri][0])}</p><p>${esc(q.opts[ri][2]||"")}</p>${q.p?`<p class="muted">Course notes p. ${esc(q.p)}</p>`:""}</div>`;
      rv.append(d); });
    wrap.append(rv);
    window.scrollTo(0,root.getBoundingClientRect().top+window.scrollY-80);
  }
  start();
}
window.EXAM={ mount, lastResult:k=>lsGet(KEY,{})[k] };
})();
