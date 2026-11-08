// Epilog Fusion Edge 24 in raw WebGL2 (no libraries). Same approach as the ShopBot PRSalpha viewer: per-part state
// texture (mode + emission + explode vector), hemispheric + wrapped key light, blurred planar floor shadow, depth-faded
// edges, HTML callouts anchored to 3D points, staged fault beats, part tour, cutaway/exploded views and a camera with
// presets, sliders, orthographic mode and a shareable URL hash. Millimetres, Z up, front face at y = 0.
const D = __DATA__;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const stage = $(".sb-gl-stage"), canvas = stage.querySelector("canvas"), fallback = $(".sb-gl-fallback");
const calloutLayer = $("[data-callouts]"), readout = $("[data-readout]"), status = $("[data-status]");
const runButton = $("[data-run]"), runLabel = $("[data-run-label]"), scrub = $("[data-scrub]"), timeLabel = $("[data-time]"), speedSelect = $("[data-speed]");
const capBeat = $("[data-beat]"), capText = $("[data-caption]"), capTodo = $("[data-todo]"), capNav = $("[data-beatnav]"), autoButton = $("[data-beat-auto]");
const faultButtons = $$("[data-fault]"), faultDetail = $("[data-fault-detail]"), viewButtons = $$("[data-view]"), partButtons = $$("[data-part]");
const projButtons = $$("[data-proj]"), themeButtons = $$("[data-theme-set]"), toggleButtons = $$("[data-toggle]"), tourButton = $("[data-tour]"), partTourButton = $("[data-part-tour]");
const linkOut = $("[data-link]"), phaseList = $("[data-phases]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const K = D.K, JOB = D.JOB, FAULTS = D.FAULTS, TOUR = D.TOUR, VIEWS = D.VIEWS, BEAT_LEN = D.BEAT_LEN, BEAT_HOLD = 1.4;
const DEG = Math.PI / 180;

const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
if (!gl) { fallback.hidden = false; throw new Error("WebGL2 unavailable"); }
gl.getExtension("EXT_color_buffer_float");

// ---------------------------------------------------------------- math
const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]), unit: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
const M4 = () => { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };
const TMP = M4();
function ident(o) { o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; }
function mulInto(o, a, b) { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) TMP[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3]; o.set(TMP); return o; }
function translation(o, x, y, z) { ident(o); o[12] = x; o[13] = y; o[14] = z; return o; }
function rotXAbout(o, ang, p) { ident(o); const c = Math.cos(ang), s = Math.sin(ang); o[5] = c; o[6] = s; o[9] = -s; o[10] = c; o[13] = p[1] - (c * p[1] - s * p[2]); o[14] = p[2] - (s * p[1] + c * p[2]); return o; }
function perspectiveInto(o, fovy, aspect, near, far) { const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far); o.fill(0); o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf; o[11] = -1; o[14] = 2 * far * near * nf; return o; }
function orthoInto(o, hw, hh, near, far) { o.fill(0); o[0] = 1 / hw; o[5] = 1 / hh; o[10] = -2 / (far - near); o[14] = -(far + near) / (far - near); o[15] = 1; return o; }
function lookAtInto(o, eye, t) {
  let zx = eye[0] - t[0], zy = eye[1] - t[1], zz = eye[2] - t[2]; let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
  let xx = -zy, xy = zx; l = Math.hypot(xx, xy); if (l < 1e-6) { xx = 1; xy = 0; l = 1; } xx /= l; xy /= l; const xz = 0;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0; o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0; o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
  o[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]); o[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]); o[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]); o[15] = 1; return o;
}
const xform = (m, p, out = [0, 0, 0]) => { out[0] = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]; out[1] = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]; out[2] = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]; return out; };
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const approach = (cur, goal, dt, tau) => cur + (goal - cur) * (1 - Math.exp(-dt / tau));
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------------------------------------------------------------- shaders
const HEAD = "#version 300 es\nprecision highp float;\nprecision highp int;\n";
const NM = D.model.mats.length;
const PARTS_GLSL = `uniform sampler2D uParts; uniform vec3 uMat[${NM}]; uniform float uSpec[${NM}]; uniform float uExplode;
vec4 partState(float id){ int i = int(id + 0.5); return texelFetch(uParts, ivec2(i % 512, 2 * (i / 512)), 0); }
vec3 partExplode(float id){ int i = int(id + 0.5); return texelFetch(uParts, ivec2(i % 512, 2 * (i / 512) + 1), 0).xyz; }`;
const SOLID_VS = `${HEAD}layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec4 aAttr;
uniform mat4 uProj, uView, uModel; ${PARTS_GLSL}
out vec3 vW; out vec3 vN; out vec3 vCol; out vec3 vEmit; out float vSpec; out float vSmooth; flat out int vMode;
void main(){ vec4 st = partState(aAttr.x); vMode = int(st.r + 0.5); vEmit = st.gba;
  vec4 w = uModel * vec4(aPos + partExplode(aAttr.x) * uExplode, 1.0); vW = w.xyz; vN = mat3(uModel) * aNrm; int m = int(aAttr.y + 0.5);
  vCol = uMat[m]; vSpec = uSpec[m]; vSmooth = aAttr.z;
  gl_Position = (vMode == 3 || vMode == 5) ? vec4(2.0, 2.0, 2.0, 1.0) : uProj * uView * w; }`;
const SOLID_FS = `${HEAD}in vec3 vW; in vec3 vN; in vec3 vCol; in vec3 vEmit; in float vSpec; in float vSmooth; flat in int vMode;
uniform vec3 uEye, uViewDir, uKeyDir, uKey, uSky, uGround, uNeutral, uAccent; uniform float uFocus, uPulse, uAlpha; uniform int uOrtho, uPass; out vec4 o;
void main(){
  vec3 n = normalize(vN); vec3 V = uOrtho == 1 ? -uViewDir : normalize(uEye - vW);
  if (dot(n, V) < 0.0) n = -n;
  vec3 amb = mix(uGround, uSky, n.z * 0.5 + 0.5);
  float wrap = max(0.0, (dot(n, uKeyDir) + 0.45) / 1.45);
  vec3 H = normalize(uKeyDir + V); float sp = pow(max(dot(n, H), 0.0), 48.0) * vSpec;
  float fres = pow(1.0 - clamp(abs(dot(n, V)), 0.0, 1.0), 3.0);
  vec3 c = vCol * (amb + uKey * wrap) + uKey * sp * 0.55 + uSky * fres * 0.05;
  if (vMode == 0) { float g = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(c, uNeutral * (0.8 + 0.5 * g), 0.88 * uFocus); }
  if (vMode == 2) c = mix(c, uAccent * (0.55 + 0.6 * wrap), 0.6 + 0.2 * uPulse) + uAccent * fres * 0.4;
  if (vEmit.r + vEmit.g + vEmit.b > 0.01) c = vEmit * (0.9 + 0.3 * fres) + vec3(0.06);
  float a = uPass == 1 ? uAlpha * (0.55 + 0.45 * fres) : 1.0;
  if (uPass == 1) { float streak = smoothstep(0.35, 0.0, abs(fract((vW.x + vW.y * 0.8) / 620.0) - 0.5) - 0.12); c += uSky * (0.22 * fres + 0.10 * streak); }
  o = vec4(c, vMode == 4 ? 0.22 : a); }`;
const LINE_VS = `${HEAD}layout(location=0) in vec3 aPos; layout(location=2) in vec4 aAttr;
uniform mat4 uProj, uView, uModel; ${PARTS_GLSL}
uniform vec2 uFade; uniform float uEdge, uFocus, uLineAlpha; uniform vec3 uAccent; out vec4 vC;
void main(){ vec4 st = partState(aAttr.x); int mode = int(st.r + 0.5); vec4 w = uModel * vec4(aPos + partExplode(aAttr.x) * uExplode, 1.0); vec4 e = uView * w;
  float fade = 1.0 - smoothstep(uFade.x, uFade.y, -e.z); int m = int(aAttr.y + 0.5);
  vec3 col = uMat[m] * uEdge; float a = uLineAlpha * fade;
  if (mode == 0) a *= 1.0 - 0.9 * uFocus;
  if (mode == 2) { col = uAccent; a = max(a, 0.9); }
  if (mode == 4) a *= 0.35;
  if (mode == 5) { col = uAccent; a = max(a, 0.55); } // ghost: a part cut away for one teaching beat keeps its outline
  vC = vec4(col, a); gl_Position = mode == 3 ? vec4(2.0, 2.0, 2.0, 1.0) : uProj * e; }`;
const LINE_FS = `${HEAD}in vec4 vC; out vec4 o; void main(){ o = vC; }`;
const SHADOW_VS = `${HEAD}layout(location=0) in vec3 aPos; layout(location=2) in vec4 aAttr;
uniform mat4 uModel; uniform vec3 uL; uniform vec4 uRect; ${PARTS_GLSL}
void main(){ vec4 st = partState(aAttr.x); int mode = int(st.r + 0.5); vec4 w = uModel * vec4(aPos + partExplode(aAttr.x) * uExplode, 1.0);
  float z = max(w.z, 0.0); vec2 p = w.xy - uL.xy * (z / uL.z); vec2 uv = (p - uRect.xy) / (uRect.zw - uRect.xy);
  gl_Position = (mode == 3 || mode == 4 || mode == 5) ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(uv * 2.0 - 1.0, 0.0, 1.0); }`;
const SHADOW_FS = `${HEAD}out vec4 o; void main(){ o = vec4(1.0); }`;
const BLUR_VS = `${HEAD}layout(location=0) in vec3 aPos; out vec2 vUV; void main(){ vUV = aPos.xy; gl_Position = vec4(aPos.xy * 2.0 - 1.0, 0.0, 1.0); }`;
const BLUR_FS = `${HEAD}in vec2 vUV; uniform sampler2D uSrc; uniform vec2 uStep; out vec4 o;
void main(){ const float W[5] = float[5](0.2270, 0.1946, 0.1216, 0.0541, 0.0162); float s = texture(uSrc, vUV).r * W[0];
  for (int i = 1; i < 5; i++) { s += (texture(uSrc, vUV + uStep * float(i)).r + texture(uSrc, vUV - uStep * float(i)).r) * W[i]; } o = vec4(s, 0.0, 0.0, 1.0); }`;
const FLOOR_VS = `${HEAD}layout(location=0) in vec3 aPos; uniform mat4 uProj, uView; uniform vec4 uQuad; out vec2 vXY;
void main(){ vXY = mix(uQuad.xy, uQuad.zw, aPos.xy); gl_Position = uProj * uView * vec4(vXY, 0.0, 1.0); }`;
const FLOOR_FS = `${HEAD}in vec2 vXY; uniform sampler2D uShTex; uniform vec4 uShRect; uniform vec3 uFloor, uGrid, uClear; uniform vec4 uShadow; uniform vec2 uCentre; uniform float uRadius; out vec4 o;
float shadowAt(vec2 xy){ vec2 uv = (xy - uShRect.xy) / (uShRect.zw - uShRect.xy); if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0; return texture(uShTex, uv).r; }
void main(){ vec2 q = vXY / 100.0; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); float line = 1.0 - min(min(g.x, g.y), 1.0);
  vec2 q2 = vXY / 500.0; vec2 g2 = abs(fract(q2 - 0.5) - 0.5) / fwidth(q2); float major = 1.0 - min(min(g2.x, g2.y), 1.0);
  float r = length(vXY - uCentre) / uRadius; float fade = 1.0 - smoothstep(0.25, 1.0, r);
  vec3 c = mix(uFloor, uGrid, max(line * 0.55, major * 0.9) * fade);
  c = mix(c, uShadow.rgb, shadowAt(vXY) * uShadow.a);
  o = vec4(mix(uClear, c, fade), 1.0); }`;
const TEX_VS = `${HEAD}layout(location=0) in vec3 aPos; uniform mat4 uProj, uView, uModel; uniform vec3 uO, uU, uV; out vec2 vUV;
void main(){ vUV = aPos.xy; gl_Position = uProj * uView * uModel * vec4(uO + uU * aPos.x + uV * aPos.y, 1.0); }`;
const TEX_FS = `${HEAD}in vec2 vUV; uniform sampler2D uTex; uniform float uDim, uLit, uHot, uPulse; uniform vec3 uNeutral, uShade, uAccent; out vec4 o;
void main(){ vec4 t = texture(uTex, vec2(vUV.x, 1.0 - vUV.y)); vec3 c = t.rgb * mix(uShade, vec3(1.0), uLit); float g = dot(c, vec3(0.3, 0.59, 0.11));
  c = mix(c, uNeutral * (0.8 + 0.5 * g), 0.85 * uDim * (1.0 - uHot)); c = mix(c, uAccent * (0.6 + 0.5 * g), uHot * (0.45 + 0.15 * uPulse)); o = vec4(c, t.a); }`;
const FX_VS = `${HEAD}layout(location=0) in vec3 aPos; uniform mat4 uProj, uView, uModel; out vec3 vL;
void main(){ vL = aPos; gl_Position = uProj * uView * uModel * vec4(aPos, 1.0); }`;
const FX_FS = `${HEAD}in vec3 vL; uniform vec4 uColor; uniform int uSoft; out vec4 o;
void main(){ float a = uColor.a; if (uSoft == 1) { float r = length(vL.xy); a *= smoothstep(1.0, 0.0, r); if (a < 0.004) discard; } o = vec4(uColor.rgb, a); }`;
function program(vs, fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); gl.attachShader(p, sh);
  }
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}
const SOLID = program(SOLID_VS, SOLID_FS), LINE = program(LINE_VS, LINE_FS), SHADOW = program(SHADOW_VS, SHADOW_FS), BLUR = program(BLUR_VS, BLUR_FS);
const FLOOR = program(FLOOR_VS, FLOOR_FS), TEX = program(TEX_VS, TEX_FS), FX = program(FX_VS, FX_FS);

