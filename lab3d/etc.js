/* Shared electron transport chain machinery for the mitochondrion and chloroplast zoom views.
   Membrane lies flat at y = 0. "top" is the matrix or stroma, "bot" is the intermembrane space or thylakoid lumen.
   Protons are a fixed pool of instanced spheres that wander, get pumped, and flow back through ATP synthase. */
import * as THREE from './vendor/three.module.min.js';
import { V, rng, sphereMatrix, blobGeo, rods } from './geo.js';

/* ATP synthase: Fo ring in the membrane (rotor), central stalk (rotor), F1 head (stator), peripheral stalk (stator) */
export function atpSynthase(ctx, { x = 0, z = 0.6, color = '#5a63a8', rotorColor = '#7d86c8' } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const stMat = ctx.mat(color), roMat = ctx.mat(rotorColor);
  const rotor = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, c = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.9, 8), roMat);
    c.position.set(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62); rotor.add(c);
  }
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.3, 8), roMat); stalk.position.y = 1.9; rotor.add(stalk);
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.12), roMat); mark.position.set(0.25, 1.45, 0); rotor.add(mark);
  g.add(rotor);
  const head = new THREE.Group(); head.position.y = 3.35;
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 2), ctx.mat(i % 2 ? color : '#8c93cf')); s.position.set(Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55); head.add(s); }
  const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), stMat); cap.position.y = 0.5; head.add(cap);
  g.add(head);
  const aSub = new THREE.Mesh(blobGeo(0.42, { sy: 2.1, seed: 2, amp: 0.1 }), stMat); aSub.position.set(1.05, 0, 0); g.add(aSub);
  const peri = rods([[V(1.12, 0.6, 0), V(0.9, 3.6, 0)], [V(0.9, 3.6, 0), V(0.3, 3.95, 0)]], 0.09, stMat, 6); g.add(peri);
  return { g, rotor, head, fo: rotor, f1: head };
}

/* membrane-embedded protein blob */
export function complexBlob(ctx, color, { x, y = 0, z = 0.6, r = 1, sx = 1, sy = 1, sz = 1, seed = 1 }) {
  const m = new THREE.Mesh(blobGeo(r, { sx, sy, sz, seed, amp: 0.14 }), ctx.mat(color));
  m.position.set(x, y, z); return m;
}

