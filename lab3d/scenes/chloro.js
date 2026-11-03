/* Modules 3 and 8: chloroplast cutaway and the thylakoid-membrane light reactions. */
import * as THREE from '../vendor/three.module.min.js';
import { V, tube, spheres, rng, bilayer, arrow } from '../geo.js';
import { createETC, atpSynthase, complexBlob } from '../etc.js';
import { wedgeEllipsoid, cutRims } from './mito.js';

export function build(ctx) {
  const over = new THREE.Group(), zoom = new THREE.Group(); zoom.visible = false;
  ctx.add(over, zoom);
  const r = rng(41);
  const parts = { overview: [], zoom: [] };
  const P = (m, id, name, desc, ...objs) => { ctx.part(id, name, desc, ...objs); parts[m].push(id); };
  const L = (g, t, at, o = {}) => ctx.label(t, { obj: g, at }, o);

  /* ---------- overview ---------- */
  const OX = 4.6, OY = 1.75, OZ = 2.7, IX = 4.42, IY = 1.6, IZ = 2.52;
  const outer = new THREE.Group(), oG = wedgeEllipsoid(OX, OY, OZ);
  outer.add(new THREE.Mesh(oG, ctx.mat('#93b25c')), new THREE.Mesh(oG, ctx.mat('#dfe9c4', { side: THREE.BackSide })), cutRims(OX, OY, OZ, 0.045, ctx.mat('#6f8c3e')));
  const inner = new THREE.Group(), iG = wedgeEllipsoid(IX, IY, IZ);
  inner.add(new THREE.Mesh(iG, ctx.mat('#b9cf82', { side: THREE.DoubleSide })), cutRims(IX, IY, IZ, 0.035, ctx.mat('#86a24f')));
  over.add(outer, inner);
  const stacks = [V(-3.0, 0, -0.5), V(-1.7, 0, 1.0), V(-1.4, 0, -1.25), V(0.15, 0, 0.1), V(1.6, 0, 1.15), V(1.7, 0, -1.05), V(3.05, 0, 0.05)];
  const discMat = ctx.mat('#4f8a45'), lamMat = ctx.mat('#79a861');
  const discPos = [], grana = new THREE.Group();
  const dGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.1, 28);
  stacks.forEach((c, si) => {
    const maxY = IY * Math.sqrt(Math.max(0, 1 - (c.x / IX) ** 2 - (c.z / IZ) ** 2)) - 0.2;
    const n = Math.max(4, Math.min(9, Math.floor((maxY * 2) / 0.165)));
    const ys = [];
    for (let i = 0; i < n; i++) { const y = (i - (n - 1) / 2) * 0.165; ys.push(y); const m = new THREE.Mesh(dGeo, discMat); m.position.set(c.x, y, c.z); grana.add(m); }
    discPos.push(ys);
  });
  over.add(grana);
  const lam = new THREE.Group();
  [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6], [1, 4], [2, 5]].forEach(([a, b], k) => {
    const ya = discPos[a], yb = discPos[b];
    for (let j = 0; j < 2; j++) {
      const y = ya[Math.min(ya.length - 1, 1 + ((k + j * 3) % (ya.length - 1)))];
      const yB = yb[Math.min(yb.length - 1, 1 + ((k * 2 + j) % (yb.length - 1)))];
      const A = stacks[a].clone().setY(y), B = stacks[b].clone().setY(yB);
      const d = B.clone().sub(A); const len = d.length() - 1.0; if (len <= 0) continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.3), lamMat);
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(V(1, 0, 0), d.normalize());
      lam.add(m);
    }
  });
  over.add(lam);
  const gran = [];
  for (let i = 0; i < 50; i++) { const p = V((r() - 0.5) * 8, (r() - 0.5) * 2.4, (r() - 0.5) * 4.4); if ((p.x / 4.1) ** 2 + (p.y / 1.35) ** 2 + (p.z / 2.3) ** 2 > 1) continue; if (stacks.some(s => Math.hypot(s.x - p.x, s.z - p.z) < 0.7)) continue; gran.push(p); }
  const cpd = new THREE.Group(); cpd.add(spheres(gran, 0.045, ctx.mat('#5a6e3a'), 0));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 28), ctx.mat('#6a4fa0')); ring.position.set(-0.6, -0.9, 1.8); ring.rotation.x = 1.3; cpd.add(ring);
  over.add(cpd);
  const stroma = new THREE.Mesh(wedgeEllipsoid(IX - 0.06, IY - 0.06, IZ - 0.06, 32), ctx.mat('#c8e0a8', { opacity: 0, side: THREE.DoubleSide })); stroma.material.visible = false; over.add(stroma);
  P('overview', 'c_outer', 'Outer membrane', 'Chloroplasts are surrounded by a double membrane: an outer and an inner membrane separated by a narrow space. Module 3 p. 41; Module 8 p. 118.', outer);
  P('overview', 'c_inner', 'Inner membrane', 'The inner of the two envelope membranes. Inside it is the stroma, with the thylakoids. Module 3 p. 41; Module 8 p. 118.', inner);
  P('overview', 'c_grana', 'Grana (stacked thylakoids)', 'Thylakoids are flattened membrane sacs, and a granum is an orderly stack of them. The space inside each sac is the thylakoid lumen. The thylakoid membrane holds the pigments, mainly chlorophyll, and the light-dependent reactions happen there. Module 3 p. 42; Module 8 pp. 118–119.', grana);
  P('overview', 'c_lam', 'Stroma lamellae', 'Unstacked stretches of thylakoid membrane that link one granum to the next, so the thylakoid membranes form one connected system. Module 3 p. 42; Module 8 p. 118.', lam);
  P('overview', 'c_dna', 'Chloroplast DNA and ribosomes', 'Chloroplasts are semi-autonomous, with their own circular genome and ribosomes. They resemble cyanobacteria and began as cyanobacteria engulfed by a eukaryotic cell (endosymbiosis). Module 3 pp. 41–42.', cpd);
  ctx.region('c_stroma', 'Stroma', 'The fluid that surrounds the thylakoids inside the inner membrane. Carbon fixation (the Calvin cycle) happens here, using the ATP and NADPH made by the light-dependent reactions. Module 3 p. 42; Module 8 p. 118.', stroma); parts.overview.push('c_stroma');
  L(over, 'Outer membrane', V(-2.6, OY * 0.82, -1.3), { part: 'c_outer', priority: 3, occlude: false });
  L(over, 'Inner membrane', V(2.2, IY * 0.86, 0.03), { part: 'c_inner', priority: 3, occlude: false });
  L(over, 'Granum', stacks[3].clone().setY(discPos[3][discPos[3].length - 1] + 0.06).add(V(0.3, 0, 0.3)), { part: 'c_grana', priority: 3 });
  L(over, 'Thylakoid', stacks[4].clone().setY(discPos[4][2]).add(V(0.4, 0, 0.35)), { part: 'c_grana', priority: 2.2 });
  L(over, 'Stroma lamella', lam.children[8] ? lam.children[8].position.clone() : V(0.9, 0, 0.6), { part: 'c_lam', priority: 2.2 });
  L(over, 'Stroma', V(-0.5, 0.3, 1.9), { part: 'c_stroma', priority: 2, occlude: false });
  L(over, 'DNA', ring.position.clone().add(V(0.3, 0, 0)), { part: 'c_dna', priority: 1.2, occlude: false });

  /* ---------- thylakoid membrane zoom: stroma on top, lumen below ---------- */
  const W = 20, D = 5, Z = 0.6;
  const X = { PSII: -6.7, PQ: -4.5, B6F: -2.1, PC: 0.3, PSI: 2.5, FD: 3.9, FNR: 5.3, S: 7.9 };
  const holes = [{ x: X.PSII, z: Z, r: 1.35 }, { x: X.B6F - 0.55, z: Z, r: 0.95 }, { x: X.B6F + 0.55, z: Z, r: 0.95 }, { x: X.PSI, z: Z, r: 1.3 }, { x: X.S, z: Z, r: 0.95 }, { x: X.S + 1.05, z: Z, r: 0.5 }];
  const BL = bilayer({ w: W, d: D, spacing: 0.5, half: 1.0, holes, headMat: ctx.mat('#a9c47a'), tailMat: ctx.mat('#e6e0b4'), seed: 9 });
  zoom.add(BL.heads, BL.tails);
  P('zoom', 'tmem', 'Thylakoid membrane', 'The membrane of the thylakoid sacs. It contains the pigments, the two photosystems, the electron transport chain and ATP synthase, and it keeps H+ from leaking back out of the lumen. Module 8 pp. 118, 121–122.', BL.heads, BL.tails);
  const psii = complexBlob(ctx, '#b5874a', { x: X.PSII, y: 0.15, r: 1.15, sx: 1.15, sy: 1.5, sz: 0.95, seed: 11 });
  const pq = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 6), ctx.mat('#7a5aa0')); pq.rotation.x = Math.PI / 2; pq.position.set(X.PQ, 0, Z + 0.95);
  const b6f = new THREE.Group(); b6f.add(complexBlob(ctx, '#6b86a8', { x: X.B6F - 0.55, y: 0.1, r: 0.9, sy: 1.75, seed: 12 }), complexBlob(ctx, '#6b86a8', { x: X.B6F + 0.55, y: 0.0, r: 0.9, sy: 1.7, seed: 13 }));
  const pc = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 2), ctx.mat('#4fa3a0')); pc.position.set(X.PC, -1.6, Z + 0.45);
  const psi = complexBlob(ctx, '#c0605a', { x: X.PSI, y: 0.1, r: 1.15, sx: 1.1, sy: 1.45, sz: 0.95, seed: 14 });
  const fd = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 2), ctx.mat('#a6744a')); fd.position.set(X.FD, 1.75, Z + 0.5);
  const fnr = complexBlob(ctx, '#6f9a5a', { x: X.FNR, y: 1.85, r: 0.72, sx: 1.1, sy: 0.85, seed: 15 });
  const syn = atpSynthase(ctx, { x: X.S, z: Z, color: '#5a63a8' });
  zoom.add(psii, pq, b6f, pc, psi, fd, fnr, syn.g);
  // light arrows
  const lightMat = ctx.mat('#e2b23a', { emissive: '#e2b23a', ei: 0.4 });
  const wav = (x0, y0, x1, y1) => { const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24, n = V(-(y1 - y0), x1 - x0, 0).normalize(); pts.push(V(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, Z + 1.1).addScaledVector(n, Math.sin(t * Math.PI * 6) * 0.18 * (1 - t * 0.3))); } return pts; };
  const light = new THREE.Group(); light.add(arrow(wav(X.PSII - 2.4, 5.6, X.PSII - 0.3, 1.9), 0.06, lightMat), arrow(wav(X.PSI - 2.2, 5.6, X.PSI - 0.25, 1.85), 0.06, lightMat));
  zoom.add(light);
  const water = new THREE.Group(); [[0, 0, '#d24b45', 0.2], [0.22, 0.13, '#e8eef0', 0.11], [-0.22, 0.13, '#e8eef0', 0.11]].forEach(([x, y, c, rr]) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(rr, 1), ctx.mat(c)); s.position.set(x, y, 0); water.add(s); });
  water.position.set(X.PSII - 0.6, -2.5, Z + 0.9); zoom.add(water);
  const o2 = new THREE.Group(); [-0.17, 0.17].forEach(dx => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 2), ctx.mat('#d24b45')); s.position.x = dx; o2.add(s); }); o2.position.set(X.PSII - 1.6, -2.6, Z + 0.9); o2.visible = false; zoom.add(o2);
  const nadph = new THREE.Group(); [[0, 0, 0.22], [0.3, 0.05, 0.16], [-0.28, 0.08, 0.16]].forEach(([x, y, rr]) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(rr, 1), ctx.mat('#d6b84a', { emissive: '#d6b84a', ei: 0.25 })); s.position.set(x, y, 0); nadph.add(s); }); nadph.position.set(X.FNR + 0.4, 2.9, Z + 0.6); nadph.visible = false; zoom.add(nadph);
  const flashMat = ctx.mat('#ffe08a', { emissive: '#ffd25a', ei: 1, opacity: 0.55 });
  const flashes = [X.PSII, X.PSI].map(x => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 2), flashMat); m.position.set(x, 0.6, Z + 1.0); m.visible = false; zoom.add(m); return { m, t: 0 }; });

  P('zoom', 'psii', 'Photosystem II', 'A protein-pigment complex. Antenna chlorophylls pass absorbed light energy to the reaction center chlorophyll, which gives an excited electron to the electron transport chain. PSII replaces that electron by splitting water. Module 8 pp. 120–121.', psii);
  P('zoom', 'h2o', 'Water (electron donor)', 'Water is the electron donor. Splitting (oxidizing) it at PSII produces electrons, H+ released into the thylakoid lumen, and O2 as a by-product. Module 8 pp. 117, 121.', water, o2);
  P('zoom', 'pq', 'Plastoquinone (Pq)', 'A small carrier that moves within the membrane, taking electrons from PSII to the cytochrome b6f complex. Module 8 p. 122.', pq);
  P('zoom', 'b6f', 'Cytochrome b6f complex', 'Electrons pass between PSII and PSI through this complex. As they flow along the Z pathway, H+ is moved from the stroma into the thylakoid lumen. Module 8 p. 122.', b6f);
  P('zoom', 'pc', 'Plastocyanin (Pc)', 'A small protein that carries electrons from the cytochrome b6f complex to PSI by diffusing through the thylakoid lumen. Module 8 p. 122.', pc);
  P('zoom', 'psi', 'Photosystem I', 'A second input of light energy at PSI raises the electron\'s energy high enough to reduce NADP+. The energy path of the electron from water to NADP+ looks like a "Z". Module 8 p. 121.', psi);
  P('zoom', 'fd', 'Ferredoxin (Fd)', 'A small carrier on the stroma side that takes electrons from PSI to NADP+ reductase (marked Fd in the notes figure). Module 8 p. 122.', fd);
  P('zoom', 'fnr', 'NADP+ reductase', 'Uses electrons from PSI to reduce NADP+ to NADPH in the stroma. NADPH and ATP then power the Calvin cycle. Module 8 pp. 121–122.', fnr, nadph);
  P('zoom', 'c_atps', 'ATP synthase', 'Embedded in the thylakoid membrane. H+ flows from the lumen back into the stroma through it, turning the rotor, and ATP is made on the stroma side. This ATP stays in the chloroplast for carbon fixation. Module 8 p. 122.', syn.g);
  P('zoom', 'light', 'Light', 'Light energy absorbed by chlorophyll is passed from chlorophyll to chlorophyll until it reaches the reaction center of each photosystem. Turn the light off to see the chain stop. Module 8 pp. 120–121.', light);

  const LIGHT = { on: true };
  let nCount = 0, nadphMade = 0;
  const flash = (i) => { flashes[i].t = 0.45; flashes[i].m.visible = true; };
  const eng = createETC(ctx, zoom, {
    W, D, topY: [1.8, 4.6], botY: [-4.4, -1.8], nH: 70, initBot: 30, initTop: 16, hColor: '#4aa3c8',
    synthX: X.S, synthZ: Z, rotor: syn.rotor, threshold: 2, synthK: 0.045, burstTime: 7, pattern: [0],
    canStart: () => LIGHT.on,
    routes: [[
      { p: V(X.PSII - 0.6, -2.4, Z + 0.95), action: a => { a.spawn(V(X.PSII - 0.6, -2.4, Z + 0.9), 'bot'); if (nCount++ % 2 === 0) a.puff(o2, 1.6, -1.2); } },
      { p: V(X.PSII, 0.3, Z + 1.05), dur: 0.8, gate: () => LIGHT.on, action: () => flash(0) },
      { p: V(X.PQ, 0, Z + 0.95), dur: 0.7 },
      { p: V(X.B6F - 0.6, 0, Z + 0.95), dur: 0.8, carrier: pq, action: a => a.pump(X.B6F, 2, 'top', 'bot') },
      { p: V(X.PC, -1.6, Z + 0.95), dur: 0.7 },
      { p: V(X.PSI - 0.6, -1.5, Z + 0.95), dur: 0.8, carrier: pc },
      { p: V(X.PSI, 0.3, Z + 1.05), dur: 0.5, gate: () => LIGHT.on, action: () => flash(1) },
      { p: V(X.FD, 1.75, Z + 0.95), dur: 0.6 },
      { p: V(X.FNR, 1.95, Z + 1.0), dur: 0.5, action: a => { if (nCount % 2 === 0) { a.consume(V(X.FNR, 2.0, Z + 0.5), 'top'); a.puff(nadph, 1.8, 1.2); nadphMade++; } } },
    ]],
  });
  P('zoom', 'c_h', 'Protons (H+)', 'H+ comes from splitting water and is moved from the stroma into the lumen as electrons flow along the Z pathway, so its concentration is high in the thylakoid lumen and low in the stroma. This gradient drives ATP synthase. Module 8 p. 122.', eng.hIM);
  P('zoom', 'c_e', 'Electron', 'An electron on its way from water to NADP+, boosted by light at PSII and again at PSI. Module 8 pp. 121–122.', eng.eMesh);

  L(zoom, 'Stroma', V(-9.5, 4.4, -2), { noLine: true, priority: 0.6 });
  L(zoom, 'Thylakoid lumen', V(-9.5, -4.5, -2), { noLine: true, priority: 0.6 });
  L(zoom, 'Photosystem II', V(X.PSII + 0.4, 1.6, Z + 0.6), { part: 'psii', priority: 3 });
  L(zoom, 'H₂O → ½O₂ + 2H⁺', V(X.PSII - 0.6, -3.2, Z + 0.9), { noLine: true, priority: 1 });
  ctx.label('Pq', pq, { part: 'pq', priority: 2.6, occlude: false });
  L(zoom, 'Cytochrome b6f', V(X.B6F, 1.9, Z + 0.3), { part: 'b6f', priority: 3 });
  ctx.label('Pc', pc, { part: 'pc', priority: 2.6, occlude: false });
  L(zoom, 'Photosystem I', V(X.PSI + 0.4, 1.5, Z + 0.6), { part: 'psi', priority: 3 });
  ctx.label('Fd', fd, { part: 'fd', priority: 2.4, occlude: false });
  L(zoom, 'NADP⁺ reductase', V(X.FNR + 0.4, 2.3, Z + 0.4), { part: 'fnr', priority: 2.8 });
  L(zoom, 'NADP⁺ + H⁺ → NADPH', V(X.FNR, 3.6, Z + 0.6), { noLine: true, priority: 0.9 });
  L(zoom, 'ATP synthase', V(X.S - 0.5, 3.4, Z + 0.3), { part: 'c_atps', priority: 3 });
  L(zoom, 'ADP + Pi → ATP', V(X.S + 1.3, 4.3, Z + 0.4), { noLine: true, priority: 0.9 });
  L(zoom, 'Light', V(X.PSII - 2.0, 5.0, Z + 1.1), { part: 'light', priority: 1.5, occlude: false, show: () => LIGHT.on });

  let mode = 'overview';
  const VIEWS = { overview: { pos: [5.6, 7.2, 9.5], target: [0, -0.3, 0], min: 2.5, max: 30 }, zoom: { pos: [1.2, 3.8, 25], target: [0.3, 0.2, 0], min: 4, max: 60, k: 1 } };
  return {
    view: VIEWS.overview,
    modes: { label: 'View', value: 'overview', items: [{ id: 'overview', label: 'Whole chloroplast' }, { id: 'zoom', label: 'Zoom to thylakoid membrane' }] },
    toggles: [{ id: 'light', label: 'Light', on: true, show: () => mode === 'zoom' }],
    play: true, autoplay: true, playIn: () => mode === 'zoom',
    setMode(m) { mode = m; over.visible = m === 'overview'; zoom.visible = m === 'zoom'; ctx.dirty(); return VIEWS[m]; },
    setToggle(id, on) { LIGHT.on = on; light.visible = on; },
    currentView: () => VIEWS[mode],
    partVisible: (id) => parts[mode].includes(id),
    stepOnce() { if (mode === 'zoom') eng.stepOnce(); },
    stepInfo() {
      if (mode !== 'zoom') return null;
      return LIGHT.on
        ? { num: 'Thylakoid membrane view', title: 'Light on', text: 'Light excites the reaction centers of PSII and PSI. Electrons pulled from water flow PSII → plastoquinone → cytochrome b6f → plastocyanin → PSI → ferredoxin → NADP+ reductase, making NADPH. H+ builds up in the lumen and flows back to the stroma through ATP synthase, making ATP. Module 8 pp. 121–122.' }
        : { num: 'Thylakoid membrane view', title: 'Light off', text: 'Without light the reaction centers are not excited, so water is not split and electrons stop flowing. No NADPH is made and no more H+ is moved into the lumen; ATP synthase runs only until the gradient is used up. Module 8 pp. 120–122.' };
    },
    hud() {
      if (mode !== 'zoom') return '';
      return `H⁺ in thylakoid lumen: <b>${eng.count('bot')}</b> · in stroma: <b>${eng.count('top')}</b><br>ATP made: <b>${eng.stats.atp}</b> · NADPH made: <b>${nadphMade}</b>${LIGHT.on ? '' : ' · <b>light off</b>'}`;
    },
    update(dt, playing) {
      if (mode !== 'zoom') return false;
      flashes.forEach(f => { if (f.t > 0) { f.t -= dt; const k = Math.max(0, f.t / 0.45); f.m.scale.setScalar(0.6 + (1 - k) * 0.8); f.m.material.opacity = 0.55 * k; if (f.t <= 0) f.m.visible = false; } });
      return eng.update(dt, playing);
    },
  };
}
