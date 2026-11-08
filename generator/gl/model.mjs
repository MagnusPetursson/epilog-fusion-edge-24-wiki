// Epilog Fusion Edge 24 for the WebGL viewer: parts in millimetres, X right, Y toward the rear (front face y = 0), Z up.
// Envelope 1055 × 834 × 967 mm and 610 × 610 mm work area are published (epiloglaser.com product page, manual p57).
// Exterior divisions are read from the official product photographs:
// the frontal photo is taken ≈14° from above, so the visible front face (0–0.82 of image height) maps to 0–967 mm and the
// band above it is the FLAT top seen in perspective (the installed machine's lid is not tilted).
// Flat lid ≈ 0.70 W between ≈ 0.15 W shoulders; display on the right shoulder. There is NO red emergency stop on the
// left shoulder; manual p8 shows the fire-safety label there instead.
// Interior layout follows the manual's description
// (four mirrors, window optic, lens; rear exhaust port, rear air receptacle) but positions are schematic, not measured.

export const W = 1055, D = 834, H = 967;
export const BED = { x0: (W - 610) / 2, x1: (W + 610) / 2, y0: 100, y1: 710 }; // 610 × 610 work area
export const FP = 780; // focal plane in world Z (schematic): the material surface sits here when focused
export const TABLE_TRAVEL = 254; // published maximum material thickness, table travel below the focal plane
export const TOP = { zf: H, zr: H, slope: 0 }; // flat top plane at the published height (kept as a plane for the slab helpers)
export const topZ = (y) => TOP.zf + y * Math.tan(TOP.slope);
export const COL = 158; // side housing width (0.15 W)
export const LID = { x0: COL, x1: W - COL, y0: 0, y1: 760 };
export const HINGE = [0, LID.y1, topZ(LID.y1)];
export const HOME = { x: BED.x0, y: BED.y1 }; // Epilog home is the rear-left (top-left of the job page)
export const STOCK = { w: 400, d: 300, t: 6, x: BED.x0 + 60, y: BED.y0 + 230 }; // illustrative 6 mm sheet
export const CONE_TIP = FP + 12; // schematic stand-off: a 6 mm sheet focused on the grid top would leave 6 mm
export const BRIDGE_Z = 858;
export const DISPLAY = {};
export const LOGO = { o: [COL + 8, 7.7, 764], u: [700, 0, 0], v: [0, 0, 70] }; // lower fascia: Epilog emblem + EpilogLaser.com (left); canvas 1600 × 160
export const LIDLOGO = { o: [COL + 12, -2.3, 889], u: [717.5, 0, 0], v: [0, 0, 71.75] }; // lid front band: FusionEdge (right); canvas 1640 × 164
export const SIDELOGO = [{ o: [-1.3, D / 2 - 30, 572], u: [0, 0, 370], v: [0, 60, 0] }, { o: [W + 1.3, D / 2 + 30, 572], u: [0, 0, 370], v: [0, -60, 0] }]; // vertical wordmark on both blue side covers; canvas 1200 × 200

// ------------------------------------------------------------- materials: [name, rgb (linear-ish), specular, alpha]
export const MATS = [
  ["body", [0.90, 0.94, 1.03], 0.3, 1], ["panel", [0.84, 0.875, 0.93], 0.2, 1], ["plinth", [0.66, 0.67, 0.68], 0.15, 1],
  ["teal", [0.02, 0.385, 0.635], 0.45, 1], ["navy", [0.04, 0.07, 0.13], 0.35, 1], ["charcoal", [0.17, 0.18, 0.19], 0.3, 1],
  ["recess", [0.26, 0.27, 0.28], 0.08, 1], ["glass", [0.30, 0.33, 0.38], 0.9, 0.80], ["alu", [0.70, 0.72, 0.74], 0.55, 1],
  ["steel", [0.45, 0.47, 0.50], 0.6, 1], ["black", [0.05, 0.05, 0.055], 0.25, 1], ["rubber", [0.07, 0.07, 0.07], 0.05, 1],
  ["red", [0.78, 0.09, 0.07], 0.45, 1], ["yellow", [0.88, 0.70, 0.08], 0.2, 1], ["brass", [0.78, 0.60, 0.28], 0.8, 1],
  ["mirror", [0.86, 0.64, 0.34], 0.95, 1], ["lens", [0.55, 0.42, 0.22], 0.95, 1], ["tube", [0.26, 0.27, 0.29], 0.5, 1],
  ["grid", [0.52, 0.54, 0.56], 0.5, 1], ["tray", [0.30, 0.31, 0.32], 0.2, 1], ["ply", [0.80, 0.64, 0.42], 0.05, 1],
  ["vent", [0.04, 0.045, 0.05], 0.1, 1], ["led", [0.95, 0.95, 0.92], 0.2, 1], ["screen", [0.80, 0.86, 0.90], 0.6, 1],
  ["debris", [0.32, 0.22, 0.12], 0.05, 1], ["hose", [0.55, 0.56, 0.57], 0.3, 1], ["label", [0.93, 0.93, 0.90], 0.05, 1],
  ["console", [0.47, 0.48, 0.50], 0.15, 1], ["inset", [0.62, 0.67, 0.76], 0.2, 1],
];
export const MAT = Object.fromEntries(MATS.map(([n], i) => [n, i]));

// ------------------------------------------------------------- groups (each drawn with its own model matrix)
// static · lid (rotates about the rear hinge) · bridge (Y) · head (X on the bridge) · table (Z) · stock (XY on the table)
export const GROUPS = ["static", "lid", "bridge", "head", "table", "stock"];

