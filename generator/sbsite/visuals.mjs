// Schematic SVG visuals for the Epilog teaching site, in the ShopBot site's drawing language:
// hairline technical drawing, numbered callouts explained by an HTML caption list, colour only for meaning
// (red = danger, green = OK). Shapes are schematic; proportions follow the 3D model where they show the machine.
const S = (w, h, inner, cls = "", label = "") => `<svg class="sb-vis ${cls}" viewBox="0 0 ${w} ${h}" role="img"${label ? ` aria-label="${label}"` : ""} xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const T = (x, y, t, o = "") => `<text x="${x}" y="${y}" ${o}>${t}</text>`;
const L = (x1, y1, x2, y2, o = "") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${o}/>`;
const R = (x, y, w, h, o = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${o}/>`;
const C = (cx, cy, r, o = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" ${o}/>`;
const P = (d, o = "") => `<path d="${d}" ${o}/>`;
const co = (n, bx, by, px, py) => `${px != null ? `${L(bx, by, px, py, 'class="sb-leader"')}${C(px, py, 2.4, 'class="sb-leader-dot"')}` : ""}<g class="sb-co">${C(bx, by, 14)}${T(bx, by + 5.4, n, 'text-anchor="middle"')}</g>`;
const lbl = (x, y, t, o = "") => T(x, y, t, /class=/.test(o) ? o : `class="sb-vis-label" ${o}`);

export const fig = (svg, items = [], { id = "", cls = "", title = "", lead = "" } = {}) => `<figure class="sb-fig ${cls}"${id ? ` id="${id}"` : ""}>${title ? `<div class="sb-fig-t">${title}</div>` : ""}${lead ? `<p class="sb-fig-lead">${lead}</p>` : ""}<div class="sb-fig-art">${svg}</div>${items.length ? `<ol class="sb-callouts">${items.map((t, i) => `<li><span class="sb-callout-n">${i + 1}</span><span>${t}</span></li>`).join("")}</ol>` : ""}</figure>`;

export const ICONS = {
  stop: `<svg viewBox="0 0 24 24"><path d="M7.5 2h9L22 7.5v9L16.5 22h-9L2 16.5v-9z" fill="var(--anatomy-red)"/><rect x="8" y="8" width="8" height="8" fill="#fff"/></svg>`,
  play: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="var(--anatomy-green)"/><path d="M9.5 7l7.5 5-7.5 5z" fill="#0b0b0b"/></svg>`,
  alarm: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="var(--anatomy-red)"/><path d="M12 6v7M12 16v2" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`,
};
export const icon = (n, cls = "") => `<span class="sb-icon ${cls}" aria-hidden="true">${ICONS[n] || ""}</span>`;

// ---------- the control panel from above: portrait display, joystick, Go/Stop with its status ring
export const panel = (ring = "var(--anatomy-green)") => S(320, 166, `
${R(8, 8, 304, 150, 'rx="10" fill="var(--anatomy-shade-1)" stroke="var(--anatomy-muted)" stroke-width="1"')}
${R(30, 18, 76, 108, 'rx="4" fill="var(--anatomy-shade-3)" stroke="var(--anatomy-text)" stroke-width="1"')}${R(36, 24, 64, 13, 'fill="#1d5f8c"')}${[0, 1, 2].map((i) => R(38, 44 + i * 16, 60, 11, `fill="${i ? "var(--anatomy-shade-1)" : "#cfe3f1"}"`)).join("")}${[0, 1, 2, 3, 4].map((i) => C(40 + i * 14, 112, 4.5, 'fill="#1d5f8c"')).join("")}
${C(160, 70, 20, 'fill="var(--anatomy-shade-3)" stroke="var(--anatomy-muted)" stroke-width="1"')}${C(160, 70, 7, 'fill="var(--anatomy-strong)"')}
${C(250, 70, 31, `fill="none" stroke="${ring}" stroke-width="6"`)}${C(250, 70, 24, 'fill="#151515"')}${P("M240 60l12 10-12 10z", 'fill="#fff"')}${R(255, 60, 4, 20, 'fill="#fff"')}${R(262, 60, 4, 20, 'fill="#fff"')}
${lbl(68, 146, "DISPLAY", 'text-anchor="middle" class="sb-vis-label sb-caps"')}${lbl(160, 122, "JOYSTICK", 'text-anchor="middle" class="sb-vis-label sb-caps"')}${lbl(250, 122, "GO/STOP", 'text-anchor="middle" class="sb-vis-label sb-caps"')}${lbl(250, 140, "status ring", 'text-anchor="middle" class="sb-vis-label sb-small sb-muted"')}
`, "sb-pendant", "Control panel: display, joystick and Go/Stop with its status ring");

// ---------- flame in the cabinet: no E-stop; pause, step back, call
export const flame = () => S(320, 166, `
${R(8, 8, 304, 150, 'rx="10" fill="var(--anatomy-shade-1)" stroke="var(--anatomy-muted)" stroke-width="1"')}
${R(30, 40, 170, 84, 'fill="none" stroke="var(--anatomy-text)" stroke-width="1.2"')}${L(30, 104, 200, 104, 'stroke="var(--anatomy-muted)" stroke-dasharray="3 3"')}${R(60, 100, 110, 6, 'fill="#c7a074"')}
${R(108, 46, 18, 26, 'fill="var(--anatomy-shade-3)" stroke="var(--anatomy-text)" stroke-width="1"')}${P("M112 72h10l-5 10z", 'fill="var(--anatomy-shade-3)" stroke="var(--anatomy-text)" stroke-width="1"')}
${P("M117 100c-14-10-6-20 0-30 3 9 13 12 9 24 -2 6 -6 7 -9 6z", 'fill="#f29a2e"')}${P("M118 100c-6-6-2-11 1-16 2 6 6 8 3 14z", 'fill="#ffe08a"')}
${C(250, 70, 31, 'fill="none" stroke="var(--anatomy-green)" stroke-width="6"')}${C(250, 70, 24, 'fill="#151515"')}${P("M240 60l12 10-12 10z", 'fill="#fff"')}${R(255, 60, 4, 20, 'fill="#fff"')}${R(262, 60, 4, 20, 'fill="#fff"')}
${lbl(115, 30, "LID SHUT · HANDS OUT", 'text-anchor="middle" class="sb-vis-label sb-caps"')}${lbl(250, 122, "GO/STOP", 'text-anchor="middle" class="sb-vis-label sb-caps"')}${lbl(250, 140, "then step back, call", 'text-anchor="middle" class="sb-vis-label sb-small sb-muted"')}
`, "sb-keys", "Flame at the cut: Go/Stop, keep hands out, step back and call staff");

// ---------- focus, in section: lens cone, beam waist, sheet. ok = thickness entered; bad = blank (focus on the grid)
export const focusPair = () => {
  const one = (x0, ok) => {
    const cx = x0 + 110, waist = 150, sheetTop = ok ? 150 : 128, gridTop = ok ? 156 : 134;
    return `${P(`M${cx - 26} 30h52l-14 64h-24z`, 'fill="var(--anatomy-shade-3)" stroke="var(--anatomy-text)" stroke-width="1.2"')}
${P(`M${cx - 12} 94L${cx} ${waist}L${cx + 12} 94z`, 'fill="var(--anatomy-red)" opacity=".28"')}${P(`M${cx} ${waist}L${cx - 9} ${waist + 40}M${cx} ${waist}L${cx + 9} ${waist + 40}`, 'stroke="var(--anatomy-red)" stroke-width="1" opacity=".5"')}
${L(cx - 70, waist, cx + 70, waist, 'stroke="var(--anatomy-red)" stroke-width="1.6" stroke-dasharray="5 3"')}
${R(x0 + 20, sheetTop, 180, 22, 'fill="#c7a074" stroke="#8a6a44" stroke-width="1"')}${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => R(x0 + 22 + i * 21, gridTop + 16, 6, 30, 'fill="var(--anatomy-shade-3)"')).join("")}
${L(x0 + 20, sheetTop, x0 + 200, sheetTop, `stroke="${ok ? "var(--anatomy-green)" : "var(--anatomy-green)"}" stroke-width="2"`)}
${ok ? "" : `${L(cx + 84, sheetTop, cx + 84, waist, 'stroke="#e8b923" stroke-width="1.4"')}${L(cx + 78, sheetTop, cx + 90, sheetTop, 'stroke="#e8b923" stroke-width="1.4"')}${L(cx + 78, waist, cx + 90, waist, 'stroke="#e8b923" stroke-width="1.4"')}${lbl(cx + 96, (sheetTop + waist) / 2 + 5, "6 mm")}`}
${lbl(cx, 222, ok ? "Thickness entered" : "Thickness blank", 'text-anchor="middle" class="sb-vis-label sb-caps"')}${lbl(cx, 240, ok ? "surface on focus" : "focus on the grid top", 'text-anchor="middle" class="sb-vis-label sb-small sb-muted"')}`;
  };
  return S(500, 250, `${one(10, true)}${L(250, 20, 250, 240, 'stroke="var(--anatomy-faint)"')}${one(270, false)}${co(1, 40, 60, 110, 70)}${co(2, 40, 120, 52, 150)}${co(3, 470, 110, 448, 128)}`, "sb-focus", "Focus in section: with the thickness entered the surface sits at the focal point; with it blank, the focus lands on the grid top and the sheet stands above it");
};

// ---------- the ring around Go/Stop
export const ringRow = () => {
  const items = [["#f2f2f2", "White", "booting"], ["#8e5cc7", "Purple", "loading"], ["url(#rb)", "Multi", "homing"], ["#3fb7d9", "Blue ↔ green", "idle, ready"], ["var(--anatomy-green)", "Green", "running, tracing"], ["var(--anatomy-red)", "Red", "a drive failed"]];
  return S(600, 120, `<defs><linearGradient id="rb"><stop offset="0" stop-color="#e44"/><stop offset=".5" stop-color="#4c4"/><stop offset="1" stop-color="#48f"/></linearGradient></defs>${items.map(([c, n, s], i) => { const x = 50 + i * 100; return `${C(x, 40, 22, `fill="none" stroke="${c}" stroke-width="6"`)}${C(x, 40, 16, 'fill="#151515"')}${lbl(x, 88, n, 'text-anchor="middle" class="sb-vis-label sb-small"')}${lbl(x, 106, s, 'text-anchor="middle" class="sb-vis-label sb-small sb-muted"')}`; }).join("")}`, "sb-ring", "Go/Stop ring colours: white booting, purple loading, multi-coloured homing, blue to green idle, green running, red drive failed");
};

// ---------- decision tree: something is wrong
export const stoppedFlow = () => `<div class="sb-tree" role="group" aria-label="Something is wrong: what to do">
<div class="sb-tree-root">Something is wrong</div>
<div class="sb-tree-branches">
<div class="sb-branch"><div class="sb-tree-q">Flame bigger than a flicker?<span>smoke you can smell</span></div><div class="sb-tree-a sb-tree-stop">Go/Stop · step back · call <a href="#F01">F01</a><span>lid shut, hands out</span></div></div>
<div class="sb-branch"><div class="sb-tree-q">Ring red?<span>head stopped dead</span></div><div class="sb-tree-a">A drive failed <a href="#F08">F08</a><span>leave it, call staff</span></div></div>
<div class="sb-branch"><div class="sb-tree-q">Bad result?<span>fuzzy, weak, offset</span></div><div class="sb-tree-a">Focus, optics, a moved sheet <a href="#F02">F02</a> · <a href="#F07">F07</a> · <a href="#F05">F05</a><span>pause first</span></div></div>
</div>
<div class="sb-tree-end"><b>Go/Stop pauses the job.</b><span class="sb-chain">Pause <i>→</i> wait for the head <i>→</i> look <i>→</i> fix the cause <i>→</i> resume only if nothing moved</span></div>
<div class="sb-tree-staff">${icon("alarm")}<span>Fire · smoke outside the cabinet · red ring · anything you can’t identify <b>→ step back and call staff</b></span></div>
</div>`;

export const flow = (steps, cls = "") => `<ol class="sb-seq ${cls}" style="--n:${steps.length}">${steps.map((s, i) => `<li class="${s.hot ? "hot" : ""}"><span class="sb-seq-n">${i + 1}</span><span class="sb-seq-t">${s.href ? `<a href="${s.href}">${s.title}</a>` : s.title}</span>${s.text ? `<span class="sb-seq-x">${s.text}</span>` : ""}</li>`).join("")}</ol>`;
export const stats = (items) => `<dl class="sb-spec">${items.map(([l, v]) => `<div><dt>${l}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
export const maintGrid = (cols, label = "Maintenance calendar") => `<div class="sb-cal" role="table" aria-label="${label}">${cols.map(([h, items], i) => `<div class="sb-cal-col" role="rowgroup"><div class="sb-cal-h" role="columnheader"><span class="sb-cal-i">${["I", "II", "III", "IV"][i] || ""}</span>${h}</div><ul>${items.map((t) => `<li role="cell">${t}</li>`).join("")}</ul></div>`).join("")}</div>`;
