/* Module 11: a replication fork moving left. Everything is a function of one time value t,
   so Play, Step and Back all just set t. Upper arm = lagging-strand template, lower arm = leading-strand template. */
import * as THREE from '../vendor/three.module.min.js';
import { V, DynTube, blobGeo, rodMatrix, sphereMatrix } from '../geo.js';

const XL = -9, XR = 7, J = 1.4, YA = 1.25, YN = 0.72, HR = 0.36, OMEGA = 2.6;
const F0 = 3.2, VF = 0.42, FMIN = -6.0, T_END = 26.5, LAGV = 1.2, PRL = 0.45;
const fAt = (t) => Math.max(FMIN, F0 - VF * t);
const tAtF = (x) => (F0 - x) / VF;
const S = [4.6, 2.0, -0.6, -3.2];                     // 5' starts of the lagging-strand primers
const E = [XR, ...S.slice(0, -1)];                    // each fragment runs until the previous primer
const TP = S.map(s => tAtF(s - J - 0.3));             // priming times
const TD = S.map((s, k) => TP[k] + 0.5 + (E[k] - s - PRL) / LAGV);   // fragment finished

const STEPS = [
  { at: 0, t: 'Helicase unwinds the parent DNA', d: 'Helicase unwinds the parental double helix at the replication fork. Single-strand binding proteins coat the exposed strands so they cannot pair up again, and topoisomerase, working ahead of the fork, relieves the supercoiling that unwinding causes. Notes p. 164.' },
  { at: 0.95, t: 'Primase lays an RNA primer', d: 'Primase, an RNA polymerase, makes a short RNA primer complementary to the template. DNA polymerase can only add nucleotides to an existing 3′-OH, so each new strand starts from a primer. Notes pp. 165, 167.' },
  { at: 4.6, t: 'Leading strand: continuous', d: 'DNA polymerase extends the leading strand 5′ to 3′. Its 3′ end points toward the fork, so it is made as one long continuous strand as the parental DNA unwinds. Notes pp. 165–166.' },
  { at: 8.2, t: 'Lagging strand: Okazaki fragments', d: 'The lagging strand\'s 3′ end points away from the fork. Each time more template is exposed, a new primer is laid and DNA polymerase extends it away from the fork until it reaches the fragment in front. These short pieces are Okazaki fragments. Notes pp. 166–167.' },
  { at: TD[1] + 0.4, t: 'Primer replaced with DNA', d: 'A different DNA polymerase removes the RNA primer of the fragment ahead and replaces it with DNA. Notes p. 167.' },
  { at: TD[1] + 1.35, t: 'Ligase seals the gap', d: 'DNA ligase joins the two fragments, completing the sugar-phosphate backbone of the lagging strand. Notes p. 167.' },
  { at: T_END - 0.3, t: 'Two daughter molecules', d: 'Each daughter molecule is one parental (template) strand paired with one new strand, so replication is semiconservative. The leading and lagging strands are made at the same time. Notes pp. 163, 167.' },
];

