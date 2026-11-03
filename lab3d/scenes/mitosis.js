/* Module 11: mitosis and cytokinesis in an animal cell. Spindle axis along x. */
import * as THREE from '../vendor/three.module.min.js';
import { V, tube, rng, rodMatrix } from '../geo.js';

const STAGES = [
  { t: 'Interphase', d: 'Between divisions the DNA is spread out as chromatin, so individual chromosomes are hard to see. During S phase each chromosome was copied into two identical sister chromatids, and the centrosome has duplicated. Notes pp. 162, 172.' },
  { t: 'Prophase', d: 'The chromosomes condense and become visible, each one two sister chromatids held together at the centromere. Outside the nucleus the mitotic spindle begins to form, and the two centrosomes migrate toward opposite poles. Notes p. 173.' },
  { t: 'Prometaphase', d: 'The nuclear envelope breaks down. Spindle microtubules grow and shrink to explore the old nuclear region, and when one meets a chromosome it attaches at a kinetochore. Each centromere has two kinetochores, one for each sister chromatid. Notes p. 174.' },
  { t: 'Metaphase', d: 'Spindle microtubules lengthen and shorten, pushing the chromosomes to the middle of the cell. They line up on the metaphase plate, a single plane roughly equidistant from both spindle poles. Notes p. 174.' },
  { t: 'Anaphase', d: 'The centromere divides and the kinetochore microtubules shorten, pulling the sister chromatids apart toward opposite poles. Each pole gets one chromatid from each pair, and each separated chromatid is now an individual chromosome. Notes p. 174.' },
  { t: 'Telophase', d: 'A complete set of chromosomes reaches each pole. The spindle microtubules break down, a nuclear envelope re-forms around each set, and the chromosomes decondense. Telophase ends mitosis. Notes p. 174.' },
  { t: 'Cytokinesis', d: 'A contractile ring of actin filaments on the inner face of the membrane, at the equator and perpendicular to the old spindle, contracts and pinches the cytoplasm into two daughter cells. Notes p. 175.' },
];

