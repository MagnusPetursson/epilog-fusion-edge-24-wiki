// Printed companions, built like the ShopBot site's handbook: same print stylesheet (vendored ../sb/print.mjs),
// same chapter shell, 3D stills from the viewer, a two-pass contents with real page numbers.
//   node generator/sbsite/print.mjs <outDir>   -> outDir/epilog-handbook.{html,pdf}, outDir/epilog-wiki.{html,pdf}
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { pageHtml } from "../../kit/iso-kit.mjs";
import { SHELL_CSS, SITE_CSS, PROSE_CSS, VIS_CSS } from "../sb/design.mjs";
import { HB_CSS_RAW, stripMedia } from "../sb/print.mjs";
import * as V from "./visuals.mjs";
import * as K from "./content.mjs";
import { B, PDF, sec } from "./site.mjs";

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, "..", "..");
const TODAY = "2026-10-21";
const FOOT = K.MACHINE.foot;
const CHROME = process.env.CHROME || (() => { const d = join(homedir(), ".cache/ms-playwright"); const c = readdirSync(d).filter((x) => /^chromium-\d+$/.test(x)).sort().pop(); return join(d, c, "chrome-linux64", "chrome"); })();
const PF_CSS = SITE_CSS.split("\n").filter((l) => /^\s*body\.pf /.test(l)).map((l) => l.trim().replace(/body\.pf /g, ".hb-pf ")).join("\n");
const HB_CSS = HB_CSS_RAW.replace("${FOOT}", FOOT).replace("${PF_CSS}", PF_CSS) + `
/* Epilog additions: still grid for nine faults, flame beats, settings table, ledger appendix */
.hb-stills img{object-position:50% 50%}
.hb-hero img{height:72mm;object-position:50% 55%}
.sb-stopgrid .sb-vis{max-width:58mm}
.hb-ledger{font-size:8pt;line-height:1.3;width:100%;border-collapse:collapse}
.hb-ledger th{font:600 6.5pt/1.2 var(--sb-sans);letter-spacing:.1em;text-transform:uppercase;color:var(--anatomy-muted);text-align:left;padding:1.2mm 2mm 1.2mm 0;border-bottom:1.2pt solid var(--anatomy-strong)}
.hb-ledger td{padding:1mm 2mm 1mm 0;border-bottom:.4pt solid var(--anatomy-faint);vertical-align:top}
.hb-ledger td:first-child{font-family:var(--anatomy-mono);font-size:7pt;white-space:nowrap}
.hb-ledger tr{break-inside:avoid}
.hb-web .sb-more{border:0}.hb-web .sb-more>summary{list-style:none;font:600 12pt/1.3 var(--sb-serif);color:var(--anatomy-strong);padding:3mm 0 1mm;border-top:1px solid var(--anatomy-faint)}
.hb-web .sb-more>summary::-webkit-details-marker{display:none}.hb-web .sb-more>summary::after{display:none}
.hb-box .sb-table{display:block;font-size:9pt;margin:0}
.hb-box .sb-table dt{font:600 8pt/1.3 var(--sb-sans);color:var(--anatomy-strong);padding:1.6mm 0 .3mm;border-top:.5pt solid var(--anatomy-faint);break-after:avoid}
.hb-box .sb-table dd{padding:0 0 1.4mm;border-top:0;break-before:avoid}
.hb-box .hb-acols{columns:2}
#ch-run .sb-step{padding:2mm 0}
#ch-run .sb-step-x{font-size:9.2pt;line-height:1.33}
#ch-run .sb-step-t{font-size:11pt}
#ch-run .hb-chh{margin-bottom:4mm}
.hb-symptoms{break-before:auto!important;margin-top:6mm}
.sb-ftab-wrap{break-inside:avoid}
#epilog-safety{break-inside:avoid}
.hb-web .sb-sec-h{break-after:avoid;page-break-after:avoid}
.hb-web .sb-sec{break-inside:auto}
.hb-web .sb-more{break-inside:avoid}
.hb-web .sb-reflinks{display:none!important}
#ch-run .hb-web>.sb-sec{break-before:page}
.hb-ledger{font-size:8.6pt}
.hb-web .sb-gl-frame,.hb-web .sb-stage-note,.hb-web .sb-filter,.hb-web .sb-pf-tools .sb-print,.hb-web .sb-jump{display:none!important}
`;
export const dataUri = (file, mime) => `data:${mime};base64,${readFileSync(file).toString("base64")}`;
const FONTDIR = join(ROOT, "assets", "fonts");
const fontCss = readFileSync(join(FONTDIR, "fonts.css"), "utf8").replace(/url\(([^)]+\.woff2)\)/g, (m, f) => `url(${dataUri(join(FONTDIR, f), "font/woff2")})`);
const img = (name) => dataUri(join(ROOT, "assets", "print-stills", name + ".jpg"), "image/jpeg");
const openAll = (html) => html.replace("Answers are under each question. Answer it yourself before you open one.", "Answers are printed below. Try each question before reading its answer.").replace(/<details(?![^>]*\sopen)/g, "<details open");
const PAGEFILES = K.PAGES.map((p) => p.file.replace(".html", ""));
const localLinks = (html) => html
  .replace(/\s*·\s*<a class="sb-showfault" href="[^"]*"[^>]*>[^<]*<\/a>/g, "")
  .replace(new RegExp(`href="(?:${PAGEFILES.join("|")})\\.html#([^"]+)"`, "g"), 'href="#$1"')
  .replace(new RegExp(`href="(?:${PAGEFILES.join("|")})\\.html"`, "g"), (m) => `href="#ch-${m.match(/(\w+)\.html/)[1]}"`)
  .replace(/<a href="webgl\.html[^"]*">([^<]*)<\/a>/g, "$1");