// ---------------------------------------------------------------- geometry upload
const f32 = (b64) => { const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new Float32Array(u8.buffer); };
function vao(attrs) {
  const va = gl.createVertexArray(); gl.bindVertexArray(va);
  for (const [loc, data, size] of attrs) { if (!data) continue; const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); }
  gl.bindVertexArray(null); return va;
}
const PARTS = D.model.parts, NP = PARTS.length;
const GROUP = {};
for (const [name, g] of Object.entries(D.model.groups)) {
  GROUP[name] = { name, model: M4(), solid: { vao: vao([[0, f32(g.pos), 3], [1, f32(g.nrm), 3], [2, f32(g.attr), 4]]), count: g.n },
    lines: { vao: vao([[0, f32(g.lpos), 3], [2, f32(g.lattr), 4]]), count: g.ln },
    glass: g.glass.n ? { vao: vao([[0, f32(g.glass.pos), 3], [1, f32(g.glass.nrm), 3], [2, f32(g.glass.attr), 4]]), count: g.glass.n } : null };
}
const GROUPS = Object.values(GROUP);
const quadBuf = vao([[0, new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0]), 3]]);
// unit disc (soft billboards) and unit cone along +z (radius 1 at z=0 → 0 at z=1) for the beam
const discBuf = vao([[0, new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]), 3]]);
const coneData = []; const CSEG = 24;
for (let i = 0; i < CSEG; i++) { const a0 = (i / CSEG) * 2 * Math.PI, a1 = ((i + 1) / CSEG) * 2 * Math.PI; coneData.push(Math.cos(a0), Math.sin(a0), 0, Math.cos(a1), Math.sin(a1), 0, 0, 0, 1); }
const coneBuf = vao([[0, new Float32Array(coneData), 3]]); const coneCount = CSEG * 3;
// smooth cone for the beam/focus illustration: 96 segments, radius 1 at z=0 → apex at z=1
const SCONE = (() => { const d = [], n = 96; for (let i = 0; i < n; i++) { const a0 = (i / n) * 2 * Math.PI, a1 = ((i + 1) / n) * 2 * Math.PI; d.push(Math.cos(a0), Math.sin(a0), 0, Math.cos(a1), Math.sin(a1), 0, 0, 0, 1); } return { buf: vao([[0, new Float32Array(d), 3]]), n: n * 3 }; })();
const cylData = []; for (let i = 0; i < CSEG; i++) { const a0 = (i / CSEG) * 2 * Math.PI, a1 = ((i + 1) / CSEG) * 2 * Math.PI; const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1); cylData.push(c0, s0, 0, c1, s1, 0, c1, s1, 1, c0, s0, 0, c1, s1, 1, c0, s0, 1); }
const cylBuf = vao([[0, new Float32Array(cylData), 3]]); const cylCount = CSEG * 6;

// part lookups
const partIndex = new Map(PARTS.map((p, i) => [p.name, i]));
const partsMatching = (prefixes) => { const out = []; PARTS.forEach((p, i) => { if (prefixes.some((x) => p.name === x || p.name.startsWith(x))) out.push(i); }); return out; };
const BBOX = { lo: [0, 0, 0], hi: [K.W, K.D, K.H] }; BBOX.centre = [K.W / 2, K.D / 2]; BBOX.radius = Math.hypot(K.W, K.D) * 1.2;

// part-state texture: row 2k = (mode, emission rgb), row 2k+1 = (explode xyz, 0)
const partTex = gl.createTexture(); const partData = new Float32Array(512 * 2 * Math.ceil(NP / 512) * 4);
gl.bindTexture(gl.TEXTURE_2D, partTex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
PARTS.forEach((p, i) => { const r = 2 * Math.floor(i / 512) + 1, c = i % 512; partData.set([p.explode[0], p.explode[1], p.explode[2], 0], (r * 512 + c) * 4); });
function uploadParts() { gl.bindTexture(gl.TEXTURE_2D, partTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 512, 2 * Math.ceil(NP / 512), 0, gl.RGBA, gl.FLOAT, partData); }
const setPart = (i, mode, e = [0, 0, 0]) => { const r = 2 * Math.floor(i / 512), c = i % 512; partData.set([mode, e[0], e[1], e[2]], (r * 512 + c) * 4); };

// ---------------------------------------------------------------- 2D canvases → textures (display, fascia lettering, the sheet)
const ANISO = gl.getExtension("EXT_texture_filter_anisotropic");
function canvasTex(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); if (ANISO) gl.texParameterf(gl.TEXTURE_2D, ANISO.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(ANISO.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return { c, ctx: c.getContext("2d"), t, dirty: true }; }
function pushTex(T) { gl.bindTexture(gl.TEXTURE_2D, T.t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, T.c); gl.generateMipmap(gl.TEXTURE_2D); T.dirty = false; }
const LOGO = canvasTex(1600, 160), LIDLOGO = canvasTex(1640, 164), SIDE = canvasTex(1200, 200), SCREEN = canvasTex(352, 620), SHEET = canvasTex(1600, 1200);
// Epilog's emblem as photographed: a squared block "C" (heavy spine, broad top and bottom arms, blue window opening right)
// with a short bar floating in the window. Weight contrast (bold Epilog/Fusion, thin Laser.com/Edge) is made by stroking:
// fattening with the ink, thinning with destination-out, so it does not depend on which font weights the system has.
function emblem(c, x, y, s) { const w = s * 0.86; c.fillRect(x, y, w, s); c.save(); c.globalCompositeOperation = "destination-out";
  c.fillRect(x + s * 0.36, y + s * 0.29, w, s * 0.42); c.restore(); c.fillRect(x + s * 0.47, y + s * 0.43, w - s * 0.47, s * 0.14); }
function word(c, txt, x, y, size, weight) { c.font = `500 ${size}px 'IBM Plex Sans', Arial, sans-serif`; c.fillText(txt, x, y);
  if (weight > 0) { c.lineWidth = weight * size; c.lineJoin = "round"; c.strokeText(txt, x, y); }
  else { c.save(); c.globalCompositeOperation = "destination-out"; c.lineWidth = -weight * size; c.strokeText(txt, x, y); c.restore(); }
  return c.measureText(txt).width; }
function wordmark(c, a, b, x, y, size, maxW) { c.font = `500 ${size}px 'IBM Plex Sans', Arial, sans-serif`; const tw = c.measureText(a + b).width; if (tw > maxW) size *= maxW / tw;
  const w1 = word(c, a, x, y, size, 0.05); word(c, b, x + w1 + size * 0.02, y, size, -0.022); }
function drawLogos() {
  const ink = "#f4f7f9"; // 2.286 px per mm on all three canvases
  for (const T of [LOGO, LIDLOGO, SIDE]) { const c = T.ctx; c.clearRect(0, 0, T.c.width, T.c.height); c.fillStyle = ink; c.strokeStyle = ink; c.textBaseline = "alphabetic"; c.textAlign = "left"; }
  emblem(LOGO.ctx, 10, 12, 136); wordmark(LOGO.ctx, "Epilog", "Laser.com", 150, 112, 92, 720);
  { const c = LIDLOGO.ctx, size = 84; c.font = `500 ${size}px 'IBM Plex Sans', Arial, sans-serif`; const tw = c.measureText("FusionEdge").width; wordmark(c, "Fusion", "Edge", 1622 - Math.min(tw, 430), 112, size, 430); }
  emblem(SIDE.ctx, 20, 34, 132); wordmark(SIDE.ctx, "Epilog", "Laser.com", 170, 140, 112, 980);
  LOGO.dirty = LIDLOGO.dirty = SIDE.dirty = true;
}
drawLogos();
const SPX = SHEET.c.width / K.STOCK.w; // px per mm on the sheet
let sheetBase = null;
function sheetReset(plastic) {
  const c = SHEET.ctx, w = SHEET.c.width, h = SHEET.c.height; seed = 11;
  if (plastic) { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#b9c3c8"); g.addColorStop(1, "#9eaab0"); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 6; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(i * 260, 0); c.lineTo(i * 260 + 300, h); c.stroke(); } }
  else { c.fillStyle = "#cfa572"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const y = rnd() * h; c.strokeStyle = `rgba(${120 + rnd() * 40},${80 + rnd() * 30},${40 + rnd() * 20},${0.10 + rnd() * 0.18})`; c.lineWidth = 1 + rnd() * 3; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 60) c.lineTo(x, y + Math.sin(x / 140 + i) * 6 + (rnd() - 0.5) * 3); c.stroke(); } }
  ROWS_DONE.clear(); SHEET.dirty = true;
}
const r0 = JOB.raster;
const RASTER = { oy: 0 }; // fault beats may engrave the artwork shifted toward the front by oy (stock mm): a second copy beside the first
// raster mask: the job's artwork sampled at 1 mm (stock coordinates, y from the front edge)
const MASK = (() => { const r = JOB.raster, w = r.x1 - r.x0, h = r.y1 - r.y0; const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
  x.fillStyle = "#000"; x.fillRect(0, 0, w, h); x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = "700 46px 'IBM Plex Sans', Arial, sans-serif"; x.fillText("FAB LAB", w / 2, h * 0.30); x.font = "700 52px 'IBM Plex Sans', Arial, sans-serif"; x.fillText("SAGA", w / 2, h * 0.76);
  const d = x.getImageData(0, 0, w, h).data; const m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = d[i * 4] > 120 ? 1 : 0; return { w, h, m }; })();
const maskAt = (xs, ys) => { const r = JOB.raster; const i = Math.floor(xs - r.x0), j = Math.floor(r.y1 - ys); return i >= 0 && j >= 0 && i < MASK.w && j < MASK.h && MASK.m[j * MASK.w + i] === 1; };
// engraved artwork at sheet resolution, one canvas per result: in focus (crisp, full depth), out of focus (spread, softer,
// lighter), weak optics (crisp but faint). Raster rows reveal it by clipping, so letter edges stay smooth at any zoom.
const ART = (() => { const w = Math.round((r0.x1 - r0.x0) * SPX), h = Math.round((r0.y1 - r0.y0) * SPX);
  const lines = [["FAB LAB", 46, 0.30], ["SAGA", 52, 0.76]];
  const make = (layers) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round";
    for (const { fill, blur = 0, grow = 0 } of layers) { x.filter = blur ? `blur(${blur * SPX}px)` : "none"; x.fillStyle = x.strokeStyle = fill; x.lineWidth = 2 * grow * SPX;
      for (const [t, size, fy] of lines) { x.font = `700 ${size * SPX}px 'IBM Plex Sans', Arial, sans-serif`; x.fillText(t, w / 2, h * fy); if (grow) x.strokeText(t, w / 2, h * fy); } }
    return c; };
  return { w, h,
    good: make([{ fill: "rgba(92,52,22,.35)", blur: 0.5, grow: 0.25 }, { fill: "rgba(52,26,10,.96)" }]),
    blur: make([{ fill: "rgba(110,66,30,.30)", blur: 3.2, grow: 2.4 }, { fill: "rgba(84,46,18,.55)", blur: 1.8, grow: 0.8 }]),
    weak: make([{ fill: "rgba(104,64,30,.46)" }]) }; })();
