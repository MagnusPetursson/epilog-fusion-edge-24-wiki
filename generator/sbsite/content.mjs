// Epilog Fusion Edge 24 — teaching content for the ShopBot-sibling site, handbook and full wiki.
// One source of truth: every page, PDF and 3D caption draws from here. Citations are [n] into SOURCES;
// every machine-specific statement has a claim in CLAIMS (sources/claims.mjs) with a locator; scripts/check-claims-sb.py
// finds the claim's verbatim quote in an archived copy of its source (neither is redistributed here).
// Local facts for Fab Lab Saga's machine cite the lab's own configuration (source 18, not listed to readers).

export const MACHINE = { name: "Epilog Fusion Edge", model: "24", lab: "Fab Lab Saga · University of Iceland", foot: "Epilog Fusion Edge 24 · Fab Lab Saga, University of Iceland" };

// [n, label, url, short tag]
export const SOURCES = [
  [1, "Epilog Laser — Fusion Edge product page and specifications (accessed 19 Oct 2026)", "https://www.epiloglaser.com/laser-machines/fusion-edge-laser-cutter-engraver/", "PP"],
  [2, "Epilog — Fusion Edge & Maker manual, Model 17000, August 2025 (machines bought after 1 Apr 2025)", "https://support.epiloglaser.com/assets/downloads/manuals/17000-series_manual.pdf", "M25"],
  [3, "Epilog — Fusion Series manual (Pro, Edge, Maker), May 2025 legacy edition (machines bought before 1 Apr 2025)", "https://support.epiloglaser.com/assets/downloads/manuals/fusion-series_manual.pdf", "L25"],
  [4, "Epilog — Fusion Edge 12/24 manual, Model 17000, April 2021", "https://www.epiloglaser.com/assets/downloads/manuals/fusionedge-manual-web.pdf", "E21"],
  [5, "Epilog Support KA-01237 — Reducing Fire Hazards with your Laser", "https://support.epiloglaser.com/laser-machine/fusion-pro/usage-and-operation/faq/reducing-fire-hazards-with-your-laser/", "KA-01237"],
  [6, "Epilog Support KA-01212 — Material Safety and your Laser", "https://support.epiloglaser.com/laser-machine/fusion-pro/usage-and-operation/faq/material-safety-and-your-laser/", "KA-01212"],
  [7, "Epilog FAQ — What materials are unsafe to engrave and/or cut with the laser?", "https://www.epiloglaser.com/how-it-works/faq/laser-machine-unsafe-materials/", "FAQ-unsafe"],
  [8, "Epilog FAQ — Can you cut or engrave polycarbonate with a laser machine?", "https://www.epiloglaser.com/how-it-works/faq/can-you-cut-engrave-polycarbonate-with-laser-machine/", "FAQ-PC"],
  [9, "Epilog Support KA-01508 — Material Compatibility for CO2 and Fiber Laser Engravers", "https://support.epiloglaser.com/laser-machine/fusion-pro/usage-and-operation/faq/material-compatibility-for-co2-and-fiber-laser-engravers/", "KA-01508"],
  [10, "Epilog Support — Control Panel Tour, Fusion Pro, Edge, Maker & Galvo", "https://support.epiloglaser.com/laser-machine/fusion-pro/getting-started/control-panel-tour/", "CPT"],
  [11, "Epilog Support KA-01555 — Cleaning Procedures, Fusion Maker, Edge and Pro", "https://support.epiloglaser.com/laser-machine/fusion-pro/service-and-repair/cleaning/cleaning-procedures-fusion-maker-edge-and-pro/", "KA-01555"],
  [12, "Epilog Support KA-01672 — Optics Cleaning, Fusion Maker, Edge, Pro", "https://support.epiloglaser.com/laser-machine/fusion-pro/service-and-repair/cleaning/optics-cleaning-fusion-maker-edge-pro/", "KA-01672"],
  [13, "Epilog Support KA-01583 — Engraver Table Weight Limits", "https://support.epiloglaser.com/laser-machine/fusion-pro/usage-and-operation/system-requirements-setup/engraver-table-weight-limits/", "KA-01583"],
  [14, "Epilog Support KA-01684 — Autofocus Calibration Wizard (Fusion Edge)", "https://support.epiloglaser.com/laser-machine/fusion-edge/calibrations/autofocus-calibration-wizard/", "KA-01684"],
  [15, "Epilog Support KA-01544 — Focus Calibrations, Fusion Maker, Edge and Pro", "https://support.epiloglaser.com/laser-machine/fusion-edge/maintenance-cleaning-calibrations/focus-calibrations-fusion-maker-edge-and-pro/", "KA-01544"],
  [16, "Epilog Support KA-01619 — Lens Removal and Installation (Fusion Edge)", "https://support.epiloglaser.com/laser-machine/fusion-edge/system-requirements-setup/lens-removal-and-installation/", "KA-01619"],
  [17, "Epilog Laser — official Fusion Edge 12/24/36 family product photograph (Edge 24: left foreground)", "https://www.epiloglaser.com/assets/img/yootheme/cache/6c/fusion-edge-12-24-36-group-6c31c2a7.webp", "Photo"],
];
export const SRC = Object.fromEntries(SOURCES.map(([n, , , tag]) => [tag, n]));