// ------------------------------------------------------------- primitive builders (all return triangle soups + edges)
const parts = [];
let cur = null;
function part(name, group, mat, opts = {}) {
  cur = { name, group, mat: MAT[mat], tris: [], edges: [], shell: !!opts.shell, explode: opts.explode || [0, 0, 0], tour: opts.tour || null, xf: opts.xf || null, smooth: [] };
  parts.push(cur);
  return cur;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function tri(a, b, c, n, smooth = false, na, nb, nc) {
  n = n || unit(cross(sub(b, a), sub(c, a)));
  cur.tris.push([a, b, c, smooth ? [na, nb, nc] : [n, n, n], smooth ? 1 : 0]);
}
function quad(a, b, c, d) { const n = unit(cross(sub(b, a), sub(c, a))); tri(a, b, c, n); tri(a, c, d, n); }
function edge(a, b) { cur.edges.push([a, b]); }
export function box(lo, hi, { edges = true } = {}) {
  const [x0, y0, z0] = lo, [x1, y1, z1] = hi;
  const p = (i) => [i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0];
  quad(p(0), p(2), p(3), p(1)); // bottom
  quad(p(4), p(5), p(7), p(6)); // top
  quad(p(0), p(1), p(5), p(4)); // front (y0)
  quad(p(2), p(6), p(7), p(3)); // back
  quad(p(0), p(4), p(6), p(2)); // left
  quad(p(1), p(3), p(7), p(5)); // right
  if (edges) for (const [a, b] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) edge(p(a), p(b));
}
// convex polygon in the YZ plane extruded along X
export function prismX(poly, x0, x1, { edges = true } = {}) {
  const A = poly.map(([y, z]) => [x0, y, z]), B = poly.map(([y, z]) => [x1, y, z]);
  for (let i = 1; i < poly.length - 1; i++) { tri(A[0], A[i + 1], A[i]); tri(B[0], B[i], B[i + 1]); }
  for (let i = 0; i < poly.length; i++) { const j = (i + 1) % poly.length; quad(A[i], A[j], B[j], B[i]); if (edges) { edge(A[i], A[j]); edge(B[i], B[j]); edge(A[i], B[i]); } }
}
// convex polygon in the XY plane extruded along Z
export function prismZ(poly, z0, z1, { edges = true } = {}) {
  const A = poly.map(([x, y]) => [x, y, z0]), B = poly.map(([x, y]) => [x, y, z1]);
  for (let i = 1; i < poly.length - 1; i++) { tri(A[0], A[i + 1], A[i]); tri(B[0], B[i], B[i + 1]); }
  for (let i = 0; i < poly.length; i++) { const j = (i + 1) % poly.length; quad(A[i], B[i], B[j], A[j]); if (edges) { edge(A[i], A[j]); edge(B[i], B[j]); } }
}
// frustum / cylinder along an axis: from point c, direction axis ("x"|"y"|"z" or -), length L, radii r0 → r1
export function cyl(c, axis, L, r0, r1 = r0, { seg = 28, caps = true, edges = true, hole = 0 } = {}) {
  const s = axis[0] === "-" ? -1 : 1, ax = axis.replace("-", "");
  const k = { x: 0, y: 1, z: 2 }[ax], u = (k + 1) % 3, v = (k + 2) % 3;
  const P = (t, r, a) => { const p = [...c]; p[k] += s * t; p[u] += r * Math.cos(a); p[v] += r * Math.sin(a); return p; };
  const N = (a) => { const n = [0, 0, 0]; n[u] = Math.cos(a); n[v] = Math.sin(a); n[k] = (r0 - r1) / L * s; return unit(n); };
  const axn = [0, 0, 0]; axn[k] = s;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * 2 * Math.PI, a1 = ((i + 1) / seg) * 2 * Math.PI;
    const p00 = P(0, r0, a0), p01 = P(0, r0, a1), p10 = P(L, r1, a0), p11 = P(L, r1, a1);
    const flip = s * (u === (k + 1) % 3 ? 1 : 1);
    if (flip > 0) { tri(p00, p01, p11, null, true, N(a0), N(a1), N(a1)); tri(p00, p11, p10, null, true, N(a0), N(a1), N(a0)); }
    else { tri(p00, p11, p01, null, true, N(a0), N(a1), N(a1)); tri(p00, p10, p11, null, true, N(a0), N(a0), N(a1)); }
    if (caps) {
      const neg = axn.map((x) => -x);
      if (hole > 0) {
        const h00 = P(0, hole, a0), h01 = P(0, hole, a1), h10 = P(L, hole, a0), h11 = P(L, hole, a1);
        tri(p00, h01, p01, neg); tri(p00, h00, h01, neg); tri(p10, p11, h11, axn); tri(p10, h11, h10, axn);
        tri(h00, h11, h01, null, true, N(a0 + Math.PI), N(a1 + Math.PI), N(a1 + Math.PI)); tri(h00, h10, h11, null, true, N(a0 + Math.PI), N(a0 + Math.PI), N(a1 + Math.PI));
      } else { tri(P(0, 0, 0), p01, p00, neg); tri(P(L, 0, 0), p10, p11, axn); }
    }
    if (edges) { edge(p00, p01); edge(p10, p11); }
  }
}
// n-sided prism between two arbitrary points (struts, rods)
function rod(a, b, r, seg = 10) { const d = unit(sub(b, a)), t = unit(cross(d, Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])), w = cross(d, t);
  const ring = (c) => Array.from({ length: seg }, (_, i) => { const q = (i / seg) * 2 * Math.PI; return [0, 1, 2].map((k) => c[k] + r * (Math.cos(q) * t[k] + Math.sin(q) * w[k])); });
  const A = ring(a), B = ring(b); for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; quad(A[i], A[j], B[j], B[i]); } for (let i = 1; i + 1 < seg; i++) { tri(A[0], A[i + 1], A[i]); tri(B[0], B[i], B[i + 1]); } }
// slab lying on the sloped top plane: rectangle x0..x1 × y0..y1, from the plane up by h (normal to the plane)
function onTop(x0, x1, y0, y1, h, dz = 0) {
  const t = Math.tan(TOP.slope), c = Math.cos(TOP.slope), s = Math.sin(TOP.slope);
  const z = (y) => TOP.zf + y * t + dz;
  const poly = [[y0, z(y0)], [y1, z(y1)], [y1 - s * h, z(y1) + c * h], [y0 - s * h, z(y0) + c * h]];
  prismX(poly, x0, x1);
}
// a part placed with a local frame on the sloped top: returns a transform for points given in (x, along-slope, normal)
export const slopeFrame = (x, y, dz = 0) => ({ o: [x, y, topZ(y) + dz], a: TOP.slope });
function onSlope(F, fn) { // run builder fn in local coords, then rotate about X by slope and translate to F.o
  const start = cur.tris.length, e0 = cur.edges.length; fn();
  const c = Math.cos(F.a), s = Math.sin(F.a);
  const R = (p) => [p[0] + F.o[0], p[1] * c - p[2] * s + F.o[1], p[1] * s + p[2] * c + F.o[2]];
  const Rn = (n) => [n[0], n[1] * c - n[2] * s, n[1] * s + n[2] * c];
  for (let i = start; i < cur.tris.length; i++) { const t = cur.tris[i]; cur.tris[i] = [R(t[0]), R(t[1]), R(t[2]), t[3].map(Rn), t[4]]; }
  for (let i = e0; i < cur.edges.length; i++) cur.edges[i] = cur.edges[i].map(R);
}

