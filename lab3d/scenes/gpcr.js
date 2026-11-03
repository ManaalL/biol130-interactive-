/* Module 9: GPCR signalling, the epinephrine example, as a step-through animation. Extracellular side is +y. */
import * as THREE from '../vendor/three.module.min.js';
import { V, bilayer, blobGeo, DynTube, sphereMatrix, rng } from '../geo.js';

const STEPS = [
  { t: 'Resting state', d: 'No ligand is bound, so the receptor is inactive. The α subunit of the G protein holds GDP, which keeps α, β and γ joined and the G protein inactive. Notes p. 132.' },
  { t: 'Epinephrine binds', d: 'Epinephrine (adrenaline) from the adrenal gland binds the GPCR on the outside of a heart muscle cell. Notes pp. 132–133.' },
  { t: 'Receptor changes shape', d: 'Ligand binding changes the receptor\'s conformation: its helices shift and open the cytosolic side. The activated receptor binds the G protein. Notes p. 132.' },
  { t: 'GDP swapped for GTP', d: 'The activated receptor makes the α subunit release GDP and bind GTP. Bound to GTP, the G protein is "on" and the signal keeps going. Notes p. 132.' },
  { t: 'α-GTP activates adenylyl cyclase', d: 'The GTP-bound α subunit separates from β and γ, then binds and activates adenylyl cyclase, an enzyme in the membrane. Notes pp. 132–133.' },
  { t: 'ATP becomes cAMP', d: 'Activated adenylyl cyclase converts ATP into cyclic AMP (cAMP), a small second messenger. Each enzyme makes many cAMP molecules, so the signal is amplified. Notes pp. 133–134.' },
  { t: 'cAMP activates PKA', d: 'cAMP binds and activates protein kinase A. Active PKA phosphorylates proteins in the heart muscle, increasing the rate of contraction. Each PKA activates many target proteins. Notes pp. 133–134.' },
  { t: 'Termination', d: 'Epinephrine leaves the receptor, which returns to its inactive shape. The α subunit hydrolyses GTP to GDP and rejoins β and γ, which switches off adenylyl cyclase. Cytosolic enzymes degrade cAMP to AMP, and phosphatases remove phosphates from target proteins. Notes p. 135.' },
];