// claim id → { s: source n, loc: locator, t: what we say }
// loc for manuals is the PRINTED page number ("p. 30"); the checker confirms the quote is on that printed page.
import { CLAIMS } from "../../sources/claims.mjs";
export { CLAIMS };

const cite = (...ids) => {
  const ns = [...new Set(ids.map((id) => { if (!CLAIMS[id]) throw Error("unknown claim " + id); return CLAIMS[id].s; })).values()].filter(n => SOURCES.some(s => s[0] === n)).sort((a, b) => a - b);
  return ns.length ? `<span class="sb-cite">[${ns.join(",")}]</span>` : "";
};
export const C = cite;

// ------------------------------------------------------------------------ pages
export const PAGES = [
  { file: "rules.html", nav: "Rules", title: "Safety rules", sub: "Ten rules, how to stop and how to start a job. Read them before the induction." },
  { file: "machine.html", nav: "The machine", title: "The machine", sub: "Beam path, motion system, table and extraction. The 3D model shows each part and stages nine faults." },
  { file: "run.html", nav: "Run a job", title: "Run a job", sub: "Twelve steps from your file to a finished part, with what you should see at each one." },
  { file: "focus.html", nav: "Focus", title: "Focus, the red dot and home", sub: "Thickness focus, the red-dot pointer and the home position. Wrong focus is the most common cause of a bad result." },
  { file: "preflight.html", nav: "Pre-flight", title: "Pre-flight checklist", sub: "A one-page checklist for every job, kept at the machine." },
  { file: "trouble.html", nav: "Troubleshooting", title: "Troubleshooting", sub: "Symptoms, causes and actions for ten faults. Pause the job before you diagnose." },
  { file: "materials.html", nav: "Materials", title: "Materials and settings", sub: "Identify the material first, then start from Epilog’s 80 W settings and adjust from the result." },
  { file: "maintain.html", nav: "Maintenance", title: "Maintenance and reference", sub: "The published schedule, who does what, the numbers, the sources." },
  { file: "quiz.html", nav: "Self-check", title: "Self-check", sub: "Twelve questions. Passing is part of the sign-off." },
];
PAGES.forEach((p, i) => { p.n = String(i + 1).padStart(2, "0"); });