const ROWS_DONE = new Map(); // row+style → painted [lo, hi] (stock mm), so a repeated sweep doesn't darken translucent marks
function paintArt(style) { const c = SHEET.ctx, H = SHEET.c.height; c.drawImage(ART[style] || ART.good, r0.x0 * SPX, H - r0.y1 * SPX); SHEET.dirty = true; }
function paintArc(a0, a1, ox, oy) { const cc = JOB.circle, n = Math.max(2, Math.ceil((a1 - a0) * 96)); let prev = null; // stock mm, offset by (ox, oy)
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * 2 * Math.PI, pt = [cc.cx + cc.r * Math.cos(a) + ox, cc.cy + cc.r * Math.sin(a) + oy]; if (prev) paint(prev[0], prev[1], pt[0], pt[1], "vector", "good"); prev = pt; } }
function paint(x0, y0, x1, y1, kind, style) {
  const c = SHEET.ctx, H = SHEET.c.height, P = (x, y) => [x * SPX, H - y * SPX];
  c.save();
  const weak = style === "weak", blur = style === "blur";
  if (blur) c.filter = "blur(3px)";
  if (kind === "raster") {
    if (Math.abs(y1 - y0) > 0.5) { c.restore(); return; } // row change: nothing is engraved on the turnaround
    const key = `${Math.round(y0 * 10)}:${style}`, done = ROWS_DONE.get(key); let lo = Math.min(x0, x1), hi = Math.max(x0, x1);
    if (done) { if (lo >= done[0] && hi <= done[1]) { c.restore(); return; } if (lo < done[0] && hi > done[1]) { /* spans both sides: paint whole, rare */ } else if (lo < done[0]) hi = Math.min(hi, done[0]); else lo = Math.max(lo, done[1]); }
    ROWS_DONE.set(key, done ? [Math.min(done[0], lo), Math.max(done[1], hi)] : [lo, hi]);
    c.filter = "none"; const half = JOB.raster.row / 2, [ax, ay] = P(lo, y0 + half), [bx, by] = P(hi, y0 - half);
    c.beginPath(); c.rect(ax, ay, bx - ax, by - ay); c.clip(); c.drawImage(ART[style] || ART.good, r0.x0 * SPX, H - (r0.y1 + RASTER.oy) * SPX);
  } else {
    const [ax, ay] = P(x0, y0), [bx, by] = P(x1, y1); c.strokeStyle = weak ? "rgba(70,40,18,.35)" : blur ? "rgba(60,32,12,.6)" : "rgba(26,14,6,.96)"; c.lineCap = "round";
    c.lineWidth = (blur ? 3.2 : weak ? 0.6 : 0.9) * SPX; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
    if (!weak && !blur) { c.strokeStyle = "rgba(40,20,8,.35)"; c.lineWidth = 2.6 * SPX; c.stroke(); }
  }
  c.restore(); SHEET.dirty = true;
}
function drawScreen() { // layout after Epilog's job-list screen: dark-blue header with the brand, job rows, footer with status + five round keys
  const c = SCREEN.ctx, w = SCREEN.c.width, h = SCREEN.c.height; c.fillStyle = "#e9edf0"; c.fillRect(0, 0, w, h); c.textBaseline = "alphabetic";
  c.fillStyle = "#16365c"; c.fillRect(0, 0, w, 58); c.fillStyle = "#ffffff"; c.font = "600 22px 'IBM Plex Sans', Arial, sans-serif"; c.fillText("EpilogLaser", 16, 37);
  c.strokeStyle = "#ffffff"; c.lineWidth = 2; for (let i = 0; i < 3; i++) { const x = w - 104 + i * 34; c.strokeRect(x, 20, 18, 18); }
  const jobs = [[JOB.name, "0:04:12"], ["coaster-set", "0:11:44"], ["saga-keyrings", "0:07:26"], ["box-joint-test", "0:14:14"]];
  jobs.forEach(([j, t], i) => { const y = 66 + i * 64; c.fillStyle = i === 0 ? "#d3e1ec" : "#f6f8f9"; c.fillRect(8, y, w - 16, 58); c.fillStyle = "#c9b089"; c.fillRect(16, y + 8, 42, 42);
    c.fillStyle = "#16365c"; c.font = "600 16px 'IBM Plex Sans', Arial, sans-serif"; c.fillText(j, 68, y + 26); c.font = "400 14px 'IBM Plex Sans', Arial, sans-serif"; c.fillText(t, 68, y + 46); c.fillText("0 / 0", w - 54, y + 24); });
  c.fillStyle = "#16365c"; c.fillRect(0, h - 132, w, 132);
  c.fillStyle = FXS.ring === "red" ? "#ff8a7a" : FXS.ring === "run" ? "#9be7a8" : "#ffffff"; c.font = "600 20px 'IBM Plex Sans', Arial, sans-serif"; c.fillText(FXS.status, 14, h - 102);
  for (let i = 0; i < 5; i++) { const x = 36 + i * ((w - 72) / 4); c.beginPath(); c.arc(x, h - 46, 26, 0, 2 * Math.PI); c.fillStyle = (i === 2 && FXS.dot > 0.5) ? "#d23a2c" : "#dfe6ec"; c.fill(); }
  SCREEN.dirty = true;
}
// ---------------------------------------------------------------- palette
const hex = (s) => { s = s.trim().replace("#", ""); if (s.length === 3) s = s.split("").map((c) => c + c).join(""); const n = parseInt(s.slice(0, 6), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
let PAL = null;
function readPalette() {
  const cs = getComputedStyle(document.body); const v = (name, fb) => { const s = cs.getPropertyValue(name); return s && s.trim().startsWith("#") ? hex(s) : fb; };
  const light = document.body.dataset.theme === "light"; const page = v("--anatomy-page", light ? [0.95, 0.95, 0.94] : [0.043, 0.043, 0.043]);
  PAL = light ? { light, clear: page, floor: page.map((c) => c * 0.955), grid: page.map((c) => c * 0.74), sky: [0.78, 0.79, 0.82], ground: [0.40, 0.39, 0.36], key: [0.60, 0.58, 0.54], neutral: [0.80, 0.80, 0.79], accent: v("--anatomy-red", [0.9, 0.28, 0.3]), edge: 0.38, lineAlpha: 0.75, shadow: [0.16, 0.15, 0.13, 0.32], smoke: [0.42, 0.40, 0.38], gas: [0.62, 0.70, 0.18] }
    : { light, clear: page, floor: [0.085, 0.085, 0.09], grid: [0.2, 0.2, 0.21], sky: [0.66, 0.68, 0.73], ground: [0.26, 0.25, 0.23], key: [0.66, 0.63, 0.58], neutral: [0.22, 0.22, 0.23], accent: v("--anatomy-red", [1, 0.42, 0.42]), edge: 0.40, lineAlpha: 0.7, shadow: [0, 0, 0, 0.55], smoke: [0.62, 0.61, 0.60], gas: [0.70, 0.80, 0.26] };
  const mats = new Float32Array(NM * 3), spec = new Float32Array(NM); D.model.mats.forEach((m, i) => { mats.set(m.c, i * 3); spec[i] = m.s; });
  for (const P of [SOLID, LINE, SHADOW]) { gl.useProgram(P.p); if (P.u.uMat) gl.uniform3fv(P.u.uMat, mats); if (P.u.uSpec) gl.uniform1fv(P.u.uSpec, spec); if (P.u.uParts) gl.uniform1i(P.u.uParts, 0); }
  for (const b of themeButtons) b.setAttribute("aria-pressed", b.dataset.themeSet === (light ? "light" : "dark") ? "true" : "false");
}
function setTheme(t) { document.body.dataset.theme = t; readPalette(); dirtyParts = true; run(); }

// ---------------------------------------------------------------- state
const HOME = [K.HOME.x, K.HOME.y];
const POSE0 = () => ({ lid: 0, tz: K.LOW, sx: 0, sy: 0, hx: HOME[0], hy: HOME[1] });
const FX0 = () => ({ guide: 0, fire: 0, dot: 0, power: 1, flame: 0, smoke: "off", ring: "idle", debris: 0, ember: 0, dirt: 0, mark: "good", plastic: 0, rust: 0, status: "Idle" });
let P = POSE0(), G = POSE0(), FXS = FX0(), FXG = FX0();
const state = { clock: 0, running: false, fault: null, beat: 0, beatT: 0, auto: true, motion: "hold", mc: 0, touring: false, partTour: false, tourStep: 0, tourClock: 0,
  part: null, ghost: [], cut: 0, cutGoal: 0, explode: 0, explodeGoal: 0, lidForce: null, ortho: false, culprits: [], focus: false, lastPaint: null, phase: null };
let dirtyParts = true;
const cam = { az: -32 * DEG, el: 22 * DEG, dist: 3300, target: [527, 417, 520], fov: 34 * DEG };
const goal = { ...cam, target: [...cam.target] };
let SPEED = 1;

// ---------------------------------------------------------------- motion along the job paths (stock coordinates → world)
const r = JOB.raster;
function rasterAt(m) { const rowT = r.rowTime, rows = JOB.rows; const i = Math.floor(m / rowT) % rows; const f = (m / rowT) % 1; const dir = i % 2 === 0 ? 1 : -1;
  const over = 18; const x = dir > 0 ? r.x0 - over + (r.x1 - r.x0 + 2 * over) * f : r.x1 + over - (r.x1 - r.x0 + 2 * over) * f; const y = r.y1 - i * r.row; return [x, y, i]; }
// Raster engraving is painted from the job's own timeline: every row segment the head swept between two frames, row by row.
// Painting from one frame's head position to the next dropped row ends and whole rows when a frame spanned a row change,
// so letters came out striped at low frame rates or high playback speeds.
function paintRasterSpan(m0, m1, style, oy) {
  const rowT = r.rowTime; let t = Math.max(0, m0);
  while (t < m1 - 1e-6) { const i = Math.floor(t / rowT + 1e-9), tEnd = Math.min(m1, (i + 1) * rowT);
    const [xa, ya] = rasterAt(t), [xb] = rasterAt(Math.max(t, tEnd - 1e-4)); paint(xa, ya + oy, xb, ya + oy, "raster", style); t = tEnd; }
}
const paintStyle = () => FXS.mark === "blur" || surfaceZ() > K.FP + 3 ? "blur" : FXS.mark === "weak" || FXS.power < 0.7 ? "weak" : "good";
const canPaint = () => P.lid < 0.02 && surfaceZ() > K.FP - 20;
const VPATH = (() => { const pts = []; const cc = JOB.circle, o = JOB.outline; const n = 72;
  for (let i = 0; i <= n; i++) { const a = (i / n) * 2 * Math.PI; pts.push([cc.cx + cc.r * Math.cos(a), cc.cy + cc.r * Math.sin(a), cc.time * i / n]); }
  const corners = [[o.x0, o.y0], [o.x1, o.y0], [o.x1, o.y1], [o.x0, o.y1], [o.x0, o.y0]]; const per = 2 * (o.x1 - o.x0 + o.y1 - o.y0); let acc = 0;
  for (let i = 0; i < 4; i++) { const [a, b] = [corners[i], corners[i + 1]]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let k = 1; k <= 20; k++) { pts.push([a[0] + (b[0] - a[0]) * k / 20, a[1] + (b[1] - a[1]) * k / 20, cc.time + o.time * (acc + L * k / 20) / per]); } acc += L; }
  return pts; })();
const VT = JOB.circle.time + JOB.outline.time;
function vectorAt(m) { m = ((m % VT) + VT) % VT; let i = 1; while (i < VPATH.length - 1 && VPATH[i][2] < m) i++; const a = VPATH[i - 1], b = VPATH[i]; const f = (m - a[2]) / Math.max(1e-6, b[2] - a[2]); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, VPATH[i - 1][0] === VPATH[0][0] && i < 2 ? 1 : 0]; }
const toWorld = (xs, ys, pose = P) => [K.STOCK.x + pose.sx + xs, K.STOCK.y + pose.sy + ys];
const toStock = (x, y, pose = P) => [x - K.STOCK.x - pose.sx, y - K.STOCK.y - pose.sy];

// deterministic job state at machine time t
function jobAt(t) {
  const ph = JOB.phases, at = (id) => ph.find((p) => p.id === id); const s = { ...POSE0(), fire: 0, dot: 0, kind: null, phase: ph[0].id, ring: "run", status: "Running" };
  const pf = at("focus"), pt = at("trace"), pr = at("raster"), pv = at("vector"), pp = at("park"), pw = at("wait"), po = at("open");
  for (const p of ph) if (t >= p.t) s.phase = p.id;
  s.tz = t < pf.t ? K.LOW : K.LOW + (K.FOCUSED - K.LOW) * smooth01((t - pf.t) / pf.d);
  const [rx, ry] = toWorld(r.x0 - 18, r.y1, { sx: 0, sy: 0 });
  if (t < pt.t) { const f = smooth01((t - pf.t) / pf.d); s.hx = HOME[0] + (rx - HOME[0]) * f * 0; s.hy = HOME[1]; }
  else if (t < pr.t) { // trace the outline with the red dot
    const o = JOB.outline; const per = [[o.x0, o.y1], [o.x1, o.y1], [o.x1, o.y0], [o.x0, o.y0], [o.x0, o.y1]]; const f = (t - pt.t) / pt.d;
    if (f < 0.15) { const g = smooth01(f / 0.15); const [wx, wy] = toWorld(o.x0, o.y1, { sx: 0, sy: 0 }); s.hx = HOME[0] + (wx - HOME[0]) * g; s.hy = HOME[1] + (wy - HOME[1]) * g; }
    else { const g = (f - 0.15) / 0.85 * 4; const i = Math.min(3, Math.floor(g)), k = g - i; const a = per[i], b = per[i + 1]; [s.hx, s.hy] = toWorld(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, { sx: 0, sy: 0 }); }
    s.dot = 1; s.status = "Tracing";
  } else if (t < pv.t) { const [xs, ys] = rasterAt(t - pr.t); [s.hx, s.hy] = toWorld(xs, ys, { sx: 0, sy: 0 }); s.fire = maskAt(xs, ys) ? 1 : 0; s.kind = "raster"; s.xs = xs; s.ys = ys; }
  else if (t < pp.t) { const [xs, ys] = vectorAt(t - pv.t); [s.hx, s.hy] = toWorld(xs, ys, { sx: 0, sy: 0 }); s.fire = 1; s.kind = "vector"; }
  else { const [ex, ey] = toWorld(JOB.outline.x0, JOB.outline.y0, { sx: 0, sy: 0 }); const g = smooth01((t - pp.t) / pp.d); s.hx = ex + (HOME[0] - ex) * g; s.hy = ey + (HOME[1] - ey) * g; s.status = t < pw.t ? "Parking" : "Idle"; s.ring = t < pw.t ? "run" : "idle"; }
  s.lid = t < po.t ? 0 : smooth01((t - po.t) / po.d);
  return s;
}
// replay the sheet marks up to time t (used for scrubbing back and for "settle")
function replayJob(t) { sheetReset(false); let prev = null; for (let u = 0; u <= t; u += 1 / 30) { const s = jobAt(u); if (s.kind) { const [xs, ys] = toStock(s.hx, s.hy, { sx: 0, sy: 0 }); if (prev && prev.kind === s.kind && Math.hypot(xs - prev.xs, ys - prev.ys) < 40) paint(prev.xs, prev.ys, xs, ys, s.kind, "good"); prev = { kind: s.kind, xs, ys }; } else prev = null; } }

