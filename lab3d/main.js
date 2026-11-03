/* 3D lab page: scene list, hash routing, toolbar and info panel. */
import { Viewer, reduceMotion } from './core.js';

const SCENES = [
  { id: 'cell', short: 'Animal cell', group: 'Modules 1 and 3', n: 'M1·3', title: 'Animal cell, cut away', module: 'Modules 1 and 3', pages: 'Module 1 p. 9 · Module 3 pp. 37–41 · Module 10 pp. 143–146',
    intro: 'A eukaryotic animal cell with one quarter removed so you can see inside. The nucleus holds the chromosomes. The endomembrane system (nuclear envelope, ER, Golgi apparatus, lysosomes, vesicles and plasma membrane) builds, modifies and moves cell materials; mitochondria, centrosomes and the cytoskeleton are not part of it. Not to scale.',
    fig: 'An animal cell with a quarter cut away. Organelles are drawn larger than life so they can be seen.' },
  { id: 'membrane', short: 'Cell membrane', group: 'Module 3', n: 'M3', title: 'Fluid mosaic membrane', module: 'Module 3', pages: 'Module 3 pp. 33–36',
    intro: 'A patch of plasma membrane. Its core is a phospholipid bilayer: hydrophilic heads face the water on both sides and hydrophobic tails face each other inside. Proteins, cholesterol and carbohydrates make up the mosaic, and lipids move sideways within each layer, which is why the membrane is fluid. Carbohydrate chains are only on the extracellular face.',
    fig: 'A patch of plasma membrane, extracellular side up. Play shows lipids moving sideways (lateral diffusion).' },
  { id: 'dna', short: 'DNA double helix', group: 'Module 4', n: 'M4', title: 'DNA double helix', module: 'Module 4', pages: 'Module 4 pp. 55–57',
    intro: 'B-form DNA, two complete turns (20 base pairs). The sugar-phosphate backbones wind around the outside and the bases point inward. The two strands run in opposite directions (antiparallel) and the helix coils to the right. One turn is 3.4 nm, or 10 base pairs, and the helix is 2 nm across.',
    fig: 'B-DNA, 20 base pairs. A purple, T teal, G orange, C yellow. Click a base to see how many hydrogen bonds it makes.' },
  { id: 'protein', short: 'Protein structure', group: 'Module 5', n: 'M5', title: 'Levels of protein structure', module: 'Module 5', pages: 'Module 5 pp. 69–74',
    intro: 'Protein structure has four levels of organization. The primary structure, the amino acid sequence, determines the secondary, tertiary and quaternary structure. Use the buttons above the model to move between the levels.',
    fig: 'The four levels of protein structure. Helices are drawn as helical ribbons and β strands as flattened arrows, as in the notes.' },
  { id: 'mito', short: 'Mitochondrion', group: 'Module 7', n: 'M7', title: 'Mitochondrion and the ETC', module: 'Modules 3 and 7', pages: 'Module 3 p. 41 · Module 7 pp. 106, 109–111',
    intro: 'A mitochondrion has an outer membrane, an intermembrane space, a highly folded inner membrane and the matrix. The electron transport chain and ATP synthase sit in the inner membrane. Switch to the inner membrane view to watch electrons pass along the chain, protons get pumped into the intermembrane space, and ATP synthase turn as they flow back.',
    fig: 'A mitochondrion cut lengthwise. In the inner membrane view the matrix is on top and the intermembrane space below, as in the notes.' },
  { id: 'chloro', short: 'Chloroplast', group: 'Module 8', n: 'M8', title: 'Chloroplast and thylakoid', module: 'Modules 3 and 8', pages: 'Module 3 pp. 41–42 · Module 8 pp. 118, 121–122',
    intro: 'A chloroplast is bound by two membranes and has a third inside, the thylakoid membrane, folded into flattened sacs stacked into grana. The light-dependent reactions happen in the thylakoid membrane and carbon fixation happens in the stroma. Switch to the thylakoid membrane view to follow electrons from water to NADP+.',
    fig: 'A chloroplast cut lengthwise. In the thylakoid membrane view the stroma is on top and the thylakoid lumen below, as in the notes.' },
  { id: 'gpcr', short: 'GPCR signalling', group: 'Module 9', n: 'M9', title: 'G protein-coupled receptor', module: 'Module 9', pages: 'Module 9 pp. 132–135',
    intro: 'A GPCR has seven transmembrane helices and works with a G protein made of α, β and γ subunits. This model follows the epinephrine (adrenaline) example in the notes, from ligand binding through cAMP and protein kinase A to termination of the signal. Step through it or press Play.',
    fig: 'Epinephrine signalling through a GPCR. Extracellular side up, cytosol below.' },
  { id: 'cyto', short: 'Cytoskeleton', group: 'Module 10', n: 'M10', title: 'Cytoskeletal filaments', module: 'Module 10', pages: 'Module 10 pp. 143–148',
    intro: 'The three cytoskeletal filaments side by side, roughly to scale. Microtubules are hollow tubes of tubulin dimers, microfilaments are a double helix of actin monomers, and intermediate filaments are strong rope-like fibres with a diameter in between. The nanometre values are approximate textbook figures; the notes compare the filaments only by relative size.',
    fig: 'Microtubule (top), intermediate filament (middle) and microfilament (bottom), drawn to about the same scale. Part of the microtubule wall is left open to show the hollow centre.' },
  { id: 'fork', short: 'Replication fork', group: 'Module 11', n: 'M11', title: 'Replication fork', module: 'Module 11', pages: 'Module 11 pp. 163–167',
    intro: 'DNA replication is semiconservative: each parental strand is the template for a new daughter strand. DNA polymerase can only add nucleotides to a 3′ end, so the leading strand is made continuously toward the fork while the lagging strand is made away from it in short Okazaki fragments.',
    fig: 'A replication fork moving left. Template (parental) strands dark blue, new DNA light green, RNA primers red.' },
  { id: 'mitosis', short: 'Mitosis', group: 'Module 11', n: 'M11', title: 'Mitosis', module: 'Module 11', pages: 'Module 11 pp. 172–175',
    intro: 'After S phase each chromosome is two sister chromatids held together at the centromere. Mitosis separates them into two identical nuclei in five stages, and cytokinesis then divides the cytoplasm. Two pairs of homologous chromosomes are shown, dark and light blue.',
    fig: 'An animal cell going through mitosis and cytokinesis. The spindle runs left to right.' },
];
const BY = Object.fromEntries(SCENES.map((s, i) => [s.id, { ...s, fig: i + 1 }]));
SCENES.forEach((s, i) => { BY[s.id].figText = s.fig; });

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* scene list grouped by module */
(function () {
  const box = $('#scenes'); let g = null, h = '<div class="g">Module · model</div>';
  SCENES.forEach(s => {
    if (g !== null && s.group !== g) h += '<div class="sep" aria-hidden="true"></div>';
    g = s.group;
    h += `<button type="button" data-id="${s.id}" title="${esc(s.title)}"><span class="n">${esc(s.n)}</span>${esc(s.short)}</button>`;
  });
  box.innerHTML = h;
  box.addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b) go(b.dataset.id); });
})();