// ------------------------------------------------------------------------ 01 rules
export const RULES = [
  ["Trained and signed off.", `You run the laser only after the induction and this self-check. Students and staff operate it; cleaning, supervision, service and release are staff work.${C("roles")}`],
  ["Never leave it running.", `Stay at the machine and watch the whole job. A camera, a timer or someone passing by does not count. Vector cutting is the most likely to start a fire, acrylic especially.${C("attended", "attended-kb", "vector-fire", "acrylic-fire")}`],
  ["Identify the material.", `If you can’t name the material, it doesn’t go in. PVC and vinyl never: they release a corrosive gas that destroys the machine and harms you. Kydex contains PVC. If in doubt, read its safety data sheet or ask staff.${C("pvc", "corrosion", "hcl", "kydex", "sds")}`],
  ["Measure, then enter the thickness.", `Use calipers. Enter the thickness for every process. Left blank, autofocus focuses on the top of the grid instead of your material.${C("calipers", "thickness-mode", "thickness-grid", "thickness-local")}`],
  ["Extraction on, always.", `Never run without working extraction. At Saga it runs all the time; if you smell smoke at the lid, or smoke hangs in the cabinet, pause and tell staff.${C("unvented", "exhaust-leaks", "extraction-on")}`],
  ["Lid shut while it runs.", `The lid stops the beam, not the head. Pause with Go/Stop and wait for the head to stop before you lift it.${C("interlock", "lid-motion", "pause-node")}`],
  ["Flame: pause, step back, call.", `Flicker is normal; flame that grows is not. Press Go/Stop, keep the lid shut and your hands out, and get staff.${C("familiar-flare", "pause-node", "fire-staff")}`],
  ["Leave the bed clean.", `Offcuts that fall through the grid are fuel. Take out your parts and scraps; tell staff if the tray needs emptying.${C("debris-fire", "debris-clean")}`],
  ["Hands off the optics and panels.", `Never run with a cover off or the enclosure changed. Lens, mirrors and panels are staff work, with approved cleaner only.${C("no-unvented-enclosure", "access-panels", "optics-solution", "roles")}`],
  ["Check the load limit.", `27.2 kg at most while the table moves (autofocus moves it), 40.8 kg resting. Heavy or awkward work is staff work.${C("load-decision", "table-load")}`],
];

export const STOPS = [
  { kind: "ok", tag: "Routine · the job can resume", title: "Go/Stop", icon: "play",
    text: `The round button by the display. The beam shuts off at once. The head pauses at the end of the raster line, or at the next node of a vector path, so it may keep moving for a moment. Then you may lift the lid and look. Lid down and Go/Stop again resumes where it left off. It lines up only if nothing moved.${C("pause-node", "pause-delay", "registration")}` },
  { kind: "bad", tag: "Something is wrong · don’t resume", title: "Flame, smoke, a smell", icon: "alarm",
    text: `Press Go/Stop, keep the lid shut, don’t reach in, step back and get staff. Lifting the lid stops the beam but not the head.${C("lid-motion", "fire-staff")}` },
];

export const START = [
  { title: "Turn it on", text: `Turn the machine on and wait until the boot cycle is complete. Check that air assist is on.` },
  { title: "Print to the laser", text: `In the Epilog software: Auto Focus = Thickness, thickness entered for every process.` },
  { title: "Select your job", text: `Job Menu on the panel; your file name highlighted in blue.` },
  { title: "Trace", text: `Red dot on, Trace: the head outlines the job. Check that it lands on the sheet.` },
  { title: "Lid down, look", text: `Nothing loose on the bed, you in place for the whole job.`, hot: true },
  { title: "Go/Stop", text: `The table rises to focus, then the job runs. Watch every second.` },
];

// ------------------------------------------------------------------------ 02 machine
export const SPEC = [
  ["Work area", "610 × 610 mm"], ["Laser", "80 W CO₂, 10.6 µm, air-cooled"], ["Lens", "50.8 mm focal length"],
  ["Max thickness", "254 mm"], ["Table load", "27.2 kg moving · 40.8 kg resting"], ["Machine", "1055 × 834 × 967 mm · 102 kg"], ["Extraction", "595–680 m³/h, one 102 mm port"],
];