// ---------------------------------------------------------------- particles: smoke, gas and flame
const PUFFS = []; const FLAMES = [];
function spawnPuff(p, kind) { if (PUFFS.length > 260) PUFFS.shift(); PUFFS.push({ p: [...p], v: [(rnd() - 0.5) * 20, (rnd() - 0.5) * 20, 30 + rnd() * 30], age: 0, life: kind === "flow" ? 2.4 : 8 + rnd() * 4, size: 10 + rnd() * 8, kind }); }
const HOTXY = [486, 366]; // the offcut that catches (model: table.debris.hot)
const hotPoint = () => [HOTXY[0], HOTXY[1], P.tz - 36];
function stepParticles(dt, cut) {
  const mode = FXS.smoke;
  if (cut && FXS.fire > 0.5 && mode !== "off") { const n = dt * (mode === "flow" ? 28 : 34); for (let i = 0; i < n + (rnd() < n % 1 ? 1 : 0); i++) spawnPuff([cut[0] + (rnd() - 0.5) * 6, cut[1] + (rnd() - 0.5) * 6, cut[2] + 2], mode); }
  if (FXS.ember > 0.6 && rnd() < dt * 10) spawnPuff([HOTXY[0] + (rnd() - 0.5) * 30, HOTXY[1] + (rnd() - 0.5) * 20, P.tz - 34], "linger");
  const roof = K.TOPZ0 + 20;
  for (const q of PUFFS) {
    q.age += dt; const m = mode === "off" ? q.kind : mode;
    if (q.kind === "flow" || m === "flow") { const tgt = [Math.min(Math.max(q.p[0], K.BED.x0), K.BED.x1), K.BED.y1 + 70, K.PED + 40]; const d = v3.sub(tgt, q.p); const l = v3.len(d) || 1; q.v = v3.lerp(q.v, v3.mul(d, 260 / l), Math.min(1, dt * 3)); q.life = Math.min(q.life, q.age + Math.max(0.2, l / 260)); }
    else { q.v[2] = approach(q.v[2], q.p[2] > roof - 40 ? -4 : 14, dt, 0.8); q.v[0] = approach(q.v[0], (rnd() - 0.5) * 60, dt, 1.4); q.v[1] = approach(q.v[1], (rnd() - 0.5) * 60 + (q.kind === "gas" ? 20 : 0), dt, 1.4); q.size = Math.min(95, q.size + dt * 14); }
    q.p = v3.add(q.p, v3.mul(q.v, dt));
  }
  for (let i = PUFFS.length - 1; i >= 0; i--) if (PUFFS[i].age > PUFFS[i].life) PUFFS.splice(i, 1);
  const spread = state.flameSrc === "hot" ? 34 : 14; if (cut && FXS.flame > 0.02) { const n = dt * 60 * FXS.flame; for (let i = 0; i < n + 1; i++) if (FLAMES.length < 90) FLAMES.push({ p: [cut[0] + (rnd() - 0.5) * spread * FXS.flame, cut[1] + (rnd() - 0.5) * spread * FXS.flame, cut[2]], v: [(rnd() - 0.5) * 30, (rnd() - 0.5) * 30, 90 + rnd() * 120 * FXS.flame], age: 0, life: 0.25 + rnd() * 0.35 * (0.4 + FXS.flame), size: 5 + rnd() * 9 * FXS.flame, under: state.flameSrc === "hot" }); }
  for (const f of FLAMES) { f.age += dt; f.p = v3.add(f.p, v3.mul(f.v, dt));
    if (f.under && f.p[2] > P.tz - 2) { f.p[2] = P.tz - 2; if (f.v[2] > 0) { f.v[0] *= 3; f.v[1] *= 3; f.v[2] = 0; } } } // under the sheet: flames spread along its underside instead of passing through it
  for (let i = FLAMES.length - 1; i >= 0; i--) if (FLAMES[i].age > FLAMES[i].life) FLAMES.splice(i, 1);
}

// ---------------------------------------------------------------- group transforms from the pose
function updateGroups() {
  ident(GROUP.static.model);
  rotXAbout(GROUP.lid.model, -P.lid * 68 * DEG, K.HINGE);
  translation(GROUP.bridge.model, 0, P.hy + 48, 0);
  translation(GROUP.head.model, P.hx, P.hy + 48, 0);
  translation(GROUP.table.model, 0, 0, P.tz);
  translation(GROUP.stock.model, K.STOCK.x + P.sx, K.STOCK.y + P.sy, P.tz);
}
const lensTip = () => [P.hx, P.hy, K.CONE_TIP];
const surfaceZ = () => P.tz + K.STOCK.t;
const cutPoint = () => { const [xs, ys] = toStock(P.hx, P.hy); const on = xs >= 0 && ys >= 0 && xs <= K.STOCK.w && ys <= K.STOCK.d; return [P.hx, P.hy, on ? surfaceZ() : P.tz]; };

// ---------------------------------------------------------------- part modes (cutaway, focus/culprits, effects)
const SHELL = PARTS.map((p, i) => (p.shell ? i : -1)).filter((i) => i >= 0);
const DEBRIS = partsMatching(["table.debris"]), HOT = new Set(partsMatching(["table.debris.hot"])), RING = partIndex.get("controls.ring"), LEDS = partsMatching(["lid.led", "led.strip"]), RUST = partsMatching(["guide.", "optics.", "bridge.beam"]);
function updateParts() {
  const accent = new Set(state.culprits); const focus = state.focus && accent.size > 0;
  const cutOn = state.cut > 0.5;
  for (let i = 0; i < NP; i++) {
    let mode = focus ? (accent.has(i) ? 2 : 0) : 1; if (!focus && accent.has(i)) mode = 2;
    if (cutOn && PARTS[i].shell) mode = accent.has(i) ? 4 : 3;
    setPart(i, mode);
  }
  for (const i of DEBRIS) setPart(i, FXS.debris > 0.5 ? (accent.has(i) ? 2 : (focus ? 0 : 1)) : 3, FXS.ember > 0.05 && HOT.has(i) ? [1.0 * FXS.ember, 0.36 * FXS.ember, 0.05] : [0, 0, 0]);
  const ringCol = FXS.ring === "red" ? [1, 0.12, 0.08] : FXS.ring === "run" ? [0.15, 0.95, 0.35] : FXS.ring === "idle" ? [0.25, 0.75, 0.95] : [0, 0, 0];
  setPart(RING, cutOn ? (accent.has(RING) ? 4 : 3) : accent.has(RING) ? 2 : (focus ? 0 : 1), ringCol);
  for (const i of LEDS) setPart(i, focus ? 0 : 1, [0.96, 0.95, 0.9]);
  if (FXS.rust > 0.5) for (const i of RUST) setPart(i, 2, [0.55, 0.26, 0.08]);
  for (const i of state.ghost) setPart(i, 5); // per-beat cutaway (outline only), labelled in the caption
  uploadParts(); dirtyParts = false;
}

// ---------------------------------------------------------------- camera
const view = M4(), proj = M4(), viewProj = M4(); let eye = [0, 0, 0], viewDir = [0, 1, 0];
function camEye(c) { return [c.target[0] + c.dist * Math.sin(c.az) * Math.cos(c.el), c.target[1] - c.dist * Math.cos(c.az) * Math.cos(c.el), c.target[2] + c.dist * Math.sin(c.el)]; }
function setGoal(c, instant = false) { if (c.az !== undefined) goal.az = cam.az + wrapPi(c.az - cam.az); if (c.el !== undefined) goal.el = c.el; if (c.dist !== undefined) goal.dist = c.dist; if (c.target) goal.target = [...c.target]; if (c.fov !== undefined) goal.fov = c.fov; if (instant) { Object.assign(cam, { ...goal, target: [...goal.target] }); } run(); }
const camOf = (v) => ({ az: v.az * DEG, el: v.el * DEG, dist: v.dist, target: v.follow === "head" ? (state.motion === "hold" && G.hx !== undefined ? [G.hx, G.hy, v.fz ?? K.CONE_TIP + 24] : [P.hx, P.hy, v.fz ?? K.CONE_TIP + 24]) : v.target, fov: (v.fov || 34) * DEG });
function updateCamera(dt) {
  const k = dt ? 1 - Math.exp(-dt / 0.28) : 1;
  cam.az += (goal.az - cam.az) * k; cam.el += (goal.el - cam.el) * k; cam.dist += (goal.dist - cam.dist) * k; cam.fov += (goal.fov - cam.fov) * k;
  for (let i = 0; i < 3; i++) cam.target[i] += (goal.target[i] - cam.target[i]) * k;
  eye = camEye(cam); viewDir = v3.unit(v3.sub(cam.target, eye)); lookAtInto(view, eye, cam.target);
  const aspect = canvas.width / canvas.height;
  if (state.ortho) { const hh = cam.dist * Math.tan(cam.fov / 2); orthoInto(proj, hh * aspect, hh, -cam.dist * 4, cam.dist * 6); }
  else perspectiveInto(proj, cam.fov, aspect, Math.max(20, cam.dist * 0.05), cam.dist * 12);
  mulInto(viewProj, proj, view);
  return Math.abs(goal.az - cam.az) + Math.abs(goal.el - cam.el) + Math.abs(goal.dist - cam.dist) / 1000 + Math.abs(goal.target[0] - cam.target[0]) / 500 > 1e-4;
}

// ---------------------------------------------------------------- shadows (floor only)
const KEY = v3.unit([-0.42, -0.50, 0.76]); // key light from the front left, as in the product photos
const SH = (() => { const res = 512; const mk = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R8, res, res); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return { t, f }; };
  const a = mk(), b = mk(); const ox = -KEY[0] / KEY[2] * K.H, oy = -KEY[1] / KEY[2] * K.H;
  return { res, a, b, rect: [Math.min(-300, ox - 300), Math.min(-300, oy - 300), K.W + 300 + Math.max(0, ox), K.D + 300 + Math.max(0, oy)] }; })();
function bakeShadow() {
  gl.useProgram(SHADOW.p); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.uniform3fv(SHADOW.u.uL, KEY); gl.uniform4fv(SHADOW.u.uRect, SH.rect); gl.uniform1f(SHADOW.u.uExplode, state.explode);
  gl.bindFramebuffer(gl.FRAMEBUFFER, SH.a.f); gl.viewport(0, 0, SH.res, SH.res); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  for (const g of GROUPS) { gl.uniformMatrix4fv(SHADOW.u.uModel, false, g.model); gl.bindVertexArray(g.solid.vao); gl.drawArrays(gl.TRIANGLES, 0, g.solid.count); }
  gl.useProgram(BLUR.p); gl.uniform1i(BLUR.u.uSrc, 1); gl.activeTexture(gl.TEXTURE1); gl.bindVertexArray(quadBuf);
  for (let pass = 0; pass < 2; pass++) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, SH.b.f); gl.bindTexture(gl.TEXTURE_2D, SH.a.t); gl.uniform2f(BLUR.u.uStep, 2 / SH.res, 0); gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, SH.a.f); gl.bindTexture(gl.TEXTURE_2D, SH.b.t); gl.uniform2f(BLUR.u.uStep, 0, 2 / SH.res); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
}

// ---------------------------------------------------------------- draw
let pulse = 0;
function solidUniforms(pass) {
  const u = SOLID.u; gl.useProgram(SOLID.p);
  gl.uniformMatrix4fv(u.uProj, false, proj); gl.uniformMatrix4fv(u.uView, false, view); gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uViewDir, viewDir);
  gl.uniform3fv(u.uKeyDir, KEY); gl.uniform3fv(u.uKey, PAL.key); gl.uniform3fv(u.uSky, PAL.sky); gl.uniform3fv(u.uGround, PAL.ground); gl.uniform3fv(u.uNeutral, PAL.neutral); gl.uniform3fv(u.uAccent, PAL.accent);
  gl.uniform1f(u.uFocus, state.focus ? 1 : 0); gl.uniform1f(u.uPulse, pulse); gl.uniform1i(u.uOrtho, state.ortho ? 1 : 0); gl.uniform1i(u.uPass, pass); gl.uniform1f(u.uAlpha, PAL.light ? 0.66 : 0.72); gl.uniform1f(u.uExplode, state.explode);
}
function quadTex(T, o, uu, vv, model, lit = 1, hot = 0) { if (T.dirty) pushTex(T); const u = TEX.u; gl.useProgram(TEX.p); gl.uniformMatrix4fv(u.uProj, false, proj); gl.uniformMatrix4fv(u.uView, false, view); gl.uniformMatrix4fv(u.uModel, false, model);
  gl.uniform3fv(u.uO, o); gl.uniform3fv(u.uU, uu); gl.uniform3fv(u.uV, vv); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, T.t); gl.uniform1i(u.uTex, 2); gl.activeTexture(gl.TEXTURE0);
  gl.uniform1f(u.uDim, state.focus ? 1 : 0); gl.uniform1f(u.uLit, lit); gl.uniform1f(u.uHot, hot); gl.uniform1f(u.uPulse, pulse); gl.uniform3fv(u.uAccent, PAL.accent); gl.uniform3fv(u.uNeutral, PAL.neutral); gl.uniform3fv(u.uShade, [0.82, 0.82, 0.82]); gl.bindVertexArray(quadBuf); gl.drawArrays(gl.TRIANGLES, 0, 6); }