// soft-edged box: rounded vertical corners (rc) and a rounded top (optionally bottom) edge (re), n flat facets per quarter turn.
// The facets read as a formed sheet-metal radius in the viewer's flat-shaded style; outline edges follow the tangent lines.
export function softBox(lo, hi, { rc = 0, re = 0, n = 3, bottom = false, edges = true } = {}) {
  const [x0, y0, z0] = lo, [x1, y1, z1] = hi, nc = rc > 0 ? n : 0;
  const ring = (ins, z) => { const out = [], R = Math.max(rc, ins), r = R - ins;
    for (const [cx, cy, a0] of [[x1 - R, y0 + R, -Math.PI / 2], [x1 - R, y1 - R, 0], [x0 + R, y1 - R, Math.PI / 2], [x0 + R, y0 + R, Math.PI]])
      for (let i = 0; i <= nc; i++) { const a = a0 + (nc ? i / nc : 0.5) * Math.PI / 2; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]); }
    return out; };
  const q = (k) => (k / n) * Math.PI / 2, prof = [];
  if (bottom && re > 0) for (let k = n; k >= 0; k--) prof.push([re * (1 - Math.cos(q(k))), z0 + re - re * Math.sin(q(k))]); else prof.push([0, z0]);
  const topStart = prof.length;
  if (re > 0) for (let k = 0; k <= n; k++) prof.push([re * (1 - Math.cos(q(k))), z1 - re + re * Math.sin(q(k))]); else prof.push([0, z1]);
  const rings = prof.map(([ins, z]) => ring(ins, z)), m = rings[0].length;
  for (let r = 0; r + 1 < rings.length; r++) { const A = rings[r], B = rings[r + 1]; for (let i = 0; i < m; i++) { const j = (i + 1) % m; tri(A[i], A[j], B[j]); tri(A[i], B[j], B[i]); } }
  for (const [P, up] of [[rings[0], -1], [rings[rings.length - 1], 1]]) { const c = [P.reduce((s, p) => s + p[0], 0) / m, P.reduce((s, p) => s + p[1], 0) / m, P[0][2]]; for (let i = 0; i < m; i++) tri(c, P[i], P[(i + 1) % m], [0, 0, up]); }
  if (edges) { for (const k of new Set([0, topStart - (bottom && re > 0 ? 1 : 0), topStart, rings.length - 1])) { const P = rings[k]; for (let i = 0; i < m; i++) edge(P[i], P[(i + 1) % m]); }
    const T0 = rings[bottom && re > 0 ? topStart - 1 : 0], T1 = rings[topStart]; for (let c = 0; c < 4; c++) { const i = c * (nc + 1) + (nc >> 1); edge(T0[i], T1[i]); } }
}

// ============================================================= exterior
// Likeness pass (19 Oct 2026). Divisions re-measured on Epilog's frontal Edge 24 photo (fusion-edge-24-laser.webp, 400 px:
// front face 94→287 px = 967 mm at ≈13° elevation; uprights 34 px = 158 mm) and on the 1170 px copy of the same product image
// (vertically squashed ≈11 %, so used for fractions and x positions only). From the floor: casters/underbody 0–80 · white sill
// 80–173 · shallow recess 173–368 · white access panel 368–756 · blue fascia 756–885 (vent field 840–876, EpilogLaser.com 766–834) ·
// blue lid band 885–967 (FusionEdge, right). Side covers are blue above ≈524 mm: Fusion Edge series render (left side) and the
// Model 17000 manual p9 ("blue side cover"). Right-side fans and power entry: Fusion manual p8 side elevation.
const T = COL; const BASE = 84; export const PED = 739;
const FAS0 = 756, VENT0 = 840, VENT1 = 876, LIDF0 = 885;
const CY = 10; // central panels sit 10 mm behind the housings' front faces
const SIDEB = 524; // blue side cover from here up

// casters under the housings (front pair photographed: pale housing, dark wheel, brass hub; rear pair assumed), dark underbody
for (const [x, y, n] of [[COL / 2, 70, "fl"], [W - COL / 2, 70, "fr"], [COL / 2, D - 70, "rl"], [W - COL / 2, D - 70, "rr"]]) {
  const cx = x < W / 2 ? -170 : 170;
  part(`caster.${n}.wheel`, "static", "rubber", { tour: "pedestal", explode: [cx, 0, 0] }); cyl([x - 13, y + 4, 34], "x", 26, 34, 34, { seg: 24 });
  part(`caster.${n}.fork`, "static", "alu", { tour: "pedestal", explode: [cx, 0, 0] });
  softBox([x - 42, y - 40, 30], [x + 42, y + 34, 78], { rc: 16, re: 10, n: 3, edges: false }); // broad pale swivel hood (photo: ≈90 × 75 mm, wheel showing below)
  part(`caster.${n}.bracket`, "static", "steel", { tour: "pedestal", explode: [cx, 0, 0] }); box([x - 46, y - 44, 78], [x + 46, y + 44, BASE]);
  part(`caster.${n}.hub`, "static", "brass", { tour: "pedestal", explode: [cx, 0, 0] }); cyl([x, y - 40.5, 54], "-y", 3, 10, 10, { seg: 16 }); // brass swivel nut seen through the hood opening
  part(`caster.${n}.opening`, "static", "black", { tour: "pedestal", explode: [cx, 0, 0] }); softBox([x - 22, y - 40.6, 34], [x + 22, y - 38, 70], { rc: 0, re: 8, n: 2, edges: false });
}
part("plinth", "static", "charcoal", { tour: "pedestal" }); box([COL + 20, 140, 46], [W - COL - 20, D - 80, BASE]);
// side housings: full-height formed volumes (radiused vertical corners and top edge) whose flat tops are the shoulders
for (const [x0, x1, n, ex] of [[0, COL, "left", -170], [W - COL, W, "right", 170]]) {
  part(`side.${n}`, "static", "body", { shell: n === "right", explode: [ex, 0, 0], tour: n === "right" ? "controls" : "enclosure" });
  softBox([x0, 0, BASE], [x1, D, H], { rc: 12, re: 10, n: 3 });
  part(`side.${n}.cover`, "static", "teal", { shell: n === "right", explode: [ex * 1.02, 0, 0], tour: "enclosure" }); // blue side cover panel
  const xo = n === "left" ? x0 - 1.0 : x1, xi = n === "left" ? x0 : x1 + 1.0;
  box([xo, 24, SIDEB], [xi, D - 24, H - 18]);
}
// right side (Fusion manual p8 side elevation, scaled 2.31 mm/px across, 2.13 mm/px up): front return 0–108, service panel
// y 108–649 / z 151–793 with a latch top-right (no fan guards), rear strip 649–834 carrying the warning
// triangle, rating plate and the power-entry module.
for (const [xs, sg, n] of [[-0.5, -1, "left"], [W + 0.5, 1, "right"]]) { const x0 = Math.min(xs, xs + sg * 0.6), x1 = Math.max(xs, xs + sg * 0.6);
  part(`side.${n}.seams`, "static", "vent", { shell: n === "right", explode: [sg * 172, 0, 0], tour: "enclosure" }); // service-panel and upper U-cover seams
  box([x0, 108, 151], [x1, 110, 793], { edges: false }); box([x0, 647, 151], [x1, 649, 793], { edges: false });
  box([x0, 108, 151], [x1, 649, 153], { edges: false }); box([x0, 108, 791], [x1, 649, 793], { edges: false });
  if (n === "left") { box([x0, 141, 845], [x1, 143, H - 2], { edges: false }); box([x0, 613, 845], [x1, 615, H - 2], { edges: false }); box([x0, 141, 843], [x1, 615, 845], { edges: false }); } }
