/* Shared study memory for BIOL 130.
   SRS: spaced-repetition schedule for every question, term, explain-it prompt and figure you've met.
   Modes: when you read, prepped and checked each chapter.
   Used by the module pages (Read / Prep / Check), the mini exams and the daily review page. Stored only in this browser. */
(function(){
const KEY="biol130-srs-v1", MKEY="biol130-modes-v1";
const IV=[1,2,4,8,16,32,64];             // days until next review, by box
function today(off){ const d=new Date(); d.setHours(12,0,0,0); if(off) d.setDate(d.getDate()+off); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function hash(s){ let h=5381; s=String(s); for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36); }
function load(k,d){ try{ const v=localStorage.getItem(k); return v?Object.assign(d,JSON.parse(v)):d; }catch(e){ return d; } }
function put(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
let S=load(KEY,{v:1,items:{},days:{}});
let M=load(MKEY,{v:1,read:{},prep:{},check:{}});
function daysBetween(a,b){ return Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/864e5); }
const SRS={
  today, hash, IV,
  id:{
    exam:(mod,q)=>"x|"+mod+"|"+hash(q.q),
    term:(mod,k)=>"t|"+mod+"|"+k,
    rev:(mod,r)=>"r|"+mod+"|"+hash(r.q),
    fig:(mod,f)=>"f|"+mod+"|"+f
  },
  get(id){ return S.items[id]; },
  items(){ return S.items; },
  /* add a new item without grading it (due tomorrow by default) */
  add(id,meta,dueOff){ if(!S.items[id]){ S.items[id]=Object.assign({},meta,{box:0,due:today(dueOff==null?1:dueOff),seen:0,lapses:0,added:today()}); put(KEY,S); } return S.items[id]; },
  /* g: 0 = missed, 1 = shaky, 2 = got it, 3 = easy */
  grade(id,meta,g){
    const it=S.items[id]||(S.items[id]=Object.assign({},meta,{box:0,seen:0,lapses:0,added:today()}));
    it.seen++; it.last=today(); it.g=g;
    if(g===0){ it.box=0; it.lapses++; it.due=today(1); }
    else if(g===1){ it.box=Math.max(0,it.box-1); it.due=today(Math.max(1,Math.round(IV[it.box]/2))); }
    else { it.box=Math.min(IV.length-1,it.box+(g===3?2:1)); it.due=today(IV[it.box]); }
    const t=today(); S.days[t]=(S.days[t]||0)+1; put(KEY,S); return it;
  },
  due(date){ date=date||today(); return Object.keys(S.items).filter(id=>S.items[id].due<=date).map(id=>Object.assign({id},S.items[id])); },
  forecast(n){ const out=[]; for(let i=0;i<n;i++){ const d=today(i); out.push({d,n:Object.values(S.items).filter(it=>i===0?it.due<=d:it.due===d).length}); } return out; },
  days(){ return S.days; },
  streak(){ let n=0, i=S.days[today()]?0:1; while(S.days[today(-i)]){ n++; i++; } return n; },
  reviewedToday(){ return S.days[today()]||0; },
  daysBetween,
  mark(kind,mod,ch,data){ M[kind]=M[kind]||{}; M[kind][mod]=M[kind][mod]||{}; M[kind][mod][ch]=Object.assign({date:today()},data||{}); put(MKEY,M); },
  marks(kind,mod){ return (M[kind]&&M[kind][mod])||{}; },
  reload(){ S=load(KEY,{v:1,items:{},days:{}}); M=load(MKEY,{v:1,read:{},prep:{},check:{}}); }
};
window.SRS=SRS;
window.addEventListener("storage",e=>{ if(e.key===KEY||e.key===MKEY) SRS.reload(); });
})();