const FXM = M4(), TMP2 = M4();
function fxDraw(buf, count, model, color, soft = 0) { const u = FX.u; gl.uniformMatrix4fv(u.uModel, false, model); gl.uniform4fv(u.uColor, color); gl.uniform1i(u.uSoft, soft); gl.bindVertexArray(buf); gl.drawArrays(gl.TRIANGLES, 0, count); }
function billboard(o, p, s) { const right = v3.unit(v3.cross(viewDir, [0, 0, 1])); const up = v3.unit(v3.cross(right, viewDir)); o[0] = right[0] * s; o[1] = right[1] * s; o[2] = right[2] * s; o[3] = 0; o[4] = up[0] * s; o[5] = up[1] * s; o[6] = up[2] * s; o[7] = 0; o[8] = -viewDir[0]; o[9] = -viewDir[1]; o[10] = -viewDir[2]; o[11] = 0; o[12] = p[0]; o[13] = p[1]; o[14] = p[2]; o[15] = 1; return o; }
function coneModel(o, base, rBase, tipZ, rTip) { // frustum from (base, rBase) to (z = tipZ, rTip): use unit cylinder blended via two cones
  ident(o); o[0] = rBase; o[5] = rBase; o[10] = tipZ - base[2]; o[12] = base[0]; o[13] = base[1]; o[14] = base[2]; return o; }
function beamCones(tip, top, end, waist, rTop, col) {
  const slope = rTop / Math.max(1, top - waist);
  const cone = (zBase, rBase, zApex) => { ident(TMP2); TMP2[0] = TMP2[5] = rBase; TMP2[10] = zApex - zBase; TMP2[12] = tip[0]; TMP2[13] = tip[1]; TMP2[14] = zBase; fxDraw(SCONE.buf, SCONE.n, TMP2, col); };
  if (top > waist) cone(top, rTop, Math.max(waist, end));
  if (end < waist) cone(end, (waist - end) * slope, waist);
}
function drawFx() {
  gl.useProgram(FX.p); gl.uniformMatrix4fv(FX.u.uProj, false, proj); gl.uniformMatrix4fv(FX.u.uView, false, view);
  const tip = lensTip(), sz = surfaceZ(), cp = cutPoint();
  const waist = K.FP; const fire = FXS.fire * FXS.power;
  if (fire > 0.02 && state.cut < 0.5 && P.lid < 0.05 || fire > 0.02) {
    // illustrated beam (the real CO2 beam is invisible): converging cone to the focal waist, diverging below it
    const top = tip[2], end = cp[2]; const rTop = 4.5, rW = 0.8; const rAt = (z) => (z >= waist ? rW + (rTop - rW) * (z - waist) / (top - waist) : rW + (rTop - rW) * (waist - z) / (top - waist));
    const col = [1, 0.28, 0.38, 0.55 * fire];
    if (end < top) { beamCones(tip, top, end, waist, rTop, col); }
    const spot = 1.6 + Math.abs(end - waist) * 0.9; billboard(FXM, [cp[0], cp[1], end + 1], spot * 2.2); fxDraw(discBuf, 6, FXM, [1, 0.75, 0.45, 0.9 * fire], 1);
    billboard(FXM, [cp[0], cp[1], end + 1], spot * 6); fxDraw(discBuf, 6, FXM, [1, 0.45, 0.2, 0.35 * fire], 1);
  }
  if (FXS.guide > 0.05) { // ghost beam and focal-plane ring, drawn when the beam is off to show where focus is
    gl.disable(gl.DEPTH_TEST); // x-ray: the focal ring must stay visible even when it lies inside the sheet
    const top = tip[2], g = FXS.guide; const rTop = 4.5, rW = 0.8; const rAt = (z) => (z >= waist ? rW + (rTop - rW) * (z - waist) / (top - waist) : rW + (rTop - rW) * (waist - z) / (top - waist));
    beamCones(tip, top, Math.min(waist, sz) - 8, waist, rTop, [PAL.accent[0], PAL.accent[1], PAL.accent[2], 0.42 * g]);
    billboard(FXM, [tip[0], tip[1], waist], 1.6); fxDraw(discBuf, 6, FXM, [PAL.accent[0], PAL.accent[1], PAL.accent[2], 0.95 * g], 1); // the focal point itself
    ident(TMP2); TMP2[0] = TMP2[5] = 13; TMP2[10] = 1.2; TMP2[12] = tip[0]; TMP2[13] = tip[1]; TMP2[14] = waist - 0.6; fxDraw(cylBuf, cylCount, TMP2, [PAL.accent[0], PAL.accent[1], PAL.accent[2], 0.9 * g]);
    ident(TMP2); TMP2[0] = TMP2[5] = 17; TMP2[10] = 1.2; TMP2[12] = tip[0]; TMP2[13] = tip[1]; TMP2[14] = sz - 0.6; fxDraw(cylBuf, cylCount, TMP2, [0.3, 0.85, 0.5, 0.9 * g]);
    if (Math.abs(sz - waist) > 1.5) { const lo = Math.min(sz, waist), hi = Math.max(sz, waist); for (const dx of [40, 40]) { ident(TMP2); TMP2[0] = TMP2[5] = 0.9; TMP2[10] = hi - lo; TMP2[12] = tip[0] - 24; TMP2[13] = tip[1]; TMP2[14] = lo; fxDraw(cylBuf, cylCount, TMP2, [1, 0.92, 0.3, g]); }
      for (const z of [lo, hi]) { ident(TMP2); TMP2[0] = 8; TMP2[5] = 0.9; TMP2[10] = 0.9; TMP2[12] = tip[0] - 24; TMP2[13] = tip[1]; TMP2[14] = z - 0.45; fxDraw(cylBuf, cylCount, TMP2, [1, 0.92, 0.3, g]); } }
    gl.enable(gl.DEPTH_TEST);
  }
  if (FXS.dot > 0.05) { billboard(FXM, [cp[0], cp[1], cp[2] + 0.8], 3.2); fxDraw(discBuf, 6, FXM, [1, 0.1, 0.1, 0.95 * FXS.dot], 1); billboard(FXM, [cp[0], cp[1], cp[2] + 0.8], 9); fxDraw(discBuf, 6, FXM, [1, 0.1, 0.1, 0.35 * FXS.dot], 1); }
  // smoke/gas puffs (back to front)
  const sorted = PUFFS.map((q) => [v3.dot(v3.sub(q.p, eye), viewDir), q]).sort((a, b) => b[0] - a[0]);
  for (const [, q] of sorted) { const life = q.age / q.life; const a = (q.kind === "flow" ? 0.30 : q.kind === "gas" ? 0.32 : 0.46) * Math.sin(Math.PI * clamp01(life)) * (state.focus ? 0.8 : 1); const c = q.kind === "gas" ? PAL.gas : PAL.smoke; billboard(FXM, q.p, q.size); fxDraw(discBuf, 6, FXM, [c[0], c[1], c[2], a], 1); }
  for (const f of FLAMES) { const life = f.age / f.life; billboard(FXM, f.p, f.size * (1 - life * 0.6)); fxDraw(discBuf, 6, FXM, [1, 0.55 - life * 0.35, 0.08, 0.85 * (1 - life)], 1); billboard(FXM, f.p, f.size * 0.45); fxDraw(discBuf, 6, FXM, [1, 0.92, 0.55, 0.7 * (1 - life)], 1); }
}
function render() {
  if (dirtyParts) updateParts();
  bakeShadow();
  const [cr, cg, cb] = PAL.clear; gl.clearColor(cr, cg, cb, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, partTex);
  if (eye[2] > 1) { const u = FLOOR.u; gl.useProgram(FLOOR.p); gl.uniformMatrix4fv(u.uProj, false, proj); gl.uniformMatrix4fv(u.uView, false, view);
    const R = BBOX.radius * 2.2; gl.uniform4f(u.uQuad, BBOX.centre[0] - R, BBOX.centre[1] - R, BBOX.centre[0] + R, BBOX.centre[1] + R);
    gl.uniform3fv(u.uFloor, PAL.floor); gl.uniform3fv(u.uGrid, PAL.grid); gl.uniform3fv(u.uClear, PAL.clear); gl.uniform4fv(u.uShadow, PAL.shadow);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, SH.a.t); gl.uniform1i(u.uShTex, 1); gl.activeTexture(gl.TEXTURE0); gl.uniform4fv(u.uShRect, SH.rect);
    gl.uniform2f(u.uCentre, BBOX.centre[0], BBOX.centre[1]); gl.uniform1f(u.uRadius, BBOX.radius * 1.6); gl.bindVertexArray(quadBuf); gl.drawArrays(gl.TRIANGLES, 0, 6); }
  gl.bindTexture(gl.TEXTURE_2D, partTex);
  gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.2, 2.0);
  solidUniforms(0); for (const g of GROUPS) { gl.uniformMatrix4fv(SOLID.u.uModel, false, g.model); gl.bindVertexArray(g.solid.vao); gl.drawArrays(gl.TRIANGLES, 0, g.solid.count); }
  gl.polygonOffset(-1.0, -4.0); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const stockI = partIndex.get("stock.sheet");
  quadTex(SHEET, [0, 0, K.STOCK.t + 0.05], [K.STOCK.w, 0, 0], [0, K.STOCK.d, 0], GROUP.stock.model, 1, state.culprits.includes(stockI) ? 1 : 0);
  if (state.cut < 0.5 && state.explode < 0.02) quadTex(SCREEN, K.DISPLAY.o, K.DISPLAY.u, K.DISPLAY.v, GROUP.static.model, 1.25); // the screen is a texture, not a part: hide it with its shell
  if (state.cut < 0.5 && state.explode < 0.02) { quadTex(LOGO, K.LOGO.o, K.LOGO.u, K.LOGO.v, GROUP.static.model, 1.15); quadTex(LIDLOGO, K.LIDLOGO.o, K.LIDLOGO.u, K.LIDLOGO.v, GROUP.lid.model, 1.15); for (const L of K.SIDELOGO) quadTex(SIDE, L.o, L.u, L.v, GROUP.static.model, 1.1); }
  gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, partTex);
  // edges
  { const u = LINE.u; gl.useProgram(LINE.p); gl.uniformMatrix4fv(u.uProj, false, proj); gl.uniformMatrix4fv(u.uView, false, view); gl.uniform2f(u.uFade, cam.dist * 0.6, cam.dist * 2.2);
    gl.uniform1f(u.uEdge, PAL.edge); gl.uniform1f(u.uFocus, state.focus ? 1 : 0); gl.uniform1f(u.uLineAlpha, PAL.lineAlpha); gl.uniform3fv(u.uAccent, PAL.accent); gl.uniform1f(u.uExplode, state.explode);
    gl.depthMask(false); for (const g of GROUPS) { if (!g.lines.count) continue; gl.uniformMatrix4fv(u.uModel, false, g.model); gl.bindVertexArray(g.lines.vao); gl.drawArrays(gl.LINES, 0, g.lines.count); } }
  // transparent: glass, then x-rayed shell parts
  solidUniforms(1); for (const g of GROUPS) { if (!g.glass) continue; gl.uniformMatrix4fv(SOLID.u.uModel, false, g.model); gl.bindVertexArray(g.glass.vao); gl.drawArrays(gl.TRIANGLES, 0, g.glass.count); }
  drawFx();
  gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);
}

// ---------------------------------------------------------------- callouts (HTML labels anchored to 3D points)
const LABELS = [0, 1, 2].map(() => { const el = document.createElement("div"); el.className = "sbx-callout"; el.dataset.kind = "label"; el.hidden = true;
  el.innerHTML = `<i class="sbx-dot"></i><svg class="sbx-leader" width="40" height="30" aria-hidden="true"><line x1="0" y1="30" x2="40" y2="0"/></svg><span class="sbx-label"></span>`; calloutLayer.append(el); return { el, label: el.querySelector(".sbx-label"), text: "", w: 0, flip: "" }; });
