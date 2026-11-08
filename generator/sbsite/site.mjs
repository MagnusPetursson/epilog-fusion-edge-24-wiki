// Epilog Fusion Edge 24 teaching site: a sibling of the ShopBot PRSalpha site.
// Same design system (vendored verbatim in ../sb/design.mjs), same page shell, same figure language;
// content and claims from ./content.mjs; the 3D viewer from ../gl/build-gl.mjs.
//   node generator/sbsite/site.mjs [outDir]   -> outDir/{*.html, light/*.html, webgl.html, light/webgl.html}
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pageHtml } from "../../kit/iso-kit.mjs";
import { SHELL_CSS, SITE_CSS, PROSE_CSS, VIS_CSS, FONTS } from "../sb/design.mjs";
import { glPage } from "../gl/build-gl.mjs";
import * as V from "./visuals.mjs";
import * as K from "./content.mjs";
import { FAULTS as GL_FAULTS } from "../gl/scenes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const { PAGES, C } = K;
const KEY = Object.fromEntries(GL_FAULTS.map((f) => [f.id, f.key]));
export const PDF = { handbook: "epilog-handbook.pdf", wiki: "epilog-wiki.pdf" };

export const details = (title, html, open = false, id = "") => `<details class="sb-more"${id ? ` id="${id}"` : ""}${open ? " open" : ""}><summary><span>${title}</span></summary><div class="sb-more-body">${html}</div></details>`;
export const sec = (eyebrow, title, intro, inner, { id = "", cls = "" } = {}) => `<section class="sb-sec ${cls}"${id ? ` id="${id}"` : ""}><div class="sb-sec-h">${eyebrow ? `<span class="sb-eyebrow">${eyebrow}</span>` : ""}<h2>${title}</h2>${intro ? `<p>${intro}</p>` : ""}</div>${inner}</section>`;
const OPEN_JS = `const openHash=()=>{const id=decodeURIComponent(location.hash.slice(1));if(!id)return;const el=document.getElementById(id);if(!el)return;let d=el.closest('details');while(d){d.open=true;d=d.parentElement&&d.parentElement.closest('details');}if(el.tagName==='DETAILS')el.open=true;const inner=el.querySelector(':scope>details');if(inner)inner.open=true;};addEventListener('hashchange',openHash);openHash();`;

// ---------------------------------------------------------------- shell (theme-aware)
function shell(THEME) {
  const up = THEME === "light" ? "../" : "";
  const navList = (current) => `<ol>${PAGES.map((p) => `<li><a href="${p.file}"${p.file === current ? ' aria-current="page"' : ""}><span class="n">${p.n}</span>${p.nav}</a></li>`).join("")}</ol>`;
  const nav = (current) => {
    const cur = PAGES.find((p) => p.file === current);
    return `<header class="sb-mast">
<div class="sb-mast-top"><a class="sb-brand" href="index.html"${current === "index.html" ? ' aria-current="page"' : ""}><span class="sb-brand-name">Epilog Fusion Edge <span>24</span></span><span class="sb-brand-sub">Fab Lab Saga · University of Iceland</span></a>
<details class="sb-navm"><summary><span>${cur ? `${cur.n} ${cur.nav}` : current === "webgl.html" ? "3D model" : "Contents"}</span><span class="sb-navm-k" aria-hidden="true">Contents</span></summary><nav aria-label="Site (compact)">${navList(current)}<a class="sb-navm-3d" href="webgl.html">3D model, full screen</a><a href="${THEME === "light" ? "../" : "light/"}${current}">${THEME === "light" ? "Dark" : "Light"} version</a><a href="${up}${PDF.handbook}">Student handbook (PDF)</a><a href="${up}${PDF.wiki}">Full wiki (PDF)</a></nav></details></div>
<nav class="sb-nav" aria-label="Site">${navList(current)}</nav>
<div class="sb-public-links" style="padding:8px 24px;font-size:13px;display:flex;gap:20px;flex-wrap:wrap"><a href="${THEME === "light" ? "../" : "light/"}${current}">${THEME === "light" ? "Dark" : "Light"} version</a><a href="${up}${PDF.handbook}">Student handbook (PDF)</a><a href="${up}${PDF.wiki}">Full wiki (PDF)</a></div>
</header>`;
  };
  const pager = (i) => {
    const prev = i > 0 ? PAGES[i - 1] : null, next = i < PAGES.length - 1 ? PAGES[i + 1] : null;
    return `<nav class="sb-pager" aria-label="Previous and next">${prev ? `<a class="prev" href="${prev.file}"><span>Previous · ${prev.n}</span>${prev.nav}</a>` : `<a class="prev" href="index.html"><span>Previous</span>Start</a>`}${next ? `<a class="next" href="${next.file}"><span>Next · ${next.n}</span>${next.nav}</a>` : `<a class="next" href="index.html"><span>Back to</span>Start</a>`}</nav>`;
  };
  const head = (p) => `<header class="sb-phead"><div class="sb-kicker"><span>${p.n}</span>${p.nav}</div><h1>${p.title}</h1><p class="sb-lead">${p.sub}</p></header>`;
  const colophon = `<footer class="sb-colophon"><span>${K.MACHINE.foot}</span><span>Manufacturer references: <a href="maintain.html#sources">Maintenance → Sources</a>.</span></footer>`;
  const page = (p, i, body, script = "", { bodyClass = "" } = {}) => {
    let html = pageHtml({ title: `${p.title} — Epilog Fusion Edge 24`, theme: THEME, body: `<style>${PROSE_CSS}${SHELL_CSS}${VIS_CSS}${SITE_CSS}</style>${nav(p.file)}<article class="sb-doc">${p.noHead ? "" : head(p)}${body}${i >= 0 ? pager(i) : ""}${colophon}</article>`, script, width: 1200 });
    html = html.replace("</title>", `</title>${FONTS}`);
    if (bodyClass) html = html.replace('<body class="iso"', `<body class="iso ${bodyClass}"`);
    return html;
  };
  return { nav, page };
}