part("side.right.upper", "static", "inset", { shell: true, explode: [174, 0, 0], tour: "enclosure" }); // upper inset, rounded lower corners (manual p8 elevation)
{ const R = 46, y0 = 145, y1 = 611, z0 = 830, z1 = H - 4, poly = [[y0, z1]];
  for (let i = 0; i <= 6; i++) { const a = Math.PI + (i / 6) * Math.PI / 2; poly.push([y0 + R + R * Math.cos(a), z0 + R + R * Math.sin(a)]); }
  for (let i = 0; i <= 6; i++) { const a = 1.5 * Math.PI + (i / 6) * Math.PI / 2; poly.push([y1 - R + R * Math.cos(a), z0 + R + R * Math.sin(a)]); }
  poly.push([y1, z1]); prismX(poly, W + 1.0, W + 1.6); } // sits on the blue cover (cover skin is W … W+1)
part("side.right.ports", "static", "black", { shell: true, explode: [178, 0, 0], tour: "enclosure" }); box([W + 1.6, 214, 886], [W + 4, 492, 944]);
part("side.right.ports.io", "static", "alu", { shell: true, explode: [180, 0, 0], tour: "enclosure" }); box([W + 4, 232, 900], [W + 6, 262, 928], { edges: false }); box([W + 4, 282, 908], [W + 6, 312, 920], { edges: false }); box([W + 4, 330, 908], [W + 6, 360, 920], { edges: false }); cyl([W + 4, 410, 914], "x", 2, 11, 11, { seg: 16, edges: false }); cyl([W + 4, 458, 914], "x", 2, 8, 8, { seg: 14, edges: false }); // network, 2 × USB, accessory, air-assist sense (schematic)
part("side.right.latch", "static", "black", { shell: true, explode: [178, 0, 0], tour: "enclosure" }); box([W, 540, 752], [W + 3, 614, 776]);
// The Model 17000 labeling photos (manual p8, drawing dated 09/2020) and the 2021 Edge manual photo "Cabinet right side
// cover panel" show the right side as a blue cover with no round fan guards (the Fusion-series line drawing has two).
// Those photos show a slotted grille on the rear strip; it is not modelled because its slot layout is not documented.
part("side.right.labels", "static", "yellow", { shell: true, explode: [180, 0, 0], tour: "enclosure" });
tri([W + 1.3, 735, 528], [W + 1.3, 800, 528], [W + 1.3, 767, 588], [1, 0, 0]); box([W, 735, 490], [W + 0.6, 800, 516], { edges: false }); // descriptive label under the warning triangle
part("side.right.plate", "static", "black", { shell: true, explode: [180, 0, 0], tour: "enclosure" }); box([W, 690, 420], [W + 0.8, 806, 476], { edges: false }); // certification / rating plate
part("side.right.power", "static", "panel", { shell: true, explode: [180, 0, 0], tour: "enclosure" }); box([W, 750, 250], [W + 3, 822, 405]); // module plate
part("side.right.switch", "static", "black", { shell: true, explode: [182, 0, 0], tour: "enclosure" }); // power-entry module, Fusion manual p8 side callouts
box([W + 3, 760, 268], [W + 13, 812, 306]); // IEC inlet shroud
box([W + 3, 762, 330], [W + 9, 810, 394]); // breaker/switch bezel
prismX([[770, 338], [802, 338], [802, 362], [770, 366]], W + 9, W + 19); prismX([[770, 366], [802, 362], [802, 386], [770, 386]], W + 9, W + 15); // rocker, tilted
box([W, 764, 232], [W + 8, 790, 250]); box([W, 764, 404], [W + 8, 790, 418]); // cable fittings
part("side.right.switch.face", "static", "inset", { shell: true, explode: [184, 0, 0], tour: "enclosure" }); box([W + 13, 768, 274], [W + 13.6, 804, 300], { edges: false }); // inlet socket face

// central front: sill, shallow recess with sloped returns, white access panel, blue fascia with the vent field
const RX0 = COL + 30, RX1 = W - COL - 30, RZ0 = 122, RZ1 = 366, RDEP = 34, RB = 30;
part("pedestal.front", "static", "body", { shell: true, explode: [0, -180, 0], tour: "pedestal" });
softBox([COL, CY, BASE], [W - COL, CY + 16, RZ0], { re: 9, n: 2, bottom: true, edges: false }); edge([COL, CY, RZ0], [W - COL, CY, RZ0]); box([COL, CY, RZ0], [RX0, CY + 16, RZ1]); box([RX1, CY, RZ0], [W - COL, CY + 16, RZ1]);
box([COL, CY, RZ1], [W - COL, CY + 16, FAS0]);
part("pedestal.seams", "static", "vent", { shell: true, explode: [0, -182, 0], tour: "pedestal" }); // panel joint under the fascia
box([COL, CY - 0.6, FAS0 - 1], [W - COL, CY, FAS0 + 1], { edges: false });
part("pedestal.recess", "static", "panel", { tour: "pedestal" });
{ const yF = CY + 16, yB = CY + 16 + RDEP, F = [[RX0, yF, RZ0], [RX1, yF, RZ0], [RX1, yF, RZ1], [RX0, yF, RZ1]], B = [[RX0 + RB, yB, RZ0 + 22], [RX1 - RB, yB, RZ0 + 22], [RX1 - RB, yB, RZ1 - RB], [RX0 + RB, yB, RZ1 - RB]];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(F[i], F[j], B[j], B[i]); edge(F[i], F[j]); } // soft returns: outline only at the opening
  part("pedestal.recess.back", "static", "inset", { tour: "pedestal" }); quad(B[0], B[1], B[2], B[3]); }