const viewer = new Viewer({
  stage: $('#stage'), canvas: $('#cv'), svg: $('#leaders'), layer: $('#labels'), hud: $('#hud'),
  onSelect: showPart, onInteract: () => $('#hint').classList.add('gone'),
});

let token = 0, api = null, cur = null;

function go(id) { if (location.hash.slice(1) !== id) location.hash = id; else load(id); }
window.addEventListener('hashchange', () => load(location.hash.slice(1)));

async function load(id) {
  if (!BY[id]) id = 'cell';
  if (cur === id && api) return;
  const my = ++token; cur = id;
  const meta = BY[id];
  document.querySelectorAll('#scenes button').forEach(b => b.setAttribute('aria-current', b.dataset.id === id ? 'true' : 'false'));
  $('#loading').hidden = false;
  $('#kicker').textContent = `Notes · ${meta.pages}`;
  $('#title').textContent = meta.title;
  $('#intro').textContent = meta.intro;
  $('#caption').innerHTML = `<b>Fig. ${meta.fig}</b> ${esc(meta.figText)}`;
  document.title = `${meta.title} · BIOL 130 3D Lab`;
  $('#cv').setAttribute('aria-label', `3D model: ${meta.title}`);
  let mod;
  try { mod = await import(`./scenes/${id}.js`); }
  catch (err) { console.error(err); $('#loading').textContent = 'Could not load this model'; return; }
  if (my !== token) return;
  viewer.clear();
  api = mod.build(viewer.ctx());
  viewer.api = api;
  viewer.flyTo(api.view, true);
  setupControls(meta);
  $('#loading').hidden = true;
  showPart(null);
}