const P = Object.fromEntries(K.PAGES.map((p) => [p.file.replace(".html", ""), { ...p }]));
P.machine.sub = "Beam path, motion system, table and extraction: what each part does.";
const chapter = (key, inner, cls = "") => { const p = P[key]; return `<section class="hb-ch ${cls}" id="ch-${key}"><header class="hb-chh"><div class="sb-kicker"><span>${p.n}</span>${p.nav}</div><h1>${p.title}</h1><p class="sb-lead">${p.sub}</p></header>${inner}</section>`; };
const still = (name, cap, cls = "") => `<figure class="hb-still ${cls}"><img src="${img(name)}" alt=""><figcaption>${cap}</figcaption></figure>`;
const hsec = (eyebrow, title, intro, inner, cls = "") => `<section class="hb-sec ${cls}"><div class="sb-sec-h">${eyebrow ? `<span class="sb-eyebrow">${eyebrow}</span>` : ""}<h2>${title}</h2>${intro ? `<p>${intro}</p>` : ""}</div>${inner}</section>`;
const shortUrl = (u) => { const m = u.match(/^https?:\/\/(?:www\.)?([^/]+)/); return m ? m[1] : u; };

// ------------------------------------------------------------------ handbook chapters
const H = {};
H.rules = chapter("rules", `${B.rulesList}${B.stopsBox}${B.startBox}`);
H.machine = chapter("machine", `<div class="hb-hero"><figure class="hb-still"><img src="${img("hero")}" alt=""></figure><div class="hb-hero-side"><p class="hb-cap"><b>The machine in 3D.</b> The cabinet stands on a pedestal, with a glazed lid and the control panel on the right shoulder. Online the model turns, opens, runs a demonstration job and acts out nine faults; chapter 06 shows four faults and a flame sequence. Outer dimensions are to scale; the inside is simplified.</p>${V.stats(K.SPEC)}</div></div>
${hsec("How it works", "Mechanisms", "", `<div class="hb-cols">${B.mech}</div>`, "hb-numbers")}
<div class="hb-figpair">${still("cutaway", "<b>Cutaway.</b> The X-beam (bridge) runs front to back on the Y guides and carries the head; the table below rises to set focus; the vector grid sits over the tray.")}${still("controls", "<b>The control panel.</b> Display, joystick and Go/Stop with its status ring, on the right shoulder.")}</div>
${hsec("Reference", "Specifications", "", B.numbers, "hb-numbers")}`);
H.run = chapter("run", `${B.proc}${hsec("Pausing", "Pause and resume", "", `<div class="hb-cols">${B.pause}${B.software}</div>`)}`);
H.focus = chapter("focus", `${B.trio}${hsec("Figure 1 · section", "Thickness entered vs. left blank", "", V.fig(V.focusPair(), ["<b>Lens and cone.</b> The beam narrows to its focal point a fixed distance below.", "<b>Thickness entered:</b> the table rises until your surface (green) sits on the focal plane (red).", "<b>Blank:</b> it focuses on the grid top instead, and a 6 mm sheet stands 6 mm above focus."], { cls: "sb-zero-fig" }))}
<div class="hb-figpair">${still("focus-b1", "<b>Fault 2 in the 3D model.</b> Thickness left blank: the focal plane (red) sits 6 mm below the sheet’s surface (green).")}<div class="hb-cols" style="columns:1">${K.FOCUS_NOTES.map((n) => `<p>${n}</p>`).join("")}</div></div>
${hsec("Figure 2 · result", "Correct and incorrect focus", "The same artwork, engraved with the same settings. Only the focus differs.", `<div class="hb-figpair">${still("focus-good", "<b>Correct focus.</b> Thickness entered: the spot is smallest on the surface. Sharp letter edges, evenly dark.")}${still("focus-bad", "<b>Incorrect focus.</b> Thickness left blank, surface 6 mm above focus: edges spread and soften, the mark is lighter and shallower.")}</div>`)}`);
H.preflight = `<section class="hb-ch hb-pf" id="ch-preflight"><header class="sb-phead"><div class="sb-kicker"><span>${P.preflight.n}</span>${P.preflight.nav}</div><h1>${P.preflight.title}</h1><span class="hb-tear">Tear-off sheet · keep it at the machine</span></header>
<div class="sb-pf-tools"><p class="sb-aside">Tick every line in order. If a line can’t be ticked, stop and ask staff.</p></div>
<div class="sb-pf-fill"><span>Operator</span><span>Material</span><span>Date</span><span>Job / file</span></div>${B.preflightCols}</section>`;
const beat = (n, name, t) => `<li><img src="${img(name)}" alt=""><span><b>${n}</b> ${t}</span></li>`;
H.trouble = chapter("trouble", `<div class="sb-trouble-tree">${V.stoppedFlow()}</div>${B.callStaff.replace('class="sb-sec sb-staff"', 'class="hb-sec sb-staff"')}
${hsec("Index", "Symptoms", "Each symptom gives the first action and the fault in Appendix A.", B.symptoms, "hb-symptoms")}
${hsec("3D model", "Four faults", "Illustrations of four faults. The F-number leads to the row in Appendix A.", `<div class="hb-stills">
${still("lid-b1", `<b><a href="#F03">F03</a> · Lid opened mid-job.</b> The interlock stops the beam; the head keeps moving.`)}
${still("smoke-b1", `<b><a href="#F04">F04</a> · Smoke lingers.</b> No flow at the plenum; smoke hangs at the lens and escapes at the lid.`)}
${still("debris-b2", `<b><a href="#F06">F06</a> · Offcuts in the tray.</b> A hot fragment smoulders unseen under the grid.`)}
${still("focus-b1", `<b><a href="#F02">F02</a> · No thickness entered.</b> Focus on the grid top, 6 mm below the surface.`)}
</div>
<figure class="hb-beats"><ol>${beat(1, "flare-b0", "Vector cut, air assist on: a flicker at the cut is normal.")}${beat(2, "flare-b1", "The flame grows. You’re there, so you see it at once.")}${beat(3, "flare-b2", "Go/Stop. The beam stops; the head at the next node.")}${beat(4, "flare-b3", "Still burning: lid shut, hands out, get staff.")}</ol>
<figcaption><b><a href="#F01">F01</a> · Flame during a vector cut</b>, in four beats (key 1 in the 3D model).</figcaption></figure>`, "hb-frozen")}
`);
H.materials = chapter("materials", `${hsec("First", "Material identification", `Never use anything with PVC or vinyl in it: heated, it gives off hydrogen chloride, which corrodes the machine and harms you. Kydex contains PVC; neoprene gives off hydrogen chloride when heated. If you can’t name it, its safety data sheet tells you what is in it; unknown means ask.${K.C("pvc", "corrosion", "hcl", "kydex", "neoprene", "sds", "material-policy")}`, B.matCols)}
<p class="sb-aside hb-note"><b>Polycarbonate</b> is allowed by Epilog but cuts badly and discolours on a CO₂ laser. It looks like acrylic: an unlabelled clear sheet is unknown.${K.C("polycarbonate")}</p>
${hsec("Starting points", "Speed and power at 80 W", "", B.settings)}`);
H.maintain = chapter("maintain", `${B.maintGrid}${hsec("Why", "Cleaning and fire risk", "", `<div class="hb-cols"><p>Residue and debris build up on every job and become a fire hazard in their own right. Dirty optics lose power and are damaged by it.${K.C("debris-clean", "optics-contam")} Staff clean under the table weekly.${K.C("pm-weekly")}</p><p>Optics are staff work: approved cleaner on cotton swabs, never isopropyl or hardware acetone.${K.C("optics-count", "optics-solution")}</p></div>`)}`);
H.quiz = chapter("quiz", openAll(B.quiz));
const faultsA = K.FAULTS.map(([id, key, title, see, why, todo, refs]) => `<div class="hb-f" id="${id}"><div class="hb-fh"><span class="hb-fid">${id}</span><b>${title}</b>${K.C(...refs)}${key ? `<span class="hb-fkey">3D fault</span>` : ""}</div><p><span class="lab">See</span>${see}</p><p><span class="lab">Why</span>${why}</p><p><span class="lab">Do</span>${todo}</p></div>`).join("");
const sourcesA = B.sources.replace(/<a href="([^"]+)">[^<]+<\/a>/g, (m, u) => `<a href="${u}">${shortUrl(u)}</a>`);
H.appendix = `<section class="hb-ch hb-app" id="ch-appendix"><header class="hb-chh"><div class="sb-kicker"><span>A–C</span>Appendix</div><h1>Reference</h1><p class="sb-lead">The fault table, Epilog’s safety list and the sources.</p></header>
<section class="hb-asec" id="faults"><h2><span>A</span>Ten faults</h2><p class="hb-aintro">What you see, why, what to do. Numbers in brackets are sources (Appendix C).</p><div class="hb-acols">${faultsA}</div></section>
<section class="hb-asec" id="epilog-safety"><h2><span>B</span>Epilog’s own safety list</h2><div class="hb-acols">${B.epilogSafety}</div></section>
<section class="hb-asec" id="sources"><h2><span>C</span>Sources</h2><div class="hb-acols">${sourcesA}</div></section></section>`;