export const MECH = [
  ["cabinet", `A closed sheet-metal cabinet on a built-in pedestal with four wheels. It fully encloses the laser and its beam path; two interlocks switch the beam off when the lid opens. The access panels are <b>not</b> interlocked, so they stay on.${C("pedestal", "enclosure-closed", "interlock", "access-panels", "no-move")}`],
  ["source", `An air-cooled CO₂ tube in the rear bay. Saga’s unit is 80 W. Its light is 10.6 µm: infrared, invisible, and it doesn’t pass through the window.${C("source-80w", "source-80w-instr", "air-cooled")}`],
  ["beam path", `Four mirrors and one window optic carry the beam forward, across the X-beam and down into the head. The last mirror turns it down through the lens. Dirty optics lose power and get damaged.${C("optics-count", "optics-contam")}`],
  ["head", `The lens focuses the beam to a small spot a fixed distance below the cone. Saga’s machine has the standard 50.8 mm lens. Cone air assist blows through the head whenever a job runs, keeping the lens clean and flames down.${C("lens-standard", "lens-instr", "air-cone", "air-cone-on")}`],
  ["motion", `Brushless DC servo motors with encoders move the X-beam (Y) and the head along it (X), on Kevlar belts. The table moves in Z: it rises until your material’s surface sits at focus.${C("motion-system", "thickness-mode")}`],
  ["red dot", `A visible red laser runs in line with the invisible CO₂ beam. It shows where the head is, and Trace uses it to outline your job.${C("red-dot", "trace")}`],
  ["table", `The vector grid holds your sheet above the tray so the beam passes through without reflecting back. Cut-outs fall into the tray, where they become fuel.${C("vector-table", "debris-fire")}`],
  ["extraction", `The fan pulls air from front to back, through the rear plenum and out of one 102 mm port. Epilog asks for 595–680 m³/h of extraction. At Saga it runs all the time.${C("exhaust-plenum", "exhaust-port", "exhaust-flow", "extraction-on")}`],
  ["control panel", `On the right shoulder: a 178 mm touch display, a joystick and Go/Stop. The ring around Go/Stop shows status; red means a drive has failed.${C("panel-parts", "display-7in", "ring-colours", "ring-red")}`],
];

// ------------------------------------------------------------------------ 03 run a job: phases of steps [title, what you do / see, panel or software word, hot]
export const STEPS = [
  ["At the computer", [
    ["Design and check the file", "Cut lines as vectors, engraving as filled areas or images. Know the material and its thickness before you start.", "vector | raster", false],
    ["Measure the sheet", `Calipers, in two or three places. Use the thickest reading.${C("calipers")}`, "calipers", false],
    ["Print to the laser", `Epilog software: Auto Focus = Thickness. Split into processes (engrave, then cut) and enter the thickness in <b>every</b> process.${C("af-dashboard", "thickness-mode")}`, "Auto Focus: Thickness", true],
    ["Set speed and power", "Start from the settings in Materials, or from the lab’s saved settings for that material.", "speed | power | freq.", false],
  ]],
  ["At the machine", [
    ["Turn it on", `Turn the machine on and wait until the boot cycle is complete and the ring around Go/Stop shows idle (light blue to green). Check that air assist is on. Grid clear of offcuts, nothing on the rails.${C("ring-colours", "startup")}`, "Idle", false],
    ["Place the sheet", `Flat on the grid, inside 610 × 610 mm. Home is the upper-left (back-left) corner; job positions count from there.${C("home-corner", "work-area")}`, "home: back left", false],
    ["Select the job", `Job Menu: tap your file. It turns blue.${C("job-menu")}`, "Job Menu", false],
    ["Trace", `Red dot on, then Trace. The head outlines the whole job. Make sure it stays on the sheet and clear of clips.${C("trace", "red-dot")}`, "Pointer | Trace", false],
    ["Close the lid", `The interlock blocks firing while it is open.${C("interlock")}`, "lid", false],
  ]],
  ["Running and after", [
    ["Start and watch", `The table rises to focus, then the job runs. Watch every second, closest during cuts.${C("attended", "vector-fire")}`, "Go/Stop", true],
    ["Clear smoke, open lid", `When the head parks, give the extraction a moment to clear the smoke. Then lift the lid.${C("status", "extraction-on")}`, "Parking → Idle", false],
    ["Clear the bed", `Your part and your scraps. Look under the grid for anything still glowing.${C("debris-fire")}`, "tray", false],
  ]],
];

