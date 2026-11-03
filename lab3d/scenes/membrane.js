/* Module 3: fluid mosaic membrane patch. Extracellular side is +y. */
import * as THREE from '../vendor/three.module.min.js';
import { V, bilayer, spheres, rods, blobGeo, tube, rng, rodMatrix } from '../geo.js';

export function build(ctx) {
  const g = new THREE.Group(); ctx.add(g);
  const HALF = 1.0;
  const P = { channel: { x: -3.3, z: 0.4 }, tm: { x: 0.5, z: -1.3 }, glyco: { x: 3.5, z: 1.1 }, glipid: { x: -0.7, z: 2.0 } };
  const holes = [{ x: P.channel.x, z: P.channel.z, r: 1.05 }, { x: P.tm.x, z: P.tm.z, r: 0.95 }, { x: P.glyco.x, z: P.glyco.z, r: 0.85 }];
  const BL = bilayer({ w: 12, d: 7, spacing: 0.46, y: 0, half: HALF, holes,
    headMat: ctx.mat('#c98a68'), tailMat: ctx.mat('#e0cd9c'),
    skip: (x, z, s) => s > 0 && Math.hypot(x - P.glipid.x, z - P.glipid.z) < 0.26 });
  g.add(BL.heads, BL.tails);
  ctx.part('heads', 'Phospholipid heads (hydrophilic)', 'Each phospholipid has a polar head made of glycerol, a phosphate group and a polar group. The heads face the watery fluid on both sides of the membrane. Phospholipids with two tails form a bilayer on their own because water excludes nonpolar molecules. Notes p. 34.', BL.heads);
  ctx.part('tails', 'Fatty acid tails (hydrophobic)', 'Two nonpolar fatty acid tails per phospholipid point into the middle of the bilayer, away from water. Shorter tails and more carbon-carbon double bonds (the kinked tails) increase fluidity. Notes pp. 34–35.', BL.tails);

  // cholesterol wedged between phospholipids in both leaflets
  const R = rng(11), ringPairs = [], tailPairs = [], ohPos = [];
  let tries = 0;
  while (ringPairs.length < 26 && tries++ < 400) {
    const x = -5.6 + R() * 11.2, z = -3.2 + R() * 6.4, s = R() < 0.5 ? 1 : -1;
    if (holes.some(h => Math.hypot(x - h.x, z - h.z) < h.r + 0.3)) continue;
    if (Math.hypot(x - P.glipid.x, z - P.glipid.z) < 0.6) continue;
    const yTop = s * (HALF - 0.22);
    ohPos.push(V(x, s * (HALF - 0.08), z));
    ringPairs.push([V(x, yTop, z), V(x, yTop - s * 0.42, z)]);
    tailPairs.push([V(x, yTop - s * 0.42, z), V(x + 0.05, yTop - s * 0.78, z)]);
  }
  const cholMat = ctx.mat('#d4ab3c');
  const ringG = new THREE.BoxGeometry(1, 1, 1);
  const rings = new THREE.InstancedMesh(ringG, cholMat, ringPairs.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  ringPairs.forEach(([a, b], i) => { q.setFromAxisAngle(V(0, 1, 0), R() * 3); m4.compose(a.clone().add(b).multiplyScalar(0.5), q, V(0.22, 0.42, 0.08)); rings.setMatrixAt(i, m4); });
  rings.computeBoundingSphere();
  const ctails = rods(tailPairs, 0.035, cholMat, 5);
  const oh = spheres(ohPos, 0.07, cholMat, 0);
  g.add(rings, ctails, oh);
  ctx.part('chol', 'Cholesterol', 'Cholesterol inserts between the phospholipids of animal cell membranes. Its small OH group is hydrophilic and its rigid carbon rings and tail are hydrophobic, so it packs tightly with phospholipids. It acts as a buffer for membrane fluidity, raising or lowering it depending on temperature. Notes pp. 34–35.', rings, ctails, oh);

  // channel protein: ring of six subunits around a pore
  const chan = new THREE.Group(); chan.position.set(P.channel.x, 0, P.channel.z);
  const chMat = ctx.mat('#4e8d88');
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 3.0, 4, 10), chMat);
    m.position.set(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62); m.rotation.z = Math.cos(a) * 0.08; m.rotation.x = -Math.sin(a) * 0.08;
    chan.add(m);
  }
  g.add(chan);
  ctx.part('chan', 'Channel protein', 'An integral, transmembrane protein that forms a water-filled pore through the bilayer so specific ions or molecules can cross. Moving ions and molecules (transport) is one of the four functions of membrane proteins. Notes p. 36.', chan);

  // transmembrane (integral) protein with a peripheral protein on its cytoplasmic face
  const tm = new THREE.Mesh(blobGeo(0.75, { sy: 2.6, seed: 4, amp: 0.13 }), ctx.mat('#5d7fb0'));
  tm.position.set(P.tm.x, 0.1, P.tm.z); g.add(tm);
  ctx.part('tm', 'Integral (transmembrane) protein', 'Integral membrane proteins are permanently associated with the membrane, and transmembrane ones span the entire bilayer. Membrane proteins work as transporters, receptors, enzymes and anchors. Notes p. 36.', tm);
  const per = new THREE.Mesh(blobGeo(0.6, { sx: 1.25, sy: 0.75, seed: 9, amp: 0.15 }), ctx.mat('#8a6fb0'));
  per.position.set(P.tm.x + 0.8, -HALF - 0.95, P.tm.z + 0.45); g.add(per);
  ctx.part('per', 'Peripheral protein', 'Peripheral membrane proteins are only temporarily associated with the bilayer or with integral proteins, held by noncovalent bonds. They can sit on the cytoplasmic or the extracellular side; this one is on the cytoplasmic side, bound to the integral protein. Notes p. 36.', per);

  // carbohydrate chain: a short trunk that branches
  const carbMat1 = ctx.mat('#6f9a4f'), carbMat2 = ctx.mat('#6f9a4f');
  function carb(base, seed) {
    const r = rng(seed), pts = [];
    let p = base.clone();
    for (let i = 0; i < 3; i++) { p = p.clone().add(V((r() - 0.5) * 0.15, 0.27, (r() - 0.5) * 0.15)); pts.push(p); }
    for (const dir of [-1, 1]) { let b = p.clone(); for (let i = 0; i < 2; i++) { b = b.clone().add(V(dir * 0.2, 0.2, (r() - 0.5) * 0.2)); pts.push(b); } }
    return pts;
  }
  const gp = new THREE.Mesh(blobGeo(0.62, { sy: 2.75, seed: 6, amp: 0.12 }), ctx.mat('#5d8fa8'));
  gp.position.set(P.glyco.x, 0.15, P.glyco.z); g.add(gp);
  const gpCarbs = spheres(carb(V(P.glyco.x, 1.85, P.glyco.z), 3), 0.12, carbMat1, 1);
  g.add(gpCarbs);
  ctx.part('glycoP', 'Glycoprotein', 'A membrane protein with a carbohydrate chain covalently attached. All membrane carbohydrates face outward, into the extracellular space, where they help cells recognize and interact with neighbours. Notes p. 36.', gp, gpCarbs);

  // glycolipid: one outer-leaflet lipid carrying a sugar chain
  const glG = new THREE.Group();
  const glHead = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 1), ctx.mat('#b97758'));
  glHead.position.set(P.glipid.x, HALF, P.glipid.z); glG.add(glHead);
  const tMat = ctx.mat('#e0cd9c');
  [-0.075, 0.075].forEach(dx => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.78, 5), tMat);
    m.position.set(P.glipid.x + dx, HALF - 0.14 - 0.39, P.glipid.z); glG.add(m);
  });
  const glCarb = spheres(carb(V(P.glipid.x, HALF + 0.12, P.glipid.z), 8), 0.11, carbMat2, 1); glG.add(glCarb);
  g.add(glG);
  ctx.part('glycoL', 'Glycolipid', 'A lipid with a carbohydrate chain covalently attached. Glycolipids are found only in the outer layer, with the sugar chain facing the extracellular space. Notes p. 36.', glG);

  // cytoskeleton filaments under the membrane
  const cyMat = ctx.mat('#a7b4b0');
  const cy = new THREE.Group();
  [[-1.6, 0.9], [0.6, -0.4], [2.4, 0.5]].forEach(([z, ph], k) => {
    const pts = []; for (let i = 0; i <= 12; i++) { const x = -6 + i; pts.push(V(x, -2.25 - 0.12 * Math.sin(i * 0.9 + ph) - k * 0.08, z + 0.3 * Math.sin(i * 0.6 + ph))); }
    cy.add(tube(pts, 0.07, cyMat, 60, 6));
  });
  g.add(cy);
  ctx.part('cyto', 'Cytoskeleton filaments', 'Protein filaments of the cytoskeleton run just under the membrane on the cytoplasmic side. Some membrane proteins act as anchors that attach to them. Notes pp. 33, 36.', cy);

  // labels
  ctx.label('Extracellular fluid', V(-5.2, 2.7, -1), { noLine: true, priority: 0.4 });
  ctx.label('Cytoplasm', V(-5.2, -2.9, -1), { noLine: true, priority: 0.4 });
  const front = BL.lipids.filter(l => l.sgn > 0 && l.z > 2.6 && l.x > 4 && l.x < 5);
  const hl = front[0] || BL.lipids[0];
  ctx.label('Hydrophilic heads', V(hl.x, HALF + 0.18, hl.z), { part: 'heads', priority: 2, occlude: false });
  ctx.label('Hydrophobic tails', V(5.7, 0.35, 3.3), { part: 'tails', priority: 2, occlude: false });
  ctx.label('Channel protein', V(P.channel.x, 1.85, P.channel.z + 0.6), { part: 'chan', priority: 3 });
  ctx.label('Integral protein', V(P.tm.x - 0.2, 1.75, P.tm.z + 0.5), { part: 'tm', priority: 3 });
  ctx.label('Peripheral protein', V(P.tm.x + 0.9, -HALF - 1.3, P.tm.z + 0.9), { part: 'per', priority: 3 });
  ctx.label('Glycoprotein', V(P.glyco.x + 0.25, 2.6, P.glyco.z), { part: 'glycoP', priority: 3 });
  ctx.label('Glycolipid', V(P.glipid.x + 0.2, 1.9, P.glipid.z), { part: 'glycoL', priority: 3 });
  const cp = ringPairs.reduce((b, p) => (p[0].y > 0 && p[0].z > b[0].z && p[0].x > -2 ? p : b), ringPairs[0]);
  ctx.label('Cholesterol', cp[0], { part: 'chol', priority: 2, occlude: false });
  ctx.label('Cytoskeleton filament', V(4.2, -2.3, 2.6), { part: 'cyto', priority: 1 });

  // lateral diffusion: lipids wander within their own layer (no flip-flop)
  const off = BL.lipids.map(() => ({ dx: 0, dz: 0 }));
  const ph = BL.lipids.map((l, i) => [Math.sin(i * 12.9898) * 43758.5453 % 6.283, Math.cos(i * 78.233) * 12345.678 % 6.283, 0.7 + (i % 7) * 0.13]);
  let t = 0;
  return {
    view: { pos: [7.6, 6.4, 14.2], target: [0, -0.3, 0], min: 4, max: 44, k: 0.9 },
    play: true, autoplay: true,
    stepInfo: () => null,
    update(dt, playing) {
      if (!playing) return false;
      t += dt;
      for (let i = 0; i < off.length; i++) { const [a, b, w] = ph[i]; off[i].dx = 0.09 * Math.sin(t * w * 1.6 + a) + 0.04 * Math.sin(t * 0.37 * w + b); off[i].dz = 0.09 * Math.cos(t * w * 1.3 + b) + 0.04 * Math.cos(t * 0.29 * w + a); }
      BL.place(off);
      return true;
    },
  };
}