part("pedestal.labels", "static", "yellow", { shell: true, explode: [0, -184, 0], tour: "pedestal" }); // housing safety label, upper right
box([800, CY - 1, 700], [867, CY - 0.2, 736], { edges: false });
part("pedestal.labels.ink", "static", "black", { shell: true, explode: [0, -185, 0], tour: "pedestal" });
box([800, CY - 1.3, 700], [867, CY - 1, 702], { edges: false }); box([800, CY - 1.3, 734], [867, CY - 1, 736], { edges: false });
box([800, CY - 1.3, 700], [802, CY - 1, 736], { edges: false }); box([865, CY - 1.3, 700], [867, CY - 1, 736], { edges: false });
tri([806, CY - 1.3, 706], [826, CY - 1.3, 706], [816, CY - 1.3, 729]); for (let i = 0; i < 4; i++) box([831, CY - 1.3, 707 + i * 6.5], [861, CY - 1, 710 + i * 6.5], { edges: false });
part("pedestal.fasteners", "static", "steel", { shell: true, explode: [0, -184, 0], tour: "pedestal" });
for (const x of [COL + 19, W - COL - 19]) for (const z of [420, 637]) cyl([x, CY, z], "-y", 1.5, 5, 5, { seg: 12, edges: false });
part("fascia", "static", "teal", { shell: true, explode: [0, -160, 0], tour: "enclosure" }); box([COL, CY - 2, FAS0], [W - COL, CY + 16, LIDF0]);
part("fascia.vents", "static", "vent", { shell: true, explode: [0, -162, 0], tour: "enclosure" }); // four aligned rows × 21 short slots, ~6–94 % of the fascia
for (let r = 0; r < 4; r++) for (let i = 0; i < 21; i++) { const x = 196 + i * 31.6, z = VENT0 + 2 + r * 9; box([x, CY - 3, z], [x + 23, CY - 2, z + 3.6], { edges: false }); }
// rear panel and rear bay cover
part("rear.panel", "static", "panel", { explode: [0, 180, 0], tour: "exhaust" }); box([COL, D - 14, BASE], [W - COL, D, topZ(D) - 0.5]);
part("rear.bay", "static", "body", { explode: [0, 120, 120], tour: "source" }); onTop(LID.x0, LID.x1, LID.y1, D - 14, 1.5, -1.5);
part("rear.port", "static", "alu", { explode: [0, 210, 0], tour: "exhaust" }); cyl([W / 2, D, H - 330], "y", 70, 51, 51, { hole: 47 }); // 2021 Edge manual p.17: "approximately 13 inches (330.2 mm) from the top of the machine"
part("rear.air", "static", "brass", { explode: [0, 210, 0], tour: "air" }); cyl([W - COL - 60, D, 820], "y", 26, 6, 6, { seg: 14 }); cyl([W - COL - 60, D, 820], "y", 10, 9, 9, { seg: 6 });

// controls on the right shoulder, traced from Epilog's own near-overhead photo of the panel (1920 × 1080). Scale from the shoulder:
// lid seam → blue outer edge ≈ 730 px ≈ COL (158 mm) → ≈ 4.7 px/mm. The panel is NOT a separate slab on the shoulder: the
// shoulder top itself is a textured mid-grey control surface, flush, ending at the blue outer edge. On it, centred across
// the shoulder: a portrait 7-inch display with a narrow light-grey rim (outer ≈ 97 × 158 mm, 29–126 mm from the lid seam),
// and ≈ 29 mm in front of it two controls of ≈ 22 mm diameter on one line: the blue-ringed play/pause (Go/Stop) button
// INBOARD (54 mm from the seam) and a short domed joystick OUTBOARD (103 mm). Front edge position and slope are not shown in
// that crop by itself; the photo is cropped at the shoulder's front edge, so the plate runs flush to the front.
// Epilog Support "Replacing the control panel" photos 20–22/26 show the plate flat on a flat shoulder.
const CON = { x0: LID.x1 + 10, x1: W - 14, y0: 1, y1: 380, hf: 2, hr: 2 }; // dark, thin, flat plate ending ≈ 380 mm back, flush to the front edge
const CONA = 0;
const conF = (dz = 0) => ({ o: [0, CON.y0, H + CON.hf + dz], a: CONA });
const conP = (x, ly, h) => [x, CON.y0 + ly, H + CON.hf + h];
const SX = LID.x1; // the lid seam: photo distances are measured from here
const DX = SX + 77.5, DY0 = 49, DY1 = DY0 + 154; // photo cropped at the shoulder's front edge → display ≈ 50–205 mm, controls ≈ 20 mm from the front // display rim, local y from the panel front (CON.y0)
const BY = 20; // the two controls' centre line, ≈ 20 mm from the front edge (96 px above the crop)
part("controls.housing", "static", "charcoal", { shell: true, explode: [40, 0, 168], tour: "controls" });
box([CON.x0, CON.y0, H], [CON.x1, CON.y1, H + CON.hf]); box([CON.x0, CON.y0 - 1, H - 3], [CON.x1, CON.y0, H + CON.hf]); // thin flat plate, running over the front edge
part("controls.deck", "static", "plinth", { shell: true, explode: [40, 0, 170], tour: "controls" });
onSlope(conF(0), () => box([DX - 47, DY0, 0], [DX + 47, DY1, 1.2])); // light-grey display rim (outer ≈ 94 × 154 mm)
part("controls.display", "static", "black", { shell: true, explode: [40, 0, 172], tour: "controls" });
onSlope(conF(0.8), () => box([DX - 44, DY0 + 3, 0], [DX + 44, DY1 - 3, 0.8])); // glass, seated in the rim
part("controls.joystick", "static", "black", { shell: true, explode: [40, 0, 174], tour: "controls" });
onSlope(conF(0), () => cyl([SX + 103, BY, 0], "z", 2.5, 11.5, 11, { seg: 32 })); // collar
part("controls.joystick.cap", "static", "steel", { shell: true, explode: [40, 0, 176], tour: "controls" });
onSlope(conF(0), () => { cyl([SX + 103, BY, 2.5], "z", 3, 8, 7.6, { seg: 28 }); cyl([SX + 103, BY, 5.5], "z", 1.8, 7.6, 5.6, { seg: 28 }); cyl([SX + 103, BY, 7.3], "z", 1, 5.6, 2.5, { seg: 28 }); }); // low domed grey cap
part("controls.go", "static", "black", { shell: true, explode: [40, 0, 174], tour: "controls" });
onSlope(conF(0), () => cyl([SX + 54, BY, 0], "z", 3.2, 7.8, 7.4, { seg: 32 }));
part("controls.ring", "static", "led", { shell: true, explode: [40, 0, 174], tour: "controls" });
onSlope(conF(0), () => cyl([SX + 54, BY, 0], "z", 2.6, 11, 11, { seg: 40, hole: 8 }));
{ const o = conP(DX - 43, DY0 + 4, 1.7), v1 = conP(DX - 43, DY1 - 4, 1.7); DISPLAY.o = o; DISPLAY.u = [86, 0, 0]; DISPLAY.v = sub(v1, o); } // 7-inch (178 mm) LCD
// left shoulder: NO emergency stop on this machine. Model 17000 manual p8 ("Cabinet top left") shows the fire-safety label MT268 lying
// lengthwise on the left shoulder just in front of the rear vent group; both shoulders carry slotted vents toward the rear.
part("label.fire", "static", "yellow", { shell: false, explode: [-40, 0, 170] }); box([52, 400, H], [106, 548, H + 0.8], { edges: true });
part("label.fire.text", "static", "black", { explode: [-40, 0, 171] });
for (let i = 0; i < 5; i++) box([60, 410 + i * 16, H + 0.8], [98, 415 + i * 16, H + 1.1], { edges: false });
tri([64, 504, H + 0.9], [94, 504, H + 0.9], [79, 538, H + 0.9]);
for (const [x0, n] of [[30, "left"], [W - COL + 30, "right"]]) { part(`shoulder.vents.${n}`, "static", "vent", { shell: n === "right", explode: [n === "left" ? -40 : 40, 0, 170], tour: "enclosure" });
  for (let i = 0; i < 8; i++) box([x0, 572 + i * 18, H - 0.6], [x0 + COL - 60, 580 + i * 18, H + 0.3], { edges: false }); }