// ------------------------------------------------------------------------ 04 focus: trio
export const FOCUS_TRIO = [
  { title: "Focus by thickness", tag: "Saga method",
    text: `In the software, Auto Focus = Thickness; enter the measured thickness in every process. When the job starts, the table rises so your surface sits at the focal point. Leave it blank and the machine focuses on the top of the grid: your sheet is then too close by its own thickness.${C("thickness-mode", "thickness-grid", "thickness-local")}` },
  { title: "The red dot and Trace", tag: "placement",
    text: `The red dot is a visible laser in line with the invisible beam. With it on, Trace outlines the selected job over and over until you press Trace again. Use it to check placement before every job.${C("red-dot", "trace")}` },
  { title: "Home and Reset", tag: "home position",
    text: `The head parks at its home position (back left) after a job. Reset sends it home from wherever it is. The status line shows Parking while it travels.${C("reset", "status")}` },
];
export const FOCUS_NOTES = [
  `<b>Plunger and gauge.</b> The machine also has a focus plunger and a manual focus gauge. Saga teaches thickness focus only. Never plunger-focus on the bare grid, and a gauge left down will crash into the work.${C("plunger-warning", "gauge-up", "thickness-local")}`,
  `<b>Thick acrylic.</b> For 6 mm and thicker, Epilog suggests moving focus about 2 mm closer to the lens for a cleaner edge. Only staff make this change.${C("acrylic-focus-note")}`,
  `<b>Calibration.</b> Focus and autofocus calibration have their own wizards on the panel. They belong to staff.${C("af-wizard", "roles")}`,
];

// ------------------------------------------------------------------------ 05 preflight
export const PREFLIGHT = [
  ["Before you load", [
    "Signed off; staying at the machine for the whole job",
    "Material identified: name it, or read its safety data sheet. No PVC, no vinyl, no Kydex",
    "Thickness measured with calipers",
    "Heavy work is under 27.2 kg; otherwise ask staff",
    "Bed and tray clear of offcuts; nothing on the rails",
  ]],
  ["At the panel", [
    "Machine on, boot cycle complete: ring light blue to green",
    "Air assist on",
    "Job printed with Auto Focus = Thickness and the thickness in every process",
    "Job selected in the Job Menu (blue)",
    "Red dot on, Trace run: the outline stays on the sheet",
  ]],
  ["Running", [
    "Lid closed before Go/Stop",
    "You watch every second, closest during vector cuts",
    "Flame that grows: Go/Stop, step back, alert staff",
    "Go/Stop and wait for the head to stop before lifting the lid",
  ]],
  ["After", [
    "Smoke cleared before you open",
    "Part and scraps out; nothing glowing under the grid",
    "Anything odd written in the log and told to staff",
  ]],
];

