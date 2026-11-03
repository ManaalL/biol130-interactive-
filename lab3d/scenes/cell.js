/* Modules 1 and 3: animal cell with a quarter cut away (the x>0, z>0 wedge is removed). */
import * as THREE from '../vendor/three.module.min.js';
import { V, tube, spheres, rods, rng, blobGeo } from '../geo.js';

const WEDGE_START = Math.PI, WEDGE_LEN = Math.PI * 1.5;   // keeps everything except phi 90-180 degrees (x>0, z>0)
const inCut = (p, c = V()) => p.x - c.x > 0 && p.z - c.z > 0;

export function build(ctx) {
  const g = new THREE.Group(); ctx.add(g);
  const R = 6, SY = 0.8;
  const r = rng(21);

  // plasma membrane: outer surface, paler inner surface, and a rim along the cut
  const memG = new THREE.SphereGeometry(R, 64, 40, WEDGE_START, WEDGE_LEN);
  const memOut = new THREE.Mesh(memG, ctx.mat('#d8c29a'));
  const memIn = new THREE.Mesh(memG, ctx.mat('#efe6d3', { side: THREE.BackSide }));
  const mem = new THREE.Group(); mem.add(memOut, memIn); mem.scale.set(1, SY, 1);
  const rimPts1 = [], rimPts2 = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40 * Math.PI; rimPts1.push(V(R * Math.sin(t), R * Math.cos(t), 0)); rimPts2.push(V(0, R * Math.cos(t), R * Math.sin(t))); }
  const rimMat = ctx.mat('#b79d6e');
  mem.add(tube(rimPts1, 0.07, rimMat, 80, 6), tube(rimPts2, 0.07, rimMat, 80, 6));
  g.add(mem);
  ctx.part('pm', 'Plasma membrane', 'Phospholipids and proteins that separate the cell from its surroundings and regulate what passes in and out. It is part of the endomembrane system. Module 1 p. 9; Module 3 pp. 33, 37.', mem);

  // cytosol as a clickable region (invisible until selected)
  const cytG = new THREE.SphereGeometry(R - 0.12, 32, 20, WEDGE_START, WEDGE_LEN);
  const cyt = new THREE.Mesh(cytG, ctx.mat('#cfe3da', { opacity: 0.0, side: THREE.BackSide })); cyt.scale.set(1, SY, 1);
  cyt.material.visible = false; g.add(cyt);
  ctx.region('cytosol', 'Cytosol', 'The cytoplasm is everything inside the plasma membrane except the nucleus. The cytosol is the fluid region outside the organelles but inside the plasma membrane. Module 3 p. 37.', cyt);

  // nucleus: double envelope with pores, nucleolus, chromatin
  const NC = V(-0.6, 0.35, -0.6), NR = 2.15;
  const nuc = new THREE.Group(); nuc.position.copy(NC);
  const envOut = new THREE.Mesh(new THREE.SphereGeometry(NR, 48, 32, WEDGE_START, WEDGE_LEN), ctx.mat('#7d79b4', { side: THREE.DoubleSide }));
  const envIn = new THREE.Mesh(new THREE.SphereGeometry(NR - 0.13, 48, 32, WEDGE_START, WEDGE_LEN), ctx.mat('#a9a3d0', { side: THREE.DoubleSide }));
  nuc.add(envOut, envIn);
  const poreDirs = []; let k = 0;
  while (poreDirs.length < 46 && k++ < 500) { const d = V(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1); if (d.length() > 1 || d.length() < 0.2) continue; d.normalize(); if (d.x > 0.05 && d.z > 0.05) continue; if (d.x > -0.12 && d.z > -0.12) continue; poreDirs.push(d); }
  const poreIM = new THREE.InstancedMesh(new THREE.TorusGeometry(0.13, 0.05, 6, 14), ctx.mat('#3f3a6e'), poreDirs.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  poreDirs.forEach((d, i) => { q.setFromUnitVectors(V(0, 0, 1), d); m4.compose(d.clone().multiplyScalar(NR + 0.02), q, V(1, 1, 1)); poreIM.setMatrixAt(i, m4); });
  poreIM.computeBoundingSphere(); nuc.add(poreIM);
  const nucleolus = new THREE.Mesh(blobGeo(0.62, { seed: 5, amp: 0.12 }), ctx.mat('#4b456f'));
  nucleolus.position.set(0.55, -0.25, 0.55); nuc.add(nucleolus);
  const chrom = new THREE.Group(), chMat = ctx.mat('#8e6fae');
  for (let c = 0; c < 7; c++) {
    const pts = []; let p = V((r() - 0.5) * 1.8, (r() - 0.5) * 1.8, (r() - 0.5) * 1.8);
    for (let i = 0; i < 9; i++) { p = p.clone().add(V((r() - 0.5) * 0.8, (r() - 0.5) * 0.8, (r() - 0.5) * 0.8)); if (p.length() > NR - 0.45) p.multiplyScalar((NR - 0.45) / p.length()); pts.push(p); }
    chrom.add(tube(pts, 0.05, chMat, 60, 5));
  }
  nuc.add(chrom);
  g.add(nuc);
  ctx.part('nuc', 'Nucleus and nuclear envelope', 'The nucleus holds the cell\'s chromosomes: it stores genetic information and is the site of RNA synthesis. The nuclear envelope is a double membrane (inner and outer), and the outer membrane is continuous with the ER. Module 1 p. 9; Module 3 p. 38.', envOut, envIn);
  ctx.part('pores', 'Nuclear pores', 'Protein openings through the nuclear envelope that let molecules move into and out of the nucleus. They are essential for the nucleus to communicate with the rest of the cell. Module 3 p. 38.', poreIM);
  ctx.part('nucleolus', 'Nucleolus', 'A dense region inside the nucleus where ribosomal RNA is made and ribosome subunits are put together. The notes list it with the non-endomembrane structures. Module 1 p. 9.', nucleolus);
  ctx.part('chromatin', 'Chromatin', 'DNA packaged with histone proteins. In a cell that is not dividing it is spread through the nucleus instead of being condensed into visible chromosomes. Module 11 p. 172.', chrom);

  // rough ER: curved sheets around the nucleus facing the right-hand opening, studded with ribosomes
  const rer = new THREE.Group(); rer.position.copy(NC);
  const rerMat = ctx.mat('#6f8fc7', { side: THREE.DoubleSide });
  const ribo = [];
  [[2.55, 3.35, 1.9], [2.9, 3.3, 1.8], [3.25, 3.4, 1.6]].forEach(([rad, ps, pl], i) => {
    const th0 = 0.75 + i * 0.05, thL = 1.5 - i * 0.1;
    const s = new THREE.Mesh(new THREE.SphereGeometry(rad, 32, 14, ps, pl, th0, thL), rerMat); rer.add(s);
    for (let n = 0; n < 110; n++) {
      const ph = ps + r() * pl, th = th0 + r() * thL;
      for (const off of [0.07, -0.07]) { const rr = rad + off; ribo.push(V(-rr * Math.cos(ph) * Math.sin(th), rr * Math.cos(th), rr * Math.sin(ph) * Math.sin(th)).add(NC)); }
    }
  });
  // ribosomes free in the cytosol
  for (let n = 0; n < 60; n++) { const p = V((r() - 0.5) * 9, (r() - 0.5) * 6.5, (r() - 0.5) * 9); if (p.length() > 4.9 || p.distanceTo(NC) < 2.6 || inCut(p)) continue; ribo.push(p); }
  g.add(rer);
  const riboIM = spheres(ribo, 0.05, ctx.mat('#2f3c63'), 0); g.add(riboIM);
  ctx.part('rer', 'Rough endoplasmic reticulum', 'A network of flattened sacs continuous with the outer nuclear membrane. Ribosomes on its cytosolic surface make proteins, many of them destined for membranes or for secretion. Its folds give a large membrane surface area. Module 3 pp. 38–39.', rer);
  ctx.part('ribo', 'Ribosomes', 'Sites of protein synthesis, where amino acids are assembled into polypeptides. Some are bound to the rough ER and others are free in the cytosol. Module 3 p. 39.', riboIM);

  // smooth ER: tubules in the left-hand part of the cell
  const ser = new THREE.Group(), serMat = ctx.mat('#86b2a2');
  const SC = V(-2.6, -1.7, 2.2);
  for (let i = 0; i < 6; i++) {
    const pts = []; let p = SC.clone().add(V((r() - 0.5) * 1.5, (r() - 0.5) * 1.0, (r() - 0.5) * 1.2));
    for (let j = 0; j < 6; j++) { p = p.clone().add(V((r() - 0.5) * 0.9, (r() - 0.5) * 0.6, (r() - 0.5) * 0.9)); pts.push(p); }
    ser.add(tube(pts, 0.12, serMat, 40, 7));
  }
  g.add(ser);
  ctx.part('ser', 'Smooth endoplasmic reticulum', 'ER that lacks ribosomes. It is the site of fatty acid and phospholipid synthesis, and parts of it bud off as vesicles. Cells that make a lot of lipid have a lot of smooth ER. Module 3 p. 39.', ser);

  // Golgi apparatus: curved stack of cisternae with vesicles
  const gol = new THREE.Group(), golMat = ctx.mat('#c9746a');
  for (let i = 0; i < 5; i++) {
    const geo = new THREE.SphereGeometry(1, 28, 10); const pos = geo.attributes.position;
    const sx = 1.25 - i * 0.12, sz = 0.85 - i * 0.07;
    for (let v = 0; v < pos.count; v++) { const x = pos.getX(v) * sx, z = pos.getZ(v) * sz; pos.setXYZ(v, x, pos.getY(v) * 0.09 + 0.28 * (x * x + z * z), z); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, golMat); m.position.y = i * 0.25; gol.add(m);
  }
  gol.position.set(2.9, -0.9, -1.9); gol.lookAt(NC); gol.rotateX(Math.PI / 2);
  g.add(gol);
  ctx.part('golgi', 'Golgi apparatus', 'A stack of flattened sacs called cisternae. It is not attached to the ER; vesicles from the ER bring it proteins and lipids, which it modifies, sorts to their destinations and tags with carbohydrates (glycosylation). Module 3 p. 39.', gol);
  const vesPos = [];
  for (let i = 0; i < 9; i++) { const a = r() * 6.283; vesPos.push(V(2.9 + Math.cos(a) * 1.5, -0.9 + (r() - 0.3) * 1.4, -1.9 + Math.sin(a) * 1.1)); }
  vesPos.push(V(4.6, -2.2, -1.2), V(4.9, 0.6, -1.6), V(1.7, 1.6, -3.4));
  const vesIM = spheres(vesPos.filter(p => !inCut(p)), 0.2, ctx.mat('#e0a08a'), 1); g.add(vesIM);
  ctx.part('ves', 'Vesicles', 'Small membrane sacs that bud off one compartment and fuse with another. They carry proteins from the ER to the Golgi, between Golgi regions, and to the plasma membrane, where they release their contents outside the cell by exocytosis. Module 3 pp. 37, 39.', vesIM);

  // mitochondria
  const mitoG = new THREE.Group(), mMat = ctx.mat('#c77a4f'), crMat = ctx.mat('#8f4f33');
  [[V(-3.2, 1.6, 1.8), 0.6, 0.3], [V(2.7, 2.0, -2.6), -0.4, 1.2], [V(3.9, -2.1, -0.7), 0.9, -0.3], [V(-1.4, -2.7, 3.2), 0.2, 0.8], [V(-3.6, -0.2, -2.2), 1.2, 0.4]].forEach(([p, a, b]) => {
    const m = new THREE.Group();
    m.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.3, 6, 16), mMat));
    for (let i = -2; i <= 2; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.03, 4, 18), crMat); t.rotation.x = Math.PI / 2; t.position.y = i * 0.3; m.add(t); }
    m.position.copy(p); m.rotation.set(a, b, a * 0.5 + 1.1); mitoG.add(m);
  });
  g.add(mitoG);
  ctx.part('mito', 'Mitochondria', 'Rod-shaped organelles that harness energy from compounds such as sugars and convert it into ATP. They have a double membrane with a highly folded inner membrane, and they are semi-autonomous with their own circular DNA. Not part of the endomembrane system. Open the Mitochondrion model for the inside. Module 3 p. 41.', mitoG);

  // lysosomes
  const lysPos = [V(1.4, -2.9, -2.4), V(-3.4, 0.9, 2.9), V(4.1, 1.1, -1.4), V(-0.6, -3.2, 2.0)];
  const lysIM = spheres(lysPos, 0.36, ctx.mat('#4f8f7a'), 2); g.add(lysIM);
  ctx.part('lys', 'Lysosomes', 'Specialized vesicles derived from the Golgi. Their enzymes break down damaged or unneeded proteins, nucleic acids, lipids and complex carbohydrates. A proton pump in the lysosome membrane keeps the inside at about pH 5. Module 3 p. 40.', lysIM);

  // centrosome: two centrioles at right angles, each nine triplets of microtubules
  const CC = V(1.6, 1.9, -1.2);
  const cen = new THREE.Group(); cen.position.copy(CC);
  const cMat = ctx.mat('#3d6b5f');
  const centriole = () => { const c = new THREE.Group(); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; for (let t = 0; t < 3; t++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 5), cMat); const rr = 0.16 + t * 0.045; m.position.set(Math.cos(a + t * 0.25) * rr, 0, Math.sin(a + t * 0.25) * rr); c.add(m); } } return c; };
  const c1 = centriole(), c2 = centriole(); c2.rotation.x = Math.PI / 2; c2.position.set(0.35, 0.2, 0.1);
  cen.add(c1, c2); g.add(cen);
  ctx.part('cen', 'Centrosome', 'The microtubule-organizing centre of an animal cell, built around a pair of centrioles at right angles. Microtubule minus ends sit here and plus ends grow out toward the plasma membrane. It duplicates before mitosis and the two move to opposite poles. Module 10 pp. 144, 146; Module 11 p. 173.', cen);

  // microtubules radiating from the centrosome
  const mts = new THREE.Group(), mtMat = ctx.mat('#5aa08c');
  let made = 0, tries = 0, mtMid = null;
  while (made < 16 && tries++ < 200) {
    const d = V(r() * 2 - 1, (r() * 2 - 1) * 0.8, r() * 2 - 1).normalize();
    const end = V(d.x * R * 0.93, d.y * R * SY * 0.93, d.z * R * 0.93);
    if (inCut(end) || end.distanceTo(NC) < 1) continue;
    const mid = CC.clone().lerp(end, 0.5); if (mid.distanceTo(NC) < NR + 0.4) continue;
    mid.add(V((r() - 0.5) * 0.8, (r() - 0.5) * 0.8, (r() - 0.5) * 0.8));
    mts.add(tube([CC.clone(), mid, end], 0.03, mtMat, 30, 4)); made++;
    if (!mtMid && end.x > 0 && end.y > 0) mtMid = mid.clone();
  }
  g.add(mts);
  ctx.part('mt', 'Cytoskeleton (microtubules)', 'The cytoskeleton is a network of protein filaments that gives the cell internal support and moves substances around. Microtubules radiate from the centrosome toward the cell edge, help the cell resist compression and hold organelles in place. Module 1 p. 9; Module 10 pp. 143–144.', mts);

  // labels
  const L = (t, p, part, pr = 2, o = {}) => ctx.label(t, p, { part, priority: pr, ...o });
  L('Plasma membrane', V(R * 0.62, R * SY * 0.78, 0.05), 'pm', 3, { occlude: false });
  L('Nucleus', NC.clone().add(V(0.2, NR * 0.98, 0.25)), 'nuc', 3, { occlude: false });
  L('Nuclear pore', NC.clone().add(poreDirs.reduce((b, d) => (d.y > 0.3 && d.x + d.z > b.x + b.z ? d : b), poreDirs[0]).clone().multiplyScalar(NR + 0.05)), 'pores', 1.5);
  L('Nucleolus', NC.clone().add(V(0.75, -0.1, 0.75)), 'nucleolus', 2.5);
  L('Chromatin', NC.clone().add(V(0.2, 0.6, 0.6)), 'chromatin', 1);
  L('Rough ER', NC.clone().add(V(2.4, 0.9, -1.4)), 'rer', 2.5);
  L('Ribosomes', ribo[30], 'ribo', 1.2);
  L('Smooth ER', SC.clone().add(V(0.2, 0.3, 0.4)), 'ser', 2);
  L('Golgi apparatus', V(3.2, -0.6, -1.6), 'golgi', 2.5);
  L('Vesicle', vesPos[vesPos.length - 3], 'ves', 1);
  L('Mitochondrion', V(-3.2, 1.6, 1.8), 'mito', 2);
  L('Lysosome', lysPos[2], 'lys', 1.5);
  L('Centrosome', CC.clone(), 'cen', 2);
  L('Microtubule', mtMid || CC.clone(), 'mt', 1);

  return { view: { pos: [11.5, 7.5, 12.5], target: [0.2, -0.2, 0], min: 4, max: 40, k: 0.72 } };
}
