/* Module 4: B-DNA double helix, 2 turns (20 bp), right-handed, antiparallel. */
import * as THREE from '../vendor/three.module.min.js';
import { V, tube, spheres, rods, rng } from '../geo.js';

export function build(ctx) {
  const SEQ = 'ATGCGTACCAGTGCATTAGC';            // strand 1, read 5' (top) to 3' (bottom)
  const PAIR = { A: 'T', T: 'A', G: 'C', C: 'G' };
  const N = SEQ.length, RISE = 0.34, TW = Math.PI / 5;   // 3.4 nm per 10 bp, 36 degrees per bp (1 unit = 1 nm)
  const RP = 0.95, RS = 0.72, PHI = 2.53;               // backbone radius, sugar radius, angular gap on the minor-groove side (about 145 degrees)
  const y0 = (N - 1) * RISE / 2;
  const at = (ang, r, y) => V(r * Math.cos(ang), y, -r * Math.sin(ang));   // right-handed: angle grows as y grows
  const g = new THREE.Group(); ctx.add(g);

  // strand 1 runs 5'->3' downward; bp index 0 at the top
  const ang = (i) => -(i * TW);   // going down, angle decreases, so going up it increases: right-handed
  const yy = (i) => y0 - i * RISE;
  const s1 = [], s2 = [], p1 = [], p2 = [], sug1 = [], sug2 = [];
  for (let i = -1; i <= N; i++) {
    const a = ang(i), y = yy(i);
    s1.push(at(a, RP, y)); s2.push(at(a + PHI, RP, y));
    if (i >= 0 && i < N) { sug1.push(at(a, RS + 0.06, y)); sug2.push(at(a + PHI, RS + 0.06, y)); }
    if (i >= 0 && i < N - 1) { p1.push(at(a - TW / 2, RP, y - RISE / 2)); p2.push(at(a + PHI - TW / 2, RP, y - RISE / 2)); }
  }
  const b1 = tube(s1.slice(1, -1), 0.11, ctx.mat('#3f6fa8'), N * 8, 8);
  const b2 = tube(s2.slice(1, -1), 0.11, ctx.mat('#7aa6d2'), N * 8, 8);
  g.add(b1, b2);
  ctx.part('bb1', 'Sugar-phosphate backbone (strand 1)', 'Deoxyribose sugars joined by phosphodiester bonds form the backbone, which winds around the outside of the helix. This strand runs 5′ to 3′ from top to bottom, with a free 5′ phosphate at the top and a free 3′ hydroxyl at the bottom. Notes p. 55–56.', b1);
  ctx.part('bb2', 'Sugar-phosphate backbone (strand 2)', 'The second backbone runs the opposite way, 5′ to 3′ from bottom to top. The two strands are antiparallel. Notes p. 56.', b2);
  const phos = spheres([...p1, ...p2], 0.15, ctx.mat('#d9a23a'), 1); g.add(phos);
  ctx.part('phos', 'Phosphate groups', 'Phosphates link the 3′ carbon of one sugar to the 5′ carbon of the next (phosphodiester bonds). At cellular pH (about 7) their hydroxyl groups are ionized, so the backbone is negatively charged. Notes p. 55.', phos);
  const sug = spheres([...sug1, ...sug2], 0.13, ctx.mat('#9a86b8'), 1); g.add(sug);
  ctx.part('sugar', 'Deoxyribose sugars', 'A five-carbon sugar with no oxygen at the 2′ carbon (that is the "deoxy"). The base attaches at the 1′ carbon and the phosphate at the 5′ carbon. Notes p. 55.', sug);

  // bases: flat plates on the chord between the two sugars, purines longer than pyrimidines
  const COL = { A: '#8a77c4', T: '#3f9e9a', G: '#d0684d', C: '#dcbf4a' };
  const purine = (b) => b === 'A' || b === 'G';
  const boxes = { A: [], T: [], G: [], C: [] }, hb = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), X = V(1, 0, 0);
  for (let i = 0; i < N; i++) {
    const b = SEQ[i], c = PAIR[b], a = ang(i), y = yy(i);
    const A = at(a, RS, y), B = at(a + PHI, RS, y), dir = B.clone().sub(A), len = dir.length(); dir.normalize();
    const gap = 0.2, f = purine(b) ? 0.56 : 0.44;
    const mid = A.clone().addScaledVector(dir, len * f);
    const e1 = mid.clone().addScaledVector(dir, -gap / 2), e2 = mid.clone().addScaledVector(dir, gap / 2);
    boxes[b].push([A, e1]); boxes[c].push([e2, B]);
    const side = V(0, 1, 0).cross(dir).normalize();
    const n = (b === 'A' || b === 'T') ? 2 : 3;
    for (let k = 0; k < n; k++) { const o = (k - (n - 1) / 2) * 0.1; hb.push([e1.clone().addScaledVector(side, o), e2.clone().addScaledVector(side, o)]); }
  }
  const bg = new THREE.BoxGeometry(1, 1, 1);
  const baseInfo = {
    A: ['Adenine (A)', 'Adenine is a purine, a double-ring base. It pairs only with thymine, held by 2 hydrogen bonds. Notes pp. 55–57.'],
    T: ['Thymine (T)', 'Thymine is a pyrimidine, a single-ring base. It pairs only with adenine, held by 2 hydrogen bonds. Notes pp. 55–57.'],
    G: ['Guanine (G)', 'Guanine is a purine, a double-ring base. It pairs only with cytosine, held by 3 hydrogen bonds. Notes pp. 55–57.'],
    C: ['Cytosine (C)', 'Cytosine is a pyrimidine, a single-ring base. It pairs only with guanine, held by 3 hydrogen bonds. Notes pp. 55–57.'],
  };
  const baseMesh = {};
  for (const b of 'ATGC') {
    const im = new THREE.InstancedMesh(bg, ctx.mat(COL[b]), boxes[b].length);
    boxes[b].forEach(([p, r], k) => {
      const d = r.clone().sub(p), L = d.length(); d.normalize(); q.setFromUnitVectors(X, d);
      m4.compose(p.clone().add(r).multiplyScalar(0.5), q, V(L, 0.09, purine(b) ? 0.34 : 0.26)); im.setMatrixAt(k, m4);
    });
    im.computeBoundingSphere(); g.add(im); baseMesh[b] = im;
    ctx.part('base' + b, baseInfo[b][0], baseInfo[b][1], im);
  }
  const hbm = rods(hb, 0.016, ctx.mat('#7f8c89'), 4); g.add(hbm);
  ctx.part('hbond', 'Hydrogen bonds', 'Hydrogen bonds hold complementary bases together: 2 between A and T, 3 between G and C. Each one is weak, but many together stabilize the helix, and being weak lets DNA "unzip" down the middle. Base stacking between neighbouring bases on the same strand also stabilizes the helix. Notes p. 57.', hbm);

  // dimension marks: one turn (3.4 nm, 10 bp) and diameter (2 nm)
  const dimMat = ctx.mat('#7f8c89');
  const dx = 1.75, ya = yy(4), yb = yy(14);
  const dim = new THREE.Group();
  dim.add(tube([V(dx, ya, 0), V(dx, yb, 0)], 0.018, dimMat, 2, 4));
  [ya, yb].forEach(y => dim.add(tube([V(dx - 0.18, y, 0), V(dx + 0.18, y, 0)], 0.018, dimMat, 2, 4)));
  const yd = yy(N - 1) - 0.75;
  dim.add(tube([V(-1, yd, 0), V(1, yd, 0)], 0.018, dimMat, 2, 4));
  [-1, 1].forEach(x => dim.add(tube([V(x, yd - 0.15, 0), V(x, yd + 0.15, 0)], 0.018, dimMat, 2, 4)));
  g.add(dim);
  ctx.label('3.4 nm = 1 turn (10 bp)', V(dx + 0.2, (ya + yb) / 2, 0), { noLine: true, priority: 0.5 });
  ctx.label('2 nm', V(0, yd - 0.05, 0), { noLine: true, priority: 0.5 });

  // ends: show antiparallel strands
  const top = 0.45, bot = -0.45;
  ctx.label('5′', at(ang(-0.6), RP, yy(0) + top), { cls: 'end', priority: 3 });
  ctx.label('3′', at(ang(N - 0.4), RP, yy(N - 1) + bot), { cls: 'end', priority: 3 });
  ctx.label('3′', at(ang(-0.6) + PHI, RP, yy(0) + top), { cls: 'end', priority: 3 });
  ctx.label('5′', at(ang(N - 0.4) + PHI, RP, yy(N - 1) + bot), { cls: 'end', priority: 3 });

  // grooves: centred between the backbones, shown only when facing the viewer
  const gi = 9.5, gy = yy(gi), ga = ang(gi);
  const minorA = ga + PHI / 2, majorA = ga + PHI + (Math.PI * 2 - PHI) / 2;
  const grooveMinor = V(Math.cos(minorA), 0, -Math.sin(minorA)), grooveMajor = V(Math.cos(majorA), 0, -Math.sin(majorA));
  ctx.label('Minor groove', grooveMinor.clone().multiplyScalar(0.9).setY(gy), { normal: grooveMinor, priority: 2 });
  ctx.label('Major groove', grooveMajor.clone().multiplyScalar(0.9).setY(gy - 0.2), { normal: grooveMajor, priority: 2 });

  // part labels, anchored on instances facing the default camera
  const facing = (pts) => pts.reduce((b, p) => (p.z - p.x * 0.3 > b.z - b.x * 0.3 ? p : b));
  ctx.label('Sugar-phosphate backbone', s1[4], { part: 'bb1', priority: 2 });
  ctx.label('Phosphate', facing(p2.slice(10, 16)), { part: 'phos', priority: 1 });
  for (const b of 'ATGC') {
    const list = boxes[b].map(([p, r]) => p.clone().lerp(r, 0.5));
    ctx.label(baseInfo[b][0], facing(list), { part: 'base' + b, priority: 1.5 });
  }
  ctx.label('Hydrogen bonds', hb[Math.floor(hb.length * 0.25)][0].clone().lerp(hb[Math.floor(hb.length * 0.25)][1], 0.5), { part: 'hbond', priority: 1.2 });

  return { view: { pos: [6.2, 2.2, 10.5], target: [0.2, 0, 0], min: 3, max: 30, k: 0.35 } };
}