export function build(ctx) {
  const g = new THREE.Group(); ctx.add(g);
  const R = rng(51);
  const RC = V(-4.6, 0, 0.4), AC = V(2.9, 0, 0.4), PKA = V(5.3, -4.1, 0.9);
  const BL = bilayer({ w: 15, d: 4.4, spacing: 0.48, half: 1.0, holes: [{ x: RC.x, z: RC.z, r: 1.55 }, { x: AC.x - 0.55, z: AC.z, r: 0.75 }, { x: AC.x + 0.55, z: AC.z, r: 0.75 }], headMat: ctx.mat('#cfa27c'), tailMat: ctx.mat('#e8dab0'), seed: 4 });
  g.add(BL.heads, BL.tails);
  ctx.part('pm', 'Plasma membrane', 'The phospholipid bilayer of a heart muscle cell. The ligand stays outside; the signal is passed across by the receptor. Notes p. 132.', BL.heads, BL.tails);

  // GPCR: seven transmembrane helices on pivots so the cytosolic ends can swing out
  const rec = new THREE.Group(); rec.position.copy(RC); g.add(rec);
  const recMat = ctx.mat('#8a5a9e');
  const piv = [], HL = 2.7;
  for (let k = 0; k < 7; k++) {
    const th = k / 7 * Math.PI * 2 + 0.3, p = new THREE.Group();
    p.position.set(Math.cos(th) * 0.95, HL / 2, Math.sin(th) * 0.95); p.userData.th = th;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, HL, 12), recMat); m.position.y = -HL / 2; p.add(m);
    rec.add(p); piv.push(p);
  }
  const loops = Array.from({ length: 8 }, () => { const t = new DynTube(18, 6, 0.1, recMat); rec.add(t.mesh); return t; });
  const top = (p) => p.position.clone(), bot = (p) => p.localToWorld(V(0, -HL, 0)).sub(rec.position);
  function setLoops() {
    rec.updateMatrixWorld(true);
    const ends = piv.map(p => ({ t: top(p), b: bot(p) }));
    for (let k = 0; k < 6; k++) {
      const atTop = k % 2 === 1, a = atTop ? ends[k].t : ends[k].b, b = atTop ? ends[k + 1].t : ends[k + 1].b;
      const mid = a.clone().add(b).multiplyScalar(0.5); const out = V(mid.x, 0, mid.z).normalize().multiplyScalar(0.35);
      const lift = atTop ? 0.55 : -0.55;
      const c = new THREE.CatmullRomCurve3([a, a.clone().add(V(0, lift, 0)).add(out), b.clone().add(V(0, lift, 0)).add(out), b]);
      loops[k].set((u, v) => v.copy(c.getPoint(u)));
    }
    const n0 = ends[0].t, cN = new THREE.CatmullRomCurve3([n0, n0.clone().add(V(0.2, 0.6, 0.6)), n0.clone().add(V(0.9, 1.0, 1.2))]);
    loops[6].set((u, v) => v.copy(cN.getPoint(u)));
    const c0 = ends[6].b, cC = new THREE.CatmullRomCurve3([c0, c0.clone().add(V(-0.3, -0.7, 0.4)), c0.clone().add(V(-1.1, -1.2, 0.8)), c0.clone().add(V(-1.6, -1.1, 1.4))]);
    loops[7].set((u, v) => v.copy(cC.getPoint(u)));
  }
  let recAct = 0;
  function poseReceptor(a) {
    piv.forEach((p, k) => { const th = p.userData.th; const tilt = (k === 4 || k === 5 ? 0.33 : 0.07) * a; p.quaternion.setFromAxisAngle(V(-Math.sin(th), 0, Math.cos(th)), tilt); });
    setLoops();
  }
  poseReceptor(0);
  ctx.part('gpcr', 'G protein-coupled receptor', 'A single polypeptide that crosses the membrane seven times, as seven transmembrane α helices, with the amino end outside and the carboxyl end in the cytosol. It is inactive until a ligand binds; binding changes its shape so it can activate a G protein. Notes pp. 131–132.', rec);

  // ligand
  const lig = new THREE.Group(); [[0, 0, 0, 0.22], [0.28, 0.12, 0, 0.16], [-0.24, 0.16, 0.1, 0.14], [0.05, 0.3, -0.12, 0.13]].forEach(([x, y, z, r]) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), ctx.mat('#d0607a')); s.position.set(x, y, z); lig.add(s); });
  g.add(lig);
  ctx.part('lig', 'Epinephrine (ligand)', 'Epinephrine, also called adrenaline, is released from the adrenal gland and is the signal in the notes example. It binds the GPCR from outside the cell. How long it stays bound depends on how tightly the receptor holds it (binding affinity). Notes pp. 133, 135.', lig);

  // G protein
  const ga = new THREE.Group(); const gaBody = new THREE.Mesh(blobGeo(0.72, { sx: 1.2, sy: 0.9, seed: 21, amp: 0.12 }), ctx.mat('#a99ad0')); ga.add(gaBody);
  const gdp = new THREE.Group(), gtp = new THREE.Group(), nucMat = ctx.mat('#e09a3a'), baseMat = ctx.mat('#c9763a');
  [gdp, gtp].forEach((n, k) => { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), baseMat); n.add(b); for (let i = 0; i < 2 + k; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), nucMat); s.position.set(0.2 + i * 0.19, -0.04 * i, 0); n.add(s); } n.position.set(-0.15, -0.35, 0.62); ga.add(n); });
  gtp.visible = false;
  const gb = new THREE.Mesh(blobGeo(0.62, { sx: 1.05, sy: 0.95, seed: 22, amp: 0.15 }), ctx.mat('#4f9a6a'));
  const gg = new THREE.Mesh(blobGeo(0.36, { sx: 1.3, sy: 0.7, seed: 23, amp: 0.15 }), ctx.mat('#86c08e'));
  const gbg = new THREE.Group(); gb.position.set(0, -0.15, 0); gg.position.set(0.45, 0.42, 0.2); gbg.add(gb, gg);
  const freeNuc = new THREE.Group(); const fn = gdp.clone(); freeNuc.add(fn); freeNuc.visible = false; g.add(freeNuc);
  const pi = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), nucMat); pi.visible = false; g.add(pi);
  g.add(ga, gbg);
  ctx.part('ga', 'G protein α subunit', 'The part of the G protein that binds GDP or GTP. Bound to GDP, the three subunits stay joined and the G protein is inactive. Bound to GTP, α separates from β and γ and binds a target protein, here adenylyl cyclase. Notes p. 132.', gaBody);
  ctx.part('gbg', 'G protein β and γ subunits', 'The β and γ subunits stay together. They hold the α subunit while it carries GDP and release it once it binds GTP. Notes p. 132.', gbg);
  ctx.part('nuc', 'GDP / GTP', 'The nucleotide on the α subunit is the G protein\'s switch: GTP bound means on, GDP bound means off. The G protein turns itself off by hydrolysing GTP to GDP (releasing a phosphate). Notes pp. 132, 135.', gdp, gtp, freeNuc, pi);

  // adenylyl cyclase
  const ac = new THREE.Group(); ac.position.copy(AC);
  const acMat = ctx.mat('#3f8fa8');
  ac.add(...[-0.55, 0.55].map(x => { const m = new THREE.Mesh(blobGeo(0.5, { sy: 2.6, seed: 31 + x * 10, amp: 0.1 }), acMat); m.position.set(x, 0.05, 0); return m; }));
  const acCat = new THREE.Mesh(blobGeo(0.8, { sx: 1.3, sy: 0.8, seed: 33, amp: 0.12 }), acMat); acCat.position.set(0, -1.95, 0.1); ac.add(acCat);
  g.add(ac);
  ctx.part('ac', 'Adenylyl cyclase', 'An enzyme in the plasma membrane. When the GTP-bound α subunit binds it, it converts ATP into cyclic AMP (cAMP). Notes p. 133.', ac);
  const haloMat = ctx.mat('#e2b23a', { emissive: '#e2b23a', ei: 0.6 });
  const acHalo = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.05, 6, 40), haloMat); acHalo.position.set(AC.x, -1.95, AC.z + 0.1); acHalo.visible = false; g.add(acHalo);

  // PKA
  const pka = new THREE.Group(); pka.position.copy(PKA);
  const pkaBody = new THREE.Mesh(blobGeo(0.7, { sx: 1.25, sy: 0.95, seed: 41, amp: 0.1 }), ctx.mat('#5fb0b0')); pka.add(pkaBody);
  const pkaHalo = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.05, 6, 40), haloMat); pkaHalo.visible = false; pka.add(pkaHalo);
  g.add(pka);
  ctx.part('pka', 'Protein kinase A (PKA)', 'An enzyme activated when cAMP binds it. Kinases phosphorylate target proteins; in heart muscle, active PKA increases the rate of contraction. Each PKA phosphorylates many targets, another step of amplification. Notes pp. 133–134.', pkaBody);

  // ATP -> cAMP particles
  const NP = 22, cMat = ctx.mat('#ffffff');
  const pIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), cMat, NP); pIM.frustumCulled = false; g.add(pIM);
  const cA = new THREE.Color('#e09a3a'), cC = new THREE.Color('#8a5ab0');
  const P = Array.from({ length: NP }, (_, i) => ({ p: V(), tgt: V(), s: 0, sT: 0, born: 0, phase: 0, site: i < 4 ? i : -1 }));
  P.forEach((q, i) => pIM.setColorAt(i, cA));
  ctx.part('camp', 'cAMP (second messenger)', 'Cyclic AMP, a small signalling molecule made from ATP by adenylyl cyclase (ATP starts orange here and turns purple as cAMP). It spreads through the cytosol and binds protein kinase A. Enzymes in the cytosol later break it down to AMP. Notes pp. 133–135.', pIM);
  const siteOf = (k) => PKA.clone().add(V(Math.cos(k / 4 * 6.283) * 0.95, Math.sin(k / 4 * 6.283) * 0.75, 0.35));
  const randCyto = () => V(1.2 + R() * 5.5, -2.9 - R() * 2.1, -1.2 + R() * 2.8);

  // labels
  ctx.label('Extracellular fluid', V(-7.6, 3.4, -2), { noLine: true, priority: 0.5 });
  ctx.label('Cytosol', V(-7.6, -3.6, -2), { noLine: true, priority: 0.5 });
  ctx.label('GPCR (7 transmembrane helices)', { obj: rec, at: V(-1.1, 1.0, 0.6) }, { part: 'gpcr', priority: 3, occlude: false });
  ctx.label('Epinephrine', lig, { part: 'lig', priority: 3, occlude: false });
  ctx.label('α', { obj: ga, at: V(-0.55, 0.2, 0.55) }, { part: 'ga', priority: 2.8, occlude: false });
  ctx.label('β', { obj: gbg, at: V(-0.2, -0.4, 0.5) }, { part: 'gbg', priority: 2.6, occlude: false });
  ctx.label('γ', gg, { part: 'gbg', priority: 2.6, occlude: false });
  ctx.label('GDP', gdp, { part: 'nuc', priority: 2.4, occlude: false, show: () => gdp.visible });
  ctx.label('GTP', gtp, { part: 'nuc', priority: 2.4, occlude: false, show: () => gtp.visible });
  ctx.label('Adenylyl cyclase', { obj: ac, at: V(0.6, -2.4, 0.5) }, { part: 'ac', priority: 3, occlude: false });
  ctx.label('Protein kinase A', { obj: pka, at: V(0.6, -0.5, 0.4) }, { part: 'pka', priority: 2.8, occlude: false });
  const campAnchor = new THREE.Object3D(); g.add(campAnchor);
  ctx.label('cAMP', campAnchor, { part: 'camp', priority: 2.2, occlude: false, show: () => step >= 5 && step <= 6 });
  ctx.label('ATP → cAMP', V(AC.x + 1.4, -2.7, AC.z + 0.6), { noLine: true, priority: 1, show: () => step === 5 });

  // keyframes
  const LIG = [V(-2.7, 4.6, 1.6), V(RC.x, 1.25, RC.z), null, null, null, null, null, V(-2.6, 4.9, 2.0)];
  const GA0 = V(-1.6, -1.85, 0.5), BG0 = V(-0.75, -1.8, 0.2);
  const GA = [GA0, GA0, V(-3.6, -1.95, 0.5), V(-3.6, -1.95, 0.5), V(AC.x - 1.55, -2.15, AC.z + 0.3), null, null, GA0];
  const BG = [BG0, BG0, V(-2.7, -1.85, 0.2), null, null, null, null, BG0];
  const fill = (arr) => { for (let i = 1; i < arr.length; i++) if (!arr[i]) arr[i] = arr[i - 1]; return arr; };
  fill(LIG); fill(GA); fill(BG);
  let step = 0, tStep = 0, dwell = 0;
  const DWELL = 4.2;
  lig.position.copy(LIG[0]); ga.position.copy(GA[0]); gbg.position.copy(BG[0]);

  function applyDiscrete(i, instant) {
    gdp.visible = i < 3 || i === 7; gtp.visible = i >= 3 && i <= 6;
    acHalo.visible = i >= 4 && i <= 6; pkaHalo.visible = i === 6;
    freeNuc.visible = i === 3; freeNuc.position.copy(GA[2]).add(V(-0.1, -0.4, 0.6)); freeNuc.userData.t = 0;
    pi.visible = i === 7; pi.position.copy(GA[6]).add(V(0.2, -0.5, 0.6)); pi.userData.t = 0;
    tStep = 0;
    if (i < 5) P.forEach(q => { q.s = 0; q.sT = 0; q.born = 0; q.phase = 0; });
    if (i === 5) P.forEach((q, k) => { q.born = -k * 0.14; q.phase = 0; q.s = 0; q.sT = 0; });
    if (i === 6) P.forEach(q => { if (q.born <= 0 || q.phase === 0) { q.p.copy(randCyto()); q.phase = 2; } q.sT = 0.14; q.s = q.s || 0.14; if (q.site >= 0) q.tgt.copy(siteOf(q.site)); else q.tgt.copy(randCyto()); });
    if (i === 7) P.forEach(q => { q.sT = 0; });
    if (instant || ctx.reduceMotion) { lig.position.copy(LIG[i]); ga.position.copy(GA[i]); gbg.position.copy(BG[i]); recAct = (i >= 2 && i <= 6) ? 1 : 0; poseReceptor(recAct); P.forEach(q => { q.s = q.sT; if (i === 6) q.p.copy(q.tgt); }); }
    ctx.dirty();
  }
  applyDiscrete(0, true);

  const api = {
    view: { pos: [0.8, 3.8, 18.5], target: [0.4, -0.9, 0], min: 4, max: 60, k: 1 },
    steps: STEPS, play: true, autoplay: false,
    stepInfo: () => ({ num: `Step ${step + 1} of ${STEPS.length}`, title: STEPS[step].t, text: STEPS[step].d, short: `Step ${step + 1} / ${STEPS.length}`, atStart: step === 0 }),
    next() { step = (step + 1) % STEPS.length; dwell = 0; applyDiscrete(step); },
    prev() { step = Math.max(0, step - 1); dwell = 0; applyDiscrete(step, true); },
    update(dt, playing) {
      let moving = false;
      if (playing) { dwell += dt; if (dwell > DWELL) { api.next(); api.stepChanged && api.stepChanged(); } moving = true; }
      tStep += dt;
      const k = 1 - Math.exp(-dt * 3.2);
      const mv = (o, tgt) => { if (o.position.distanceToSquared(tgt) > 1e-5) { o.position.lerp(tgt, k); moving = true; } };
      mv(lig, LIG[step]); mv(ga, GA[step]); mv(gbg, BG[step]);
      const actT = step >= 2 && step <= 6 ? 1 : 0;
      if (Math.abs(recAct - actT) > 1e-3) { recAct += (actT - recAct) * k; poseReceptor(recAct); moving = true; }
      if (freeNuc.visible) { freeNuc.userData.t += dt; freeNuc.position.add(V(-0.25, -0.35, 0.2).multiplyScalar(dt)); freeNuc.scale.setScalar(Math.max(0.01, 1 - freeNuc.userData.t / 2.5)); moving = true; }
      if (pi.visible) { pi.userData.t += dt; pi.position.add(V(0.2, -0.3, 0.2).multiplyScalar(dt)); pi.scale.setScalar(Math.max(0.01, 1 - pi.userData.t / 2.5)); moving = true; }
      // particles
      let anyP = false; const m4 = new THREE.Matrix4(); const src = V(AC.x, -2.7, AC.z + 0.4);
      P.forEach((q, i) => {
        if (step === 5) {
          q.born += dt;
          if (q.born > 0 && q.phase === 0) { q.phase = 1; q.p.copy(src).add(V((R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.3)); q.tgt.copy(randCyto()); q.sT = 0.14; }
        }
        if (q.phase > 0 || q.s > 0.001) {
          q.s += (q.sT - q.s) * Math.min(1, dt * 3);
          if (q.p.distanceToSquared(q.tgt) > 1e-4) q.p.lerp(q.tgt, Math.min(1, dt * (step === 6 && q.site >= 0 ? 2.2 : 0.9)));
          else if (step === 5 || (step === 6 && q.site < 0)) q.tgt.copy(randCyto());
          anyP = true;
        }
        const born = Math.max(0, Math.min(1, (q.born - 0.2) / 0.8));
        pIM.setColorAt(i, (step >= 6 || step === 7 || born >= 1) ? cC : cA.clone().lerp(cC, born));
        sphereMatrix(m4, q.p, Math.max(0.0001, q.s)); pIM.setMatrixAt(i, m4);
      });
      pIM.instanceMatrix.needsUpdate = true; if (pIM.instanceColor) pIM.instanceColor.needsUpdate = true;
      const vis = P.find(q => q.s > 0.05 && q.site < 0); if (vis) campAnchor.position.copy(vis.p);
      return moving || anyP;
    },
  };
  return api;
}