function anchorPoint(a) {
  if (a.anchor === "cut") return cutPoint(); if (a.anchor === "waist") return [P.hx - 12, P.hy, K.FP]; if (a.anchor === "surface") return [P.hx + 16, P.hy, surfaceZ()]; if (a.anchor === "gapdim") return [P.hx - 24, P.hy, (surfaceZ() + K.FP) / 2];
  if (a.anchor === "art") { const [x, y] = toWorld((r.x0 + r.x1) / 2 + (a.dx || 0), (r.y0 + r.y1) / 2 + (a.dy || 0)); return [x, y, surfaceZ()]; }
  if (a.anchor === "gap") { const [x, y] = toWorld((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2); return [x, y, surfaceZ()]; }
  if (a.anchor === "arc") { const cc = JOB.circle, an = a.t * 2 * Math.PI; const [x, y] = toWorld(cc.cx + cc.r * Math.cos(an), cc.cy + cc.r * Math.sin(an), a.pass === 2 ? { sx: 0, sy: 0 } : P); return [x, y, surfaceZ()]; }
  if (a.anchor === "tray") return [a.x, a.y, P.tz - 35]; // just above the offcut's top face
  if (a.anchor === "hot") return [HOTXY[0] - 10, HOTXY[1], P.tz - 35]; // beside the grid slat that stands right over the piece
  if (a.point) return a.point;
  if (a.part) { const ids = partsMatching([a.part]); if (!ids.length) return null; const p = PARTS[ids[0]]; const c = [(p.lo[0] + p.hi[0]) / 2 + p.explode[0] * state.explode, (p.lo[1] + p.hi[1]) / 2 + p.explode[1] * state.explode, (a.at === "bottom" ? p.lo[2] : a.at === "top" ? p.hi[2] : (p.lo[2] + p.hi[2]) / 2) + p.explode[2] * state.explode]; if (a.off) for (let k = 0; k < 3; k++) c[k] += a.off[k]; return xform(GROUP[p.group].model, c); }
  return null;
}
function project(p) { const m = viewProj; const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]; if (w <= 1e-4) return null; const nx = x / w, ny = y / w; return [(nx * 0.5 + 0.5) * canvas.clientWidth, (0.5 - ny * 0.5) * canvas.clientHeight, nx, ny]; }
function currentCallouts() {
  if (state.fault) { const b = state.fault.beats[state.beat]; return (state.beatT > 0.6 || still.matches) ? b.callouts || [] : []; }
  if (state.part) { const t = TOUR.find((x) => x.id === state.part); return t ? [{ part: t.parts[0], text: t.name }] : []; }
  return [];
}
// Callout anchors are low-passed in world space (time constant 2 s). A label pinned to something that sweeps back and forth —
// the head during raster engraving sweeps a row every 0.62 s — then settles near the middle of the sweep and drifts slowly,
// instead of jumping with the head, which made it unreadable on low-refresh displays. Static anchors are unaffected; a new
// label snaps to its anchor. Working in world space keeps labels attached to the scene while the camera moves.
const CALLOUT_TAU = 2.0; const calloutSmooth = [];
function smoothCallouts(dt) {
  const list = currentCallouts();
  for (let i = 0; i < LABELS.length; i++) { const spec = list[i]; if (!spec) { calloutSmooth[i] = null; continue; }
    const p = anchorPoint(spec); if (!p) { calloutSmooth[i] = null; continue; }
    const s = calloutSmooth[i]; if (!s || s.spec !== spec) { calloutSmooth[i] = { spec, p: [...p] }; continue; }
    for (let k = 0; k < 3; k++) s.p[k] = approach(s.p[k], p[k], dt, CALLOUT_TAU); }
}
function updateCallouts() {
  const list = currentCallouts(); const used = [];
  LABELS.forEach((c, i) => {
    const spec = list[i]; if (!spec) { if (!c.el.hidden) c.el.hidden = true; return; }
    const sm = calloutSmooth[i]; const p = sm && sm.spec === spec ? sm.p : anchorPoint(spec); const sp = p && project(p); const show = sp && Math.abs(sp[2]) < 1.05 && Math.abs(sp[3]) < 1.05;
    c.el.hidden = !show; if (!show) return; c.el.style.transform = `translate(${sp[0].toFixed(1)}px, ${sp[1].toFixed(1)}px)`;
    if (c.text !== spec.text) { c.text = spec.text; c.label.textContent = spec.text; c.w = 0; }
    if (!c.w) c.w = c.label.offsetWidth || spec.text.length * 8;
    let flip = (sp[0] + 56 + c.w > canvas.clientWidth - 20 && sp[0] - 56 - c.w > 8 ? "l" : "r") + (sp[1] < 90 ? "d" : "u");
    for (const u of used) if (Math.abs(u[0] - sp[0]) < 170 && Math.abs(u[1] - sp[1]) < 34) flip = flip[0] + (flip[1] === "u" ? "d" : "u");
    used.push(sp); if (c.flip !== flip) { c.flip = flip; c.el.dataset.flip = flip; }
  });
}

// ---------------------------------------------------------------- simulation step
function applyFxGoal(dt) {
  const tau = 0.35;
  for (const k of ["power", "flame", "ember", "dirt", "rust", "guide"]) FXS[k] = approach(FXS[k], FXG[k], dt, k === "flame" ? 0.6 : tau);
  FXS.fire = FXG.fire; FXS.dot = approach(FXS.dot, FXG.dot, dt, 0.15);
  for (const k of ["smoke", "ring", "status", "mark"]) if (FXS[k] !== FXG[k]) { FXS[k] = FXG[k]; if (k !== "mark") { dirtyParts = true; drawScreen(); } }
  if (FXS.debris !== FXG.debris) { FXS.debris = FXG.debris; dirtyParts = true; }
  if (FXS.plastic !== FXG.plastic) { FXS.plastic = FXG.plastic; sheetReset(FXS.plastic); }
  if ((FXS.ember > 0.05) !== (FXG.ember > 0.05) || Math.abs(FXS.ember - FXG.ember) > 0.01 || (FXS.rust > 0.5) !== (FXG.rust > 0.5)) dirtyParts = true;
}
function step(dt) {
  pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260);
  const prevCut = state.cut > 0.5; // before the update: a crossing of 0.5 must re-run updateParts (was read after it, so the
  // cutaway's hidden/shown parts lagged one press behind when nothing else marked the parts dirty)
  state.cut = approach(state.cut, state.cutGoal, dt, 0.12); if (Math.abs(state.cut - state.cutGoal) < 0.01) state.cut = state.cutGoal;
  state.explode = approach(state.explode, state.explodeGoal, dt, 0.3); if (Math.abs(state.explode - state.explodeGoal) < 0.002) state.explode = state.explodeGoal;
  if (prevCut !== (state.cut > 0.5)) dirtyParts = true;
  let paintKind = null;
  if (state.fault) {
    const b = state.fault.beats[state.beat]; state.beatT += dt;
    // motion
    const m = state.motion; const tau = 0.45;
    if (m === "raster" || m === "vector") {
      const mc0 = state.mc; state.mc += dt * (m === "raster" ? state.rasterSpeed || 1 : 1);
      if (m === "raster" && state.rasterOnce && state.mc >= JOB.rows * JOB.raster.rowTime) { state.motion = "park"; } // one full pass, then the job ends
      const [xs, ys] = m === "raster" ? rasterAt(state.mc) : vectorAt(state.mc); const [wx, wy] = toWorld(xs, ys + (m === "raster" ? RASTER.oy : 0));
      // "far" = the head hasn't caught up with the path yet (entering the beat). The allowance includes this frame's own path step,
      // so a fast sweep or a low frame rate (the head moves > 30 mm per frame) no longer counts as far and stops the engraving
      const lt = state.lastTgt, stepLen = lt ? Math.hypot(wx - lt[0], wy - lt[1]) : 0; state.lastTgt = [wx, wy];
      const far = Math.hypot(wx - P.hx, wy - P.hy) > 30 + stepLen; P.hx = far ? approach(P.hx, wx, dt, 0.12) : wx; P.hy = far ? approach(P.hy, wy, dt, 0.12) : wy;
      if (far && m === "raster") state.mc = mc0; // the job waits until the head has reached the start of the path
      paintKind = far ? null : m; FXG.fire = (state.faultFire ? 1 : 0) * (m === "raster" ? (maskAt(xs, ys) ? 1 : 0) : 1);
      if (m === "raster") { if (!far && state.faultFire && canPaint()) paintRasterSpan(mc0, state.mc, paintStyle(), RASTER.oy); paintKind = null; }
    } else if (m === "arc") { // part of the job's circle, in MACHINE coordinates (the sheet as originally placed)
      const A = state.arc, cc = JOB.circle, a = A.f * 2 * Math.PI; const [wx, wy] = toWorld(cc.cx + cc.r * Math.cos(a), cc.cy + cc.r * Math.sin(a), { sx: 0, sy: 0 });
      const far = Math.hypot(wx - P.hx, wy - P.hy) > 3; if (far) { P.hx = approach(P.hx, wx, dt, 0.18); P.hy = approach(P.hy, wy, dt, 0.18); FXG.fire = 0; }
      else { P.hx = wx; P.hy = wy; if (A.f < A.a1) { A.f = Math.min(A.a1, A.f + dt / cc.time); FXG.fire = state.faultFire ? 1 : 0; paintKind = "vector"; } else { FXG.fire = 0; if (A.park) state.motion = "park"; } }
    } else if (m === "park") { P.hx = approach(P.hx, HOME[0], dt, tau); P.hy = approach(P.hy, HOME[1], dt, tau); FXG.fire = 0; }
    else { FXG.fire = 0; if (m === "hold" && G.hx !== undefined) { P.hx = approach(P.hx, G.hx, dt, tau); P.hy = approach(P.hy, G.hy, dt, tau); } }
    for (const k of ["lid", "tz", "sx", "sy"]) P[k] = approach(P[k], G[k], dt, k === "tz" ? 0.5 : 0.35);
    applyFxGoal(dt);
    if (state.auto && !still.matches && state.beatT > BEAT_LEN + BEAT_HOLD) { if (state.beat < state.fault.beats.length - 1) setBeat(state.beat + 1); else if (state.touring) nextTour(); }
  } else if (state.running || state.scrubbed) {
    const c0 = state.clock, scrubbed = state.scrubbed;
    if (state.running) { state.clock = Math.min(JOB.total, state.clock + dt * SPEED); if (state.clock >= JOB.total) { pause(); if (state.touring) nextTour(); } }
    state.scrubbed = false;
    const s = jobAt(state.clock); Object.assign(P, { lid: state.lidForce ?? s.lid, tz: s.tz, sx: 0, sy: 0, hx: s.hx, hy: s.hy });
    FXG.fire = s.fire; FXG.dot = s.dot; FXG.smoke = s.kind || s.phase === "park" ? "flow" : "off"; FXG.ring = s.ring; FXG.status = s.status; applyFxGoal(dt);
    paintKind = s.kind; if (state.phase !== s.phase) { state.phase = s.phase; showPhase(s.phase); }
    { const pr = JOB.phases[3]; const a = Math.max(c0, pr.t), b = Math.min(state.clock, pr.t + pr.d); if (!scrubbed && state.running && b > a && canPaint()) paintRasterSpan(a - pr.t, b - pr.t, paintStyle(), 0); }
    if (paintKind === "raster") paintKind = null; // painted from the timeline above
  } else {
    P.lid = approach(P.lid, state.lidForce ?? G.lid, dt, 0.35); applyFxGoal(dt);
    if (state.partTour) { state.tourClock += dt; if (state.tourClock > 4.2) { state.tourClock = 0; state.tourStep = (state.tourStep + 1) % TOUR.length; showPart(TOUR[state.tourStep].id, false); } }
  }
  updateGroups();
  // paint marks where the beam hits the sheet
  const [xs, ys] = toStock(P.hx, P.hy);
  if (paintKind && FXS.fire > 0.5 && P.lid < 0.02 && surfaceZ() > K.FP - 20) { const lp = state.lastPaint; if (lp && lp.kind === paintKind && Math.hypot(xs - lp.xs, ys - lp.ys) < 40) paint(lp.xs, lp.ys, xs, ys, paintKind, FXS.mark === "blur" || surfaceZ() > K.FP + 3 ? "blur" : FXS.mark === "weak" || FXS.power < 0.7 ? "weak" : "good"); state.lastPaint = { kind: paintKind, xs, ys }; }
  else state.lastPaint = paintKind && P.lid < 0.02 ? { kind: paintKind, xs, ys } : null;
  smoothCallouts(dt);
  stepParticles(still.matches ? 0 : dt, state.flameSrc === "hot" && FXS.flame > 0.05 ? hotPoint() : FXS.fire > 0.5 || FXS.flame > 0.05 ? cutPoint() : null);
}