// no grille on the top deck behind the lid: no manufacturer photo shows slots there.

// ============================================================= lid (rotates about the rear hinge)
// blue front band wraps down the front (0.75–0.82 H), dark frame, large smoky window
part("lid.frame", "lid", "charcoal", { explode: [0, 0, 270], tour: "lid" });
{ const L = (x0, x1, y0, y1) => onTop(x0, x1, y0, y1, 22, -22);
  L(LID.x0 + 2, LID.x1 - 2, 4, 40); L(LID.x0 + 2, LID.x1 - 2, LID.y1 - 56, LID.y1); L(LID.x0 + 2, LID.x0 + 30, 40, LID.y1 - 56); L(LID.x1 - 30, LID.x1 - 2, 40, LID.y1 - 56); }
part("lid.front", "lid", "teal", { explode: [0, 0, 270], tour: "lid" }); box([LID.x0 + 2, -2, LIDF0], [LID.x1 - 2, 8, topZ(0)]);
part("lid.lip", "lid", "navy", { explode: [0, 0, 270], tour: "lid" }); box([LID.x0 + 2, -3, LIDF0], [LID.x1 - 2, 8, LIDF0 + 4]);
part("lid.label", "lid", "yellow", { explode: [0, 0, 272], tour: "lid" }); onTop(LID.x1 - 137, LID.x1 - 85, LID.y1 - 44, LID.y1 - 16, 0.8, 0); // defeatably-interlocked housing label (17000 manual p8; product photo)
part("lid.rear", "lid", "teal", { explode: [0, 0, 270], tour: "lid" }); onTop(LID.x0 + 2, LID.x1 - 2, LID.y1 - 20, LID.y1, 1.2, -1.2);
part("lid.glass", "lid", "glass", { explode: [0, 0, 270], tour: "lid" }); onTop(LID.x0 + 30, LID.x1 - 30, 40, LID.y1 - 56, 5, -12);
const STRUT = part("lid.struts", "lid", "charcoal", { explode: [0, 0, 266], tour: "lid" }), STRUT_ROD = part("lid.struts.rod", "lid", "steel", { explode: [0, 0, 266], tour: "lid" });
{ const th = 68 * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th), [hy, hz] = [HINGE[1], HINGE[2]];
  const toLid = (y, z) => { const dy = y - hy, dz = z - hz; return [hy + dy * c - dz * sn, hz + dy * sn + dz * c]; }; // inverse of the open rotation
  for (const x of [LID.x0 + 16, LID.x1 - 16]) { const [ly, lz] = toLid(700, 880), up = [x, 380, topZ(380) - 26], lo = [x, ly, lz], m = up.map((v, k) => v + (lo[k] - v) * 0.45);
    cur = STRUT_ROD; rod(up, m, 4, 8); cur = STRUT; rod(m, lo, 9, 10); } }
part("lid.led", "lid", "led", { explode: [0, 0, 260], tour: "lid" }); onTop(LID.x0 + 40, LID.x1 - 40, 46, 58, 4, -27);