// ------------------------------------------------------------------------ 06 trouble: symptoms and faults
// fault: [id, 3D key|null, title, see, why, do, claims]
export const FAULTS = [
  ["F01", "flare", "Flame during a vector cut", "Flame grows at the cut instead of a brief flicker.", "Vector cutting puts the most heat into one place. Acrylic and wood flare up most; air assist reduces it but doesn’t prevent it.", "Go/Stop. Don’t lift the lid to look and don’t reach in. Step back and get staff. Don’t resume.", ["vector-fire", "acrylic-fire", "air-assist-vector", "familiar-flare"]],
  ["F02", "focus", "No thickness entered", "A wide, fuzzy mark; cuts don’t go through.", "With the thickness blank, autofocus focuses on the top of the grid, so the surface sits above focus by the sheet’s thickness.", "Go/Stop. Measure with calipers, enter the thickness in every process, print again. More power doesn’t fix focus.", ["thickness-grid", "thickness-mode", "calipers"]],
  ["F03", "lid", "Lid opened mid-job", "The beam stopped but the head kept moving; rows are missing.", "The interlock stops the beam, not the motion.", "Close the lid. Rows done with it open are lost. Next time: Go/Stop, wait for the head, then lift.", ["lid-motion", "interlock", "pause-node"]],
  ["F04", "smoke", "Smoke lingers", "Smoke hangs round the head, or you smell it at the lid or in the room.", "Blocked plenum or filter, a leaking hose, or an extraction fault. The fan can still sound normal.", "Go/Stop, keep the lid shut while it clears and tell staff. Don’t run again until staff have checked the whole path.", ["unvented", "exhaust-leaks", "fume-harm", "exhaust-plenum"]],
  ["F05", "moved", "Second pass misses the first", "Engraving and cut, or two passes, don’t line up.", "The sheet moved while the lid was up. The machine works in its own coordinates and can’t know.", "Don’t move the work during a pause. If it moved, stop the job and set it up again with staff.", ["registration"]],
  ["F06", "debris", "Offcuts in the tray", "Small pieces under the grid; a glow or smell after a cut.", "Cut-outs that fall through are dry fuel right under the beam.", "Take your scraps out. If the tray is full or anything glows, tell staff; they empty it.", ["debris-fire", "debris-clean"]],
  ["F07", "optics", "Weaker mark than before", "Same settings, lighter engraving or cuts that no longer go through.", "Dirty or damaged optics lose power. Focus or settings can also be wrong.", "Check thickness and settings first. Then tell staff: optics are staff work, approved cleaner only.", ["optics-contam", "optics-solution", "roles"]],
  ["F08", "drive", "Red ring on Go/Stop", "The head stops dead and the ring turns red.", "A drive has failed.", "Leave it. Note what happened and call staff; they contact Epilog support.", ["ring-red", "ring-colours"]],
  ["F09", "pvc", "Unknown plastic", "A sheet with no label: acrylic, polycarbonate, PVC?", "PVC releases hydrogen chloride, which corrodes the machine and harms you. Polycarbonate cuts badly and discolours.", "Don’t put it in. Identify it from the label or the safety data sheet, or ask staff.", ["pvc", "corrosion", "hcl", "polycarbonate", "sds"]],
  ["F10", null, "Job not in the list", "Your file doesn’t appear in the Job Menu.", "The print didn’t reach the machine, or went to a different laser.", "Check the printer chosen in the software and print again. Network trouble is staff work.", ["job-menu"]],
];
export const SYMPTOMS = [
  ["Flames bigger than a flicker", "F01"], ["Fuzzy, wide mark or the cut doesn’t go through", "F02 · F07"], ["Head moved with the lid up; rows missing", "F03"],
  ["Smoke stays in the cabinet, or you can smell it", "F04"], ["Two passes don’t line up", "F05"], ["Glow or scraps under the grid", "F06"],
  ["Lighter than last time, same settings", "F07"], ["Ring red, head stopped", "F08"], ["Plastic with no label", "F09"], ["Your job isn’t in the Job Menu", "F10"],
];
export const CALL_STAFF = ["Flame that grows, or any fire", "Smoke or smell outside the cabinet", "A red ring", "Anything you can’t identify: material, noise, smell", "Optics, panels, the tray, calibration: always staff"];

// ------------------------------------------------------------------------ 07 materials
export const MAT_YES = ["Wood, plywood, MDF, veneer", "Acrylic (cast or extruded)", "Paper, card, mat board", "Leather", "Cork, rubber", "Fabric, felt", "Glass, stone, tile (engrave only)", "Anodised aluminium (engrave only)"];
export const MAT_NO = ["PVC and vinyl, in any form", "Kydex and other PVC blends", "Neoprene / chloroprene (hydrogen chloride when heated)", "Anything you can’t identify", "Bare metal for cutting"];
export const MAT_ASK = ["Polycarbonate (cuts poorly, discolours)", "Coated or painted sheet", "Composites, foams, unknown plastics", "Anything over 27.2 kg"];
// Epilog's suggested settings, Fusion Edge CO2, 80 W column (L25 pp. 273–274). s = speed %, p = power %, f = frequency.
export const SETTINGS = [
  ["Acrylic", "Engrave text/clipart", "300 DPI", "100 s · 50 p"],
  ["Acrylic", "Engrave text/clipart", "500 DPI", "100 s · 40 p"],
  ["Acrylic", "Cut 3 mm", "100 f", "30 s · 100 p"],
  ["Acrylic", "Cut 6 mm", "100 f", "10 s · 100 p"],
  ["Wood", "Engrave text/clipart", "500 DPI", "80 s · 100 p"],
  ["Wood", "Thin veneer, cut", "10 f", "50 s · 40 p"],
  ["Wood", "Cut 3 mm", "10 f", "30 s · 100 p"],
  ["Wood", "Cut 6 mm", "10 f", "12 s · 100 p †"],
  ["Cork", "Engrave", "500 DPI", "100 s · 20 p"],
  ["Anodised aluminium", "Engrave text", "500 DPI", "100 s · 30 p"],
];

