/* Module 5: the four levels of protein structure. */
import * as THREE from '../vendor/three.module.min.js';
import { V, tube, spheres, rods, helixRibbon, strandArrow, rng } from '../geo.js';

const LEVELS = {
  primary: { title: 'Primary structure (1°)', num: 'Level 1 of 4',
    text: 'The specific linear sequence of amino acids, from the amino end (N-terminus) to the carboxyl end (C-terminus), joined by peptide bonds. It can be written Val–Gly–Ala–His or V–G–A–H. The R groups alternate sides of the chain, which affects how it folds. The primary structure determines all the higher levels. Notes pp. 71–72.' },
  secondary: { title: 'Secondary structure (2°)', num: 'Level 2 of 4',
    text: 'Regular shapes in parts of the chain, held by hydrogen bonds between backbone functional groups (C=O and N–H). R groups are not involved. The α helix is right-handed, and each C=O bonds to the N–H four amino acids along. In a β sheet, segments lie side by side in a pleated sheet; these strands are antiparallel. Notes p. 73.' },
  tertiary: { title: 'Tertiary structure (3°)', num: 'Level 3 of 4',
    text: 'The 3-D shape of one whole polypeptide: how its helices, sheets and loops are arranged. It is set by where hydrophobic and hydrophilic R groups end up (hydrophobic ones are buried inside) and by bonds between R groups: hydrogen bonds, hydrophobic interactions, ionic bonds and disulfide bonds. Notes pp. 70, 74.' },
  quaternary: { title: 'Quaternary structure (4°)', num: 'Level 4 of 4',
    text: 'The arrangement of two or more polypeptide subunits, held by the same kinds of bonds as tertiary structure. Two identical subunits make a homodimer and two different ones make a heterodimer. This model is a homodimer. Notes p. 74.' },
};
const VIEWS = {
  primary: { pos: [1.5, 3.5, 15.5], target: [0, 0, 0], min: 3, max: 50, k: 1.05 },
  secondary: { pos: [1.5, 2.5, 15], target: [0, 0, 0], min: 3, max: 50, k: 0.95 },
  tertiary: { pos: [6.5, 3.5, 9.5], target: [0, 0, -0.4], min: 3, max: 30 },
  quaternary: { pos: [7, 5, 15], target: [0, 0, 0], min: 4, max: 50, k: 0.95 },
};

