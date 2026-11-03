/* Module 10: the three cytoskeletal filaments, about to scale (1 unit = 10 nm). Plus ends on the right. */
import * as THREE from '../vendor/three.module.min.js';
import { V, tube, spheres, rng, blobGeo, sphereMatrix } from '../geo.js';

export function build(ctx) {
  const g = new THREE.Group(); ctx.add(g);
  const X0 = -6, X1 = 6, MTY = 3.1, IFY = 0.15, MFY = -2.3;

  /* microtubule: 13 protofilaments of alternating alpha/beta tubulin, hollow, 25 nm */
  const RAD = 0.98, MON = 0.4, NPF = 13;
  const aPos = [], bPos = [];
  for (let j = 0; j < NPF; j++) {
    const phi = j / NPF * Math.PI * 2, off = j * 0.092;
    const cy = Math.cos(phi) * RAD, cz = Math.sin(phi) * RAD;
    for (let i = 0; ; i++) {
      const x = X0 + 0.2 + i * MON + off; if (x > X1 - 0.1) break;
      if (Math.sin(phi) > 0.45 && x > 0.9) continue;      // open window so the hollow centre shows
      (i % 2 === 0 ? aPos : bPos).push(V(x, MTY + cy, cz));
    }
  }
  const aIM = spheres(aPos, 0.215, ctx.mat('#9cc8e4'), 1), bIM = spheres(bPos, 0.215, ctx.mat('#3f7fb8'), 1);
  g.add(aIM, bIM);
  ctx.part('atub', 'α-tubulin', 'One of the two proteins in a tubulin dimer. One α-tubulin and one β-tubulin join into a dimer, and the dimers line up end to end in 13 rows (protofilaments) that form the hollow tube. Microtubules are the widest cytoskeletal fibres; they resist compression, guide where organelles sit, and serve as tracks for motor proteins. Module 10 pp. 143–144, 147.', aIM);
  ctx.part('btub', 'β-tubulin', 'The other protein of the tubulin dimer. All dimers point the same way, so the two ends differ: the plus end assembles quickly and the minus end slowly. In animal cells the minus ends sit at the centrosome. Microtubules grow and shrink at random (dynamic instability). Module 10 pp. 144–146.', bIM);

  /* actin microfilament: two-stranded helix of G-actin, 7 nm */
  const act = [];
  for (let i = 0; ; i++) { const x = X0 + 0.2 + i * 0.275; if (x > X1) break; const a = i * (-166.15 * Math.PI / 180); act.push(V(x, MFY + Math.cos(a) * 0.17, Math.sin(a) * 0.17)); }
  const actIM = spheres(act, 0.255, ctx.mat('#d47a68'), 2); g.add(actIM);
  ctx.part('actin', 'Actin microfilament', 'A double helix of actin monomers, the thinnest cytoskeletal fibre. Microfilaments reinforce the cell membrane, form the core of microvilli, and take part in transport, muscle contraction and cytokinesis. Like microtubules they have a faster-growing plus end and a slower-growing minus end. Module 10 pp. 144–145, 148.', actIM);

  /* intermediate filament: rope of twisted strands, 10 nm, fraying at the left to show subunits */
  const ifG = new THREE.Group(), ifMat = ctx.mat('#6fae6a');
  for (let s = 0; s < 8; s++) {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const x = X0 + 0.1 + i / 120 * (X1 - X0 - 0.2), a = s / 8 * Math.PI * 2 + x * 0.9;
      const fray = x < X0 + 1.2 ? 1 + (X0 + 1.2 - x) * 0.9 : 1;
      const rr = (s % 2 ? 0.3 : 0.16) * fray;
      pts.push(V(x, IFY + Math.cos(a) * rr, Math.sin(a) * rr));
    }
    ifG.add(tube(pts, 0.11, ifMat, 160, 6));
  }
  g.add(ifG);
  ctx.part('if', 'Intermediate filament', 'A strong, cable-like polymer of protein subunits with a diameter between that of microfilaments and microtubules. Found in animal cells, it gives the cell mechanical strength. Different cells use different proteins: for example neurofilaments in neurons and lamins in the nucleus. Module 10 pp. 147–148.', ifG);

  /* diameter marks (approximate values) */
  const dimMat = ctx.mat('#7f8c89'), dx = X0 - 0.75;
  [[MTY, 1.25, '≈ 25 nm'], [IFY, 0.5, '≈ 10 nm'], [MFY, 0.37, '≈ 7 nm']].forEach(([y, h, t]) => {
    g.add(tube([V(dx, y - h, 0), V(dx, y + h, 0)], 0.02, dimMat, 2, 4));
    [y - h, y + h].forEach(yy => g.add(tube([V(dx - 0.15, yy, 0), V(dx + 0.15, yy, 0)], 0.02, dimMat, 2, 4)));
    ctx.label(t, V(dx - 0.2, y, 0), { noLine: true, priority: 2.5, cls: 'end' });
  });

  /* kinesin walking toward the plus end on the top protofilament */
  const kin = new THREE.Group(), kMat = ctx.mat('#3fa38c'), cargoMat = ctx.mat('#e7d7a8');
  const headA = new THREE.Mesh(blobGeo(0.26, { sx: 1.3, sy: 0.8, seed: 61, amp: 0.1 }), kMat), headB = headA.clone();
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6), kMat);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 6), kMat);
  const cargo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 3), cargoMat);
  kin.add(headA, headB, neck, stalk, cargo); g.add(kin);
  ctx.part('kin', 'Kinesin with cargo', 'A motor protein that carries cargo, such as vesicles, toward the plus end of a microtubule. Its movement comes from changes in its shape, powered by ATP. Dynein carries cargo the other way, toward the minus end. Here each step moves the cargo 8 nm, one tubulin dimer. Module 10 p. 147.', kin);
  const trackY = MTY + RAD + 0.42;
  const hx = [X0 + 1.0, X0 + 1.8]; let tr = 0, phase = 0, steps = 0, stepping = false, autoT = 0;
  function poseKin() {
    // hand over hand: the trailing head swings 16 nm past the leading head, so the cargo moves 8 nm per step
    const ps = [0, 1].map(i => {
      if (stepping && i === tr) { const t = phase; return V(hx[i] + 1.6 * t, trackY + Math.sin(t * Math.PI) * 0.45, (i ? -0.25 : 0.25) * Math.sin(t * Math.PI)); }
      return V(hx[i], trackY, 0);
    });
    headA.position.copy(ps[0]); headB.position.copy(ps[1]);
    const hub = ps[0].clone().add(ps[1]).multiplyScalar(0.5).add(V(0, 0.65, 0));
    neck.position.copy(hub).add(V(0, -0.3, 0)); neck.scale.y = 0.7;
    stalk.position.copy(hub).add(V(0, 0.8, 0));
    cargo.position.copy(hub).add(V(0, 2.25, 0));
  }
  poseKin();
  function finishStep() { hx[tr] += 1.6; tr = 1 - tr; phase = 0; stepping = false; steps++; if (Math.min(...hx) > X1 - 2.4) { hx[0] = X0 + 1.0; hx[1] = X0 + 1.8; tr = 0; } }

  /* labels */
  ctx.label('Microtubule (hollow tube)', V(-1.6, MTY + RAD + 0.2, 0.3), { part: 'btub', priority: 3, occlude: false });
  ctx.label('α-tubulin', aPos.find(p => p.x > -3.5 && p.z > 0.6) || aPos[0], { part: 'atub', priority: 2.4, occlude: false });
  ctx.label('β-tubulin', bPos.find(p => p.x > -2.8 && p.z > 0.6) || bPos[0], { part: 'btub', priority: 2.4, occlude: false });
  ctx.label('Hollow centre (lumen)', V(3.4, MTY, 0), { noLine: false, priority: 1.6 });
  ctx.label('Intermediate filament', V(-0.8, IFY + 0.45, 0.3), { part: 'if', priority: 3, occlude: false });
  ctx.label('Microfilament (actin)', V(-1.2, MFY + 0.4, 0.3), { part: 'actin', priority: 3, occlude: false });
  ctx.label('G-actin monomer', act[Math.floor(act.length * 0.7)], { part: 'actin', priority: 1.8, occlude: false });
  ctx.label('Kinesin', headA, { part: 'kin', priority: 2.4, occlude: false });
  ctx.label('Cargo vesicle', cargo, { part: 'kin', priority: 2.2, occlude: false });
  [[MTY, RAD + 0.25], [MFY, 0.3]].forEach(([y, h]) => {
    ctx.label('+', V(X1 + 0.25, y, 0), { cls: 'end', priority: 3, noLine: true });
    ctx.label('−', V(X0 - 0.05, y + h + 0.25, 0), { cls: 'end', priority: 3, noLine: true });
  });

  return {
    view: { pos: [3.0, 5.4, 19.5], target: [0, 2.4, 0], min: 2, max: 50, k: 1 },
    play: true, autoplay: true,
    stepOnce() { if (!stepping) stepping = true; },
    hud: () => `Kinesin steps: <b>${steps}</b> · 8 nm and one ATP each`,
    update(dt, playing) {
      if (playing && !stepping) { autoT += dt; if (autoT > 0.35) { autoT = 0; stepping = true; } }
      if (!stepping) return false;
      phase = Math.min(1, phase + dt / 0.45);
      poseKin();
      if (phase >= 1) { finishStep(); poseKin(); }
      return true;
    },
  };
}