// ---------------------------------------------------------------- page bodies (theme-independent; shared with the PDFs)
export const B = {};
B.rulesList = `<ol class="sb-tenrules">${K.RULES.map(([t, x]) => `<li><b>${t}</b><span>${x}</span></li>`).join("")}</ol>`;
B.stopsBox = `<section class="sb-panel sb-panel-stop" id="stops"><div class="sb-panel-h">${V.icon("stop")}<h2>How to stop</h2></div><p class="sb-panel-sub">Go/Stop is the only stop control; there is no emergency-stop button.${C("no-estop")}</p><div class="sb-stopgrid">
${K.STOPS.map((s) => `<div>${s.kind === "ok" ? V.panel() : V.flame()}<span class="what ${s.kind}">${s.tag}</span><h3>${s.title}</h3><p>${s.text}</p></div>`).join("\n")}
</div></section>`;
B.startBox = `<section class="sb-panel sb-panel-start" id="job-start"><div class="sb-panel-h">${V.icon("play")}<h2>How to start a job</h2></div><p class="sb-panel-sub">Enter the thickness before you print; run Trace before Go/Stop.</p>${V.flow(K.START)}</section>`;
B.epilogSafety = `<ul class="sb-rules">${["attended", "vector-fire", "clear-area", "air-assist-vector", "unvented", "fume-harm", "pvc", "no-unvented-enclosure", "access-panels", "class2"].map((id) => `<li>${K.CLAIMS[id].t}${C(id)}</li>`).join("")}</ul>`;
B.rules = `${B.rulesList}${B.stopsBox}${B.startBox}<div class="sb-measure" style="margin-top:72px">${details("Epilog safety list (manual and Support)", B.epilogSafety)}</div>`;

