// Builds webgl.html (dark) and light/webgl.html: the Epilog Fusion Edge 24 viewer in the ShopBot inspect/operate shell.
// Usage: node generator/gl/build-gl.mjs <outDir> [--light] [--nav <html>]  (site.mjs passes the masthead)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as M from "./model.mjs";
import * as S from "./scenes.mjs";
import { GL_CSS, ISO_CSS } from "../sb/design.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function glData() {
  const model = M.build();
  const audit = M.audit(model);
  if (!audit.bodyMatches) throw new Error("Envelope audit failed: " + JSON.stringify(audit));
  const K = { W: M.W, D: M.D, H: M.H, BED: M.BED, FP: M.FP, STOCK: M.STOCK, HOME: M.HOME, HINGE: M.HINGE, CONE_TIP: M.CONE_TIP, PED: M.PED, TOPZ0: M.topZ(0),
    FOCUSED: S.FOCUSED, LOW: S.LOW, DISPLAY: M.DISPLAY, LOGO: M.LOGO, LIDLOGO: M.LIDLOGO, SIDELOGO: M.SIDELOGO };
  return { model, audit, K, JOB: S.JOB, FAULTS: S.FAULTS, TOUR: S.TOUR, VIEWS: S.VIEWS, BEAT_LEN: S.BEAT_LEN, READY: "Drag to orbit · scroll to zoom · shift-drag to pan", READY_TOUCH: "Drag to orbit · pinch to zoom" };
}

const ICON = {
  rewind: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 3v10M13 3 6 8l7 5z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  back: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 3 2 8l6 5zM14 3 8 8l6 5z" fill="currentColor"/></svg>',
  fwd: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 3l6 5-6 5zM2 3l6 5-6 5z" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
};