// ============================================================= interior (static)
// Y guides inside both sides, bed frame, table lift screws, exhaust plenum, laser tube and optics in the rear bay
part("guide.left", "static", "alu", { tour: "guides" }); cyl([BED.x0 - 40, 60, BRIDGE_Z], "y", 690, 8, 8, { seg: 18 });
part("guide.right", "static", "alu", { tour: "guides" }); cyl([BED.x1 + 40, 60, BRIDGE_Z], "y", 690, 8, 8, { seg: 18 });
part("guide.leftrail", "static", "steel", { tour: "guides" }); box([COL + 2, 50, BRIDGE_Z - 26], [BED.x0 - 48, 760, BRIDGE_Z - 10]);
part("guide.rightrail", "static", "steel", { tour: "guides" }); box([BED.x1 + 48, 50, BRIDGE_Z - 26], [W - COL - 2, 760, BRIDGE_Z - 10]);
part("frame.deck", "static", "recess", { tour: "table" }); // fixed deck the table drops through
box([COL, 30, PED - 4], [BED.x0 - 50, D - 30, PED]); box([BED.x1 + 50, 30, PED - 4], [W - COL, D - 30, PED]);
box([BED.x0 - 50, 30, PED - 4], [BED.x1 + 50, BED.y0 - 50, PED]);
for (const [x, y] of [[BED.x0 - 40, BED.y0 - 30], [BED.x1 + 40, BED.y0 - 30], [BED.x0 - 40, BED.y1 + 30], [BED.x1 + 40, BED.y1 + 30]]) {
  part("lift.screw", "static", "steel", { tour: "table" }); cyl([x, y, 400], "z", PED - 400 + 40, 7, 7, { seg: 14 });
}
part("exhaust.plenum", "static", "charcoal", { tour: "exhaust" }); box([BED.x0 - 20, BED.y1 + 52, PED - 4], [BED.x1 + 20, BED.y1 + 92, FP - 10]);
part("exhaust.slots", "static", "vent", { tour: "exhaust" });
// process-extraction intake: one row of long horizontal slots across the rear wall, Model 17000 manual p.55 "Cleaning the Vents" photo
for (let i = 0; i < 6; i++) { const x = BED.x0 - 10 + i * 106; box([x, BED.y1 + 51, PED + 8], [x + 90, BED.y1 + 52, PED + 20], { edges: false }); }
part("exhaust.duct", "static", "hose", { tour: "exhaust" }); box([W / 2 - 45, BED.y1 + 92, 590], [W / 2 + 45, D - 14, 690]); box([W / 2 - 45, BED.y1 + 72, 590], [W / 2 + 45, BED.y1 + 92, PED]);
part("source.tube", "static", "tube", { explode: [0, 60, 200], tour: "source" }); box([COL + 70, 790, 892], [W - COL - 20, 818, 942]);
part("source.fins", "static", "alu", { explode: [0, 60, 200], tour: "source" });
for (let i = 0; i < 28; i++) { const x = COL + 84 + i * 23.5; box([x, 786, 888], [x + 3, 822, 946], { edges: false }); }
part("source.window", "static", "lens", { explode: [0, 60, 200], tour: "source" }); cyl([COL + 64, 804, 917], "-x", 6, 10, 10, { seg: 16 });
part("optics.m1", "static", "mirror", { explode: [-40, 60, 200], tour: "optics" }); box([COL + 8, 790, 902], [COL + 32, 818, 932]);
part("optics.m2", "static", "mirror", { explode: [-40, 0, 200], tour: "optics" }); box([COL + 8, 772, BRIDGE_Z + 4], [COL + 32, 798, BRIDGE_Z + 30]);
part("optics.beamrun", "static", "steel", { explode: [-40, 0, 200], tour: "optics" }); box([COL + 20, 796, 914], [LID.x1 - 120, 804, 920]); // housing hint (beam rides inside)
part("led.strip", "static", "led", { tour: "lid" }); box([BED.x0, CY + 18, LIDF0 - 18], [BED.x1, CY + 22, LIDF0 - 12], { edges: false });

// ============================================================= bridge (X-beam) — translates in Y
part("bridge.beam", "bridge", "alu", { tour: "bridge" }); box([COL + 6, -26, BRIDGE_Z - 12], [W - COL - 6, 26, BRIDGE_Z + 30]);
part("bridge.cover", "bridge", "charcoal", { tour: "bridge" }); box([COL + 20, -30, BRIDGE_Z + 6], [W - COL - 20, -26, BRIDGE_Z + 26]);
part("bridge.ends", "bridge", "charcoal", { tour: "bridge" }); box([COL + 2, -34, BRIDGE_Z - 30], [COL + 20, 34, BRIDGE_Z + 14]); box([W - COL - 20, -34, BRIDGE_Z - 30], [W - COL - 2, 34, BRIDGE_Z + 14]);
part("optics.m3", "bridge", "mirror", { tour: "optics" }); box([COL + 8, -10, BRIDGE_Z + 14], [COL + 30, 12, BRIDGE_Z + 36]);
part("bridge.belt", "bridge", "black", { tour: "bridge" }); box([BED.x0 - 40, -32, BRIDGE_Z + 12], [BED.x1 + 40, -30, BRIDGE_Z + 20], { edges: false });

// ============================================================= head (lens carriage) — translates in X on the bridge; local origin at the beam axis
part("head.carriage", "head", "charcoal", { tour: "head" }); box([-38, -64, BRIDGE_Z - 20], [38, -30, BRIDGE_Z + 44]);
part("head.cover", "head", "alu", { tour: "head" }); box([-34, -70, BRIDGE_Z - 10], [34, -64, BRIDGE_Z + 40]);
part("optics.m4", "head", "mirror", { tour: "optics" }); box([-14, -60, BRIDGE_Z + 12], [14, -36, BRIDGE_Z + 36]);
part("head.tube", "head", "alu", { tour: "head" }); cyl([0, -48, BRIDGE_Z - 20], "-z", BRIDGE_Z - 20 - (CONE_TIP + 26), 13, 13, { seg: 24 });
part("head.lens", "head", "lens", { tour: "head" }); cyl([0, -48, CONE_TIP + 40], "-z", 4, 14.5, 14.5, { seg: 24 });
part("head.cone", "head", "brass", { tour: "air" }); cyl([0, -48, CONE_TIP + 26], "-z", 26, 13, 4.5, { seg: 24, hole: 2.5 });
part("head.airline", "head", "hose", { tour: "air" }); cyl([22, -48, BRIDGE_Z + 40], "-z", BRIDGE_Z + 40 - (CONE_TIP + 40), 3, 3, { seg: 10 }); cyl([15, -48, CONE_TIP + 40], "x", 10, 3, 3, { seg: 10 });
part("head.plunger", "head", "steel", { tour: "focus" }); cyl([-26, -48, CONE_TIP + 54], "-z", 46, 3, 3, { seg: 10 }); cyl([-26, -48, CONE_TIP + 10], "-z", 4, 6, 6, { seg: 14 });
part("head.pointer", "head", "red", { tour: "head" }); box([18, -60, BRIDGE_Z - 20], [30, -36, BRIDGE_Z - 12]);