export function build(ctx) {
  const groups = {};
  for (const k of Object.keys(LEVELS)) { groups[k] = new THREE.Group(); groups[k].visible = false; ctx.add(groups[k]); }
  const partsBy = { primary: [], secondary: [], tertiary: [], quaternary: [] };
  const P = (lvl, id, name, desc, ...objs) => { ctx.part(id, name, desc, ...objs); partsBy[lvl].push(id); };
  const L = (grp, text, at, o = {}) => ctx.label(text, { obj: grp, at }, o);

  /* ---------- primary: ball-and-stick backbone ---------- */
  {
    const g = groups.primary, n = 12, sp = 1.25, x0 = -(n - 1) * sp / 2 - 0.4;
    const N = [], CA = [], C = [], R = [], H = [], O = [], bonds = [], pep = [];
    const SEQ = ['Val', 'Gly', 'Ala', 'His', 'Leu', 'Ser', 'Lys', 'Phe', 'Asp', 'Cys', 'Thr', 'Glu'];
    for (let i = 0; i < n; i++) {
      const s = i % 2 ? -1 : 1, x = x0 + i * sp;
      const n_ = V(x, 0, 0), ca = V(x + 0.42, 0.34 * s, 0), c = V(x + 0.84, 0, 0);
      N.push(n_); CA.push(ca); C.push(c);
      R.push(ca.clone().add(V(0, 0.7 * s, 0.25)));
      H.push(n_.clone().add(V(-0.05, -0.42 * s, 0)));
      O.push(c.clone().add(V(0.05, -0.48 * s, 0)));
      bonds.push([n_, ca], [ca, c], [ca, R[i]], [n_, H[i]], [c, O[i]]);
      if (i < n - 1) pep.push([c, V(x + sp, 0, 0)]);
    }
    const gly = 1;
    const rPos = R.filter((_, i) => i !== gly);
    const mN = spheres(N, 0.2, ctx.mat('#4f78c4'), 2), mCA = spheres(CA, 0.22, ctx.mat('#8d9499'), 2), mC = spheres(C, 0.2, ctx.mat('#a8754a'), 2);
    const mO = spheres(O, 0.15, ctx.mat('#a8754a'), 1), mH = spheres([...H, R[gly]], 0.1, ctx.mat('#8fd0de'), 1);
    const mR = spheres(rPos, 0.27, ctx.mat('#76a94f'), 2);
    const mB = rods(bonds.filter(b => b[1] !== R[gly]).concat([[CA[gly], R[gly]]]), 0.05, ctx.mat('#6b7376'), 6);
    const mP = rods(pep, 0.07, ctx.mat('#c4443c'), 8);
    g.add(mN, mCA, mC, mO, mH, mR, mB, mP);
    P('primary', 'ca', 'α carbon', 'The central carbon of each amino acid. The amino group, the carboxyl group, a hydrogen and the R group are all bonded to it. Notes p. 69.', mCA);
    P('primary', 'amide', 'Amino group (N–H)', 'The amino group of each amino acid. In a chain it is part of a peptide bond, except at the free amino end (N-terminus). Its N–H can hydrogen-bond to a C=O in secondary structure. Notes pp. 69, 71, 73.', mN, mH);
    P('primary', 'carbonyl', 'Carboxyl / carbonyl group (C=O)', 'The carboxyl group of each amino acid. In the chain its carbon forms the peptide bond, leaving a C=O (carbonyl) that can hydrogen-bond in secondary structure. Notes pp. 69, 71, 73.', mC, mO);
    P('primary', 'rgroup', 'R groups (side chains)', 'The R group makes each amino acid unique and gives it its chemical properties: hydrophobic, polar, acidic or basic. R groups alternate sides of the chain. Glycine (second residue here) has only a hydrogen as its R group. R groups are not part of the peptide bond. Notes pp. 69–72.', mR);
    P('primary', 'pep', 'Peptide bonds', 'Covalent bonds joining the carboxyl group of one amino acid to the amino group of the next, formed by a dehydration reaction that releases H2O. Notes p. 71.', mP);
    ctx.attach('ca', mB);
    L(g, 'N-terminus (amino end)', N[0].clone().add(V(-0.25, 0, 0)), { cls: 'end', priority: 3 });
    L(g, 'C-terminus (carboxyl end)', C[n - 1].clone().add(V(0.25, 0, 0)), { cls: 'end', priority: 3 });
    for (let i = 0; i < 4; i++) L(g, SEQ[i], R[i].clone().add(V(0, i % 2 ? -0.3 : 0.3, 0)), { noLine: false, priority: 1.5 });
    L(g, 'Peptide bond', pep[5][0].clone().lerp(pep[5][1], 0.5), { part: 'pep', priority: 2 });
    L(g, 'R group', R[6], { part: 'rgroup', priority: 2 });
    L(g, 'α carbon', CA[8], { part: 'ca', priority: 2 });
    L(g, 'Amino group', N[10], { part: 'amide', priority: 1.6 });
    L(g, 'Carbonyl (C=O)', O[9], { part: 'carbonyl', priority: 1.6 });
  }

  /* ---------- secondary: alpha helix and antiparallel beta sheet ---------- */
  {
    const g = groups.secondary;
    const hx = helixRibbon(V(-3.6, -2.6, 0), V(-3.6, 2.6, 0), { radius: 0.85, rise: 0.33, width: 0.6, thick: 0.1 });
    const hm = new THREE.Mesh(hx.geo, ctx.mat('#c0574e')); g.add(hm);
    const hb = [];
    for (let k = 0; k + 4 <= hx.nRes; k++) {
      const a = hx.residue(k), b = hx.residue(k + 4), ax = V(-3.6, 0, 0);
      const a2 = a.clone().lerp(V(ax.x, a.y, 0), 0.08), b2 = b.clone().lerp(V(ax.x, b.y, 0), 0.08);
      for (let d = 0; d < 4; d++) hb.push([a2.clone().lerp(b2, (d + 0.2) / 4), a2.clone().lerp(b2, (d + 0.65) / 4)]);
    }
    const strands = [], ys = 2.3;
    const xs = [0.6, 1.8, 3.0, 4.2];
    xs.forEach((x, i) => {
      const up = i % 2 === 0;
      const a = V(x, up ? -ys : ys, 0), b = V(x, up ? ys : -ys, 0);
      strands.push(new THREE.Mesh(strandArrow(a, b, V(1, 0, 0), { width: 0.62, thick: 0.1, pleat: 0.09, head: 0.75 }), ctx.mat('#d4ad45')));
    });
    const turns = [];
    for (let i = 0; i < 3; i++) {
      const top = i % 2 === 0, y = top ? ys + 0.05 : -ys - 0.05, x1 = xs[i], x2 = xs[i + 1];
      turns.push(tube([V(x1, y, 0), V(x1 + 0.1, y + (top ? 0.6 : -0.6), 0.1), V(x2 - 0.1, y + (top ? 0.6 : -0.6), 0.1), V(x2, y, 0)], 0.09, ctx.mat('#9aa3a8'), 24, 6));
    }
    for (let i = 0; i < 3; i++) for (let y = -1.6; y <= 1.7; y += 0.8) {
      const a = V(xs[i] + 0.34, y, 0.02), b = V(xs[i + 1] - 0.34, y, 0.02);
      for (let d = 0; d < 3; d++) hb.push([a.clone().lerp(b, (d + 0.15) / 3), a.clone().lerp(b, (d + 0.6) / 3)]);
    }
    g.add(...strands, ...turns);
    const hbm = rods(hb, 0.028, ctx.mat('#d06b78'), 4); g.add(hbm);
    P('secondary', 'helix', 'α helix', 'A very stable, right-handed helix of the backbone. Each carbonyl (C=O) forms a hydrogen bond with the amide (N–H) four amino acids away. It is drawn as a helical ribbon. Notes p. 73.', hm);
    P('secondary', 'sheet', 'β sheet', 'Segments of the chain lying side by side in a pleated sheet, held by hydrogen bonds between C=O groups in one strand and N–H groups in the next. Strands can be parallel or antiparallel; these four alternate direction (antiparallel). Each strand is drawn as a flattened arrow pointing toward the carboxyl end. Notes p. 73.', ...strands);
    P('secondary', 'turn', 'Turns (loops)', 'Short stretches that reverse the direction of the chain so the next strand can lie alongside the last one. Notes p. 73.', ...turns);
    P('secondary', 'hb2', 'Hydrogen bonds (backbone)', 'Secondary structure is held by hydrogen bonds between backbone functional groups, C=O and N–H. R groups are not involved. Notes p. 73.', hbm);
    L(g, 'α helix', V(-2.75, 2.2, 0.2), { part: 'helix', priority: 3 });
    L(g, 'β sheet (antiparallel)', V(4.2, 1.2, 0.05), { part: 'sheet', priority: 3 });
    L(g, 'Hydrogen bond', hb[24][0], { part: 'hb2', priority: 2, occlude: false });
    L(g, 'Hydrogen bonds', hb[hb.length - 7][0], { part: 'hb2', priority: 1.5, occlude: false });
    L(g, 'Turn', V(1.2, ys + 0.62, 0.1), { part: 'turn', priority: 1 });
  }

  /* ---------- a compact fold, used for tertiary and quaternary ---------- */
  function fold(c) {
    const g = new THREE.Group();
    const hMat = ctx.mat(c.h), sMat = ctx.mat(c.s), lMat = ctx.mat(c.l);
    const helices = [], strands = [], loops = [];
    const H1 = helixRibbon(V(-2.2, 1.55, 1.0), V(1.8, 1.75, 1.05), { radius: 0.5, rise: 0.25, width: 0.42, thick: 0.08 });
    const H2 = helixRibbon(V(2.0, -0.35, 1.25), V(-2.0, -0.6, 1.2), { radius: 0.5, rise: 0.25, width: 0.42, thick: 0.08, phase: 1 });
    const H3 = helixRibbon(V(-1.8, -1.5, -2.3), V(1.9, 0.4, -2.2), { radius: 0.5, rise: 0.25, width: 0.42, thick: 0.08, phase: 2 });
    [H1, H2, H3].forEach(h => helices.push(new THREE.Mesh(h.geo, hMat)));
    const xs = [-1.65, -0.55, 0.55, 1.65], sy = 1.7, z = -0.75;
    const ends = [];
    xs.forEach((x, i) => {
      const up = i % 2 === 0, a = V(x, up ? -sy : sy, z), b = V(x, up ? sy : -sy, z);
      strands.push(new THREE.Mesh(strandArrow(a, b, V(1, 0, 0), { width: 0.5, thick: 0.09, pleat: 0.07, head: 0.6 }), sMat));
      ends.push([a, b]);
    });
    const lp = (pts) => { const m = tube(pts, 0.075, lMat, pts.length * 10, 6); loops.push(m); return m; };
    lp([V(-3.0, 2.4, 1.6), V(-2.6, 2.0, 1.3), H1.start]);                         // N-terminal tail
    lp([H1.end, V(2.6, 2.1, 0.6), V(-1.0, 2.6, -0.2), ends[0][0].clone().add(V(0, -0.5, 0)), ends[0][0]].map((p, i) => i === 3 ? V(-2.3, -2.3, -0.4) : p));
    for (let i = 0; i < 3; i++) { const top = i % 2 === 0, e = ends[i][1], s = ends[i + 1][0]; lp([e, e.clone().add(V(0.15, top ? 0.5 : -0.5, 0.1)), s.clone().add(V(-0.15, top ? 0.5 : -0.5, 0.1)), s]); }
    lp([ends[3][1], V(2.4, -2.3, 0.2), V(2.6, -1.0, 1.0), H2.start]);
    lp([H2.end, V(-2.6, -1.2, 0.2), V(-2.6, -1.6, -1.6), H3.start]);
    lp([H3.end, V(2.6, 1.0, -2.0), V(3.1, 1.6, -1.4)]);                            // C-terminal tail
    const ssA = V(-0.2, 2.2, 1.0).lerp(H1.residue(7), 0.0), ssB = V(-1.0, 2.6, -0.2);
    const ss = new THREE.Group(); ss.add(...[ssA, ssB].map(p => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), ctx.mat('#e2c23c')); m.position.copy(p); return m; }));
    ss.add(rods([[ssA, ssB]], 0.06, ctx.mat('#e2c23c'), 6));
    g.add(...helices, ...strands, ...loops, ss);
    return { g, helices, strands, loops, ss, nEnd: V(-3.0, 2.4, 1.6), cEnd: V(3.1, 1.6, -1.4), H1, H2 };
  }

  /* ---------- tertiary ---------- */
  {
    const f = fold({ h: '#c0574e', s: '#d4ad45', l: '#9aa3a8' });
    groups.tertiary.add(f.g);
    P('tertiary', 't_helix', 'α helices', 'Regions of α helix (secondary structure) packed against the sheet. In the folded protein, hydrophobic R groups tend to be buried inside and hydrophilic R groups face the water outside. Notes pp. 70, 74.', ...f.helices);
    P('tertiary', 't_sheet', 'β sheet', 'Four antiparallel β strands forming a sheet in the core of the fold. The tertiary structure is how these secondary structure regions are oriented relative to each other. Notes p. 74.', ...f.strands);
    P('tertiary', 't_loop', 'Loops', 'Stretches of chain without regular secondary structure that connect the helices and strands. Glycine makes the backbone more flexible; proline limits folding around it. Notes pp. 71, 74.', ...f.loops);
    P('tertiary', 't_ss', 'Disulfide bond', 'A covalent S–S bond between the R groups of two cysteines. It cross-links different parts of the chain (or different chains) and helps hold the tertiary structure. Notes pp. 71, 74.', f.ss);
    const g = groups.tertiary;
    L(g, 'α helix', f.H1.residue(10), { part: 't_helix', priority: 3 });
    L(g, 'β sheet', V(0.55, 0.4, -0.7), { part: 't_sheet', priority: 3 });
    L(g, 'Loop', V(2.4, -2.3, 0.2), { part: 't_loop', priority: 2 });
    L(g, 'Disulfide bond', V(-0.6, 2.4, 0.4), { part: 't_ss', priority: 2.5 });
    L(g, 'N-terminus', f.nEnd, { cls: 'end', priority: 2.2 });
    L(g, 'C-terminus', f.cEnd, { cls: 'end', priority: 2.2 });
  }

  /* ---------- quaternary: homodimer ---------- */
  {
    const a = fold({ h: '#3f8f88', s: '#6fb3a6', l: '#8fb8b0' });
    const b = fold({ h: '#c48a3a', s: '#ddb46a', l: '#cfb48c' });
    a.g.position.set(-2.55, 0, 0); a.g.rotation.y = 0.5;
    b.g.position.set(2.55, 0, 0); b.g.rotation.y = Math.PI - 0.5;
    groups.quaternary.add(a.g, b.g);
    P('quaternary', 'sub1', 'Subunit 1', 'One complete polypeptide chain, folded into its own tertiary structure. Each polypeptide chain in a multi-chain protein is a subunit. Notes p. 74.', a.g);
    P('quaternary', 'sub2', 'Subunit 2', 'A second, identical polypeptide chain. Two identical subunits make this protein a homodimer. Notes p. 74.', b.g);
    const g = groups.quaternary;
    L(g, 'Subunit 1', V(-4.3, 1.9, 0.6), { part: 'sub1', priority: 3 });
    L(g, 'Subunit 2', V(4.3, 1.9, 0.6), { part: 'sub2', priority: 3 });
    L(g, 'Interface: same bonds as 3° structure', V(0, -0.4, 0.6), { noLine: true, priority: 1 });
  }

  let mode = 'primary';
  groups.primary.visible = true;
  const api = {
    view: VIEWS.primary,
    modes: { label: 'Level', value: 'primary', items: [{ id: 'primary', label: 'Primary' }, { id: 'secondary', label: 'Secondary' }, { id: 'tertiary', label: 'Tertiary' }, { id: 'quaternary', label: 'Quaternary' }] },
    setMode(m) { mode = m; api.modes.value = m; for (const k in groups) groups[k].visible = k === m; ctx.dirty(); return VIEWS[m]; },
    currentView: () => VIEWS[mode],
    partVisible: (id) => partsBy[mode].includes(id),
    stepInfo: () => ({ num: LEVELS[mode].num, title: LEVELS[mode].title, text: LEVELS[mode].text }),
  };
  return api;
}