export function build(ctx) {
  const g = new THREE.Group(); ctx.add(g);
  const R = rng(81), R0 = 3.4;

  // cell membrane as a lathe so it can elongate and pinch
  const memMat = ctx.mat('#9cc7bd', { opacity: 0.1, side: THREE.FrontSide, depthWrite: false });
  const mem = new THREE.Mesh(new THREE.BufferGeometry(), memMat); g.add(mem);
  const memEdge = new THREE.Mesh(new THREE.BufferGeometry(), ctx.mat('#7fb0a4', { opacity: 0.16, side: THREE.BackSide, depthWrite: false })); g.add(memEdge);
  const prof = (L, pinch) => { const pts = []; for (let i = 0; i <= 56; i++) { const x = -L + 2 * L * i / 56, e = Math.sqrt(Math.max(0, 1 - (x / L) ** 2)); pts.push(new THREE.Vector2(Math.max(0.001, R0 * Math.pow(e, 0.8) * (1 - pinch * Math.exp(-((x / 0.85) ** 2)))), x)); } return pts; };
  function setCell(L, pinch) {
    const geo = new THREE.LatheGeometry(prof(L, pinch), 48); geo.rotateZ(-Math.PI / 2);
    mem.geometry.dispose(); mem.geometry = geo; memEdge.geometry = geo;
  }
  ctx.part('pmc', 'Plasma membrane', 'The cell\'s outer membrane, drawn see-through. During cytokinesis it is pinched in at the equator to make two daughter cells. Notes p. 175.', mem, memEdge);

  // nuclear envelopes
  const envMat = ctx.mat('#8f86c8', { opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  const env = new THREE.Mesh(new THREE.IcosahedronGeometry(2.05, 4), envMat); g.add(env);
  const envD = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 3), envMat.clone()); m.position.set(s * 3.15, 0, 0); g.add(m); return m; });
  ctx.part('env', 'Nuclear envelope', 'The double membrane around the nucleus. It breaks down in prometaphase so spindle microtubules can reach the chromosomes, and re-forms around each set of chromosomes in telophase. Notes pp. 174.', env, ...envD);

  // chromatin threads (interphase, and the two new nuclei)
  const chMat = ctx.mat('#6a7fc0'); chMat.transparent = true; chMat.depthWrite = false;
  const thread = (c, rad, n, mat) => { const grp = new THREE.Group(); for (let k = 0; k < n; k++) { const pts = []; let p = V((R() - 0.5) * rad, (R() - 0.5) * rad, (R() - 0.5) * rad); for (let i = 0; i < 10; i++) { p = p.clone().add(V((R() - 0.5) * 0.7, (R() - 0.5) * 0.7, (R() - 0.5) * 0.7)); if (p.length() > rad) p.multiplyScalar(rad / p.length()); pts.push(p.clone().add(c)); } grp.add(tube(pts, 0.035, mat, 60, 4)); } return grp; };
  const chrom0 = thread(V(), 1.7, 12, chMat);
  const chMat2 = chMat.clone(); const chromD = new THREE.Group(); chromD.add(thread(V(-3.15, 0, 0), 1.05, 7, chMat2), thread(V(3.15, 0, 0), 1.05, 7, chMat2));
  g.add(chrom0, chromD);
  ctx.part('chrom', 'Chromatin', 'DNA wound with histone proteins. It is loose and spread out in interphase and again after telophase, so individual chromosomes cannot be seen. Notes p. 172.', chrom0, chromD);

  // chromosomes: two homologous pairs (dark and light blue), each two sister chromatids
  const homolog = [{ len: 1.3, col: '#2f5f9e' }, { len: 1.3, col: '#79a6d6' }, { len: 0.85, col: '#2f5f9e' }, { len: 0.85, col: '#79a6d6' }];
  const sisMats = { '#2f5f9e': ctx.mat('#2f5f9e'), '#79a6d6': ctx.mat('#79a6d6') };
  const cenMat = ctx.mat('#c9b86a'), kinMat = ctx.mat('#c4544a');
  const chromatids = [], sisMeshes = [], cenMeshes = [], kinMeshes = [];
  homolog.forEach((h, ci) => [-1, 1].forEach(sgn => {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, h.len, 4, 10), sisMats[h.col]); grp.add(body);
    const cen = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), cenMat); cen.position.set(-sgn * 0.1, 0.08, 0); grp.add(cen);
    const kin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 10), kinMat); kin.rotation.z = Math.PI / 2; kin.position.set(sgn * 0.17, 0.08, 0); grp.add(kin);
    g.add(grp); chromatids.push({ grp, ci, sgn, kin }); sisMeshes.push(body); cenMeshes.push(cen); kinMeshes.push(kin);
  }));
  ctx.part('sis', 'Sister chromatids', 'After DNA replication each chromosome is two identical copies, the sister chromatids, held side by side. Dark and light blue show the two members of each homologous pair. Notes pp. 172, 174.', ...sisMeshes);
  ctx.part('cen', 'Centromere', 'The region where sister chromatids are held together. It divides in anaphase so the sisters can separate. Notes pp. 172, 174.', ...cenMeshes);
  ctx.part('kin', 'Kinetochores', 'Protein complexes at the centromere, one on each side, each belonging to one sister chromatid. A kinetochore is the attachment site for a spindle microtubule, which is key to separating the sisters. Notes p. 174.', ...kinMeshes);

  // centrosomes and spindle microtubules
  const csMat = ctx.mat('#3d6b5f');
  const cs = [0, 1].map(() => { const c = new THREE.Group(); const a = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.38, 9), csMat), b = a.clone(); b.rotation.x = Math.PI / 2; b.position.set(0.18, 0.12, 0); c.add(a, b); g.add(c); return c; });
  ctx.part('cs', 'Centrosomes', 'The microtubule-organizing centres of animal cells. They duplicate before mitosis, then migrate to opposite poles and organize the spindle. Plant cells build a spindle without centrosomes. Notes p. 173.', ...cs);
  const rodG = new THREE.CylinderGeometry(1, 1, 1, 5, 1);
  const kmt = new THREE.InstancedMesh(rodG, ctx.mat('#4e9a80'), 8), smt = new THREE.InstancedMesh(rodG, ctx.mat('#7fbca5'), 28);
  kmt.frustumCulled = smt.frustumCulled = false; g.add(kmt, smt);
  ctx.part('kmt', 'Kinetochore microtubules', 'Spindle microtubules attached to kinetochores. In anaphase they shorten and pull the sister chromatids toward the poles. Notes p. 174.', kmt);
  ctx.part('smt', 'Mitotic spindle', 'A structure of microtubules that pulls the chromosomes apart into the daughter cells. These are the spindle microtubules that overlap in the middle and the short ones that radiate from each pole. They break down in telophase. Notes pp. 173–174.', smt);
  const polarDirs = Array.from({ length: 6 }, (_, i) => V(0, Math.cos(i / 6 * 6.283) * 0.55, Math.sin(i / 6 * 6.283) * 0.55));
  const astDirs = Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return V(-0.55, Math.cos(a), Math.sin(a)).normalize(); });

  // metaphase plate and contractile ring
  const plate = new THREE.Mesh(new THREE.CircleGeometry(2.2, 40), ctx.mat('#e2b23a', { opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); plate.rotation.y = Math.PI / 2; g.add(plate);
  ctx.part('plate', 'Metaphase plate', 'Not a structure, but the plane in the middle of the cell, roughly equidistant from both spindle poles, where chromosomes line up in metaphase. Notes p. 174.', plate);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.09, 8, 48), ctx.mat('#c75a4a')); ring.rotation.y = Math.PI / 2; g.add(ring);
  ctx.seeThrough('pmc', 'env', 'plate');
  ctx.part('ring', 'Contractile ring', 'A ring of actin filaments on the inner face of the membrane at the cell\'s equator. It contracts to pinch the cell into two, forming the cleavage furrow. Notes p. 175.', ring);

  // stage definitions
  const yy = [1.35, 0.45, -0.45, -1.35], zz = [0.3, -0.35, 0.35, -0.3];
  const proC = [V(-0.7, 0.7, 0.35), V(0.65, -0.55, -0.2), V(0.55, 0.85, -0.5), V(-0.55, -0.75, 0.45)], proR = [[0.4, 0.2, 0.9], [-0.3, 0.6, -0.5], [0.2, -0.7, 1.4], [0.6, 0.3, -1.1]];
  const pose = (st) => chromatids.map(({ ci, sgn }) => {
    let c, r, sep = 0.17;
    if (st <= 1) { c = proC[ci]; r = proR[ci]; }
    else if (st === 2) { c = V(sgn * 0 + (ci % 2 ? 0.55 : -0.5), yy[ci] * 1.1, zz[ci] * 1.4); r = [0.2 * (ci % 2 ? 1 : -1), 0.3, 0.35 * (ci % 2 ? -1 : 1)]; }
    else if (st === 3) { c = V(0, yy[ci], zz[ci]); r = [0, 0, 0]; }
    else if (st === 4) { c = V(sgn * 2.15, yy[ci] * 0.65, zz[ci] * 0.6); r = [0, 0, sgn * 0.35]; sep = 0; }
    else { c = V(sgn * 3.15, yy[ci] * 0.42, zz[ci] * 0.45); r = [0.3 * sgn, 0.2, sgn * 0.6 + ci * 0.3]; sep = 0; }
    const e = new THREE.Euler(...r), off = V(sgn * sep, 0, 0).applyEuler(e);
    return { p: c.clone().add(off), r };
  });
  const CS = [[V(-0.35, 2.45, 0.35), V(0.2, 2.5, 0.35)], [V(-2.35, 1.55, 0), V(2.35, 1.55, 0)], [V(-3.0, 0.15, 0), V(3.0, 0.15, 0)], [V(-3.0, 0, 0), V(3.0, 0, 0)], [V(-3.0, 0, 0), V(3.0, 0, 0)], [V(-4.0, 0, 0), V(4.0, 0, 0)], [V(-4.1, 0, 0), V(4.1, 0, 0)]];
  const D = (st) => ({
    L: [3.5, 3.5, 3.65, 3.7, 3.95, 4.7, 4.9][st], pinch: [0, 0, 0, 0, 0.04, 0.38, 0.9][st],
    env: [0.32, 0.28, 0.04, 0, 0, 0, 0][st], envD: [0, 0, 0, 0, 0, 0.26, 0.32][st],
    chrom: [1, 0.25, 0, 0, 0, 0, 0][st], chromD: [0, 0, 0, 0, 0, 0.45, 1][st], cond: [0, 1, 1, 1, 1, 0.55, 0.12][st],
    ast: [0, 0.55, 1, 1, 1, 0.45, 0][st], pol: [0, 0.3, 1, 1, 1, 0.35, 0][st], km: [0, 0, 1, 1, 1, 0, 0][st],
    plate: [0, 0, 0, 1, 0, 0, 0][st], ring: [0, 0, 0, 0, 0, 1, 1][st],
    cs: CS[st], ch: pose(st),
  });
  let stage = 0, from = D(0), to = D(0), k = 1, dwell = 0, cur = D(0);
  const lerp = (a, b, t) => a + (b - a) * t;
  function apply(s) {
    setCell(s.L, s.pinch);
    envMat.opacity = s.env; env.visible = s.env > 0.01; env.scale.setScalar(1 + (0.32 - Math.min(0.32, s.env)) * 0.4);
    envD.forEach(m => { m.material.opacity = s.envD; m.visible = s.envD > 0.01; });
    chMat.opacity = s.chrom; chMat.transparent = true; chrom0.visible = s.chrom > 0.02;
    chMat2.opacity = s.chromD; chMat2.transparent = true; chromD.visible = s.chromD > 0.02;
    chromatids.forEach((c, i) => {
      const P = s.ch[i]; c.grp.position.copy(P.p); c.grp.rotation.set(...P.r);
      const cc = s.cond; c.grp.visible = cc > 0.03;
      c.grp.scale.set(0.35 + 0.65 * cc, 1.7 - 0.7 * cc, 0.35 + 0.65 * cc);
      c.kin.visible = cc > 0.6;
    });
    cs[0].position.copy(s.cs[0]); cs[1].position.copy(s.cs[1]);
    const m4 = new THREE.Matrix4(), hideM = new THREE.Matrix4().makeScale(0, 0, 0);
    chromatids.forEach((c, i) => {
      if (s.km < 0.02 || !c.grp.visible) { kmt.setMatrixAt(i, hideM); return; }
      const pole = c.sgn < 0 ? s.cs[0] : s.cs[1]; const end = c.kin.getWorldPosition(V());
      rodMatrix(m4, pole, pole.clone().lerp(end, s.km), 0.028); kmt.setMatrixAt(i, m4);
    });
    let j = 0;
    [0, 1].forEach(pi => {
      const pole = s.cs[pi], dir = pi === 0 ? 1 : -1;
      polarDirs.forEach(d => { const end = V(dir * 0.7, d.y, d.z); if (s.pol < 0.02) smt.setMatrixAt(j++, hideM); else { rodMatrix(m4, pole, pole.clone().lerp(end, s.pol), 0.022); smt.setMatrixAt(j++, m4); } });
      astDirs.forEach(d => { const dd = V(d.x * dir, d.y, d.z); if (s.ast < 0.02) smt.setMatrixAt(j++, hideM); else { rodMatrix(m4, pole, pole.clone().addScaledVector(dd, 1.25 * s.ast), 0.02); smt.setMatrixAt(j++, m4); } });
    });
    kmt.instanceMatrix.needsUpdate = true; smt.instanceMatrix.needsUpdate = true;
    plate.material.opacity = 0.2 * s.plate; plate.visible = s.plate > 0.02;
    ring.visible = s.ring > 0.02; const rr = Math.max(0.15, R0 * (1 - s.pinch) - 0.1); ring.scale.set(rr, rr, 1 + 0 * s.ring);
  }
  function mix(a, b, t) {
    const o = {};
    for (const key of ['L', 'pinch', 'env', 'envD', 'chrom', 'chromD', 'cond', 'ast', 'pol', 'km', 'plate', 'ring']) o[key] = lerp(a[key], b[key], t);
    o.cs = [a.cs[0].clone().lerp(b.cs[0], t), a.cs[1].clone().lerp(b.cs[1], t)];
    o.ch = a.ch.map((p, i) => ({ p: p.p.clone().lerp(b.ch[i].p, t), r: p.r.map((v, q) => lerp(v, b.ch[i].r[q], t)) }));
    return o;
  }
  apply(cur);
  function go(i, instant) { from = cur; to = D(i); stage = i; k = (instant || ctx.reduceMotion) ? 1 : 0; dwell = 0; if (k === 1) { cur = to; apply(cur); } ctx.dirty(); }

  // labels
  ctx.label('Plasma membrane', { obj: mem, at: V(-1.2, 2.9, 1.3) }, { part: 'pmc', priority: 2, occlude: false });
  ctx.label('Nuclear envelope', { obj: env, at: V(0.9, 1.5, 1.1) }, { part: 'env', priority: 2.6, occlude: false, show: () => env.visible && envMat.opacity > 0.1 });
  ctx.label('Nuclear envelope', { obj: envD[1], at: V(0.5, 1.0, 0.7) }, { part: 'env', priority: 2.4, occlude: false, show: () => envD[1].visible && envD[1].material.opacity > 0.1 });
  ctx.label('Chromatin', { obj: chrom0, at: V(-0.4, -0.3, 0.9) }, { part: 'chrom', priority: 2.2, occlude: false, show: () => chMat.opacity > 0.5 });
  ctx.label('Sister chromatids', { obj: chromatids[1].grp, at: V(0.1, 0.5, 0.15) }, { part: 'sis', priority: 3, occlude: false, show: () => cur.cond > 0.6 && stage <= 3 });
  ctx.label('Chromosome', { obj: chromatids[1].grp, at: V(0.1, 0.5, 0.15) }, { part: 'sis', priority: 3, occlude: false, show: () => stage >= 4 && cur.cond > 0.3 });
  ctx.label('Centromere', { obj: chromatids[5].grp, at: V(-0.1, 0.08, 0.1) }, { part: 'cen', priority: 2.4, occlude: false, show: () => cur.cond > 0.6 && stage <= 3 });
  ctx.label('Kinetochore', chromatids[6].kin, { part: 'kin', priority: 2.2, occlude: false, show: () => chromatids[6].kin.visible && stage >= 2 && stage <= 4 });
  ctx.label('Centrosome', cs[0], { part: 'cs', priority: 2.8, occlude: false });
  ctx.label('Centrosome', cs[1], { part: 'cs', priority: 1.5, occlude: false, show: () => stage >= 1 });
  const spA = new THREE.Object3D(); g.add(spA);
  ctx.label('Spindle microtubules', spA, { part: 'smt', priority: 2, occlude: false, show: () => cur.pol > 0.5 });
  const kmA = new THREE.Object3D(); g.add(kmA);
  ctx.label('Kinetochore microtubule', kmA, { part: 'kmt', priority: 1.8, occlude: false, show: () => cur.km > 0.5 });
  ctx.label('Metaphase plate', V(0, -2.0, 0.6), { part: 'plate', priority: 2.6, occlude: false, show: () => plate.visible });
  ctx.label('Contractile ring', { obj: ring, at: V(0, 1, 0) }, { part: 'ring', priority: 2.6, occlude: false, show: () => ring.visible });

  const api = {
    view: { pos: [2.5, 3.8, 12.5], target: [0, 0, 0], min: 3, max: 34 },
    steps: STAGES, play: true, autoplay: false,
    stepInfo: () => ({ num: `Stage ${stage + 1} of ${STAGES.length}`, title: STAGES[stage].t, text: STAGES[stage].d, short: `${STAGES[stage].t}`, atStart: stage === 0 }),
    next() { go((stage + 1) % STAGES.length); },
    prev() { go(Math.max(0, stage - 1)); },
    update(dt, playing) {
      let moving = false;
      if (playing) { dwell += dt; if (k >= 1 && dwell > 3.6) { api.next(); api.stepChanged && api.stepChanged(); } moving = true; }
      if (k < 1) { k = Math.min(1, k + dt / 1.7); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; cur = mix(from, to, e); apply(cur); moving = true; }
      spA.position.copy(cur.cs[1]).lerp(V(0.7, 0.55, 0.2), 0.45);
      const c = chromatids[0]; if (c.grp.visible) kmA.position.copy(cur.cs[0]).lerp(c.kin.getWorldPosition(V()), 0.5 * cur.km);
      return moving;
    },
  };
  return api;
}