/* ---------- toolbar ---------- */
const playBtn = $('#play'), nextBtn = $('#next'), prevBtn = $('#prev');
function setPlaying(on) {
  viewer.playing = on;
  playBtn.textContent = on ? 'Pause' : 'Play';
  playBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  playBtn.classList.toggle('fill', on);
  viewer.dirty = true;
}
function setupControls(meta) {
  const modes = $('#modes'); modes.innerHTML = '';
  if (api.modes) {
    const lab = document.createElement('span'); lab.className = 'seglab'; lab.textContent = api.modes.label || 'View'; modes.append(lab);
    const seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', api.modes.label || 'View');
    api.modes.items.forEach(m => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = m.label; b.dataset.id = m.id;
      b.setAttribute('aria-pressed', m.id === api.modes.value ? 'true' : 'false');
      b.addEventListener('click', () => { seg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); setMode(m.id); });
      seg.append(b);
    });
    modes.append(seg);
  }
  if (api.toggles) {
    if (api.modes) { const sp = document.createElement('span'); sp.className = 'sp'; modes.append(sp); }
    api.toggles.forEach(t => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn tog'; b.dataset.id = t.id;
      const paint = () => { b.textContent = `${t.label}: ${t.on ? 'on' : 'off'}`; b.setAttribute('aria-pressed', t.on ? 'true' : 'false'); };
      paint(); b.hidden = t.show ? !t.show() : false;
      b.addEventListener('click', () => { t.on = !t.on; paint(); api.setToggle(t.id, t.on); viewer.dirty = true; renderStep(); });
      modes.append(b);
    });
  }
  applyControlVis();
  setPlaying(!playBtn.hidden && !!api.autoplay && !reduceMotion);
  api.stepChanged = renderStep;
  renderStep();
  buildPartList();
}
function applyControlVis() {
  const live = !api.playIn || api.playIn();
  playBtn.hidden = !(api.play && live);
  prevBtn.hidden = !(api.steps && live);
  nextBtn.hidden = !((api.steps || api.stepOnce) && live);
}
function refreshToggles() {
  if (!api || !api.toggles) return;
  api.toggles.forEach(t => { const b = document.querySelector(`#modes .btn[data-id="${t.id}"]`); if (b) b.hidden = t.show ? !t.show() : false; });
}
function setMode(id) {
  const v = api.setMode(id);
  if (v) viewer.flyTo(v);
  viewer.select(null);
  refreshToggles(); applyControlVis(); renderStep(); buildPartList();
  if (!playBtn.hidden && api.autoplay && !reduceMotion) setPlaying(true);
  viewer.dirty = true;
}
function renderStep() {
  const box = $('#stepbox');
  const info = api && api.stepInfo ? api.stepInfo() : null;
  if (!info) { box.hidden = true; $('#stepnow').textContent = ''; return; }
  box.hidden = false;
  $('#stepnum').textContent = info.num || '';
  $('#steptitle').textContent = info.title || '';
  $('#steptext').textContent = info.text || '';
  $('#stepnow').textContent = info.short || '';
  if (api.steps) { prevBtn.disabled = !!info.atStart; }
}
$('#reset').addEventListener('click', () => { if (api) viewer.flyTo(api.currentView ? api.currentView() : api.view); });
$('#labelsBtn').addEventListener('click', (e) => {
  const on = !viewer.labelsOn; viewer.setLabelsOn(on);
  e.currentTarget.textContent = on ? 'Labels on' : 'Labels off';
  e.currentTarget.setAttribute('aria-pressed', on ? 'true' : 'false');
});
playBtn.addEventListener('click', () => setPlaying(!viewer.playing));
nextBtn.addEventListener('click', () => {
  if (!api) return;
  if (api.steps) { setPlaying(false); api.next(); }
  else if (api.stepOnce) api.stepOnce();
  viewer.dirty = true; renderStep();
});
prevBtn.addEventListener('click', () => { if (!api || !api.steps) return; setPlaying(false); api.prev(); viewer.dirty = true; renderStep(); });

/* ---------- info panel ---------- */
function showPart(p) {
  const box = $('#selbox');
  if (!p) box.innerHTML = `<span class="mono">Selected part</span><p class="empty">Click or tap any part of the model to see its name and what it does. With labels off, clicking is a quick self-test.</p>`;
  else box.innerHTML = `<span class="mono">Selected part</span><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p>`;
  document.querySelectorAll('#pchips button').forEach(b => b.setAttribute('aria-pressed', p && b.dataset.id === p.id ? 'true' : 'false'));
}
function buildPartList() {
  const box = $('#pchips'); box.innerHTML = '';
  const list = [...viewer.parts.values()].filter(p => !api.partVisible || api.partVisible(p.id));
  list.forEach(p => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.id = p.id; b.textContent = p.name;
    b.setAttribute('aria-pressed', viewer.selected === p.id ? 'true' : 'false');
    b.addEventListener('click', () => viewer.select(p.id));
    box.append(b);
  });
  $('#psum').textContent = `All parts in this view (${list.length})`;
}

if (window.matchMedia && matchMedia('(pointer: coarse)').matches) $('#hint').textContent = 'Drag to rotate · pinch to zoom · tap a part';
load(location.hash.slice(1));
window.__lab = { viewer, get api() { return api; }, load };
