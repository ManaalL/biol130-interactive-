/* Geometry helpers for the 3D lab. Procedural, low-poly, no external assets. */
import * as THREE from './vendor/three.module.min.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

/* small seeded random so every load builds the same model */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function tubeGeo(points, r, segs, radial = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'catmullrom', 0.5);
  return new THREE.TubeGeometry(curve, segs || Math.max(12, points.length * 8), r, radial, closed);
}

export function tube(points, r, mat, segs, radial, closed) {
  return new THREE.Mesh(tubeGeo(points, r, segs, radial, closed), mat);
}

/* a cylinder mesh from a to b */
export function rod(a, b, r, mat, radial = 8) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, radial, 1), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
  return m;
}

const _q = new THREE.Quaternion(), _s = V(), _p = V(), _d = V();
/* matrix for a unit cylinder (radius 1, height 1, centred) stretched from a to b */
export function rodMatrix(m4, a, b, r) {
  _d.copy(b).sub(a); const len = _d.length() || 1e-4;
  _q.setFromUnitVectors(UP, _d.multiplyScalar(1 / len));
  _p.copy(a).add(b).multiplyScalar(0.5);
  _s.set(r, len, r);
  return m4.compose(_p, _q, _s);
}

export function sphereMatrix(m4, p, r) { _q.identity(); _s.set(r, r, r); return m4.compose(p, _q, _s); }

/* InstancedMesh of spheres */
export function spheres(positions, r, mat, detail = 1, colors) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const im = new THREE.InstancedMesh(g, mat, positions.length);
  const m4 = new THREE.Matrix4();
  positions.forEach((p, i) => { sphereMatrix(m4, p, Array.isArray(r) ? r[i] : r); im.setMatrixAt(i, m4); if (colors) im.setColorAt(i, colors[i]); });
  im.computeBoundingSphere();
  return im;
}

/* InstancedMesh of rods given [a,b] pairs */
export function rods(pairs, r, mat, radial = 6) {
  const g = new THREE.CylinderGeometry(1, 1, 1, radial, 1, false);
  const im = new THREE.InstancedMesh(g, mat, pairs.length);
  const m4 = new THREE.Matrix4();
  pairs.forEach(([a, b], i) => { rodMatrix(m4, a, b, Array.isArray(r) ? r[i] : r); im.setMatrixAt(i, m4); });
  im.computeBoundingSphere();
  return im;
}

/* organic protein-like blob: an icosphere pushed around by smooth noise */
export function blobGeo(r = 1, { sx = 1, sy = 1, sz = 1, seed = 3, amp = 0.16, freq = 2.2, detail = 3 } = {}) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const pos = g.attributes.position, R = rng(seed);
  const ph = Array.from({ length: 9 }, () => R() * 6.283);
  const v = V();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); const n = v.clone().normalize();
    const k = 1 + amp * (Math.sin(n.x * freq * 2 + ph[0]) * Math.cos(n.y * freq * 1.7 + ph[1]) + 0.6 * Math.sin(n.z * freq * 2.6 + ph[2] + n.x * 2) + 0.4 * Math.sin((n.x + n.y + n.z) * freq * 3 + ph[3]));
    v.multiplyScalar(k); v.x *= sx; v.y *= sy; v.z *= sz;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/* flat ribbon (box cross-section) swept along points.
   sides[i]: unit width direction; widths[i]: width; thick: thickness */