// ---------------------------------------------------------------- UI: readout, caption, faults, parts, job
function fmt(t) { const s = Math.max(0, Math.round(t)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function updateReadout() {
  const jx = Math.round(P.hx - K.BED.x0), jy = Math.round(K.BED.y1 - P.hy), dz = surfaceZ() - K.FP;
  const what = state.fault ? `${state.fault.key ? "E" + state.fault.key : ""} ${state.fault.title}` : state.running ? FXS.status.toLowerCase() : state.part ? "part tour" : "idle";
  const txt = `${what} · X ${jx} Y ${jy} mm · surface ${dz >= 0 ? "+" : "−"}${Math.abs(dz).toFixed(0)} mm from focus${FXS.fire > 0.5 ? " · firing" : ""}`;
  if (readout.textContent !== txt) readout.textContent = txt;
  if (scrub && !state.fault) { if (document.activeElement !== scrub) scrub.value = String(state.clock); timeLabel.textContent = `${fmt(state.clock)} / ${fmt(JOB.total)}`; }
}
function caption(n, text, todo = "") { capBeat.textContent = n; capText.textContent = text; capTodo.hidden = !todo; capTodo.textContent = todo; }
function showPhase(id) { const p = JOB.phases.find((x) => x.id === id); if (!p) return; caption(`Job · ${JOB.phases.indexOf(p) + 1}/${JOB.phases.length}`, p.text); if (phaseList) for (const li of phaseList.children) li.toggleAttribute("data-on", li.dataset.phase === id); status.textContent = p.text; }
function setBeat(i) {
  const f = state.fault; state.beat = Math.max(0, Math.min(f.beats.length - 1, i)); state.beatT = 0; const b = f.beats[state.beat];
  const pose = b.pose || {};
  for (const k of ["lid", "tz", "sx", "sy"]) if (pose[k] !== undefined) G[k] = pose[k];
  if (pose.motion) { state.motion = pose.motion; if (pose.motion === "hold") { G.hx = pose.hx ?? P.hx; G.hy = pose.hy ?? P.hy; } }
  state.faultFire = pose.fire !== undefined ? pose.fire : state.faultFire;
  for (const k of ["power", "flame", "ember", "dirt", "rust", "debris", "plastic", "guide"]) if (pose[k] !== undefined) FXG[k] = pose[k];
  for (const k of ["smoke", "ring", "status", "mark"]) if (pose[k] !== undefined) FXG[k] = pose[k];
  state.culprits = b.culprit ? partsMatching(b.culpritsOverride || f.culprits) : []; state.focus = !!b.culprit;
  state.cutGoal = b.cut ? 1 : (f.beats.some((x) => x.cut) && b.cut === undefined && state.beat > 0 ? state.cutGoal : 0);
  if (b.cut !== undefined) state.cutGoal = b.cut ? 1 : 0; else state.cutGoal = 0;
  if (b.cam) setGoal(camOf(b.cam));
  if (pose.art) { sheetReset(false); paintArt(pose.art); }
  state.rasterSpeed = pose.rasterSpeed || 1; state.rasterOnce = !!pose.rasterOnce; if (pose.rasterOy !== undefined && pose.rasterOy !== RASTER.oy) { RASTER.oy = pose.rasterOy; state.mc = 0; state.lastPaint = null; }
  if (pose.fresh) { sheetReset(false); for (const [a0, a1, ox = 0, oy = 0] of pose.prepaint || []) paintArc(a0, a1, ox, oy); state.lastPaint = null;
    P.sx = pose.sxFrom ?? G.sx; P.sy = pose.syFrom ?? G.sy; }
  if (pose.arc) state.arc = { f: pose.arc[0], a1: pose.arc[1], park: !!pose.parkAfter }; // parkAfter: the job ends with the arc, the head goes home
  state.flameSrc = pose.flameSrc || null;
  state.ghost = partsMatching(b.ghost || []);
  dirtyParts = true; drawScreen();
  caption(`E${f.key} · ${state.beat + 1}/${f.beats.length}${b.ghost ? " · cutaway: " + b.ghostLabel : ""}`, `${b.title}. ${b.text}`);
  status.textContent = `${f.title}, step ${state.beat + 1}: ${b.title}. ${b.text}`;
  capNav.hidden = false; saveHashSoon(); run();
}
function setFault(id) {
  RASTER.oy = 0; state.rasterSpeed = 1; state.lastTgt = null;
  pause(); state.part = null; state.partTour = false; for (const b of partButtons) b.setAttribute("aria-pressed", "false");
  const f = FAULTS.find((x) => x.id === id) || null; state.fault = f;
  for (const b of faultButtons) b.setAttribute("aria-pressed", b.dataset.fault === id ? "true" : "false");
  if (!f) { state.culprits = []; state.ghost = []; state.focus = false; state.cutGoal = 0; capNav.hidden = true; faultDetail.hidden = true; PUFFS.length = 0; FLAMES.length = 0; Object.assign(FXG, FX0()); G = POSE0(); P.lid = 0; caption("Ready", "Drag to orbit · wheel to zoom · shift-drag to pan · click a part to tour it · 1–9 stage a fault · L lid, C cutaway, E exploded · Job tab runs the demonstration."); dirtyParts = true; saveHashSoon(); run(); return; }
  // reset to a clean start: fresh sheet at focus, head over the artwork, extraction flowing
  P = { ...POSE0(), tz: K.FOCUSED }; const [wx, wy] = toWorld(r.x0 - 18, r.y1); P.hx = wx; P.hy = wy; G = { ...P };
  Object.assign(FXS, FX0()); Object.assign(FXG, FX0()); FXG.ring = "run"; FXG.status = "Running"; state.mc = 0; state.motion = "hold"; state.faultFire = 0; state.lastPaint = null;
  PUFFS.length = 0; FLAMES.length = 0; sheetReset(false); state.clock = 0;
  faultDetail.hidden = false; faultDetail.innerHTML = `<h3>${f.title}</h3><p>${f.symptom}</p><ol>${f.beats.map((b, i) => `<li><button type="button" data-goto="${i}">${b.title}</button></li>`).join("")}</ol>`;
  for (const btn of faultDetail.querySelectorAll("[data-goto]")) btn.addEventListener("click", () => setBeat(+btn.dataset.goto));
  setBeat(0);
}
function showPart(id, fly = true) {
  const t = TOUR.find((x) => x.id === id); if (!t) return; if (state.fault) setFault(null);
  state.part = id; state.culprits = partsMatching(t.parts); state.focus = true; state.cutGoal = t.cut ? 1 : 0; if (fly) state.partTour = false;
  for (const b of partButtons) b.setAttribute("aria-pressed", b.dataset.part === id ? "true" : "false");
  setGoal(camOf(t.cam)); caption(`Part · ${TOUR.indexOf(t) + 1}/${TOUR.length}`, `${t.name}. ${t.text}`); status.textContent = `${t.name}: ${t.text}`; dirtyParts = true; saveHashSoon(); run();
}
function clearPart() { state.part = null; state.partTour = false; state.culprits = []; state.focus = false; state.cutGoal = 0; for (const b of partButtons) b.setAttribute("aria-pressed", "false"); dirtyParts = true; caption("Ready", "Drag to orbit · wheel to zoom · shift-drag to pan · click a part to tour it · 1–9 stage a fault · L lid, C cutaway, E exploded · Job tab runs the demonstration."); run(); }
function play() { if (state.fault) setFault(null); if (state.part) clearPart(); if (state.clock >= JOB.total) { state.clock = 0; replayJob(0); } state.running = true; runButton.setAttribute("aria-pressed", "true"); runLabel.textContent = "Pause"; showPhase(jobAt(state.clock).phase); run(); }
function pause() { state.running = false; runButton?.setAttribute("aria-pressed", "false"); if (runLabel) runLabel.textContent = "Run"; }
function seek(t) { if (state.fault) setFault(null); state.clock = Math.max(0, Math.min(JOB.total, t)); replayJob(state.clock); state.scrubbed = true; state.lastPaint = null; run(); }
const TOURLIST = ["run", ...FAULTS.map((f) => f.id)];
function setTour(on) { state.touring = on && !still.matches; tourButton?.setAttribute("aria-pressed", state.touring ? "true" : "false"); if (state.touring) { state.tourStep = 0; nextTour(); } run(); }
function nextTour() { const step = TOURLIST[state.tourStep++ % TOURLIST.length]; if (step === "run") { setFault(null); seek(0); play(); } else { state.auto = true; setFault(step); } }
function takeOver() { if (state.touring) setTour(false); }

// ---------------------------------------------------------------- loop
let frame = 0, last = 0, visible = true;
function tick(now) {
  const dt = Math.min(0.1, last ? (now - last) / 1000 : 0); last = now; resize();
  step(dt); const moving = updateCamera(dt); render(); updateCallouts(); updateReadout(); syncCamUI();
  const busy = moving || state.running || state.fault || state.partTour || PUFFS.length || FLAMES.length || Math.abs(P.lid - (state.lidForce ?? G.lid)) > 0.002 || state.cut !== state.cutGoal || state.explode !== state.explodeGoal || state.part;
  frame = busy && visible ? requestAnimationFrame(tick) : 0; if (!busy) last = 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } }
function resize() { const dpr = Math.min(2, devicePixelRatio || 1); const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr)); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); } }
new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) run(); }).observe(stage);
document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) run(); });