B.mech = `<dl class="sb-table">${K.MECH.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join("")}</dl>`;
B.numbers = `<dl class="sb-table">${[
  ["outside", `1055 × 834 × 967 mm, 102 kg, on a built-in pedestal with wheels.${C("envelope", "pedestal")}`],
  ["work area", `610 × 610 mm; material up to 254 mm thick.${C("work-area", "max-thick")}`],
  ["table", `27.2 kg while it moves (autofocus moves it), 40.8 kg resting. ${C("load-decision", "table-load", "table-load-pp")}`],
  ["laser", `80 W CO₂, 10.6 µm, air-cooled metal/ceramic tube.${C("source-80w", "source-80w-instr", "air-cooled")}`],
  ["lens", `50.8 mm focal length, the standard lens.${C("lens-standard", "lens-instr")}`],
  ["extraction", `595–680 m³/h, one 102 mm port at the back.${C("exhaust-flow", "exhaust-port")}`],
  ["air", `8 mm receptacle at the back, 2.1 bar maximum.${C("air-limit")}`],
  ["power", `Entry at the right side, rear corner.${C("power-entry")}`],
].map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join("")}</dl>`;
B.machine = `<div class="sb-stage-wrap"><iframe class="sb-gl-frame" src="webgl.html?embed" title="Epilog Fusion Edge 24 3D model: drag to orbit, wheel to zoom" loading="eager"></iframe>
<div class="sb-stage-note"><span>The machine in 3D</span><a href="webgl.html">Full screen →</a></div></div>
<div class="sb-specrow">${V.stats(K.SPEC)}</div>
<p class="sb-measure sb-aside"><b>The model.</b> Outer dimensions (1055 × 834 × 967 mm) and work area (610 × 610 mm) are to scale.${C("envelope", "work-area")}<span class="sb-cite">[17]</span> The inside is simplified. The CO₂ beam is drawn red so you can see it; the real beam is invisible.</p>
<div class="sb-measure sb-group">${details("Mechanisms", B.mech, true)}${details("Specifications", B.numbers)}${details("Go/Stop status ring", `${V.ringRow()}<p>Red means a drive has failed: leave the machine and call staff.${C("ring-colours", "ring-red")}</p>`)}</div>`;

let sn = 0;
B.proc = `<div class="sb-proc">${K.STEPS.map(([ph, steps]) => `<div class="sb-phase"><div class="sb-phase-h">${ph}</div><ol>${steps.map(([t, x, cmd, hot]) => { sn++; return `<li class="sb-step${hot ? " hot" : ""}" id="step-${sn}"><span class="sb-step-n">${sn}</span><div><div class="sb-step-t">${t}</div><div class="sb-step-x">${x}</div></div><div class="sb-step-cmd">${cmd.split("|").map((s) => `<code>${s.trim()}</code>`).join("")}</div></li>`; }).join("")}</ol></div>`).join("")}</div>`;
B.pause = `<p>Go/Stop pauses: the beam stops at once; the head stops at the end of the raster line or the next vector node, so give it a moment. Lid up only when it has stopped. Lid down and Go/Stop resumes where it left off, and lines up only if nothing moved.${C("pause-node", "pause-delay", "registration", "lid-motion")}</p><p>Reset sends the head home and ends the run; the job stays in the list.${C("reset")}</p>`;
B.software = `<p>The Epilog software prints the job to the laser. In it you choose Auto Focus (Off, Thickness or Plunger), split the job into processes, and set speed, power and frequency for each. At Saga, Auto Focus is always Thickness and the thickness goes into every process.${C("af-dashboard", "thickness-mode", "thickness-local")}</p>`;
B.run = `${B.proc}${sec("Detail", "Notes on the steps", "", `<div class="sb-measure sb-group">${details("Pause and resume", B.pause)}${details("Epilog software", B.software)}${details("Your designs", `<p>Start from Epilog’s settings for the material (Materials), and keep a note of what worked.</p>`)}</div>`)}`;

B.trio = `<div class="sb-trio">${K.FOCUS_TRIO.map((t, i) => `<a href="#${["thick", "dot", "home"][i]}"><span class="cmd">${t.tag}</span><b>${t.title}</b><span>${t.text}</span></a>`).join("")}</div>`;
B.focus = `${B.trio}
${sec("Figure 1 · section", "Thickness entered vs. left blank", "", V.fig(V.focusPair(), ["<b>Lens and cone.</b> The beam narrows to its focal point a fixed distance below.", "<b>Thickness entered:</b> the table rises until your surface (green) sits on the focal plane (red).", "<b>Blank:</b> it focuses on the grid top instead, and a 6 mm sheet stands 6 mm above focus. The spot is wider and weaker; the edges blur."], { cls: "sb-zero-fig" }) + `<p class="sb-measure">${K.CLAIMS["thickness-grid"].t}${C("thickness-grid", "thickness-mode", "calipers")} It is fault 2 in the <a href="webgl.html#fault=focus">3D model</a>.</p>`, { id: "thick" })}
${sec("Figure 2 · from above", "Control panel", "", V.fig(V.panel(), ["<b>Display</b>, 178 mm: Job Menu, Focus, Pointer, Jog, Trace, status in the bottom-left corner.", "<b>Joystick</b>: jogs the head, or the table in the Focus menu.", "<b>Go/Stop</b>: start, pause, resume. Its ring shows status."]) + `<p class="sb-measure">${K.CLAIMS["panel-parts"].t}${C("panel-parts", "display-7in", "status", "job-menu")}</p>`, { id: "dot" })}
<div class="sb-measure sb-group" id="home">${K.FOCUS_NOTES.map((n, i) => details(["Plunger and gauge", "Thick acrylic", "Calibration"][i], `<p>${n}</p>`)).join("")}${details("Home, park and Reset", `<p>${K.FOCUS_TRIO[2].text}</p><p>${K.CLAIMS["home-corner"].t}${C("home-corner")}</p>`)}</div>`;