export function createETC(ctx, group, cfg) {
  const W = cfg.W, D = cfg.D, R = rng(cfg.seed || 5);
  const box = { top: [cfg.topY[0], cfg.topY[1]], bot: [cfg.botY[0], cfg.botY[1]] };
  const N = cfg.nH || 64;
  const hMat = ctx.mat(cfg.hColor || '#4aa3c8', { emissive: cfg.hColor || '#4aa3c8', ei: 0.18 });
  const hIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), hMat, N); hIM.frustumCulled = false;
  group.add(hIM);
  const randIn = (side) => V((R() - 0.5) * (W - 1.2), box[side][0] + R() * (box[side][1] - box[side][0]), (R() - 0.5) * (D - 0.6));
  const H = [];
  for (let i = 0; i < N; i++) {
    const side = i < cfg.initBot ? 'bot' : i < cfg.initBot + cfg.initTop ? 'top' : 'off';
    H.push({ s: side, p: randIn(side === 'off' ? 'top' : side), v: V((R() - 0.5), (R() - 0.5) * 0.6, (R() - 0.5)).multiplyScalar(0.6), path: null, k: 0, end: null });
  }
  const m4 = new THREE.Matrix4();
  function drawH() {
    H.forEach((h, i) => { sphereMatrix(m4, h.p, h.s === 'off' ? 0.0001 : 0.17); hIM.setMatrixAt(i, m4); });
    hIM.instanceMatrix.needsUpdate = true;
  }
  drawH();

  // electron token
  const eMat = ctx.mat('#f2b63a', { emissive: '#f2b63a', ei: 0.85 });
  const eMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 2), eMat); eMesh.visible = false; group.add(eMesh);
  const ATPm = ctx.mat('#e0a03a', { emissive: '#e0a03a', ei: 0.25 });
  const atps = Array.from({ length: 8 }, () => { const g = new THREE.Group(); [[0, 0], [0.22, 0.1], [0.42, 0.2]].forEach(([dx, dy], i) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(i ? 0.12 : 0.2, 1), ATPm); s.position.set(dx, dy, 0); g.add(s); }); g.visible = false; group.add(g); return { g, t: 0, on: false }; });
  const puffs = [];   // generic short-lived markers (O2 from water, water from O2, NADPH)
  const stats = { atp: 0, flow: 0, electrons: 0 };
  let rotorSpeed = 0, synthAcc = 0, cool = 0.3, e = null, routeIdx = 0, burst = 0, carriersBack = [], wantOne = false;

  function sidePick(side, nearX) {
    let best = null, bd = 1e9;
    for (const h of H) if (h.s === side) { const d = Math.abs(h.p.x - nearX) + R() * 2.5; if (d < bd) { bd = d; best = h; } }
    return best;
  }
  function send(h, pts, endSide, speed = 3.4) { h.s = 'tr'; h.path = [h.p.clone(), ...pts]; h.k = 0; h.seg = 0; h.end = endSide; h.speed = speed; }
  const api = {
    pump(x, n, from = 'top', to = 'bot') {
      for (let i = 0; i < n; i++) {
        const h = sidePick(from, x); if (!h) return;
        const z = cfg.pathZ ?? 0.6;
        const yA = from === 'top' ? 2.0 : -2.0;
        send(h, [V(x + (R() - 0.5) * 0.4, yA, z), V(x + (R() - 0.5) * 0.4, -yA, z), randIn(to)], to);
      }
    },
    spawn(p, side) { const h = H.find(q => q.s === 'off'); if (!h) return; h.p.copy(p); h.s = 'tr'; h.path = [p.clone(), randIn(side)]; h.k = 0; h.seg = 0; h.end = side; h.speed = 2.2; },
    consume(p, side = 'top') { const h = sidePick(side, p.x); if (!h) return; send(h, [p.clone()], 'off', 3); },
    puff(obj, dur = 1.6, rise = 1.2) { obj.visible = true; puffs.push({ obj, t: 0, dur, rise, y0: obj.position.y }); },
    count(side) { return H.filter(h => h.s === side).length; },
    stats,
    get busy() { return !!e; },
    stepOnce() { burst = Math.max(burst, cfg.burstTime || 4.5); wantOne = true; cool = Math.min(cool, 0.05); },
  };

  function startElectron() {
    const routes = cfg.routes; const pattern = cfg.pattern || [0];
    const r = routes[pattern[routeIdx % pattern.length]]; routeIdx++;
    e = { r, i: 0, t: 0 };
    eMesh.position.copy(r[0].p); eMesh.visible = true;
    r[0].action && r[0].action(api);
  }

  api.update = function (dt, playing) {
    const live = playing || burst > 0;
    if (!live) return false;
    if (!playing) burst -= dt;
    // electrons, one at a time
    if (!e) { cool -= dt; if (cool <= 0 && cfg.canStart() && (playing || wantOne)) { startElectron(); wantOne = false; } }
    if (e) {
      const leg = e.r[e.i + 1];
      if (!leg) { eMesh.visible = false; e = null; cool = cfg.gapTime ?? 0.35; stats.electrons++; }
      else if (e.t === 0 && leg.gate && !leg.gate()) { /* waiting */ }
      else {
        if (e.t === 0 && leg.carrier) leg.carrier.userData.home = leg.carrier.userData.home || leg.carrier.position.clone();
        e.t = Math.min(1, e.t + dt / leg.dur);
        const a = e.r[e.i].p, b = leg.p, k = e.t < 0.5 ? 2 * e.t * e.t : 1 - Math.pow(-2 * e.t + 2, 2) / 2;
        eMesh.position.lerpVectors(a, b, k);
        if (leg.carrier) leg.carrier.position.copy(leg.carrier.userData.home).add(V().subVectors(eMesh.position, a));
        if (e.t >= 1) {
          if (leg.carrier) carriersBack.push({ c: leg.carrier, from: leg.carrier.position.clone(), t: 0 });
          leg.action && leg.action(api);
          e.i++; e.t = 0;
        }
      }
    }
    carriersBack = carriersBack.filter(cb => { cb.t = Math.min(1, cb.t + dt / 0.9); cb.c.position.lerpVectors(cb.from, cb.c.userData.home, cb.t); return cb.t < 1; });

    // ATP synthase: flow rate rises with the number of protons on the high side
    // flow through ATP synthase rises with the difference in H+ across the membrane, and stops when it is gone
    const nb = api.count('bot'), nt = api.count('top');
    const rate = Math.max(0, nb - nt - (cfg.threshold ?? 2)) * (cfg.synthK ?? 0.045);
    synthAcc += rate * dt;
    while (synthAcc >= 1) {
      synthAcc -= 1;
      const h = sidePick('bot', cfg.synthX); if (!h) break;
      const z = cfg.synthZ ?? 0.6;
      send(h, [V(cfg.synthX + 0.62, -2.0, z), V(cfg.synthX + 0.62, 0, z), V(cfg.synthX, 1.4, z), randIn('top')], 'top', 3.2);
      stats.flow++;
      if (stats.flow % 3 === 0) {
        const a = atps.find(q => !q.on); if (a) { a.on = true; a.t = 0; a.g.visible = true; a.g.position.set(cfg.synthX + 0.6, 3.3, (cfg.synthZ ?? 0.6) + 0.5); }
        stats.atp++;
      }
    }
    rotorSpeed += ((rate > 0.05 ? 1.2 + rate * 2.2 : 0) - rotorSpeed) * Math.min(1, dt * 2.2);
    if (cfg.rotor) cfg.rotor.rotation.y += rotorSpeed * dt;
    atps.forEach(a => { if (!a.on) return; a.t += dt; a.g.position.y += dt * 0.7; a.g.position.x += dt * 0.35; const s = Math.max(0.01, 1 - Math.max(0, a.t - 1.4) / 0.8); a.g.scale.setScalar(s); if (a.t > 2.2) { a.on = false; a.g.visible = false; } });
    for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.t += dt; p.obj.position.y = p.y0 + p.rise * p.t / p.dur; p.obj.scale.setScalar(Math.max(0.01, 1 - Math.max(0, p.t / p.dur - 0.6) / 0.4)); if (p.t >= p.dur) { p.obj.visible = false; p.obj.position.y = p.y0; p.obj.scale.setScalar(1); puffs.splice(i, 1); } }

    // proton motion
    for (const h of H) {
      if (h.s === 'off') continue;
      if (h.s === 'tr') {
        const a = h.path[h.seg], b = h.path[h.seg + 1];
        const L = a.distanceTo(b) || 0.01; h.k += dt * h.speed / L;
        if (h.k >= 1) { h.seg++; h.k = 0; if (h.seg >= h.path.length - 1) { h.p.copy(b); h.s = h.end; continue; } }
        h.p.lerpVectors(h.path[h.seg], h.path[h.seg + 1], Math.min(1, h.k));
        continue;
      }
      const [y0, y1] = box[h.s];
      h.v.x += (R() - 0.5) * dt * 2; h.v.y += (R() - 0.5) * dt * 1.2; h.v.z += (R() - 0.5) * dt * 2; h.v.clampLength(0, 0.7);
      h.p.addScaledVector(h.v, dt);
      if (h.p.x < -W / 2 + 0.6 || h.p.x > W / 2 - 0.6) { h.v.x *= -1; h.p.x = Math.max(-W / 2 + 0.6, Math.min(W / 2 - 0.6, h.p.x)); }
      if (h.p.y < y0 || h.p.y > y1) { h.v.y *= -1; h.p.y = Math.max(y0, Math.min(y1, h.p.y)); }
      if (Math.abs(h.p.z) > D / 2 - 0.3) { h.v.z *= -1; h.p.z = Math.max(-D / 2 + 0.3, Math.min(D / 2 - 0.3, h.p.z)); }
    }
    drawH();
    return true;
  };
  api.hIM = hIM; api.eMesh = eMesh;
  return api;
}