export function build(ctx) {
  const g = new THREE.Group(); ctx.add(g);
  const tMat = ctx.mat('#2f5f9e'), nMat = ctx.mat('#7cc08a'), rMat = ctx.mat('#d0453c'), bpMat = ctx.mat('#b7c0bc');

  // template strands (parental): helix to the left of the fork, separated arms to the right
  const T1 = new DynTube(240, 7, 0.13, tMat), T2 = new DynTube(240, 7, 0.13, tMat.clone());
  g.add(T1.mesh, T2.mesh);
  const tpos = (x, f, sgn, out) => {
    const hy = sgn * HR * Math.cos(OMEGA * x), hz = sgn * HR * Math.sin(OMEGA * x);
    if (x <= f) return out.set(x, hy, hz);
    const s = Math.min(1, (x - f) / J), k = s * s * (3 - 2 * s);
    return out.set(x, hy + (sgn * YA - hy) * k, hz * (1 - k));
  };
  ctx.part('tmpl', 'Template (parental) strands', 'The two strands of the parental DNA, in dark blue. They unwind at the fork and each one serves as the template for a new daughter strand. Notes pp. 163–164.', T1.mesh, T2.mesh);

  // new DNA and primers as straight rods (instanced so they can grow and shrink)
  const unitRod = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
  const newIM = new THREE.InstancedMesh(unitRod, nMat, 8), lagIM = new THREE.InstancedMesh(unitRod, nMat.clone(), 8), primIM = new THREE.InstancedMesh(unitRod, rMat, 8);
  [newIM, lagIM, primIM].forEach(m => { m.frustumCulled = false; g.add(m); });
  ctx.part('lead', 'Leading strand (new)', 'A new strand, in light green, made continuously toward the fork. Its 3′ end points at the fork, so DNA polymerase can keep adding to it as the parent DNA unwinds. The red primer at the far right is where it started. Notes p. 166.', newIM);
  ctx.part('lag', 'Lagging strand (Okazaki fragments)', 'The other new strand, made discontinuously in short Okazaki fragments, because its 3′ end points away from the fork. Fragments are needed because DNA is only synthesized in one direction, 5′ to 3′. Notes pp. 166–167.', lagIM);
  ctx.part('primer', 'RNA primers', 'Short pieces of RNA, in red, laid down by primase. DNA polymerase extends them; later a different DNA polymerase removes each primer and replaces it with DNA. Notes p. 167.', primIM);
  const bpIM = new THREE.InstancedMesh(unitRod, bpMat, 140); bpIM.frustumCulled = false; g.add(bpIM);
  ctx.part('bp', 'Base pairs', 'Complementary bases paired by hydrogen bonds. In the parental helix both strands are old; behind the fork each new strand pairs with an old template strand. Notes pp. 163, 165.', bpIM);
  const nickIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), ctx.mat('#30393a'), 4); nickIM.frustumCulled = false; g.add(nickIM);
  ctx.part('nick', 'Nick between fragments', 'A gap in the sugar-phosphate backbone where two Okazaki fragments meet, left after the primer is replaced. DNA ligase seals it. Notes p. 167.', nickIM);

  // enzymes
  const mk = (geo, color, id, name, desc) => { const m = new THREE.Mesh(geo, ctx.mat(color)); g.add(m); ctx.part(id, name, desc, m); return m; };
  const heli = mk(new THREE.TorusGeometry(0.42, 0.16, 10, 24), '#e0bf45', 'heli', 'Helicase', 'Unwinds the parental double helix at the replication fork, so each single strand is available for DNA polymerase to add complementary bases. Notes p. 164.');
  heli.rotation.y = Math.PI / 2;
  const topo = mk(blobGeo(0.7, { sx: 0.9, sy: 1.05, seed: 71, amp: 0.13 }), '#6fae6a', 'topo', 'Topoisomerase', 'Works upstream of (ahead of) the replication fork. It changes the supercoiled state of the DNA caused by unwinding; topoisomerase II relieves the stress. Notes p. 164.');
  const ssbIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), ctx.mat('#e0954a'), 16); ssbIM.frustumCulled = false; g.add(ssbIM);
  ctx.part('ssb', 'Single-strand binding proteins', 'Bind the single-stranded regions of the parental strands and prevent them from coming back together. Notes p. 164.', ssbIM);
  const prim = mk(blobGeo(0.42, { seed: 72, amp: 0.15 }), '#8f74c2', 'prim', 'Primase', 'An RNA polymerase that synthesizes a short piece of RNA (the primer) complementary to the parental DNA strand, so DNA polymerase has a 3′ end to add to. Notes pp. 165, 167.');
  const polL = mk(blobGeo(0.55, { sx: 1.2, seed: 73, amp: 0.13 }), '#4f9d8c', 'polL', 'DNA polymerase (leading strand)', 'Adds nucleotides to the 3′-OH of the growing strand, using the four deoxyribonucleotides and a DNA template. It can only synthesize 5′ to 3′, and most DNA polymerases proofread their own errors. Here it moves toward the fork. Notes pp. 165–166, 168.');
  const polG = mk(blobGeo(0.55, { sx: 1.2, seed: 74, amp: 0.13 }), '#4f9d8c', 'polG', 'DNA polymerase (lagging strand)', 'Extends each RNA primer on the lagging strand, moving away from the fork, until it reaches the fragment in front. Notes pp. 166–167.');
  const pol1 = mk(blobGeo(0.38, { seed: 75, amp: 0.15 }), '#a6d58f', 'pol1', 'DNA polymerase (primer replacement)', 'A different DNA polymerase that removes the RNA primer and replaces it with DNA nucleotides. Notes p. 167.');
  const lig = mk(blobGeo(0.4, { sx: 1.1, seed: 76, amp: 0.15 }), '#e6a64a', 'lig', 'DNA ligase', 'Once a primer has been replaced, DNA ligase joins the fragments, completing the sugar-phosphate backbone of the new DNA. Notes p. 167.');

  // labels
  const anchor = (name) => { const o = new THREE.Object3D(); o.name = name; g.add(o); return o; };
  const aLead3 = anchor(), aLag5 = anchor(), aFrag = anchor(), aPrimer = anchor(), aSSB = anchor(), aPar = anchor();
  ctx.label('Parental DNA', aPar, { part: 'tmpl', priority: 2.5, occlude: false });
  ctx.label('Helicase', heli, { part: 'heli', priority: 3, occlude: false });
  ctx.label('Topoisomerase', topo, { part: 'topo', priority: 2.8, occlude: false });
  ctx.label('SSB proteins', aSSB, { part: 'ssb', priority: 2.2, occlude: false, show: () => aSSB.visible });
  ctx.label('Primase', prim, { part: 'prim', priority: 2.6, occlude: false, show: () => prim.visible });
  ctx.label('RNA primer', aPrimer, { part: 'primer', priority: 2.2, occlude: false, show: () => aPrimer.visible });
  ctx.label('DNA polymerase', polL, { part: 'polL', priority: 2.4, occlude: false });
  ctx.label('DNA polymerase', polG, { part: 'polG', priority: 2.0, occlude: false, show: () => polG.visible });
  ctx.label('Primer replaced', pol1, { part: 'pol1', priority: 2.6, occlude: false, show: () => pol1.visible });
  ctx.label('DNA ligase', lig, { part: 'lig', priority: 2.7, occlude: false, show: () => lig.visible });
  ctx.label('Leading strand', V(5.2, -YN - 0.15, 0.2), { part: 'lead', priority: 2.6, occlude: false });
  ctx.label('Lagging strand', aFrag, { part: 'lag', priority: 2.6, occlude: false, show: () => aFrag.visible });
  ctx.label('3′', aLead3, { cls: 'end', priority: 1.4, noLine: true });
  ctx.label('5′', V(XR + 0.3, -YN, 0), { cls: 'end', priority: 1.2, noLine: true });
  ctx.label('5′', aLag5, { cls: 'end', priority: 1.2, noLine: true, show: () => aLag5.visible });
  ctx.label('3′', V(XL - 0.35, HR * Math.cos(OMEGA * XL), 0), { cls: 'end', priority: 1.1, noLine: true });
  ctx.label('5′', V(XL - 0.35, -HR * Math.cos(OMEGA * XL), 0), { cls: 'end', priority: 1.1, noLine: true });
  ctx.label('5′', V(XR + 0.3, YA + 0.05, 0), { cls: 'end', priority: 1.1, noLine: true });
  ctx.label('3′', V(XR + 0.3, -YA - 0.05, 0), { cls: 'end', priority: 1.1, noLine: true });
  ctx.label('← fork moves this way', V(-6.5, 2.6, 0), { noLine: true, priority: 0.5 });

  const m4 = new THREE.Matrix4(), tmp = V(), tmp2 = V();
  const hide = (im, i) => { m4.makeScale(0, 0, 0); im.setMatrixAt(i, m4); };
  let t = 0, lastF = null, lastStep = -1;

  function pose() {
    const f = fAt(t);
    if (f !== lastF) { T1.set((u, v) => tpos(XL + u * (XR - XL), f, 1, v)); T2.set((u, v) => tpos(XL + u * (XR - XL), f, -1, v)); lastF = f; }
    const armStart = f + J;
    // leading strand
    const xL3 = Math.min(XR - PRL, armStart + 0.2);
    rodMatrix(m4, V(xL3, -YN, 0), V(XR - PRL, -YN, 0), 0.11); newIM.setMatrixAt(0, m4);
    for (let i = 1; i < 8; i++) hide(newIM, i);
    rodMatrix(m4, V(XR - PRL, -YN, 0), V(XR, -YN, 0), 0.115); primIM.setMatrixAt(0, m4);
    polL.position.set(xL3 - 0.15, -1.0, 0.1);
    aLead3.position.set(xL3 - 0.05, -YN - 0.45, 0.4);
    // lagging fragments
    let pi = 1, newest = -1, extending = -1, covered = [];
    let repK = -1, rep01 = 0, ligK = -1, lig01 = 0;
    for (let k = 0; k < S.length; k++) {
      const s = S[k];
      if (t < TP[k]) { hide(lagIM, k); continue; }
      newest = k;
      const ext = Math.max(0, Math.min(E[k] - s - PRL, (t - TP[k] - 0.5) * LAGV));
      if (t >= TP[k] + 0.5 && t < TD[k]) extending = k;
      // primer replacement of fragment k-1 by the polymerase that finished fragment k
      let extra = 0;
      if (k > 0 && t >= TD[k]) { const r = Math.min(1, (t - TD[k]) / 0.9); extra = r * PRL; if (r < 1) { repK = k - 1; rep01 = r; } else { const l = Math.min(1, (t - TD[k] - 0.9) / 0.9); if (l < 1) { ligK = k - 1; lig01 = l; } } }
      const x0 = s + PRL, x1 = s + PRL + ext + extra;
      if (x1 - x0 > 0.01) { rodMatrix(m4, V(x0, YN, 0), V(x1, YN, 0), 0.11); lagIM.setMatrixAt(k, m4); covered.push([x0, x1]); } else hide(lagIM, k);
    }
    for (let k = S.length; k < 8; k++) hide(lagIM, k);
    // primers: shrink from the 5' side as they are replaced
    for (let k = 0; k < S.length; k++) {
      const s = S[k];
      if (t < TP[k]) { hide(primIM, pi++); continue; }
      let a = s; const nxt = k + 1;
      if (nxt < S.length && t >= TD[nxt]) a = s + PRL * Math.min(1, (t - TD[nxt]) / 0.9);
      const grow = Math.min(1, (t - TP[k]) / 0.35);
      if (s + PRL - a > 0.01) { rodMatrix(m4, V(a, YN, 0), V(a + (s + PRL - a) * grow, YN, 0), 0.115); primIM.setMatrixAt(pi++, m4); covered.push([a, s + PRL]); }
      else hide(primIM, pi++);
    }
    for (; pi < 8; pi++) hide(primIM, pi);
    // nicks: where a finished fragment meets the next, until ligase seals it
    let ni = 0;
    for (let k = 1; k < S.length; k++) {
      const done = t >= TD[k] + 0.9, sealed = t >= TD[k] + 1.8;
      if (done && !sealed) { sphereMatrix(m4, V(S[k - 1] + PRL, YN, 0.12), 0.1); nickIM.setMatrixAt(ni++, m4); }
    }
    for (; ni < 4; ni++) hide(nickIM, ni);
    // enzymes that come and go
    prim.visible = false;
    for (let k = 0; k < S.length; k++) if (t > TP[k] - 0.7 && t < TP[k] + 0.45) { prim.visible = true; prim.position.set(S[k] + 0.25, YA + 0.15, 0.45); }
    polG.visible = newest >= 0;
    if (extending >= 0) { const s = S[extending]; const x = s + PRL + Math.max(0, Math.min(E[extending] - s - PRL, (t - TP[extending] - 0.5) * LAGV)); polG.position.set(x + 0.1, 0.98, 0.1); }
    else if (newest >= 0) polG.position.set(S[newest] + PRL + 0.15, 0.98, 0.1);
    pol1.visible = repK >= 0; if (repK >= 0) pol1.position.set(S[repK] + PRL * rep01, YN - 0.05, 0.45);
    lig.visible = ligK >= 0; if (ligK >= 0) lig.position.set(S[ligK] + PRL, YN - 0.05, 0.5);
    aPrimer.visible = newest >= 0; if (newest >= 0) aPrimer.position.set(S[newest] + 0.2, YN, 0.1);
    aLag5.visible = newest >= 0; if (newest >= 0) aLag5.position.set(S[newest] - 0.15, YN - 0.3, 0.3);
    aFrag.visible = newest >= 0; if (newest >= 0) { const k = Math.max(0, newest - 1); aFrag.position.set((S[k] + E[k]) / 2 + 0.2, YN - 0.1, 0.1); }
    heli.position.copy(tpos(f + 0.35, f, 1, tmp)); heli.position.z += 0.0;
    topo.position.set(f - 2.3, 0, 0);
    aPar.position.set(f - 4.6, HR * Math.cos(OMEGA * (f - 4.6)) + 0.1, HR * Math.sin(OMEGA * (f - 4.6)));
    // SSB on the exposed lagging template between the fork and the newest primer
    const gapEnd = newest >= 0 && S[newest] > armStart - 0.4 ? S[newest] - 0.1 : (covered.length ? Math.min(...covered.map(c => c[0])) - 0.1 : XR);
    let si = 0;
    for (let x = f + 0.8; x < gapEnd && si < 16; x += 0.42) { tpos(x, f, 1, tmp); sphereMatrix(m4, tmp2.copy(tmp).add(V(0, 0.08, 0.16)), 0.15); ssbIM.setMatrixAt(si++, m4); }
    aSSB.visible = si > 0; if (si > 0) { tpos(f + 0.8 + 0.42 * Math.floor(si / 2), f, 1, aSSB.position); aSSB.position.y += 0.2; aSSB.position.z += 0.2; }
    for (; si < 16; si++) hide(ssbIM, si);
    // base pairs: parental helix, then template-to-new pairs where new strand exists
    let bi = 0;
    const isCov = (x) => covered.some(([a, b]) => x >= a && x <= b);
    for (let x = XL + 0.2; x < XR - 0.05 && bi < 140; x += 0.34) {
      if (x < f - 0.1) { const a = tpos(x, f, 1, tmp), b = tpos(x, f, -1, tmp2); rodMatrix(m4, a, b, 0.045); bpIM.setMatrixAt(bi++, m4); }
      else if (x > armStart + 0.1) {
        if (isCov(x)) { rodMatrix(m4, V(x, YA - 0.12, 0), V(x, YN + 0.1, 0), 0.045); bpIM.setMatrixAt(bi++, m4); }
        if (x >= xL3) { rodMatrix(m4, V(x, -YA + 0.12, 0), V(x, -YN - 0.1, 0), 0.045); bpIM.setMatrixAt(bi++, m4); }
      }
    }
    for (; bi < 140; bi++) hide(bpIM, bi);
    [newIM, lagIM, primIM, nickIM, ssbIM, bpIM].forEach(m => { m.instanceMatrix.needsUpdate = true; m.boundingSphere = null; });
  }
  pose();

  // the stage shown is whatever is happening at time t; Step and Back jump between the bookmarked moments
  const stepIdx = () => {
    if (t >= T_END - 0.3 - 1e-6) return 6;
    for (let k = 1; k < S.length; k++) if (t >= TD[k] + 0.9 && t < TD[k] + 1.8) return 5;
    for (let k = 1; k < S.length; k++) if (t >= TD[k] && t < TD[k] + 0.9) return 4;
    for (let k = 0; k < S.length; k++) if (t > TP[k] - 0.7 && t < TP[k] + 0.45) return 1;
    for (let k = 0; k < S.length; k++) if (t >= TP[k] + 0.5 && t < TD[k]) return 3;
    return t < TP[0] - 0.7 ? 0 : 2;
  };
  const api = {
    view: { pos: [-0.6, 3.8, 19.5], target: [-1.0, 0.1, 0], min: 4, max: 60, k: 1 },
    steps: STEPS, play: true, autoplay: true,
    stepInfo() { const i = stepIdx(); return { num: `Stage ${i + 1} of ${STEPS.length}`, title: STEPS[i].t, text: STEPS[i].d, short: `Stage ${i + 1} / ${STEPS.length}`, atStart: t <= 0.001 }; },
    next() { const b = STEPS.find(s => s.at > t + 0.01); t = b ? b.at : 0; pose(); ctx.dirty(); },
    prev() { const b = STEPS.filter(s => s.at < t - 0.05); t = b.length ? b[b.length - 1].at : 0; pose(); ctx.dirty(); },
    update(dt, playing) {
      if (!playing) return false;
      t += dt * 0.9; if (t > T_END + 1.5) t = 0;
      pose();
      const i = stepIdx(); if (i !== lastStep) { lastStep = i; api.stepChanged && api.stepChanged(); }
      return true;
    },
  };
  return api;
}