B.preflightCols = `<div class="sb-preflight">${K.PREFLIGHT.map(([h, items]) => `<div class="sb-pf-col"><h4>${h}</h4><ul class="sb-ticks">${items.map((t) => `<li>${t}</li>`).join("")}</ul></div>`).join("")}</div>`;
B.preflight = `<div class="sb-pf-tools"><button type="button" class="sb-print" onclick="print()">Print this page</button><p class="sb-aside" style="margin:0">Keep a printed copy at the machine. Tick every line in order. If a line can’t be ticked, stop and ask staff.</p></div>
<div class="sb-pf-fill" aria-hidden="true"><span>Operator</span><span>Material</span><span>Date</span><span>Job / file</span></div>${B.preflightCols}`;

const faultById = Object.fromEntries(K.FAULTS.map((f) => [f[0], f]));
B.symptoms = `<div class="sb-symptoms">${K.SYMPTOMS.map(([s, ids]) => `<div class="sb-sym"><div class="sb-sym-h">${s}</div><div>${ids.split(" · ").map((id) => { const f = faultById[id]; return `${f[5].split(". ")[0]}. → <a href="#${id}">${id}</a>${f[1] ? ` · <a class="sb-showfault" href="webgl.html#fault=${f[1]}">3D key ${KEY[f[1]]}</a>` : ""}`; }).join("<br>")}</div></div>`).join("")}</div>`;
B.faultRows = `<ol class="sb-faults">${K.FAULTS.map(([id, key, title, see, why, todo, refs]) => `<li class="sb-frow" id="${id}"><details><summary><span class="sb-fid">${id}</span><span class="sb-ft">${title}${C(...refs)}</span><span class="sb-fkey">${key ? `key ${KEY[key]}` : ""}</span></summary><div class="sb-fbody"><div><span class="lab">What you see</span>${see}</div><div><span class="lab">Why</span>${why}</div><div><span class="lab">What to do</span>${todo}</div></div></details></li>`).join("")}</ol>`;
B.callStaff = `<section class="sb-sec sb-staff" id="callstaff"><h2>${V.icon("alarm")}When to step back and call staff</h2><ul>${K.CALL_STAFF.map((t) => `<li>${t}</li>`).join("")}</ul></section>`;
const TROUBLE_JS = `const q=document.querySelector('[data-filter]'),out=document.querySelector('[data-count]');const items=[...document.querySelectorAll('.sb-sym,.sb-frow')];
q&&q.addEventListener('input',()=>{const t=q.value.trim().toLowerCase();let n=0;for(const el of items){const hit=!t||el.textContent.toLowerCase().includes(t);el.classList.toggle('sb-hidden',!hit);if(hit)n++;const d=el.querySelector('details');if(d)d.open=!!t&&hit&&t.length>2;}out.textContent=t?n+' match'+(n===1?'':'es'):'';});${OPEN_JS}`;
B.trouble = `<div class="sb-trouble-tree">${V.stoppedFlow()}</div>
${sec("Index", "Symptoms", "Each symptom gives the first action and links to the fault card and, where the 3D model stages it, its key.", `<div class="sb-filter"><input type="search" data-filter placeholder="Filter symptoms and faults — e.g. flame, focus, plastic" aria-label="Filter symptoms and faults"><output data-count></output></div>${B.symptoms}`, { id: "symptoms" })}
${B.callStaff}
${sec("Reference", "Ten faults", "Each row gives the symptom, cause and action. Faults with a key are staged in the 3D model on <a href=\"machine.html\">The machine</a>.", `<nav class="sb-jump" aria-label="Jump to a fault">${K.FAULTS.map(([id, key]) => `<a href="#${id}"${key ? ' class="k"' : ""}>${id}</a>`).join("")}</nav>${B.faultRows}`, { id: "faults" })}`;