const HB_TOC = ["rules", "machine", "run", "focus", "preflight", "trouble", "materials", "maintain", "quiz"].map((k) => ({ id: `ch-${k}`, n: P[k].n, label: P[k].nav, find: P[k].title }))
  .concat([{ id: "faults", n: "A", label: "Ten faults", find: "A Ten faults" }, { id: "epilog-safety", n: "B", label: "Epilog’s own safety list", find: "B Epilog’s own safety list" }, { id: "sources", n: "C", label: "Sources", find: "C Sources" }]);
const cover = (kind, toc, pages) => `<section class="hb-cover"><div class="hb-cover-top"><div class="sb-kicker"><span>${kind === "wiki" ? "Wiki" : "Handbook"}</span>${kind === "wiki" ? "Complete wiki" : "Student handbook"}</div>
<h1>The Epilog Fusion Edge <em>24</em></h1><p class="sb-lead">Operation, safety and troubleshooting for the 80 W CO₂ laser cutter. ${kind === "wiki" ? "The teaching chapters, diagrams, self-check answers and manufacturer references." : "The printed companion to Fab Lab Saga’s teaching site."}</p></div>
<div class="hb-cover-meta"><div><span>Lab</span>Fab Lab Saga, University of Iceland</div><div><span>Date</span>${TODAY}</div><div><span>Version</span>80 W CO₂ · Model 17000 · September 2021 · 50.8 mm lens</div></div>
<nav class="hb-toc" aria-label="Contents"><div class="hb-toc-h">Contents</div><ol>${toc.map((t) => `<li><a href="#${t.id}"><span class="n">${t.n}</span><b>${t.label}</b><span class="pg">${pages?.[t.id] ?? ""}</span></a></li>`).join("")}</ol></nav>
<p class="hb-cover-foot">Manufacturer references are listed ${kind === "wiki" ? "in Maintenance → Sources" : "in Appendix C"}. ${kind === "wiki" ? "" : `Read chapters 01–05 before your induction, tear out the pre-flight sheet (page ${pages?.["ch-preflight"] ?? "—"}) and keep it at the machine.`}</p></section>`;