// ============================================================= table — translates in Z; local Z = 0 is the grid top at the focal plane
part("table.plate", "table", "steel", { tour: "table" }); box([BED.x0 - 30, BED.y0 - 30, -54], [BED.x1 + 30, BED.y1 + 30, -46]);
part("table.tray", "table", "tray", { tour: "table" }); box([BED.x0 - 22, BED.y0 - 22, -46], [BED.x1 + 22, BED.y1 + 22, -42]);
box([BED.x0 - 22, BED.y1 + 18, -42], [BED.x1 + 22, BED.y1 + 22, -20]);
part("table.tray.front", "table", "tray", { tour: "table" }); box([BED.x0 - 22, BED.y0 - 22, -42], [BED.x1 + 22, BED.y0 - 18, -20]); // cut away by the offcuts fault
part("table.grid", "table", "grid", { tour: "table" });
for (let i = 0; i <= 30; i++) { const x = BED.x0 + i * (610 / 30) - 1; box([x, BED.y0 - 18, -20], [x + 2, BED.y1 + 18, 0], { edges: false }); }
part("table.grid.bars", "table", "grid", { tour: "table" }); // cross bars under the slats: cut away in the offcuts fault's front section
for (let j = 0; j <= 6; j++) { const y = BED.y0 + j * (610 / 6) - 1.5; box([BED.x0 - 18, y, -20], [BED.x1 + 18, y + 3, -3], { edges: false }); }
part("table.gridframe", "table", "alu", { tour: "table" }); box([BED.x0 - 22, BED.y0 - 22, -20], [BED.x1 + 22, BED.y1 + 22, -1], { edges: true });
for (const [x, y] of [[BED.x0 - 40, BED.y0 - 30], [BED.x1 + 40, BED.y0 - 30], [BED.x0 - 40, BED.y1 + 30], [BED.x1 + 40, BED.y1 + 30]]) {
  part("table.nut", "table", "brass", { tour: "table" }); cyl([x, y, -70], "z", 24, 14, 14, { seg: 16 });
}
// offcuts in the tray (shown by the offcuts fault): 6 mm ply cut-outs of the sizes small parts leave — squares, slivers, discs,
// concentrated toward the front so the fault's front section shows them; one piece (".hot") is the one that catches
part("table.debris", "table", "debris", { tour: "table" });
for (const [x, y, w, d] of [[262, 160, 22, 14], [318, 236, 12, 30], [372, 172, 26, 18], [436, 284, 9, 34], [560, 196, 24, 12], [612, 268, 16, 16], [668, 178, 30, 9], [720, 296, 14, 22], [344, 348, 18, 18], [598, 360, 11, 26], [404, 410, 20, 12], [652, 420, 15, 15], [540, 398, 24, 10], [300, 430, 12, 12]])
  box([x, y, -42], [x + w, y + d, -36], { edges: false });
for (const [x, y, r] of [[408, 220, 9], [530, 318, 12], [690, 360, 7], [286, 300, 6], [742, 226, 10], [560, 440, 8]]) cyl([x, y, -42], "z", 6, r, r, { seg: 20 });
// the one that catches lies under the front edge of the sheet (sheet y from 330), so the fault's front section shows it under the sheet
part("table.debris.hot", "table", "debris", { tour: "table" }); box([470, 352, -42], [498, 366, -36], { edges: false }); cyl([490, 382, -42], "z", 6, 8, 8, { seg: 20 });

// ============================================================= stock — on the grid, moves for the registration fault
part("stock.sheet", "stock", "ply", { tour: "stock" }); box([0, 0, 0], [STOCK.w, STOCK.d, STOCK.t]);

// ------------------------------------------------------------- tour components (what the part tour visits; text lives in content.mjs)
export const TOUR_ORDER = ["enclosure", "pedestal", "lid", "controls", "bridge", "head", "focus", "air", "table", "stock", "guides", "optics", "source", "exhaust"];

// ------------------------------------------------------------- tessellate into per-group typed arrays
export function build() {
  const out = { groups: {}, parts: [], mats: MATS.map(([n, c, s, a]) => ({ n, c, s, a })) };
  const per = Object.fromEntries(GROUPS.map((g) => [g, { pos: [], nrm: [], attr: [], lpos: [], lattr: [], glass: { pos: [], nrm: [], attr: [] } }]));
  parts.forEach((p, id) => {
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    const G = per[p.group], A = MATS[p.mat][3] < 1 ? G.glass : G;
    for (const [a, b, c, ns, sm] of p.tris) {
      [a, b, c].forEach((v, k) => {
        A.pos.push(v[0], v[1], v[2]); A.nrm.push(ns[k][0], ns[k][1], ns[k][2]); A.attr.push(id, p.mat, sm, 0);
        for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], v[i]); hi[i] = Math.max(hi[i], v[i]); }
      });
    }
    for (const [a, b] of p.edges) { G.lpos.push(...a, ...b); G.lattr.push(id, p.mat, 0, 0, id, p.mat, 0, 0); }
    out.parts.push({ name: p.name, group: p.group, mat: p.mat, shell: p.shell, explode: p.explode, tour: p.tour, lo: lo.map((x) => +x.toFixed(1)), hi: hi.map((x) => +x.toFixed(1)), tris: p.tris.length });
  });
  const b64 = (arr) => Buffer.from(new Float32Array(arr).buffer).toString("base64");
  for (const g of GROUPS) {
    const G = per[g];
    out.groups[g] = { pos: b64(G.pos), nrm: b64(G.nrm), attr: b64(G.attr), n: G.pos.length / 3, lpos: b64(G.lpos), lattr: b64(G.lattr), ln: G.lpos.length / 3,
      glass: { pos: b64(G.glass.pos), nrm: b64(G.glass.nrm), attr: b64(G.glass.attr), n: G.glass.pos.length / 3 } };
  }
  return out;
}

// envelope audit: the outer box of the closed machine must equal the published dimensions (casters to lid top)
export function audit(model) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const p of model.parts) {
    if (["rear.port", "rear.air", "side.right.power", "side.right.switch", "lid.handle", "lid.front", "fascia", "fascia.vents", "fascia.strip", "pedestal.labels", "pedestal.fasteners", "pedestal.seams", "side.left.vents", "side.right.vents", "side.left.seam", "side.right.seam", "lid.lip", "controls.deck", "controls.display", "controls.joystick", "controls.joystick.cap", "controls.go", "controls.ring", "label.fire", "label.fire.text", "shoulder.vents.left", "shoulder.vents.right", "deck.grille", "controls.housing", "side.left.cover", "side.right.cover", "side.right.fans", "side.right.labels", "side.right.upper", "side.right.ports", "side.right.ports.io", "side.right.plate", "side.right.switch.face", "side.right.latch", "side.left.seams", "side.right.seams", "pedestal.labels.ink", "lid.label"].includes(p.name)) continue; // protrusions/trim
    if (p.group !== "static" && p.group !== "lid") continue;
    for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p.lo[i]); hi[i] = Math.max(hi[i], p.hi[i]); }
  }
  const size = hi.map((h, i) => +(h - lo[i]).toFixed(1));
  const lidTop = Math.max(...model.parts.filter((p) => p.group === "lid").map((p) => p.hi[2]));
  return { envelope: size, published: [W, D, H], bodyMatches: Math.abs(size[0] - W) < 0.6 && Math.abs(size[1] - D) < 0.6 && Math.abs(size[2] - H) < 0.6,
    bed: [BED.x1 - BED.x0, BED.y1 - BED.y0], lidTop: +lidTop.toFixed(1), protrusionsNote: "Lid frame/handle, fascia trim, top-mounted controls (joystick ≈40 mm), labels, rear port and air fitting protrude beyond the published box by up to the stated amounts; schematic." };
}