B.matCols = V.maintGrid([["Normally fine", K.MAT_YES], ["Never", K.MAT_NO], ["Ask staff first", K.MAT_ASK]], "Material categories");
B.settings = `<div class="sb-ftab-wrap"><table class="sb-ftab"><colgroup><col style="width:22%"><col style="width:28%"><col style="width:14%"><col></colgroup><thead><tr><th>Material</th><th>Process</th><th>DPI / freq.</th><th>80 W starting point</th></tr></thead><tbody>${K.SETTINGS.map(([m, p, d, s]) => `<tr><td>${m}</td><td data-l="Process">${p}</td><td class="num" data-l="DPI / freq.">${d}</td><td class="num" data-l="80 W">${s}</td></tr>`).join("")}</tbody></table></div>
<p class="sb-measure sb-aside">From the 80 W column of Epilog’s Fusion Edge suggested settings (CO₂).${C("settings-80w")} s = speed %, p = power %, f = frequency. † Test this one on scrap before a real job. These are starting points: every sheet differs, so check the result and adjust. Cast acrylic engraves frosted; extruded cuts with a flame-polished edge.${C("acrylic-focus-note")}</p>`;
B.materials = `${sec("First", "Material identification", `Epilog prohibits any material containing PVC or vinyl. Heated, it gives off hydrogen chloride, which corrodes the machine (voiding the warranty) and harms you. Kydex contains PVC. Neoprene’s safety data sheet lists hydrogen chloride when heated. If you can’t name a material, its safety data sheet tells you what is in it. You may bring any suitable material; ask staff about anything unknown.${C("pvc", "corrosion", "hcl", "kydex", "neoprene", "sds", "material-policy")}`, B.matCols)}
${sec("Polycarbonate", "Allowed by Epilog, poor on a CO₂ laser", `Epilog doesn’t forbid polycarbonate, but thin sheet cuts badly and discolours, and the fumes need good extraction. It looks like acrylic: if a clear sheet has no label, treat it as unknown.${C("polycarbonate", "fume-harm")}`, "")}
${sec("Starting points", "Speed and power", "Epilog lists its settings by material and wattage. These are the 80 W figures, for Saga’s laser.", B.settings)}
<div class="sb-measure sb-group">${details("Epilog’s CO₂ compatibility list", `<p>Epilog’s list of materials a CO₂ laser engraves or cuts: acrylic, wood, paper, leather, cork, fabric, rubber, Delrin, Corian, mat board; engrave-only glass, ceramic, stone, tile and anodised aluminium. Bare metals only with a marking compound.${C("co2-materials")}</p>`)}</div>`;

B.maintGrid = V.maintGrid(K.MAINT);
B.sources = `<ol class="sb-sources">${K.SOURCES.map(([n, label, url]) => `<li value="${n}">${label}${url ? ` — <a href="${url}">${url}</a>` : ""}</li>`).join("")}</ol><p class="sb-aside">Manuals are linked, never copied. Page numbers are the printed ones. The April 2021 Fusion Edge 12/24 manual matches this machine.</p>`;
B.maintain = `${sec("Calendar", "Maintenance schedule", `Epilog Support’s preventive schedule for the Fusion Edge, split by who does it. Students do the first column; everything else is staff.${C("pm-weekly", "pm-6m", "pm-12m", "roles")}`, `${B.maintGrid}<div class="sb-measure sb-group" style="margin-top:40px">${details("Cleaning and fire risk", `<p>Residue and debris build up on every job and become a fire hazard in their own right. Dirty optics lose power and are damaged by it.${C("debris-clean", "optics-contam")} Staff clean under the table weekly.${C("pm-weekly")}</p>`)}${details("Optics: staff only", `<p>Four mirrors, one window optic and one lens. Cleaning is staff work: approved optics cleaner (or reagent-grade alcohol) on cotton swabs, never isopropyl or hardware acetone.${C("optics-count", "optics-solution")}</p>`)}</div>`)}
${sec("Reference", "Specifications and sources", "", `<nav class="sb-reflinks" aria-label="Reference sections"><a href="#numbers">Specifications</a><a href="#sources">Sources</a></nav><div class="sb-group">${details("Specifications", B.numbers, false, "numbers")}${details("Sources", B.sources, false, "sources")}</div>`)}`;