// ---------------------------------------------------------------- input: orbit, pan, zoom, pick
const ptrs = new Map(); let drag = null, pinch = 0;
stage.addEventListener("pointerdown", (e) => { stage.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); drag = { x: e.clientX, y: e.clientY, moved: 0, pan: e.shiftKey || e.button === 2 }; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } takeOver(); });
stage.addEventListener("pointermove", (e) => {
  if (!drag || !ptrs.has(e.pointerId)) return; const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) goal.dist = Math.max(250, Math.min(9000, goal.dist * pinch / d)); pinch = d; run(); return; }
  const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; drag.moved += Math.abs(dx) + Math.abs(dy);
  if (drag.pan) { const s = goal.dist * Math.tan(goal.fov / 2) * 2 / canvas.clientHeight; const right = v3.unit(v3.cross(viewDir, [0, 0, 1])), up = v3.unit(v3.cross(right, viewDir)); goal.target = v3.add(goal.target, v3.add(v3.mul(right, -dx * s), v3.mul(up, dy * s))); }
  else { goal.az -= dx * 0.006; goal.el = Math.max(-0.17, Math.min(1.55, goal.el + dy * 0.005)); }
  run();
});
stage.addEventListener("pointerup", (e) => { ptrs.delete(e.pointerId); pinch = 0; if (drag && drag.moved < 5 && e.button === 0) pick(e); drag = null; saveHashSoon(); });
stage.addEventListener("contextmenu", (e) => e.preventDefault());
stage.addEventListener("wheel", (e) => { e.preventDefault(); takeOver(); goal.dist = Math.max(250, Math.min(9000, goal.dist * Math.exp(e.deltaY * 0.0012))); run(); saveHashSoon(); }, { passive: false });
function pick(e) {
  const rect = canvas.getBoundingClientRect(); const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1, ny = 1 - ((e.clientY - rect.top) / rect.height) * 2;
  const inv = invert(viewProj); const a = unproject(inv, nx, ny, -1), b = unproject(inv, nx, ny, 1); const dir = v3.unit(v3.sub(b, a));
  let best = null; PARTS.forEach((p, i) => { if (!p.tour) return; if (state.cut > 0.5 && p.shell) return; if (p.name === "table.debris" && FXS.debris < 0.5) return;
    const g = GROUP[p.group].model; const lo = xform(g, v3.add(p.lo, v3.mul(p.explode, state.explode))), hi = xform(g, v3.add(p.hi, v3.mul(p.explode, state.explode)));
    const t = rayBox(a, dir, [Math.min(lo[0], hi[0]), Math.min(lo[1], hi[1]), Math.min(lo[2], hi[2])], [Math.max(lo[0], hi[0]), Math.max(lo[1], hi[1]), Math.max(lo[2], hi[2])]);
    if (t !== null && (!best || t < best.t - 1)) best = { t, p }; });
  if (best) { const id = best.p.tour; if (state.part === id) clearPart(); else showPart(id); } else if (state.part) clearPart();
}
function rayBox(o, d, lo, hi) { let t0 = -Infinity, t1 = Infinity; for (let i = 0; i < 3; i++) { if (Math.abs(d[i]) < 1e-9) { if (o[i] < lo[i] || o[i] > hi[i]) return null; continue; } let a = (lo[i] - o[i]) / d[i], b = (hi[i] - o[i]) / d[i]; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null; } return t1 < 0 ? null : Math.max(0, t0); }
function unproject(inv, x, y, z) { const v = [x, y, z, 1]; const o = [0, 0, 0, 0]; for (let i = 0; i < 4; i++) o[i] = inv[i] * v[0] + inv[4 + i] * v[1] + inv[8 + i] * v[2] + inv[12 + i] * v[3]; return [o[0] / o[3], o[1] / o[3], o[2] / o[3]]; }
function invert(m) { const inv = new Float32Array(16); const a = m;
  inv[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
  inv[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
  inv[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
  inv[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
  inv[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
  inv[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
  inv[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
  inv[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
  inv[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
  inv[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
  inv[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
  inv[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
  inv[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
  inv[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
  inv[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
  inv[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
  const det = a[0] * inv[0] + a[1] * inv[4] + a[2] * inv[8] + a[3] * inv[12]; for (let i = 0; i < 16; i++) inv[i] /= det || 1; return inv; }

// keyboard
stage.addEventListener("keydown", (e) => {
  const k = e.key; let used = true;
  if (k === "ArrowLeft" || k === "ArrowRight") { if (e.shiftKey) { const right = v3.unit(v3.cross(viewDir, [0, 0, 1])); goal.target = v3.add(goal.target, v3.mul(right, (k === "ArrowLeft" ? -1 : 1) * goal.dist * 0.05)); } else goal.az += (k === "ArrowLeft" ? 1 : -1) * 0.08; }
  else if (k === "ArrowUp" || k === "ArrowDown") { if (e.shiftKey) goal.target = v3.add(goal.target, [0, 0, (k === "ArrowUp" ? 1 : -1) * goal.dist * 0.05]); else goal.el = Math.max(-0.17, Math.min(1.55, goal.el + (k === "ArrowUp" ? 0.06 : -0.06))); }
  else if (k === "+" || k === "=") goal.dist = Math.max(250, goal.dist * 0.88); else if (k === "-" || k === "_") goal.dist = Math.min(9000, goal.dist / 0.88);
  else if (k === "0") applyView("whole"); else if (k === "f" || k === "F") applyView("head");
  else if (k === "o" || k === "O") setOrtho(!state.ortho); else if (k === "c" || k === "C") toggle("cut"); else if (k === "e" || k === "E") toggle("explode"); else if (k === "l" || k === "L") toggle("lid");
  else if (/^[1-9]$/.test(k)) { const f = FAULTS.find((x) => x.key === k); if (f) { takeOver(); setFault(f.id); $("[data-tab=\"faults\"]")?.click(); } }
  else if ((k === "n" || k === "N") && state.fault) { takeOver(); setBeat(state.beat + 1); } else if ((k === "p" || k === "P") && state.fault) { takeOver(); setBeat(state.beat - 1); }
  else if (k === "Escape") { takeOver(); if (state.fault) setFault(null); else if (state.part) clearPart(); }
  else if (k === " ") { if (state.running) pause(); else if (state.fault) { state.auto = !state.auto; autoButton.setAttribute("aria-pressed", state.auto ? "true" : "false"); } }
  else if (k === "t" || k === "T") setTour(!state.touring);
  else used = false;
  if (used) { e.preventDefault(); run(); saveHashSoon(); }
});

// ---------------------------------------------------------------- controls wiring
function applyView(id) { const v = VIEWS[id]; if (!v) return; takeOver(); if (state.part) clearPart(); setGoal(camOf(v.cam)); if (!state.fault) { state.cutGoal = v.cut ? 1 : 0; if (v.lid) state.lidForce = 1; else if (state.lidForce) { state.lidForce = null; G.lid = 0; } } syncToggles(); for (const b of viewButtons) b.setAttribute("aria-pressed", b.dataset.view === id ? "true" : "false"); dirtyParts = true; saveHashSoon(); run(); }
function setOrtho(on) { state.ortho = on; for (const b of projButtons) b.setAttribute("aria-pressed", (b.dataset.proj === "ortho") === on ? "true" : "false"); run(); }
function toggle(what) {
  if (what === "cut") state.cutGoal = state.cutGoal ? 0 : 1; else if (what === "explode") state.explodeGoal = state.explodeGoal ? 0 : 1;
  else if (what === "lid") { const open = (state.lidForce ?? G.lid) > 0.5; state.lidForce = open ? null : 1; if (open) { G.lid = 0; } }
  dirtyParts = true; syncToggles(); run(); saveHashSoon();
}
function syncToggles() { for (const b of toggleButtons) { const w = b.dataset.toggle; const on = w === "cut" ? state.cutGoal === 1 : w === "explode" ? state.explodeGoal === 1 : (state.lidForce ?? G.lid) > 0.5; b.setAttribute("aria-pressed", on ? "true" : "false"); } }
for (const b of viewButtons) b.addEventListener("click", () => applyView(b.dataset.view));
for (const b of partButtons) b.addEventListener("click", () => { takeOver(); state.part === b.dataset.part ? clearPart() : showPart(b.dataset.part); });
for (const b of faultButtons) b.addEventListener("click", () => { takeOver(); state.fault?.id === b.dataset.fault ? setFault(null) : setFault(b.dataset.fault); });
for (const b of projButtons) b.addEventListener("click", () => setOrtho(b.dataset.proj === "ortho"));
for (const b of themeButtons) b.addEventListener("click", () => setTheme(b.dataset.themeSet));
for (const b of toggleButtons) b.addEventListener("click", () => toggle(b.dataset.toggle));
runButton?.addEventListener("click", () => { takeOver(); state.running ? pause() : play(); });
$("[data-rewind]")?.addEventListener("click", () => { takeOver(); pause(); seek(0); });
$("[data-back]")?.addEventListener("click", () => { takeOver(); seek(state.clock - 10); });
$("[data-fwd]")?.addEventListener("click", () => { takeOver(); seek(state.clock + 10); });
scrub?.setAttribute("max", String(JOB.total)); scrub?.addEventListener("input", () => { takeOver(); pause(); seek(+scrub.value); });
speedSelect?.addEventListener("change", () => { SPEED = +speedSelect.value; });
tourButton?.addEventListener("click", () => setTour(!state.touring));
partTourButton?.addEventListener("click", () => { takeOver(); if (state.partTour) { clearPart(); partTourButton.setAttribute("aria-pressed", "false"); return; } state.tourStep = 0; state.tourClock = 0; showPart(TOUR[0].id); state.partTour = true; partTourButton.setAttribute("aria-pressed", "true"); });
$("[data-beat-prev]")?.addEventListener("click", () => { takeOver(); setBeat(state.beat - 1); });
$("[data-beat-next]")?.addEventListener("click", () => { takeOver(); setBeat(state.beat + 1); });
$("[data-beat-replay]")?.addEventListener("click", () => { takeOver(); const f = state.fault; if (f) setFault(f.id); });
$("[data-beat-close]")?.addEventListener("click", () => { takeOver(); setFault(null); });
autoButton?.addEventListener("click", () => { state.auto = !state.auto; autoButton.setAttribute("aria-pressed", state.auto ? "true" : "false"); });
for (const t of $$("[data-tab]")) t.addEventListener("click", () => { for (const o of $$("[data-tab]")) o.setAttribute("aria-selected", o === t ? "true" : "false"); for (const p of $$("[data-panel]")) p.hidden = p.dataset.panel !== t.dataset.tab; });
$("[data-drawer-toggle]")?.addEventListener("click", (e) => { const app = $(".sbx"); const open = app.dataset.drawer !== "closed"; app.dataset.drawer = open ? "closed" : "open"; e.currentTarget.setAttribute("aria-expanded", open ? "false" : "true"); requestAnimationFrame(() => run()); });
const camInputs = $$("[data-cam]"), camNums = $$("[data-cam-num]");
function syncCamUI() { for (const i of [...camInputs, ...camNums]) { if (document.activeElement === i) continue; const k = i.dataset.cam || i.dataset.camNum; const v = k === "az" ? ((cam.az / DEG + 540) % 360) - 180 : k === "el" ? cam.el / DEG : k === "fov" ? cam.fov / DEG : cam.dist / 10; const s = (Math.round(v * 2) / 2).toString(); if (i.value !== s) i.value = s; } }
for (const i of [...camInputs, ...camNums]) i.addEventListener("input", () => { takeOver(); const k = i.dataset.cam || i.dataset.camNum, v = +i.value; if (k === "az") goal.az = cam.az + wrapPi(v * DEG - cam.az); if (k === "el") goal.el = v * DEG; if (k === "fov") goal.fov = v * DEG; if (k === "dist") goal.dist = v * 10; run(); saveHashSoon(); });
$("[data-copy-link]")?.addEventListener("click", () => { saveHash(); linkOut.value = location.href; linkOut.select(); navigator.clipboard?.writeText(location.href).catch(() => {}); });

// ---------------------------------------------------------------- URL hash: view, fault, part, toggles
let hashTimer = 0;
function saveHash() { const h = new URLSearchParams(); h.set("view", [cam.az / DEG, cam.el / DEG, cam.dist, ...cam.target, cam.fov / DEG].map((v) => Math.round(v * 10) / 10).join(","));
  if (state.fault) { h.set("fault", state.fault.id); h.set("beat", String(state.beat + 1)); } if (state.part) h.set("part", state.part); if (state.cutGoal) h.set("cut", "1"); if (state.explodeGoal) h.set("explode", "1"); if (state.ortho) h.set("ortho", "1");
  history.replaceState(null, "", `${location.pathname}${location.search}#${h.toString()}`); if (linkOut) linkOut.value = location.href; }
function saveHashSoon() { clearTimeout(hashTimer); hashTimer = setTimeout(saveHash, 400); }
function fromHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get("view")) { const v = h.get("view").split(",").map(Number); if (v.length >= 7 && v.every(Number.isFinite)) setGoal({ az: v[0] * DEG, el: v[1] * DEG, dist: v[2], target: [v[3], v[4], v[5]], fov: v[6] * DEG }, true); }
  if (h.get("cut")) { state.cutGoal = 1; state.cut = 1; } if (h.get("explode")) { state.explodeGoal = 1; state.explode = 1; } if (h.get("ortho")) setOrtho(true);
  if (h.get("part")) showPart(h.get("part"));
  if (h.get("fault")) { const f = FAULTS.find((x) => x.id === h.get("fault")); if (f) { $("[data-tab=\"faults\"]")?.click(); setFault(f.id); const b = +(h.get("beat") || 1); if (b > 1) setBeat(b - 1); } }
  syncToggles(); dirtyParts = true; run();
}
window.addEventListener("hashchange", fromHash);

// ---------------------------------------------------------------- test hook (headless verification): deterministic stepping
window.__epilog = {
  fault: (id, beat = 0) => { setFault(id); if (beat) setBeat(beat); state.auto = false; },
  beat: (i) => { setBeat(i); state.auto = false; },
  settle: (sec = BEAT_LEN, fps = 30) => { const n = Math.round(sec * fps); for (let i = 0; i < n; i++) { step(1 / fps); updateCamera(1 / fps); } updateGroups(); updateCamera(0); render(); updateCallouts(); updateReadout(); },
  job: (t) => { setFault(null); seek(t); step(0); updateGroups(); updateCamera(0); render(); },
  play: (speed = 1) => { SPEED = speed; seek(0); play(); },
  frame: (dt = 1 / 24) => { resize(); step(dt); updateCamera(dt); render(); updateCallouts(); updateReadout(); },
  orbit: (daz = 0, del = 0) => { goal.az += daz * DEG; goal.el += del * DEG; },
  stop: () => { cancelAnimationFrame(frame); frame = 0; visible = false; },
  view: applyView, part: showPart, toggle, theme: setTheme, state: () => ({ P: { ...P }, FXS: { ...FXS }, fault: state.fault?.id, beat: state.beat, cut: state.cut, explode: state.explode, puffs: PUFFS.length, flames: FLAMES.length }),
  data: { faults: FAULTS.map((f) => ({ id: f.id, beats: f.beats.length })), total: JOB.total },
  // occlusion probe (verification only): the instructional targets of the current beat and the opaque parts that lie on the
  // straight line from the eye to each target, tested against the real triangles (hidden/x-rayed parts and glass excluded)
  targets: () => currentCallouts().map((a) => { const p = anchorPoint(a); const sp = p && project(p); return { text: a.text, part: a.part || null, anchor: a.anchor || null, p, screen: sp ? [sp[0], sp[1]] : null, onScreen: !!sp && Math.abs(sp[2]) < 1 && Math.abs(sp[3]) < 1, occluders: p ? occluders(p, a.part ? partsMatching([a.part]) : []) : [] }; }),
  occluders: (p) => occluders(p, []),
  partModes: () => { const m = (i) => Math.round(partData[(2 * Math.floor(i / 512) * 512 + (i % 512)) * 4]); return { shells: SHELL.length, shellHidden: SHELL.filter((i) => m(i) === 3 || m(i) === 4).length, sheet: m(partIndex.get("stock.sheet")) }; }, // verification: modes as uploaded
  cam: (c) => { setGoal(camOf(c), true); updateCamera(0); render(); updateCallouts(); }, // verification: try a camera without changing the beat
};
let TRI = null;
function occluders(p, own) {
  if (!TRI) TRI = Object.entries(D.model.groups).map(([name, g]) => ({ name, pos: f32(g.pos), attr: f32(g.attr) }));
  const skip = new Set(own); const hits = new Map(); const e = eye; const d = v3.sub(p, e); const len = Math.hypot(d[0], d[1], d[2]); const tmax = 1 - 4 / len;
  for (const T of TRI) { const M = GROUP[T.name].model; const n = T.pos.length / 9;
    for (let i = 0; i < n; i++) { const id = Math.round(T.attr[i * 12]); if (skip.has(id)) continue;
      const r = 2 * Math.floor(id / 512), c = id % 512; const mode = Math.round(partData[(r * 512 + c) * 4]); if (mode === 3 || mode === 5) continue;
      const ex = PARTS[id].explode, k = state.explode; const V = [0, 1, 2].map((j) => xform(M, [T.pos[i * 9 + j * 3] + ex[0] * k, T.pos[i * 9 + j * 3 + 1] + ex[1] * k, T.pos[i * 9 + j * 3 + 2] + ex[2] * k]));
      const e1 = v3.sub(V[1], V[0]), e2 = v3.sub(V[2], V[0]); const h = cross3(d, e2); const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2]; if (Math.abs(det) < 1e-9) continue;
      const f = 1 / det, sv = v3.sub(e, V[0]); const u = f * (sv[0] * h[0] + sv[1] * h[1] + sv[2] * h[2]); if (u < 0 || u > 1) continue;
      const q = cross3(sv, e1); const v = f * (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]); if (v < 0 || u + v > 1) continue;
      const t = f * (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]); if (t > 1e-4 && t < tmax) hits.set(PARTS[id].name, (hits.get(PARTS[id].name) || 0) + 1); } }
  return [...hits.keys()];
}
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

// ---------------------------------------------------------------- start
readPalette(); sheetReset(false); drawScreen(); updateGroups(); setGoal(camOf(VIEWS.whole.cam), true);
caption("Ready", "Drag to orbit · wheel to zoom · shift-drag to pan · click a part to tour it · 1–9 stage a fault · L lid, C cutaway, E exploded · Job tab runs the demonstration.");
if (phaseList) for (const li of phaseList.children) li.addEventListener("click", () => { const p = JOB.phases.find((x) => x.id === li.dataset.phase); if (p) { takeOver(); pause(); seek(p.t + 0.01); } });
document.fonts?.ready.then(() => { drawScreen(); drawLogos(); run(); });
if (document.body.classList.contains("embed")) stage.setAttribute("tabindex", "0");
requestAnimationFrame(() => requestAnimationFrame(() => fromHash()));
run();
