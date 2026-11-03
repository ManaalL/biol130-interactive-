/* Viewer core for the 3D lab: renderer, camera, orbit controls, clickable parts and HTML labels. */
import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { V } from './geo.js';

export const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

function isDark() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark') return true; if (t === 'light') return false;
  return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
}
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

const SVGNS = 'http://www.w3.org/2000/svg';

export class Viewer {
  constructor({ stage, canvas, svg, layer, hud, onSelect, onInteract }) {
    Object.assign(this, { stage, canvas, svg, layer, hudEl: hud, onSelect, onInteract });
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.05, 500);
    this.scene.add(this.camera);
    const c = this.controls = new OrbitControls(this.camera, canvas);
    c.enableDamping = true; c.dampingFactor = 0.1; c.rotateSpeed = 0.75; c.zoomSpeed = 0.9; c.panSpeed = 0.7;
    c.addEventListener('change', () => { this.dirty = true; });
    c.addEventListener('start', () => { this.tween = null; this.onInteract && this.onInteract(); });
    // soft lighting: sky/ground fill, a key light riding with the camera, and a dim back light
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a949a, 1.55);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffffff, 1.75); this.key.position.set(-3, 5, 4);
    this.camera.add(this.key); this.key.target.position.set(0, 0, -10); this.camera.add(this.key.target);
    this.back = new THREE.DirectionalLight(0xffffff, 0.45); this.back.position.set(4, -2, -6); this.scene.add(this.back);
    this.root = null;
    this.parts = new Map(); this.pickables = []; this.labels = []; this.matOwner = new WeakMap();
    this.labelsOn = true; this.selected = null; this.dirty = true; this.api = null; this.playing = false;
    this.raycaster = new THREE.Raycaster();
    this.accent = new THREE.Color();
    this.applyTheme();
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.applyTheme());
    new MutationObserver(() => this.applyTheme()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(stage);
    this.onscreen = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { this.onscreen = es[0].isIntersecting; if (this.onscreen) this.dirty = true; }).observe(stage);
    this.bindPointer();
    this.clock = new THREE.Clock(); this.lastOcc = 0; this.lastHud = 0;
    const loop = () => { requestAnimationFrame(loop); this.frame(); };
    requestAnimationFrame(loop);
  }

  applyTheme() {
    const dark = isDark();
    this.dark = dark;
    this.renderer.setClearColor(new THREE.Color(cssVar('--fig-fill') || (dark ? '#18241f' : '#fbfaf5')), 1);
    this.accent.set(cssVar('--accent') || '#2a7f6d');
    this.hemi.intensity = dark ? 1.35 : 1.55;
    this.hemi.groundColor.set(dark ? 0x56606a : 0x8a949a);
    if (this.selected) this.highlight(this.selected, true);
    this.dirty = true;
  }

  resize() {
    const w = this.stage.clientWidth, h = this.stage.clientHeight;
    if (!w || !h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.dirty = true;
  }

  /* ---------- scene lifecycle ---------- */
  clear() {
    if (this.root) {
      this.scene.remove(this.root);
      this.root.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
    }
    this.labels.forEach(l => { l.el.remove(); l.line.remove(); l.dot.remove(); });
    this.parts.clear(); this.pickables = []; this.labels = []; this.selected = null; this.api = null;
    if (this.hudEl) { this.hudEl.hidden = true; this.hudEl.innerHTML = ''; this.hudEl._t = null; }
    this.matOwner = new WeakMap();
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.dirty = true;
  }

  /* context handed to scene builders */
  ctx() {
    const self = this;
    return {
      THREE, root: this.root, reduceMotion,
      add(...objs) { objs.forEach(o => self.root.add(o)); return objs[0]; },
      mat(color, o = {}) {
        const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.72, metalness: 0, flatShading: !!o.flat,
          transparent: o.opacity != null && o.opacity < 1, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide,
          depthWrite: o.depthWrite ?? !(o.opacity != null && o.opacity < 0.6), vertexColors: !!o.vertexColors });
        if (o.emissive) { m.emissive.set(o.emissive); m.emissiveIntensity = o.ei ?? 0.5; }
        return m;
      },
      part(id, name, desc, ...objs) { return self.addPart(id, name, desc, objs, false); },
      region(id, name, desc, ...objs) { return self.addPart(id, name, desc, objs, true); },
      attach(id, ...objs) { const p = self.parts.get(id); if (p) self.registerObjs(p, objs); },
      seeThrough(...ids) { ids.forEach(id => { const p = self.parts.get(id); if (p) p.seeThrough = true; }); },
      label(text, anchor, o = {}) { return self.addLabel(text, anchor, o); },
      dirty() { self.dirty = true; },
    };
  }

  addPart(id, name, desc, objs, region) {
    let p = this.parts.get(id);
    if (!p) { p = { id, name, desc, objs: [], region, mats: new Set() }; this.parts.set(id, p); }
    this.registerObjs(p, objs);
    return p;
  }
  registerObjs(p, objs) {
    objs.forEach(o => {
      p.objs.push(o);
      o.traverse(m => {
        if (!m.isMesh) return;
        m.userData.partId = p.id;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        const own = mats.map(mt => { const ow = this.matOwner.get(mt); if (ow && ow !== p.id) { const c = mt.clone(); this.matOwner.set(c, p.id); return c; } this.matOwner.set(mt, p.id); return mt; });
        m.material = Array.isArray(m.material) ? own : own[0];
        own.forEach(mt => p.mats.add(mt));
        if (p.region) { own.forEach(mt => { mt.userData.regionBase = { visible: mt.visible, opacity: mt.opacity }; }); }
        this.pickables.push(m);
      });
    });
  }

  /* anchor: Object3D, Vector3 (root space) or {obj, at:Vector3 local}. o: {part, priority, normal, occlude, cls} */
  addLabel(text, anchor, o = {}) {
    const el = document.createElement('div'); el.className = 'lbl' + (o.cls ? ' ' + o.cls : ''); el.textContent = text;
    if (o.part) { el.dataset.part = o.part; el.addEventListener('click', e => { e.stopPropagation(); this.select(o.part); }); }
    else el.classList.add('static');
    this.layer.appendChild(el);
    const line = document.createElementNS(SVGNS, 'line'); const dot = document.createElementNS(SVGNS, 'circle'); dot.setAttribute('r', '2.6');
    this.svg.appendChild(line); this.svg.appendChild(dot);
    let obj, at;
    if (anchor && anchor.isObject3D) { obj = anchor; at = V(); }
    else if (anchor && anchor.obj) { obj = anchor.obj; at = anchor.at.clone(); }
    else { obj = this.root; at = anchor.clone(); }
    const L = { text, el, line, dot, obj, at, part: o.part || null, priority: o.priority ?? 1, normal: o.normal || null,
      occlude: o.occlude ?? !!o.part, show: o.show || null, cand: -1, w: 0, h: 0, occluded: false, noLine: !!o.noLine };
    this.labels.push(L); this.dirty = true;
    return L;
  }

  setLabelsOn(on) { this.labelsOn = on; this.dirty = true; }

  /* ---------- selection ---------- */
  select(id) {
    if (this.selected === id) id = null;
    if (this.selected) this.highlight(this.selected, false);
    this.selected = id;
    if (id) this.highlight(id, true);
    this.labels.forEach(l => l.el.classList.toggle('sel', !!id && l.part === id));
    this.dirty = true;
    this.onSelect && this.onSelect(id ? this.parts.get(id) : null);
  }
  highlight(id, on) {
    const p = this.parts.get(id); if (!p) return;
    p.mats.forEach(m => {
      if (p.region) {
        const b = m.userData.regionBase;
        m.visible = on ? true : b.visible; m.transparent = true; m.opacity = on ? Math.max(0.22, b.opacity) : b.opacity; m.depthWrite = false;
        if (m.emissive) { m.emissive.copy(on ? this.accent : new THREE.Color(0)); m.emissiveIntensity = on ? 0.35 : 0; }
        m.needsUpdate = true; return;
      }
      if (!m.emissive) return;
      if (on) { if (!m.userData.base) m.userData.base = { e: m.emissive.clone(), i: m.emissiveIntensity }; m.emissive.copy(this.accent); m.emissiveIntensity = this.dark ? 0.55 : 0.42; }
      else if (m.userData.base) { m.emissive.copy(m.userData.base.e); m.emissiveIntensity = m.userData.base.i; }
    });
  }

  /* ---------- picking ---------- */
  bindPointer() {
    let down = null;
    const cv = this.canvas;
    cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; });
    cv.addEventListener('pointerup', e => {
      if (!down || down.id !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
      if (moved < 7 && dt < 700) this.pickAt(e.clientX, e.clientY);
    });
  }
  visibleDeep(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  intersect(ndc, far) {
    this.raycaster.setFromCamera(ndc, this.camera);
    this.raycaster.far = far || Infinity;
    const list = this.pickables.filter(m => this.visibleDeep(m) || this.parts.get(m.userData.partId)?.region && this.visibleDeep(m.parent));
    return this.raycaster.intersectObjects(list, false);
  }
  pickAt(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const hits = this.intersect(ndc);
    const kind = (h) => { const p = this.parts.get(h.object.userData.partId); return p?.region ? 2 : p?.seeThrough ? 1 : 0; };
    const hit = hits.find(h => kind(h) === 0) || hits.find(h => kind(h) === 1) || hits[0];
    if (hit) { const id = hit.object.userData.partId; if (this.selected !== id) this.select(id); }
    else if (this.selected) this.select(null);
  }

  /* ---------- camera ---------- */
  fit(view) {
    const t = V(...view.target), p = V(...view.pos);
    const aspect = (this.w || 800) / (this.h || 500), ref = 1.45;
    if (aspect < ref) p.sub(t).multiplyScalar(Math.pow(ref / aspect, view.k ?? 0.82)).add(t);
    return { p, t };
  }
  flyTo(view, instant) {
    const { p, t } = this.fit(view);
    const c = this.controls, d = p.distanceTo(t);
    c.minDistance = view.min ?? d * 0.25; c.maxDistance = view.max ?? d * 2.6;
    if (instant || reduceMotion) { this.camera.position.copy(p); c.target.copy(t); c.update(); this.tween = null; this.dirty = true; return; }
    this.tween = { p0: this.camera.position.clone(), t0: c.target.clone(), p1: p, t1: t, k: 0 };
  }

  /* ---------- frame ---------- */
  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    if (!this.onscreen || document.hidden || !this.w) return;
    let changed = this.dirty; this.dirty = false;
    if (this.tween) {
      const T = this.tween; if (!T.t0ms) T.t0ms = performance.now(); T.k = Math.min(1, (performance.now() - T.t0ms) / 850); const e = T.k < 0.5 ? 2 * T.k * T.k : 1 - Math.pow(-2 * T.k + 2, 2) / 2;
      this.camera.position.lerpVectors(T.p0, T.p1, e); this.controls.target.lerpVectors(T.t0, T.t1, e);
      if (T.k >= 1) this.tween = null; changed = true;
    }
    if (this.controls.update()) changed = true;
    if (this.api && this.api.update) { if (this.api.update(dt, this.playing)) changed = true; }
    if (!changed) return;
    this.renderer.render(this.scene, this.camera);
    const now = performance.now();
    if (now - this.lastOcc > 260) { this.lastOcc = now; this.occlusion(); }
    this.layoutLabels();
    if (this.hudEl && this.api && this.api.hud && now - this.lastHud > 150) { this.lastHud = now; const h = this.api.hud(); if (this.hudEl._t !== h) { this.hudEl.innerHTML = h; this.hudEl._t = h; } this.hudEl.hidden = !h; }
  }

  anchorWorld(L, out) { L.obj.updateWorldMatrix(true, false); return out.copy(L.at).applyMatrix4(L.obj.matrixWorld); }

  occlusion() {
    const cam = this.camera.position, w = V(), dir = V();
    const list = this.pickables.filter(m => { const p = this.parts.get(m.userData.partId); return this.visibleDeep(m) && !p?.region && !p?.seeThrough; });
    for (const L of this.labels) {
      L.occluded = false;
      if (!L.occlude || !this.labelVisible(L)) continue;
      this.anchorWorld(L, w);
      // three rays (anchor and two points a few pixels away) so a thin strand in front does not hide a label
      const dist = w.distanceTo(cam), wpp = 2 * dist * Math.tan(this.camera.fov * Math.PI / 360) / (this.h || 500);
      const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
      let blocked = 0;
      for (const [ox, oy] of [[0, 0], [9, 6], [-9, -6]]) {
        const tgt = w.clone().addScaledVector(right, ox * wpp).addScaledVector(up, oy * wpp);
        const dd = tgt.distanceTo(cam); dir.copy(tgt).sub(cam).normalize();
        this.raycaster.set(cam, dir); this.raycaster.far = dd * 0.985;
        const hits = this.raycaster.intersectObjects(list, false);
        if (hits.find(h => h.object.userData.partId !== L.part && h.distance < dd * 0.97)) blocked++;
        if (blocked >= 2) break;
      }
      L.occluded = blocked >= 2;
    }
  }

  labelVisible(L) {
    if (!this.visibleDeep(L.obj)) return false;
    if (L.show && !L.show()) return false;
    return true;
  }

  layoutLabels() {
    const W = this.w, H = this.h, cam = this.camera, placed = [], w = V(), nrm = V(), toCam = V();
    const sel = this.selected;
    const items = [];
    for (const L of this.labels) {
      let vis = this.labelVisible(L) && (this.labelsOn || (sel && L.part === sel));
      if (vis && L.occluded && !(sel && L.part === sel)) vis = false;
      if (vis) {
        this.anchorWorld(L, w);
        if (L.normal) {
          nrm.copy(L.normal).transformDirection(L.obj.matrixWorld);
          toCam.copy(cam.position).sub(w).normalize();
          if (nrm.dot(toCam) < -0.08) vis = false;
        }
      }
      if (vis) {
        const p = w.clone().project(cam);
        if (p.z > 1 || p.x < -1.1 || p.x > 1.1 || p.y < -1.1 || p.y > 1.1) vis = false;
        else { L.ax = (p.x + 1) / 2 * W; L.ay = (1 - p.y) / 2 * H; L.depth = p.z; }
      }
      if (!vis) { this.hideLabel(L); continue; }
      items.push(L);
    }
    // anchors themselves are obstacles so a label never sits on another dot
    const pr = (L) => (sel && L.part === sel ? 100 : 0) + L.priority;
    items.sort((a, b) => pr(b) - pr(a));
    const small = W < 520;
    const d = small ? 16 : 22;
    for (const L of items) {
      if (!L.w || L.el._t !== L.text) { L.el.style.display = 'block'; L.el.style.transform = 'translate(-9999px,0)'; L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; L.el._t = L.text; }
      const side = L.ax >= W / 2 ? 1 : -1, up = L.ay < H / 2 ? -1 : 1;
      const dirs = [[side, up * 0.7], [side, 0], [side, -up * 0.7], [0, up * 1.3], [-side, up * 0.7], [-side, 0], [0, -up * 1.3], [-side, -up * 0.7]];
      const C = []; for (const m of [1, 1.9, 2.9, 4.2]) for (const [x, y] of dirs) C.push([x * m, y * m]);
      const order = L.cand >= 0 ? [L.cand, ...C.keys()] : [...C.keys()];
      let best = null;
      for (const ci of order) {
        const [cx, cy] = C[ci];
        const ox = cx * d, oy = cy * d;
        let x = L.ax + ox, y = L.ay + oy - L.h / 2;
        if (cx > 0) x += 2; else if (cx < 0) x -= L.w + 2; else x -= L.w / 2;
        if (cy !== 0 && cx === 0) y = L.ay + oy - (cy < 0 ? L.h : 0);
        const r = { x, y, w: L.w, h: L.h };
        if (r.x < 3 || r.y < 3 || r.x + r.w > W - 3 || r.y + r.h > H - 3) continue;
        if (placed.some(q => r.x < q.x + q.w + 3 && r.x + r.w + 3 > q.x && r.y < q.y + q.h + 2 && r.y + r.h + 2 > q.y)) continue;
        if (items.some(o => o !== L && o.ax > r.x - 3 && o.ax < r.x + r.w + 3 && o.ay > r.y - 3 && o.ay < r.y + r.h + 3)) continue;
        best = { r, ci }; break;
      }
      if (!best) {
        if (sel && L.part === sel) { const r = { x: Math.min(W - L.w - 3, Math.max(3, L.ax + 8)), y: Math.max(3, L.ay - L.h - 10), w: L.w, h: L.h }; best = { r, ci: -1 }; }
        else { this.hideLabel(L, true); continue; }
      }
      L.cand = best.ci; placed.push(best.r);
      const r = best.r;
      L.el.style.display = 'block';
      L.el.style.transform = `translate(${Math.round(r.x)}px,${Math.round(r.y)}px)`;
      // leader: from anchor to nearest point on the label box
      const nx = Math.max(r.x, Math.min(L.ax, r.x + r.w)), ny = Math.max(r.y, Math.min(L.ay, r.y + r.h));
      L.line.setAttribute('x1', L.ax.toFixed(1)); L.line.setAttribute('y1', L.ay.toFixed(1));
      L.line.setAttribute('x2', nx.toFixed(1)); L.line.setAttribute('y2', ny.toFixed(1));
      L.line.style.display = L.noLine ? 'none' : '';
      L.dot.setAttribute('cx', L.ax.toFixed(1)); L.dot.setAttribute('cy', L.ay.toFixed(1)); L.dot.style.display = L.noLine ? 'none' : '';
      const isSel = sel && L.part === sel;
      L.line.classList.toggle('sel', !!isSel); L.dot.classList.toggle('sel', !!isSel);
    }
  }
  hideLabel(L, keepDot) {
    L.el.style.display = 'none'; L.line.style.display = 'none';
    L.dot.style.display = keepDot && !L.noLine ? '' : 'none';
    if (keepDot && L.ax != null) { L.dot.setAttribute('cx', L.ax.toFixed(1)); L.dot.setAttribute('cy', L.ay.toFixed(1)); }
  }
}