// ------------------------------------------------------------------ full wiki: every page body, accordions open, plus the ledger
const W_BODY = { rules: B.rules, machine: B.machine, run: B.run, focus: B.focus, preflight: B.preflightCols, trouble: B.trouble, materials: B.materials, maintain: B.maintain, quiz: B.quiz };
const W_TOC = Object.keys(W_BODY).map((k) => ({ id: `ch-${k}`, n: P[k].n, label: P[k].nav, find: P[k].title }));
const wikiChapters = () => Object.entries(W_BODY).map(([k, body]) => chapter(k, `<div class="hb-web">${k === "machine" ? `<div class="hb-hero"><figure class="hb-still"><img src="${img("hero")}" alt=""></figure><div class="hb-hero-side">${V.stats(K.SPEC)}</div></div>` : ""}${openAll(body)}</div>`, k === "preflight" ? "hb-pf" : "")).join("\n")
;

// ------------------------------------------------------------------ assemble, print, number, print again
export const css = () => `<style>${fontCss}${PROSE_CSS}${SHELL_CSS}${stripMedia(VIS_CSS)}${stripMedia(SITE_CSS)}${HB_CSS}</style>`;
function assemble(kind, pages) {
  const body = kind === "wiki"
    ? `${css()}<article class="sb-doc">${cover("wiki", W_TOC, pages)}${localLinks(wikiChapters())}</article>`
    : `${css()}<article class="sb-doc">${cover("handbook", HB_TOC, pages)}${["rules", "machine", "run", "focus", "preflight", "trouble", "materials", "maintain", "quiz"].map((k) => localLinks(openAll(H[k]))).join("\n")}${localLinks(H.appendix)}</article>`;
  return pageHtml({ title: `Epilog Fusion Edge 24 — ${kind === "wiki" ? "full wiki" : "student handbook"}`, theme: "light", body, width: 1200 });
}
export function print(htmlPath, pdfPath) { execFileSync(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--virtual-time-budget=8000", "--no-pdf-header-footer", `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href], { stdio: "pipe", timeout: 120000 }); }
function locate(pdfPath, toc) {
  const n = Number(execFileSync("pdfinfo", [pdfPath]).toString().match(/Pages:\s+(\d+)/)[1]);
  const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"]).toString().split("\f");
  const pages = {};
  for (const t of toc) for (let i = 1; i < n; i++) { const lines = text[i].split("\n").map((l) => l.trim().replace(/\s+/g, " ")); if (lines.some((l) => l.includes(t.find.trim()))) { pages[t.id] = i + 1; break; } }
  return { n, pages };
}
export function buildPrint(out) {
  const res = {};
  for (const [kind, toc, name] of [["handbook", HB_TOC, PDF.handbook], ["wiki", W_TOC, PDF.wiki]]) {
    const htmlPath = join(out, name.replace(".pdf", ".html")), pdfPath = join(out, name);
    writeFileSync(htmlPath, assemble(kind, null)); print(htmlPath, pdfPath);
    let { pages } = locate(pdfPath, toc), n = 0;
    for (let pass = 0; pass < 3; pass++) { writeFileSync(htmlPath, assemble(kind, pages)); print(htmlPath, pdfPath); const again = locate(pdfPath, toc); n = again.n; if (JSON.stringify(again.pages) === JSON.stringify(pages)) break; pages = again.pages; }
    res[kind] = { pdf: pdfPath, pages: n, toc: pages, missing: toc.filter((t) => !pages[t.id]).map((t) => t.id) };
  }
  return res;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(buildPrint(process.argv[2] || join(ROOT, "site")), null, 1));