B.quiz = `<p>Answers are under each question. Answer it yourself before you open one.</p><ol class="sb-quiz">${K.QUIZ.map(([q, a]) => `<li>${q}<details><summary>Answer</summary><div>${a}</div></details></li>`).join("")}</ol>`;

B.index = (where) => `<header class="sb-hero"><div><div class="sb-kicker"><span>00</span>Fab Lab Saga teaching wiki</div><h1>The Epilog Fusion Edge <em>24</em></h1><p class="sb-lead">Operation, safety and troubleshooting for the 80 W CO₂ laser cutter.</p><a class="sb-cta" href="rules.html">Read the rules <i>→</i></a></div>
<nav class="sb-where" aria-label="Pages by situation"><div class="sb-where-h">By situation</div>${where.map(([w, p, href, cls]) => `<a href="${href}"${cls ? ` class="${cls}"` : ""}><b>${w}</b><span>${p}</span></a>`).join("")}</nav></header>
${sec("Safety", "How to stop", "", `<div class="sb-stops-teaser"><figure>${V.panel()}<figcaption><b>Go/Stop — pause</b>The beam stops at once; the head at the next node. Wait for it, then look.</figcaption></figure><figure>${V.flame()}<figcaption><b>Flame — step back and call</b>Go/Stop, lid shut, hands out, get staff. <a href="rules.html#stops">How to stop, in full</a>.</figcaption></figure></div>`)}
${sec("Reading order", "Six pages before your first job", "Read them in this order. At the machine, use the pre-flight checklist.", V.flow([
  { title: "Rules", text: "Before the induction.", href: "rules.html" },
  { title: "The machine", text: "3D model and nine staged faults.", href: "machine.html" },
  { title: "Run a job", text: "Twelve steps from file to finished part.", href: "run.html" },
  { title: "Focus", text: "Thickness, the red dot, home.", href: "focus.html" },
  { title: "Pre-flight", text: "Printed and used for every job.", href: "preflight.html" },
  { title: "Self-check", text: "Twelve questions, with answers.", href: "quiz.html" },
]))}
${sec("Contents", "All pages", "", `<ol class="sb-toc">${PAGES.map((p) => `<li><a href="${p.file}"><span class="n">${p.n}</span><b>${p.nav}</b><span>${p.sub}</span></a></li>`).join("")}<li><a href="webgl.html"><span class="n">3D</span><b>3D model, full screen</b><span>Orbit, open the lid, run the demonstration job and stage the nine faults.</span></a></li></ol>`)}`;
export const WHERE = [
  ["Before your induction", "01 Rules", "rules.html"],
  ["How it works", "02 The machine", "machine.html"],
  ["At the machine, before a job", "05 Pre-flight", "preflight.html"],
  ["Flame, smoke, or a bad result", "06 Troubleshooting", "trouble.html", "danger"],
  ["Material and settings", "07 Materials", "materials.html"],
];

export const BODY = { "rules.html": [B.rules], "machine.html": [B.machine], "run.html": [B.run], "focus.html": [B.focus], "preflight.html": [B.preflight, "", { bodyClass: "pf" }], "trouble.html": [B.trouble, TROUBLE_JS], "materials.html": [B.materials], "maintain.html": [B.maintain, OPEN_JS], "quiz.html": [B.quiz] };

export function buildSite(out) {
  const written = [];
  for (const theme of ["dark", "light"]) {
    const dir = theme === "light" ? join(out, "light") : out; mkdirSync(dir, { recursive: true });
    const { nav, page } = shell(theme);
    PAGES.forEach((p, i) => { const [body, js = "", o = {}] = BODY[p.file]; writeFileSync(join(dir, p.file), page(p, i, body, js, o)); written.push(join(dir, p.file)); });
    writeFileSync(join(dir, "index.html"), page({ file: "index.html", title: "The Epilog Fusion Edge 24", noHead: true }, -1, B.index(WHERE))); written.push(join(dir, "index.html"));
    writeFileSync(join(dir, "webgl.html"), glPage({ theme, nav: nav("webgl.html"), shellCss: SHELL_CSS, fonts: FONTS })); written.push(join(dir, "webgl.html"));
  }
  return written;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] || join(HERE, "..", "..", "site");
  const w = buildSite(out);
  console.log(JSON.stringify({ out, files: w.length }));
}