export function glPage({ theme = "dark", nav = "", shellCss = "", fonts = "" } = {}) {
  const data = glData();
  const js = readFileSync(join(HERE, "viewer.js"), "utf8").replace("__DATA__", JSON.stringify(data));
  const faults = S.FAULTS.map((f) => `<li><button type="button" data-fault="${f.id}" aria-pressed="false" aria-keyshortcuts="${f.key}"><span class="sbx-e">E${f.key}</span><span class="sbx-fname">${esc(f.title)}</span><span class="sbx-fsym">${esc(f.symptom)}</span></button></li>`).join("");
  const views = Object.entries(S.VIEWS).map(([id, v]) => `<li><button type="button" data-view="${id}" aria-pressed="false"><span>${esc(v.label)}</span>${v.key ? `<kbd>${v.key}</kbd>` : ""}</button></li>`).join("");
  const parts = S.TOUR.map((t, i) => `<li><button type="button" data-part="${t.id}" aria-pressed="false"><span class="sbx-e">${String(i + 1).padStart(2, "0")}</span><span class="sbx-fname">${esc(t.name)}</span></button></li>`).join("");
  const phases = S.JOB.phases.map((p, i) => `<li data-phase="${p.id}"><span class="sbx-e">${i + 1}</span>${esc(p.text.split(/[.:]/)[0])}</li>`).join("");
  const field = (id, label, min, max, step, unit, numMin = min, numMax = max) => `<div class="sbx-field"><label for="sbx-${id}">${label}</label><input id="sbx-${id}" type="range" data-cam="${id}" min="${min}" max="${max}" step="${step}"><input type="number" data-cam-num="${id}" min="${numMin}" max="${numMax}" step="1" aria-label="${label} value"><span class="sbx-unit">${unit}</span></div>`;
  const EXTRA_CSS = `
.sbx-parts li button{display:grid;grid-template-columns:34px 1fr;align-items:baseline;width:100%;text-align:left;padding:7px 6px;border-radius:4px}
.sbx-parts li button[aria-pressed="true"]{background:color-mix(in srgb,var(--anatomy-red) 14%,transparent)}
.sbx-parts li button:hover{background:color-mix(in srgb,var(--anatomy-strong) 7%,transparent)}
.sbx-parts,.sbx-phases{list-style:none;margin:0 0 14px;padding:0}
.sbx-phases li{display:grid;grid-template-columns:22px 1fr;gap:4px;padding:5px 6px;border-radius:4px;cursor:pointer;color:var(--anatomy-muted)}
.sbx-phases li[data-on]{color:var(--anatomy-strong);background:color-mix(in srgb,var(--anatomy-strong) 8%,transparent)}
.sbx-detail ol{margin:6px 0 0;padding-left:18px}.sbx-detail ol button{text-align:left;padding:3px 0;text-decoration:underline;text-decoration-color:var(--anatomy-faint);text-underline-offset:3px}
.sbx-honest{margin:10px 0 0;font-size:11.5px;line-height:1.45;color:var(--anatomy-muted)}`;
  const body = `<div class="sbx" data-drawer="open">
<section class="sbx-view" aria-label="3D viewer">
<div class="sb-gl-stage" tabindex="0" role="application" aria-label="Epilog Fusion Edge 24 laser cutter in 3D. Drag or arrow keys to orbit, wheel or plus and minus to zoom, shift-drag or shift-arrows to pan. Click a part to tour it. C cutaway, E exploded, L lid. 1 to 9 stage a fault, N and P step through it, Escape closes it."><canvas aria-hidden="true"></canvas><div class="sbx-callouts" data-callouts aria-hidden="true"></div><div class="sb-gl-fallback" hidden>This browser has no WebGL2. The pages carry the same content as text and figures.</div><span class="sb-sr" role="status" aria-live="polite" data-status></span></div>
<header class="sbx-head"><h1>Epilog Fusion Edge 24</h1><span class="sbx-meta">3D teaching model · millimetres · Z up · schematic interior</span><output class="sbx-readout" data-readout>idle</output></header>
<footer class="sbx-cap"><span class="sbx-cap-n" data-beat></span><div class="sbx-cap-body"><p class="sbx-cap-text" data-caption></p><p class="sbx-cap-todo" data-todo hidden></p></div><div class="sbx-cap-nav" data-beatnav hidden><button type="button" data-beat-prev aria-label="Previous step" aria-keyshortcuts="P">‹ Prev</button><button type="button" data-beat-replay>Replay</button><button type="button" data-beat-auto aria-pressed="true" title="Advance steps automatically">Auto</button><button type="button" data-beat-next aria-label="Next step" aria-keyshortcuts="N">Next ›</button><button type="button" data-beat-close aria-keyshortcuts="Escape">Close</button></div></footer>
<button type="button" class="sbx-drawer-btn" data-drawer-toggle aria-expanded="true" aria-controls="sbx-inspector">Inspector</button>
</section>
<aside class="sbx-inspector" id="sbx-inspector" aria-label="Inspector">
<div class="sbx-tabs" role="tablist"><button type="button" role="tab" data-tab="faults" aria-selected="true" aria-controls="sbx-p-faults">Faults</button><button type="button" role="tab" data-tab="parts" aria-selected="false" aria-controls="sbx-p-parts">Parts</button><button type="button" role="tab" data-tab="views" aria-selected="false" aria-controls="sbx-p-views">Views</button><button type="button" role="tab" data-tab="job" aria-selected="false" aria-controls="sbx-p-job">Job</button></div>
<section class="sbx-panel" id="sbx-p-faults" role="tabpanel" data-panel="faults">
<p class="sbx-lede">Select a fault to stage it step by step. The cause turns red; other parts grey out. Keys 1–9.</p>
<ol class="sbx-faults">${faults}</ol>
<div class="sbx-detail" data-fault-detail hidden></div>
</section>
<section class="sbx-panel" id="sbx-p-parts" role="tabpanel" data-panel="parts" hidden>
<p class="sbx-lede">Select a part here or in the model. The view moves to it and cuts the cabinet open where needed.</p>
<div class="sbx-seg"><button type="button" data-part-tour aria-pressed="false">Tour parts</button></div>
<ol class="sbx-parts">${parts}</ol>
</section>
<section class="sbx-panel" id="sbx-p-views" role="tabpanel" data-panel="views" hidden>
<h2 class="sbx-h">Presets</h2><ul class="sbx-presets">${views}</ul>
<div class="sbx-seg" role="group" aria-label="Model"><button type="button" data-toggle="cut" aria-pressed="false" aria-keyshortcuts="C">Cutaway</button><button type="button" data-toggle="explode" aria-pressed="false" aria-keyshortcuts="E">Exploded</button><button type="button" data-toggle="lid" aria-pressed="false" aria-keyshortcuts="L">Lid open</button></div>
<h2 class="sbx-h">Camera</h2>
${field("az", "Azimuth", -180, 180, 0.5, "°")}${field("el", "Elevation", -10, 89, 0.5, "°")}${field("dist", "Distance", 25, 900, 1, "cm")}${field("fov", "Field of view", 10, 90, 1, "°")}
<div class="sbx-seg" role="group" aria-label="Projection"><button type="button" data-proj="persp" aria-pressed="true">Perspective</button><button type="button" data-proj="ortho" aria-pressed="false" aria-keyshortcuts="O">Orthographic</button></div>
<div class="sbx-seg" role="group" aria-label="Theme"><button type="button" data-theme-set="dark" aria-pressed="${theme === "dark"}">Dark</button><button type="button" data-theme-set="light" aria-pressed="${theme === "light"}">Light</button></div>
<h2 class="sbx-h">Share</h2>
<div class="sbx-seg"><button type="button" data-copy-link>Copy link</button></div>
<input class="sbx-link" data-link readonly aria-label="Link to this view">
<h2 class="sbx-h">Keys</h2>
<dl class="sbx-keys"><dt>← →</dt><dd>orbit</dd><dt>↑ ↓</dt><dd>tilt</dd><dt>Shift + arrows</dt><dd>pan</dd><dt>+ −</dt><dd>zoom</dd><dt>O</dt><dd>orthographic</dd><dt>C · E · L</dt><dd>cutaway · exploded · lid</dd><dt>0 · F</dt><dd>whole · lens</dd><dt>1–9</dt><dd>stage a fault</dd></dl>
<p class="sbx-honest">The model shows the 1055 × 834 × 967 mm machine envelope and 610 × 610 mm work area. The internal layout is simplified.</p>
</section>
<section class="sbx-panel" id="sbx-p-job" role="tabpanel" data-panel="job" hidden>
<h2 class="sbx-h">Demonstration job</h2>
<p class="sbx-lede">Engrave “FAB LAB SAGA” on 6 mm plywood, then cut a hole and the outline. Machine time is compressed and the raster rows are spaced wider than real ones so you can see them.</p>
<div class="sbx-transport" role="group" aria-label="Job transport">
<button type="button" data-rewind title="Rewind" aria-label="Rewind">${ICON.rewind}</button><button type="button" data-back title="Back 10 s" aria-label="Back 10 seconds">${ICON.back}</button><button type="button" class="sbx-run" data-run aria-pressed="false" title="Play / pause">${ICON.play}<span data-run-label>Run</span></button><button type="button" data-fwd title="Forward 10 s" aria-label="Forward 10 seconds">${ICON.fwd}</button>
</div>
<div class="sbx-scrub"><input type="range" data-scrub min="0" max="${S.JOB.total}" step="0.05" value="0" aria-label="Position in the job"><span class="sbx-num" data-time>0:00</span></div>
<div class="sbx-field sbx-field-2"><label for="sbx-speed">Clock</label><select id="sbx-speed" data-speed><option value="0.5">×0.5</option><option value="1" selected>×1</option><option value="2">×2</option></select><span class="sbx-unit">demo time</span></div>
<ol class="sbx-phases" data-phases>${phases}</ol>
<div class="sbx-seg"><button type="button" data-tour aria-pressed="false" aria-keyshortcuts="T">Play full tour</button></div>
<p class="sbx-fine">The red beam is drawn so you can see it. The real CO₂ beam (10.6 µm) is invisible. Only the red-dot pointer is visible light.</p>
</section>
</aside>
</div>`;
  const glbar = `<style>
.sbx-cap-n:empty{display:none}.sbx-cap-text.sbx-fade{opacity:0;transition:opacity .5s}
.sb-glbar{box-sizing:border-box;height:64px;padding:0 24px;border-bottom:1.5px solid var(--anatomy-strong);background:var(--anatomy-page);position:relative;z-index:30}
.sb-glbar .sb-mast{margin:0;height:100%;container-type:normal}
.sb-glbar .sb-mast-top{height:100%;padding:0;align-items:center;border:0}
.sb-glbar .sb-nav{display:none}.sb-glbar .sb-public-links{display:none!important}.sb-glbar .sb-navm{display:block}
body:not(.embed) .sbx{height:calc(100vh - 64px);height:calc(100dvh - 64px)}
body.embed .sb-glbar,body.embed .sbx-head h1,body.embed .sbx-meta{display:none}
@media (max-width:820px){body:not(.embed) .sbx{height:auto}}
@media (max-width:760px){
.sb-glbar{height:auto;min-height:64px;padding:12px 16px}
.sb-glbar .sb-mast,.sb-glbar .sb-mast-top{height:auto}
}</style><div class="sb-glbar">${nav}</div>`;
  const embedJs = `<script>if(new URLSearchParams(location.search).has("embed"))document.body.classList.add("embed");</script>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Epilog Fusion Edge 24 — 3D</title>${fonts}<style>${ISO_CSS}${GL_CSS}${EXTRA_CSS}</style><style>${shellCss}</style></head>
<body class="iso sbx-body" data-theme="${theme}">${embedJs}${glbar}${body}<script type="module">${js.replace(/<\/(script)/gi, "<\\/$1")}</script></body></html>`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] || join(HERE, "..", "..", "dist", "gl-preview");
  mkdirSync(out, { recursive: true });
  const theme = process.argv.includes("--light") ? "light" : "dark";
  const html = glPage({ theme });
  writeFileSync(join(out, "webgl.html"), html);
  const d = glData();
  console.log(JSON.stringify({ out: join(out, "webgl.html"), bytes: html.length, parts: d.model.parts.length, audit: d.audit, jobTotal: S.JOB.total }));
}
