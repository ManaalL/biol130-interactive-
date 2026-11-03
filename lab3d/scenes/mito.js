/* Modules 3 and 7: mitochondrion cutaway and the inner-membrane electron transport chain. */
import * as THREE from '../vendor/three.module.min.js';
import { V, tube, spheres, rng, bilayer, blobGeo } from '../geo.js';
import { createETC, atpSynthase, complexBlob } from '../etc.js';

/* ellipsoid along x with the top-front quarter (y>0, z>0) removed */
export function wedgeEllipsoid(rx, ry, rz, seg = 64) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg / 2), Math.PI, Math.PI * 1.5);
  g.rotateZ(Math.PI / 2); g.scale(rx, ry, rz); return g;
}
export function cutRims(rx, ry, rz, r, mat) {
  const a = [], b = [];
  for (let i = 0; i <= 48; i++) { const t = i / 48 * Math.PI; a.push(V(rx * Math.cos(t), ry * Math.sin(t), 0)); b.push(V(rx * Math.cos(t), 0, rz * Math.sin(t))); }
  const g = new THREE.Group(); g.add(tube(a, r, mat, 96, 6), tube(b, r, mat, 96, 6)); return g;
}

export function build(ctx) {
  const over = new THREE.Group(), zoom = new THREE.Group(); zoom.visible = false;
  ctx.add(over, zoom);
  const r = rng(31);
  const parts = { overview: [], zoom: [] };
  const P = (m, id, name, desc, ...objs) => { ctx.part(id, name, desc, ...objs); parts[m].push(id); };
  const RG = (m, id, name, desc, ...objs) => { ctx.region(id, name, desc, ...objs); parts[m].push(id); };
  const L = (g, t, at, o = {}) => ctx.label(t, { obj: g, at }, o);

  /* ---------- overview ---------- */
  const OX = 4.4, OY = 1.75, IX = 4.12, IY = 1.47;
  const outer = new THREE.Group();
  const oG = wedgeEllipsoid(OX, OY, OY);
  outer.add(new THREE.Mesh(oG, ctx.mat('#c4794f')), new THREE.Mesh(oG, ctx.mat('#ebc3a0', { side: THREE.BackSide })));
  outer.add(cutRims(OX, OY, OY, 0.045, ctx.mat('#9a5a38')));
  over.add(outer);
  const inner = new THREE.Group();
  const iG = wedgeEllipsoid(IX, IY, IY);
  inner.add(new THREE.Mesh(iG, ctx.mat('#dc9f68', { side: THREE.DoubleSide })), cutRims(IX, IY, IY, 0.04, ctx.mat('#b97a48')));
  over.add(inner);
  // cristae: folds of the inner membrane reaching into the matrix
  const cris = new THREE.Group(), crMat = ctx.mat('#e2ad78');
  let k = 0;
  for (let x = -3.35; x <= 3.4; x += 0.52, k++) {
    const rr = IY * Math.sqrt(Math.max(0, 1 - (x / IX) ** 2));
    const th = k % 2 ? 2.55 : -1.45, len = rr * 0.66;
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), crMat);
    m.scale.set(0.07, len, rr * 0.55);
    m.position.set(x, Math.sin(th) * (rr - len * 0.92), Math.cos(th) * (rr - len * 0.92));
    m.rotation.x = -th + Math.PI / 2;
    cris.add(m);
  }
  over.add(cris);
  // matrix contents: ribosomes and a ring of DNA
  const gran = [];
  for (let i = 0; i < 70; i++) { const p = V((r() - 0.5) * 7, (r() - 0.5) * 2, (r() - 0.5) * 2); if ((p.x / 3.9) ** 2 + (p.y / 1.25) ** 2 + (p.z / 1.25) ** 2 > 1) continue; gran.push(p); }
  const mtd = new THREE.Group();
  mtd.add(spheres(gran, 0.05, ctx.mat('#7a4a32'), 0));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 6, 30), ctx.mat('#6a4fa0')); ring.position.set(-1.2, -0.35, 0.3); ring.rotation.set(1.1, 0.3, 0); mtd.add(ring);
  over.add(mtd);
  // porins on the outer membrane
  const pd = []; let tries = 0;
  while (pd.length < 34 && tries++ < 600) { const d = V(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1); if (d.length() > 1) continue; d.normalize(); if (d.y > -0.05 && d.z > -0.05) continue; pd.push(d); }
  const porIM = new THREE.InstancedMesh(new THREE.TorusGeometry(0.11, 0.045, 5, 12), ctx.mat('#7c4a2e'), pd.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  pd.forEach((d, i) => { const p = V(d.x * OX, d.y * OY, d.z * OY); const n = V(d.x / OX, d.y / OY, d.z / OY).normalize(); q.setFromUnitVectors(V(0, 0, 1), n); m4.compose(p.addScaledVector(n, 0.02), q, V(1, 1, 1)); porIM.setMatrixAt(i, m4); });
  porIM.computeBoundingSphere(); over.add(porIM);
  // regions
  const mxG = wedgeEllipsoid(IX - 0.06, IY - 0.06, IY - 0.06, 32), imsG = wedgeEllipsoid(OX - 0.05, OY - 0.05, OY - 0.05, 32);
  const mx = new THREE.Mesh(mxG, ctx.mat('#7fb5d6', { opacity: 0, side: THREE.DoubleSide })); mx.material.visible = false;
  const ims = new THREE.Mesh(imsG, ctx.mat('#7fb5d6', { opacity: 0, side: THREE.DoubleSide })); ims.material.visible = false;
  over.add(mx, ims);
  P('overview', 'outer', 'Outer membrane', 'The smooth outer boundary of the mitochondrion. Integral proteins in it form large, nonselective channels called porins. Module 3 p. 41; Module 7 p. 106.', outer);
  P('overview', 'porin', 'Porins', 'Large, nonselective channels formed by integral proteins of the outer membrane. Module 3 p. 41.', porIM);
  P('overview', 'inner', 'Inner membrane', 'A highly convoluted membrane that holds the electron transport chain and ATP synthase. Protons cannot diffuse across it, so a proton gradient can build up. Switch to the inner membrane view to see it working. Module 3 p. 41; Module 7 p. 109.', inner);
  P('overview', 'cristae', 'Cristae', 'The folds of the inner membrane that reach into the matrix. Folding packs far more membrane, and so more electron transport chains and ATP synthases, into one mitochondrion. Module 3 p. 41; Module 7 p. 106.', cris);
  P('overview', 'mtdna', 'Mitochondrial DNA and ribosomes', 'Mitochondria are semi-autonomous: they grow and divide on their own and have their own circular genome and ribosomes, a clue that they began as endosymbiotic bacteria (proteobacteria). Module 3 pp. 41–42.', mtd);
  RG('overview', 'matrix', 'Matrix', 'The space inside the inner membrane. It holds the enzymes of pyruvate oxidation and the citric acid cycle, plus ribosomes and DNA. It has a low H+ concentration. Module 3 p. 41; Module 7 pp. 106, 109.', mx);
  RG('overview', 'ims', 'Intermembrane space', 'The aqueous compartment between the outer and inner membranes. The electron transport chain pumps H+ into it, so its H+ concentration is high (lower pH). Module 3 p. 41; Module 7 pp. 106, 109.', ims);
  L(over, 'Outer membrane', V(-2.4, OY * 0.86, -0.75), { part: 'outer', priority: 3, occlude: false });
  L(over, 'Inner membrane', V(1.6, IY * 0.93, 0.02), { part: 'inner', priority: 3, occlude: false });
  L(over, 'Cristae', cris.children[7].position.clone(), { part: 'cristae', priority: 2.5, occlude: false });
  L(over, 'Intermembrane space', V(-3.3, 0.02, (OY + IY) / 2 * Math.sin(Math.acos(-3.3 / 4.3))), { part: 'ims', priority: 2.6, occlude: false });
  L(over, 'Matrix', V(0.5, 0.1, 0.4), { part: 'matrix', priority: 2.4, occlude: false });
  L(over, 'Porin', (() => { const d = pd.find(d => d.z > 0.4 && d.y < -0.2) || pd[0]; return V(d.x * OX, d.y * OY, d.z * OY); })(), { part: 'porin', priority: 1.5 });
  L(over, 'DNA', ring.position.clone().add(V(0.3, 0, 0)), { part: 'mtdna', priority: 1.2, occlude: false });

  /* ---------- inner membrane zoom ---------- */
  const W = 19, D = 5, Z = 0.6;
  const X = { I: -6.6, II: -3.6, Q: -2.3, III: -0.5, C: 1.5, IV: 3.1, O: 4.3, S: 7.0 };
  const holes = [{ x: X.I, z: Z, r: 1.35 }, { x: X.I + 1.1, z: Z, r: 1.0 }, { x: X.II, z: Z, r: 0.75 }, { x: X.III - 0.6, z: Z, r: 1.0 }, { x: X.III + 0.6, z: Z, r: 1.0 }, { x: X.IV, z: Z, r: 1.1 }, { x: X.S, z: Z, r: 0.95 }, { x: X.S + 1.05, z: Z, r: 0.5 }];
  const BL = bilayer({ w: W, d: D, spacing: 0.5, half: 1.0, holes, headMat: ctx.mat('#d9a07a'), tailMat: ctx.mat('#ecdcb4'), seed: 3 });
  zoom.add(BL.heads, BL.tails);
  P('zoom', 'imem', 'Inner mitochondrial membrane', 'A phospholipid bilayer that protons cannot cross on their own. That is why pumping H+ across it builds a gradient that stores potential energy. Module 7 p. 109.', BL.heads, BL.tails);
  const c1 = new THREE.Group();
  c1.add(complexBlob(ctx, '#6f9a5a', { x: X.I + 0.5, r: 1, sx: 1.7, sy: 1.15, sz: 0.85, seed: 1 }), complexBlob(ctx, '#6f9a5a', { x: X.I - 0.2, y: 2.1, r: 0.85, sx: 0.95, sy: 1.6, sz: 0.85, seed: 2 }));
  const c2 = complexBlob(ctx, '#cf8a4a', { x: X.II, y: 0.75, r: 0.7, sx: 1, sy: 1.35, sz: 0.9, seed: 3 });
  const coq = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 6), ctx.mat('#7a5aa0')); coq.rotation.x = Math.PI / 2; coq.position.set(X.Q, 0, Z + 0.95);
  const c3 = new THREE.Group();
  c3.add(complexBlob(ctx, '#8a6fb0', { x: X.III - 0.6, y: 0.4, r: 0.95, sx: 1, sy: 1.75, sz: 0.9, seed: 4 }), complexBlob(ctx, '#8a6fb0', { x: X.III + 0.6, y: 0.3, r: 0.95, sx: 1, sy: 1.7, sz: 0.9, seed: 5 }));
  const cytc = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 2), ctx.mat('#c45f6c')); cytc.position.set(X.C, -1.55, Z + 0.4);
  const c4 = complexBlob(ctx, '#5b85b8', { x: X.IV, y: -0.1, r: 1.05, sx: 1.15, sy: 1.6, sz: 0.95, seed: 6 });
  const o2 = new THREE.Group(); [[-0.17, 0], [0.17, 0]].forEach(([dx]) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 2), ctx.mat('#d24b45')); s.position.x = dx; o2.add(s); }); o2.position.set(X.O, 2.5, Z + 0.4);
  const syn = atpSynthase(ctx, { x: X.S, z: Z });
  zoom.add(c1, c2, coq, c3, cytc, c4, o2, syn.g);
  const water = new THREE.Group(); [[0, 0, 0.2], [0.2, 0.12, 0.1], [-0.2, 0.12, 0.1]].forEach(([x, y, rr], i) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(i ? 0.11 : 0.18, 1), ctx.mat(i ? '#e8eef0' : '#d24b45')); s.position.set(x, y, 0); water.add(s); }); water.position.set(X.O + 0.5, 2.5, Z + 0.4); water.visible = false; zoom.add(water);
  P('zoom', 'cI', 'Complex I', 'Accepts electrons from NADH (NADH → NAD+ + H+) and passes them to ubiquinone (CoQ). The energy released is used to pump H+ from the matrix into the intermembrane space. Module 7 p. 109.', c1);
  P('zoom', 'cII', 'Complex II', 'Accepts electrons from FADH2 (FADH2 → FAD + 2H+) and passes them to CoQ. Unlike complexes I, III and IV, it does not pump protons. Module 7 p. 109.', c2);
  P('zoom', 'coq', 'Ubiquinone (CoQ)', 'Coenzyme Q, a small carrier that moves within the membrane, taking electrons from complexes I and II to complex III. Module 7 p. 109.', coq);
  P('zoom', 'cIII', 'Complex III', 'Takes electrons from CoQ and passes them to cytochrome c, using the energy to pump H+ into the intermembrane space. Module 7 p. 109.', c3);
  P('zoom', 'cytc', 'Cytochrome c', 'A small protein on the intermembrane-space face of the membrane that carries electrons from complex III to complex IV. Module 7 p. 109.', cytc);
  P('zoom', 'cIV', 'Complex IV', 'Passes electrons to oxygen and pumps H+. Oxygen, the final electron acceptor, combines with H+ to form water: ½O2 + 2e− + 2H+ → H2O. Module 7 p. 109.', c4);
  P('zoom', 'o2', 'Oxygen (O2)', 'The final electron acceptor. Without oxygen, electrons back up in the chain, pumping stops and the proton gradient runs down; cells then fall back on fermentation, which makes much less ATP. Module 7 pp. 109, 111.', o2, water);
  P('zoom', 'atps', 'ATP synthase', 'A molecular machine with two parts. H+ flowing down its gradient through the Fo channel in the membrane turns the rotor (watch the ring spin); F1 in the matrix uses that rotation to make ATP from ADP + Pi. This is oxidative phosphorylation. Module 7 p. 110.', syn.g);

  const OXY = { on: true };
  const eng = createETC(ctx, zoom, {
    W, D, topY: [1.8, 4.6], botY: [-4.4, -1.8], nH: 70, initBot: 34, initTop: 16, hColor: '#4aa3c8',
    synthX: X.S, synthZ: Z, rotor: syn.rotor, threshold: 2, synthK: 0.045, burstTime: 6.5, pattern: [0, 0, 1],
    canStart: () => OXY.on,
    routes: [
      [{ p: V(X.I - 0.2, 3.6, Z + 0.9), action: a => a.spawn(V(X.I - 0.2, 3.6, Z + 0.9), 'top') }, { p: V(X.I + 0.3, 0.2, Z + 0.95), dur: 0.9, action: a => a.pump(X.I, 2) }, { p: V(X.Q, 0, Z + 0.95), dur: 0.6 },
        { p: V(X.III - 0.7, 0, Z + 0.95), dur: 0.8, carrier: coq, action: a => a.pump(X.III, 2) }, { p: V(X.C, -1.55, Z + 0.95), dur: 0.6 },
        { p: V(X.IV - 0.6, -1.55, Z + 0.95), dur: 0.7, carrier: cytc }, { p: V(X.IV, 0.3, Z + 1.0), dur: 0.5, action: a => a.pump(X.IV, 1) },
        { p: V(X.O, 2.5, Z + 0.6), dur: 0.6, gate: () => OXY.on, action: a => { a.puff(water, 1.5, 1.0); a.consume(V(X.O, 2.5, Z), 'top'); } }],
      [{ p: V(X.II, 2.4, Z + 0.9), action: a => { a.spawn(V(X.II, 2.4, Z + 0.9), 'top'); a.spawn(V(X.II + 0.3, 2.4, Z + 0.9), 'top'); } }, { p: V(X.II, 0.4, Z + 0.95), dur: 0.8 }, { p: V(X.Q, 0, Z + 0.95), dur: 0.5 },
        { p: V(X.III - 0.7, 0, Z + 0.95), dur: 0.8, carrier: coq, action: a => a.pump(X.III, 2) }, { p: V(X.C, -1.55, Z + 0.95), dur: 0.6 },
        { p: V(X.IV - 0.6, -1.55, Z + 0.95), dur: 0.7, carrier: cytc }, { p: V(X.IV, 0.3, Z + 1.0), dur: 0.5, action: a => a.pump(X.IV, 1) },
        { p: V(X.O, 2.5, Z + 0.6), dur: 0.6, gate: () => OXY.on, action: a => { a.puff(water, 1.5, 1.0); a.consume(V(X.O, 2.5, Z), 'top'); } }],
    ],
  });
  P('zoom', 'hplus', 'Protons (H+)', 'Complexes I, III and IV pump H+ from the matrix into the intermembrane space, so H+ is high there and low in the matrix. The protons cannot diffuse back across the membrane, so the gradient holds potential energy that ATP synthase uses. Module 7 p. 109.', eng.hIM);
  P('zoom', 'elec', 'Electron', 'An electron moving through a series of redox reactions, from carrier to carrier, toward oxygen. Module 7 p. 109.', eng.eMesh);
  o2.userData.home = o2.position.clone();

  L(zoom, 'Mitochondrial matrix', V(-9, 4.4, -2), { noLine: true, priority: 0.6 });
  L(zoom, 'Intermembrane space', V(-9, -4.5, -2), { noLine: true, priority: 0.6 });
  L(zoom, 'Complex I', V(X.I - 0.5, 3.0, Z + 0.6), { part: 'cI', priority: 3 });
  L(zoom, 'Complex II', V(X.II, 1.6, Z + 0.5), { part: 'cII', priority: 3 });
  ctx.label('CoQ', coq, { part: 'coq', priority: 2.6, occlude: false });
  L(zoom, 'Complex III', V(X.III, 1.9, Z + 0.4), { part: 'cIII', priority: 3 });
  ctx.label('Cytochrome c', cytc, { part: 'cytc', priority: 2.6, occlude: false });
  L(zoom, 'Complex IV', V(X.IV + 0.3, 1.2, Z + 0.7), { part: 'cIV', priority: 3 });
  ctx.label('O₂', o2, { part: 'o2', priority: 2.4, occlude: false, show: () => OXY.on });
  L(zoom, 'ATP synthase (F1)', V(X.S - 0.5, 3.4, Z + 0.3), { part: 'atps', priority: 3 });
  L(zoom, 'Fo rotor', V(X.S - 0.6, -0.9, Z + 0.4), { part: 'atps', priority: 1.5 });
  L(zoom, 'NADH → NAD⁺ + H⁺', V(X.I - 0.2, 3.9, Z + 0.9), { noLine: true, priority: 1 });
  L(zoom, 'FADH₂ → FAD', V(X.II, 2.75, Z + 0.9), { noLine: true, priority: 0.9 });
  L(zoom, '½O₂ + 2H⁺ → H₂O', V(X.O + 0.3, 3.2, Z + 0.6), { noLine: true, priority: 0.9, show: () => OXY.on });
  L(zoom, 'ADP + Pi → ATP', V(X.S + 1.2, 4.3, Z + 0.4), { noLine: true, priority: 0.9 });

  let mode = 'overview';
  const VIEWS = { overview: { pos: [5.5, 6.4, 8.8], target: [0, -0.2, 0], min: 2.5, max: 30 }, zoom: { pos: [1.2, 3.6, 24.5], target: [0.2, 0, 0], min: 4, max: 60, k: 1 } };
  const tog = { id: 'o2', label: 'Oxygen', on: true, show: () => mode === 'zoom' };
  const api = {
    view: VIEWS.overview,
    modes: { label: 'View', value: 'overview', items: [{ id: 'overview', label: 'Whole mitochondrion' }, { id: 'zoom', label: 'Zoom to inner membrane' }] },
    toggles: [tog],
    play: true, autoplay: true, playIn: () => mode === 'zoom',
    setMode(m) { mode = m; over.visible = m === 'overview'; zoom.visible = m === 'zoom'; ctx.dirty(); return VIEWS[m]; },
    setToggle(id, on) { OXY.on = on; o2.visible = on; },
    currentView: () => VIEWS[mode],
    partVisible: (id) => parts[mode].includes(id),
    stepOnce() { if (mode === 'zoom') eng.stepOnce(); },
    stepInfo() {
      if (mode !== 'zoom') return null;
      return OXY.on
        ? { num: 'Inner membrane view', title: 'Oxygen present', text: 'Electrons from NADH and FADH2 pass from carrier to carrier to oxygen. Complexes I, III and IV use the energy to pump H+ into the intermembrane space, and H+ flowing back through ATP synthase turns its rotor to make ATP. Turn oxygen off to see what happens without a final electron acceptor. Module 7 pp. 109–110.' }
        : { num: 'Inner membrane view', title: 'No oxygen', text: 'With no final electron acceptor, electrons back up at complex IV and the chain stops, so no more H+ is pumped. ATP synthase keeps running only until the gradient runs down, then stops. Without oxygen the cell relies on fermentation, which makes far less ATP. Module 7 pp. 109–111.' };
    },
    hud() {
      if (mode !== 'zoom') return '';
      return `H⁺ in intermembrane space: <b>${eng.count('bot')}</b> · in matrix: <b>${eng.count('top')}</b><br>ATP made: <b>${eng.stats.atp}</b>${OXY.on ? '' : ' · <b>no O₂</b>, chain stopped'}`;
    },
    update(dt, playing) {
      if (mode !== 'zoom') return false;
      return eng.update(dt, playing);
    },
  };
  return api;
}