export function ribbonGeo(points, sides, widths, thick = 0.08) {
  const n = points.length, pos = [], idx = [];
  const tang = points.map((p, i) => points[Math.min(n - 1, i + 1)].clone().sub(points[Math.max(0, i - 1)]).normalize());
  const norms = points.map((p, i) => V().crossVectors(tang[i], sides[i]).normalize());
  const corner = (i, a, b) => points[i].clone().addScaledVector(sides[i], a * widths[i] / 2).addScaledVector(norms[i], b * thick / 2);
  const faces = [[[1, 1], [-1, 1]], [[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[-1, 1], [-1, -1]]];
  faces.forEach(([c0, c1]) => {
    const base = pos.length / 3;
    for (let i = 0; i < n; i++) { const a = corner(i, c0[0], c0[1]), b = corner(i, c1[0], c1[1]); pos.push(a.x, a.y, a.z, b.x, b.y, b.z); }
    for (let i = 0; i < n - 1; i++) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  });
  // end caps
  [0, n - 1].forEach((i, k) => {
    const base = pos.length / 3; [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([a, b]) => { const c = corner(i, a, b); pos.push(c.x, c.y, c.z); });
    if (k === 0) idx.push(base, base + 2, base + 1, base, base + 3, base + 2); else idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* alpha helix ribbon around an axis from a to b. Right-handed, 3.6 residues per turn. */
export function helixRibbon(a, b, { radius = 0.42, perTurn = 3.6, rise = 0.17, width = 0.36, thick = 0.08, phase = 0 } = {}) {
  const axis = b.clone().sub(a), L = axis.length(); axis.normalize();
  const ref = Math.abs(axis.y) < 0.9 ? UP : V(1, 0, 0);
  const u = V().crossVectors(axis, ref).normalize(), w = V().crossVectors(axis, u).normalize();
  const nRes = Math.max(4, Math.round(L / rise)); const steps = nRes * 6;
  const pts = [], sides = [], widths = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, ang = phase + t * nRes / perTurn * Math.PI * 2;
    // right-handed: angle increases counter-clockwise looking down the axis toward a
    const radial = u.clone().multiplyScalar(Math.cos(ang)).addScaledVector(w, Math.sin(ang));
    const taper = Math.min(1, t * 8, (1 - t) * 8);
    pts.push(a.clone().addScaledVector(axis, t * L).addScaledVector(radial, radius * (0.35 + 0.65 * taper)));
    sides.push(axis.clone());
    widths.push(width * (0.4 + 0.6 * taper));
  }
  // side vector must be perpendicular to tangent: project
  for (let i = 0; i < pts.length; i++) {
    const tn = pts[Math.min(pts.length - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
    sides[i].addScaledVector(tn, -sides[i].dot(tn)).normalize();
  }
  return { geo: ribbonGeo(pts, sides, widths, thick), start: pts[0], end: pts[pts.length - 1], nRes,
    residue: (k) => { const t = k / nRes, ang = phase + k / perTurn * Math.PI * 2; return a.clone().addScaledVector(axis, t * L).addScaledVector(u.clone().multiplyScalar(Math.cos(ang)).addScaledVector(w, Math.sin(ang)), radius); } };
}

/* beta strand drawn as a flattened arrow from a to b, pleated slightly, arrowhead at b (C-terminal end) */
export function strandArrow(a, b, side, { width = 0.5, thick = 0.1, pleat = 0.07, head = 0.6 } = {}) {
  const dir = b.clone().sub(a), L = dir.length(); dir.normalize();
  const sd = side.clone().addScaledVector(dir, -side.dot(dir)).normalize();
  const nrm = V().crossVectors(dir, sd).normalize();
  const n = 28, pts = [], sides = [], widths = [];
  const headStart = Math.max(0.3, (L - head) / L);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(a.clone().addScaledVector(dir, t * L).addScaledVector(nrm, Math.sin(t * L / 0.34 * Math.PI) * pleat));
    sides.push(sd.clone());
    widths.push(t < headStart ? width : width * 1.75 * (1 - (t - headStart) / (1 - headStart)) + 0.02);
  }
  // sharp shoulder of the arrow
  const k = Math.round(headStart * n); widths.splice(k, 0, width); pts.splice(k, 0, pts[k].clone()); sides.splice(k, 0, sd.clone());
  return ribbonGeo(pts, sides, widths, thick);
}

/* Tube whose path can be changed every frame without reallocating. */
export class DynTube {
  constructor(nSeg, radial, radius, material) {
    this.n = nSeg; this.rad = radial; this.r = radius;
    const nv = (nSeg + 1) * (radial + 1);
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(nv * 3); this.nor = new Float32Array(nv * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let j = 0; j < nSeg; j++) for (let i = 0; i < radial; i++) {
      const a = j * (radial + 1) + i, b = (j + 1) * (radial + 1) + i;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    g.setIndex(idx);
    this.geo = g; this.mesh = new THREE.Mesh(g, material); this.mesh.frustumCulled = false;
    this._t = V(); this._n = V(); this._b = V(); this._ref = V(0, 0, 1);
  }
  /* fn(u) -> Vector3 for u in [0,1]; target used to avoid allocation */
  set(fn) {
    const n = this.n, R = this.rad, P = [];
    for (let j = 0; j <= n; j++) P.push(fn(j / n, V()));
    const t = this._t, nn = this._n, bb = this._b;
    for (let j = 0; j <= n; j++) {
      t.copy(P[Math.min(n, j + 1)]).sub(P[Math.max(0, j - 1)]); if (t.lengthSq() < 1e-10) t.set(1, 0, 0); t.normalize();
      const ref = Math.abs(t.z) > 0.9 ? V(0, 1, 0) : this._ref;
      nn.crossVectors(ref, t).normalize(); bb.crossVectors(t, nn);
      for (let i = 0; i <= R; i++) {
        const a = i / R * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), k = (j * (R + 1) + i) * 3;
        const nx = nn.x * c + bb.x * s, ny = nn.y * c + bb.y * s, nz = nn.z * c + bb.z * s;
        this.nor[k] = nx; this.nor[k + 1] = ny; this.nor[k + 2] = nz;
        this.pos[k] = P[j].x + nx * this.r; this.pos[k + 1] = P[j].y + ny * this.r; this.pos[k + 2] = P[j].z + nz * this.r;
      }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.normal.needsUpdate = true;
    this.geo.computeBoundingSphere();
  }
}

/* A patch of phospholipid bilayer built from instanced heads and tails.
   y is the bilayer midplane; heads sit at y +/- half. holes: [{x,z,r}] to leave room for proteins. */
export function bilayer({ w = 12, d = 4, spacing = 0.46, y = 0, half = 1.0, headR = 0.2, tailLen = 0.78, tailR = 0.05, holes = [], headMat, tailMat, jitter = 0.06, seed = 7, skip }) {
  const R = rng(seed), heads = [], tails = [], lipids = [];
  const nx = Math.round(w / spacing), nz = Math.round(d / spacing);
  for (const sgn of [1, -1]) for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const x = -w / 2 + (i + 0.5) * spacing + (k % 2 ? spacing / 2 : 0) + (R() - 0.5) * jitter;
    const z = -d / 2 + (k + 0.5) * spacing + (R() - 0.5) * jitter;
    if (x > w / 2) continue;
    if (holes.some(h => (x - h.x) ** 2 + (z - (h.z || 0)) ** 2 < h.r * h.r)) continue;
    if (skip && skip(x, z, sgn)) continue;
    lipids.push({ x, z, sgn, ph: R() * 6.283, kink: R() < 0.3 });
  }
  const headPos = lipids.map(l => V(l.x, y + l.sgn * half, l.z));
  const headIM = spheres(headPos, headR, headMat, 1);
  const tg = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
  const tailIM = new THREE.InstancedMesh(tg, tailMat, lipids.length * 2);
  const api = {
    lipids, heads: headIM, tails: tailIM, y, half,
    place(offsets) { // offsets: optional array of {dx,dz} per lipid
      const m4 = new THREE.Matrix4(), a = V(), b = V(), c = V();
      lipids.forEach((l, i) => {
        const ox = offsets ? offsets[i].dx : 0, oz = offsets ? offsets[i].dz : 0;
        const hx = l.x + ox, hz = l.z + oz, hy = y + l.sgn * half;
        sphereMatrix(m4, a.set(hx, hy, hz), headR); headIM.setMatrixAt(i, m4);
        for (let t = 0; t < 2; t++) {
          const dx = (t ? 1 : -1) * 0.075;
          const top = a.set(hx + dx, hy - l.sgn * headR * 0.7, hz);
          const endY = hy - l.sgn * (headR * 0.7 + tailLen);
          const kinkX = (t && l.kink) ? 0.16 : 0;
          b.set(hx + dx + kinkX, endY, hz);
          rodMatrix(m4, top, b, tailR); tailIM.setMatrixAt(i * 2 + t, m4);
        }
      });
      headIM.instanceMatrix.needsUpdate = true; tailIM.instanceMatrix.needsUpdate = true;
    }
  };
  api.place();
  tailIM.computeBoundingSphere();
  return api;
}

/* wavy arrow made of a tube and a cone head */
export function arrow(points, r, mat) {
  const g = new THREE.Group();
  const n = points.length; const end = points[n - 1], prev = points[n - 2];
  const dir = end.clone().sub(prev).normalize();
  const shaftEnd = end.clone().addScaledVector(dir, -r * 5);
  const pts = points.slice(0, n - 1).concat([shaftEnd]);
  g.add(tube(pts, r, mat, pts.length * 10, 6));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 3, r * 6, 10), mat);
  cone.position.copy(shaftEnd).addScaledVector(dir, r * 3);
  cone.quaternion.setFromUnitVectors(UP, dir);
  g.add(cone);
  return g;
}

/* dashed line made from small rods (instanced) */
export function dashes(a, b, n, r, mat) {
  const pairs = [];
  for (let i = 0; i < n; i++) {
    const t0 = (i + 0.15) / n, t1 = (i + 0.65) / n;
    pairs.push([a.clone().lerp(b, t0), a.clone().lerp(b, t1)]);
  }
  return pairs;
}

export function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
export function damp(cur, target, k, dt) { return target + (cur - target) * Math.exp(-k * dt); }