// ------------------------------------------------------------------------ 08 maintenance
export const MAINT = [
  ["Every job (you)", ["Take out your parts and scraps", "Look under the grid for anything glowing", "Report smells, weak marks, noises", "Leave the bed clear"]],
  ["Weekly (staff)", [`Clean the optics, approved cleaner only${C("pm-weekly", "optics-solution")}`, `Clean under the cutting table${C("pm-weekly")}`, `Clean the Y guide rails${C("pm-weekly")}`, `Wipe the interior${C("pm-weekly")}`]],
  ["6 months (staff)", [`Remove and clean the exhaust plenum${C("pm-6m")}`, `Exhaust unit service${C("pm-6m")}`, `Fans and tube heat sinks clear${C("heat-sinks")}`]],
  ["12 months", [`Technician: full preventive service${C("pm-12m")}`]],
];

// ------------------------------------------------------------------------ 09 quiz [question, answer-html]
export const QUIZ = [
  ["Your 6 mm plywood cut leaves a wide, fuzzy line and doesn’t go through. The settings are the lab’s usual ones. What is the most likely cause, and what do you do?", `No thickness entered: it focused on the top of the grid, 6 mm below your surface. Go/Stop, measure, enter the thickness in every process, print again. See <a href="trouble.html#F02">F02</a>.`],
  ["During a vector cut the flame grows beyond a flicker. What do you do, in order?", `Go/Stop. Don’t lift the lid, don’t reach in. Step back and get staff. Don’t resume. <a href="rules.html#stops">How to stop</a>, <a href="trouble.html#F01">F01</a>.`],
  ["You want to check an engraving mid-job. Why must you press Go/Stop before lifting the lid?", `The lid stops the beam, not the head. Rows done with the lid up are lost, and the moving head is within reach. <a href="trouble.html#F03">F03</a>.`],
  ["You paused, lifted the lid and nudged the sheet. What happens if you resume?", `It carries on in machine coordinates, so the rest lands offset. It only lines up if nothing moved. <a href="trouble.html#F05">F05</a>.`],
  ["A friend gives you a grey plastic sheet with no label. What can you do with it?", `Nothing until it’s identified (label or safety data sheet). If it is PVC, vinyl or Kydex, it never goes in. <a href="materials.html">Materials</a>, <a href="trouble.html#F09">F09</a>.`],
  ["Why is PVC banned? Give two reasons.", `Heated, it releases hydrogen chloride: a corrosive gas that destroys the machine (and voids the warranty) and is harmful to breathe. <a href="materials.html">Materials</a>.`],
  ["Where does the red dot land compared with the CO₂ beam, and what does Trace do?", `In line with it. Trace outlines the selected job with the red dot, repeatedly, so you can check placement. <a href="focus.html">Focus</a>.`],
  ["The ring around Go/Stop turns red and the head stops. What do you do?", `A drive has failed. Leave it, note what happened, call staff. <a href="trouble.html#F08">F08</a>.`],
  ["Smoke hangs in the cabinet after a cut and you can smell it at the lid. What do you do?", `Go/Stop, keep the lid shut while it clears, tell staff. Don’t run again until they have checked the extraction path. <a href="trouble.html#F04">F04</a>.`],
  ["What is the most you may put on the table for a job that uses autofocus, and why that figure?", `27.2 kg: autofocus moves the table, and the lifting limit applies. 40.8 kg is only for resting. <a href="rules.html">Rule 10</a>.`],
  ["After the job, what do you check before you leave?", `Part and scraps out, nothing glowing under the grid, bed clear, anything odd reported. <a href="preflight.html">Pre-flight</a>.`],
  ["A cut looks weaker than last week with the same settings and the right thickness. Who cleans the lens, and with what?", `Staff, with approved optics cleaner. Never isopropyl or hardware acetone. <a href="trouble.html#F07">F07</a>, <a href="maintain.html">Maintenance</a>.`],
];

