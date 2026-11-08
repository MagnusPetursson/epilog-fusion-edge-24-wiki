// What the 3D viewer stages, and what the trouble page prints: the job program, the part tour and nine faults.
// Every beat must change something you can SEE (pose, motion, effect or highlight); verify-beats.py enforces it.
// Text cites claim ids from content.mjs (CLAIMS); the claim ledger maps each to a URL and locator.
import { BED, FP, STOCK, HOME } from "./model.mjs";
export { FP };

const T = STOCK.t;
export const FOCUSED = FP - T; // grid-top world Z that puts a 6 mm sheet's surface on the focal plane
export const LOW = FP - 90; // where the table waits before autofocus
const ON_SHEET = { hx: STOCK.x + 150, hy: STOCK.y + 22 }; // head 22 mm in from the sheet's front edge: seen from the front, the
// sheet's 6 mm edge is a section under the nozzle, so surface, thickness and focal point read side by side

// ------------------------------------------------------------- the demonstration job (machine time is compressed for teaching)
// lid closes → thickness autofocus raises the table → trace with the red dot → raster engrave → vector cut → park → wait → lid opens
export const JOB = {
  name: "saga-sign-6mm-ply",
  raster: { x0: 60, x1: 340, y0: 150, y1: 250, row: 4, rowTime: 0.62 }, // stock mm (y from the stock's front edge)
  circle: { cx: 200, cy: 85, r: 48, time: 7 },
  outline: { x0: 20, y0: 20, x1: 380, y1: 280, time: 13 },
  phases: [
    { id: "lid", t: 0, d: 2.5, text: "Close the lid. The interlock inhibits firing whenever it is open.", claims: ["lid-motion"] },
    { id: "focus", t: 2.5, d: 4, text: "Thickness autofocus: the table rises until the sheet’s surface sits at the lens focus. The entered thickness, measured with calipers, sets that height.", claims: ["thickness-mode"] },
    { id: "trace", t: 6.5, d: 6, text: "Trace with the red dot: the head outlines the job with the visible pointer. The CO₂ beam stays off and is invisible anyway.", claims: ["red-dot", "trace"] },
    { id: "raster", t: 12.5, d: 0, text: "Raster engraving: the head sweeps row by row and fires only where the image is filled. Row spacing is exaggerated here.", claims: ["raster-vector"] },
    { id: "vector", t: 0, d: 0, text: "Vector cutting follows the path slowly. This is where flare-ups are most likely: stay and watch, with air assist on.", claims: ["vector-fire", "air-assist-vector"] },
    { id: "park", t: 0, d: 3, text: "The job ends and the head returns home. Smoke still in the cabinet is drawn out by the always-on extraction.", claims: ["extraction-on"] },
    { id: "wait", t: 0, d: 3, text: "Wait for the smoke to clear before you open the lid.", claims: ["extraction-on"] },
    { id: "open", t: 0, d: 2.5, text: "Lift the lid and take the part out. Check for embers on the sheet and under the grid.", claims: ["debris-fire"] },
  ],
};
{ // derive the phase times
  const r = JOB.raster, rows = Math.floor((r.y1 - r.y0) / r.row) + 1;
  JOB.phases[3].d = rows * r.rowTime; JOB.rows = rows;
  JOB.phases[4].d = JOB.circle.time + JOB.outline.time;
  for (let i = 4; i < JOB.phases.length; i++) JOB.phases[i].t = JOB.phases[i - 1].t + JOB.phases[i - 1].d;
  const last = JOB.phases.at(-1); JOB.total = +(last.t + last.d).toFixed(2);
}

// fault 5: the job's circle is paused at CUT_AT of the way round, the sheet is moved MOVE (25 mm), the rest is cut in machine coords
// fractions of a turn from +x; the circle starts at the left (0.5) and runs across the front first, so the first part of the
// cut stays in view in front of the gantry; it is paused 0.55 of the way round
const ARC0 = 0.5, CUT_AT = ARC0 + 0.55, ARC1 = ARC0 + 1, MOVE = [20, -15];
const PAUSED_AT = (() => { const c = JOB.circle, a = CUT_AT * 2 * Math.PI; return { hx: STOCK.x + c.cx + c.r * Math.cos(a), hy: STOCK.y + c.cy + c.r * Math.sin(a) }; })();
// ------------------------------------------------------------- camera presets (az from +Y toward +X; el above horizon; target in mm)
// interior and top sit 120 mm higher than the original camera targets assumed; absolute targets follow
const DZ = 120;
const C = (az, el, dist, target, fov = 34) => ({ az, el, dist, target: target[2] > 0 ? [target[0], target[1], target[2] + DZ] : target, fov });
// fault 5 cameras: close over the circle (head follows it, so a high angle keeps the arc beside the nozzle visible), then plan
const MOVED_CAM = C(-8, 80, 540, [STOCK.x + JOB.circle.cx + 8, STOCK.y + JOB.circle.cy - 6, 660], 32);
const MOVED_TOP = C(0, 84, 520, [STOCK.x + JOB.circle.cx + 8, STOCK.y + JOB.circle.cy - 6, 660], 32);
// fault 6: a front section through the table, like the focus fault: straight on, just above the tray, with the tray's front wall and
// the grid frame cut away so the offcuts lie in plain view under the grid and the sheet
const TRAY_SECTION = { cam: C(0, 3, 1000, [500, 330, 618], 30), cut: true, ghost: ["table.tray.front", "table.gridframe", "table.grid.bars"], ghostLabel: "tray front, grid frame and cross bars" };
const HOT_CAM = C(0, 3, 560, [486, 366, 625], 30); // closer on the offcut that catches
// fault 7: the job engraves the artwork row by row, clean lens first; with the dirty lens it engraves the same artwork again
// WEAK_OY mm toward the front, so both results lie side by side on the sheet. One fixed camera frames both.
const WEAK_OY = -125;
const OPTICS_CAM = C(-14, 60, 900, [482, 468, 666]);
export const VIEWS = {
  whole: { label: "Whole machine", key: "0", cam: C(-32, 20, 3150, [527, 417, 520]) },
  front: { label: "Front view", cam: C(-2, 16, 3400, [527, 417, 500]) },
  head: { label: "Lens", key: "F", cam: { ...C(38, 20, 700, [0, 0, 0]), follow: "head" }, cut: true },
  bed: { label: "Cabinet interior", cam: C(-18, 52, 1900, [527, 420, 650]), cut: true },
  controls: { label: "Control panel", cam: C(-12, 50, 900, [965, 235, 975]) },
  lidopen: { label: "Lid open", cam: C(-30, 26, 3800, [527, 380, 660]), lid: true },
  rear: { label: "Rear view", cam: C(150, 18, 3200, [527, 417, 500]) },
  plan: { label: "Plan view", cam: C(0, 89, 2600, [527, 417, 600]) },
};

// ------------------------------------------------------------- part tour: component → parts (name prefixes), camera, text (claims)
export const TOUR = [
  { id: "enclosure", name: "Enclosure", parts: ["side.", "fascia", "front.rail", "rear.panel"], cam: C(-32, 20, 3100, [527, 417, 520]),
    text: "Closed panels and lid keep the invisible beam inside. Never run with covers removed or the enclosure modified.", claims: ["enclosure-closed"] },
  { id: "pedestal", name: "Built-in pedestal", parts: ["pedestal.", "plinth", "caster."], cam: C(-24, 12, 2600, [527, 300, 300]),
    text: "The machine stands on its own pedestal, on wheels. Moving it is staff work.", claims: ["pedestal", "no-move"] },
  { id: "lid", name: "Lid and window", parts: ["lid."], cam: C(-30, 34, 2400, [527, 380, 880]),
    text: "Opening the lid stops the beam firing, but the carriage keeps moving. Stop the job before you open it.", claims: ["lid-motion"] },
  { id: "controls", name: "Control panel", parts: ["controls."], cam: C(-12, 50, 900, [965, 150, 975]),
    text: "178 mm touch display, joystick and Go/Stop button. The ring around Go/Stop shows machine status; red means a drive has failed.", claims: ["panel-parts", "display-7in", "ring-colours"] },
  { id: "bridge", name: "X-beam (bridge)", parts: ["bridge.", "optics.m3"], cam: C(-26, 34, 1500, [527, 500, 720]), cut: true,
    text: "The bridge travels front to back on the Y guides and carries the head across in X. Brushless servos drive it on Kevlar belts.", claims: ["motion-system"] },
  { id: "head", name: "Lens carriage", parts: ["head.carriage", "head.cover", "head.tube", "head.lens", "head.pointer", "optics.m4"], cam: { ...C(34, 24, 820, [0, 0, 0]), follow: "head" }, cut: true,
    text: "Mirror 4 turns the beam down through the focus lens (standard 50.8 mm focal length). The red-dot pointer marks the head position.", claims: ["optics-count", "lens-standard", "red-dot"] },
  { id: "focus", name: "Focus plunger", parts: ["head.plunger"], cam: { ...C(48, 14, 600, [0, 0, 0]), follow: "head" }, cut: true,
    text: "The plunger touches the material to set focus. At Saga you focus by thickness instead. Never plunger-focus on the bare grid.", claims: ["plunger-warning", "thickness-mode"] },
  { id: "air", name: "Air assist", parts: ["head.cone", "head.airline", "rear.air"], cam: { ...C(30, 18, 620, [0, 0, 0]), follow: "head" }, cut: true,
    text: "Compressed air through the cone blows heat and debris away from the cut. Use it whenever you vector cut. The supply limit at the rear receptacle is about 2 bar.", claims: ["air-assist-vector", "air-limit"] },
  { id: "table", name: "Table, grid and tray", parts: ["table.", "lift.screw", "frame.deck"], cam: C(-20, 36, 1600, [527, 420, 620]), cut: true,
    text: "The table lifts to set focus. The grid lets cut-outs fall into the tray, where offcuts become fuel. Loads: 40.8 kg static, 27.2 kg while the table moves.", claims: ["work-area", "debris-fire", "table-load"] },
  { id: "stock", name: "Material", parts: ["stock."], cam: C(-24, 40, 1200, [450, 450, 660]), cut: true,
    text: "Know what it is before you put it in. PVC and vinyl are never allowed. If you don’t know a material, identify it first (find its safety data sheet).", claims: ["pvc", "sds"] },
  { id: "guides", name: "Y guides", parts: ["guide."], cam: C(-34, 30, 1500, [300, 420, 720]), cut: true,
    text: "Rails the bridge runs on. Staff clean them weekly. Don’t rest tools or material on them.", claims: ["pm-weekly"] },
  { id: "optics", name: "Mirrors and beam path", parts: ["optics.", "source.window"], cam: C(-130, 40, 1700, [400, 650, 800]), cut: true,
    text: "Four mirrors, one window optic and one lens carry the beam from the tube to the work. Optics cleaning is staff work, with approved solution only.", claims: ["optics-count", "optics-solution"] },
  { id: "source", name: "Laser source", parts: ["source.tube", "source.fins", "rear.bay"], cam: C(-150, 34, 1800, [520, 790, 830]), cut: true,
    text: "Air-cooled CO₂ source in the rear bay. Saga’s unit is 80 W. Keep the cooling vents clear.", claims: ["source-80w", "air-cooled"] },
  { id: "exhaust", name: "Exhaust plenum and port", parts: ["exhaust.", "rear.port", "rear.panel"], cam: C(160, 20, 2600, [527, 600, 520]),
    text: "Smoke is drawn rearward through the plenum and out of one 102 mm port. It needs 595–680 m³/h of extraction. Saga’s extraction runs all the time.", claims: ["exhaust-port", "exhaust-flow", "extraction-on"] },
];

// ------------------------------------------------------------- faults (keys 1–9). Each beat: pose targets, motion, effects, camera, callouts.
// pose keys: lid 0..1 · motion raster|vector|halt|park|hold · tz (grid-top Z) · sx, sy (stock shift) · dot · fire (beam allowed) · power ·
// flame · smoke flow|linger|gas|off · ring idle|run|red · debris · ember · dirt · mark good|blur|weak · art good|blur|weak (finished engraving shown at once) · cut · status · culprits · focus
const head = { part: "head.cone", at: "bottom", text: "Cone" };
export const FAULTS = [
  { id: "flare", key: "1", title: "Flame during a vector cut", symptom: "Flames grow at the cut instead of a brief flicker.",
    culprits: ["stock."], claims: ["vector-fire", "attended", "air-assist-vector", "fire-staff"],
    beats: [
      { title: "Cutting, air assist on", text: "Vector cutting puts the most heat into the sheet. Air assist keeps flare-ups down. It does not stop them.", pose: { motion: "vector", fire: 1, flame: 0.12, smoke: "flow", lid: 0 }, cam: C(-24, 30, 1100, [470, 420, 672]), callouts: [{ anchor: "cut", text: "Small flicker at the cut" }] },
      { title: "The flame grows", text: "Even a familiar material can burst into flame. You’re standing there, so you see it at once.", pose: { motion: "vector", fire: 1, flame: 1, smoke: "linger" }, culprit: true, cam: C(-22, 42, 950, [470, 420, 670]), callouts: [{ anchor: "cut", text: "Sustained flame" }] },
      { title: "Stop the job, lid closed", text: "Press Go/Stop. The beam stops; the head stops at the next node. Keep the lid shut. Opening it feeds the fire air.", pose: { motion: "halt", fire: 0, flame: 0.75, ring: "idle", status: "Idle" }, culprit: true, cam: C(-18, 46, 1600, [680, 320, 780]), callouts: [{ part: "controls.go", text: "Go/Stop" }, { anchor: "cut", text: "Still burning" }] },
      { title: "Get staff", text: "If it keeps burning, keep the lid shut, step back and get staff. Fire response is staff work.", pose: { motion: "halt", fire: 0, flame: 0.75, smoke: "linger" }, culprit: true, cam: C(-38, 30, 2650, [527, 417, 590]), callouts: [{ anchor: "cut", text: "Do not reach in" }] },
    ] },
  { id: "focus", key: "2", title: "No thickness entered", symptom: "A fuzzy, wide mark; the cone sits too close to the sheet.",
    culprits: ["table.grid", "table.gridframe", "lift.screw"], claims: ["thickness-mode", "thickness-grid", "calipers"],
    beats: [
      { title: "Thickness entered: 6 mm", text: "With the measured thickness entered, autofocus puts the sheet’s surface at the beam’s narrowest point.", pose: { tz: FOCUSED, motion: "hold", ...ON_SHEET, fire: 0, guide: 1, mark: "good" }, cam: { ...C(0, 0, 240, [0, 0, 0]), follow: "head", fz: FP + 7, fov: 30 }, cut: true, callouts: [{ anchor: "waist", text: "Focus (red) on the surface (green)" }] },
      { title: "Correct focus: sharp mark", text: "This is what correct focus looks like. The spot is at its smallest on the surface, so letter edges are sharp and the engraving is evenly dark.", pose: { tz: FOCUSED, motion: "park", fire: 0, guide: 0, art: "good", mark: "good" }, cam: C(0, 62, 500, [482, 528, 666], 30), callouts: [{ anchor: "art", dx: 96, dy: 28, text: "Sharp edges, even depth" }] },
      { title: "Thickness left blank", text: "With no thickness, autofocus focuses on the top of the grid. The sheet now stands 6 mm above focus.", pose: { tz: FP, motion: "hold", ...ON_SHEET, fire: 0, guide: 1 }, cam: { ...C(0, 0, 240, [0, 0, 0]), follow: "head", fz: FP + 7, fov: 30 }, cut: true, callouts: [{ anchor: "surface", text: "Surface (green)" }, { anchor: "waist", text: "Focus (red): 6 mm below the surface" }] },
      { title: "Wrong focus: blurred mark", text: "This is what a 6 mm focus error looks like on the same artwork: the spot is wider and weaker, so edges spread and soften and the engraving is lighter and shallower. Turning up the power doesn’t fix that.", pose: { tz: FP, motion: "park", fire: 0, guide: 0, art: "blur", mark: "blur" }, cam: C(0, 62, 500, [482, 528, 666], 30), callouts: [{ anchor: "art", dx: 96, dy: 28, text: "Soft, spread edges" }] },
      { title: "Measure and re-enter", text: "Pause the job. Measure the sheet with calipers and enter the thickness for every process, then focus again.", pose: { tz: FOCUSED, motion: "hold", ...ON_SHEET, fire: 0, mark: "good", guide: 1 }, cam: { ...C(0, 0, 240, [0, 0, 0]), follow: "head", fz: FP + 7, fov: 30 }, cut: true, callouts: [{ anchor: "waist", text: "Back on the surface" }] },
    ] },
  { id: "lid", key: "3", title: "Lid opened mid-job", symptom: "The beam stops but the head keeps moving.",
    culprits: ["lid.", "head.carriage", "bridge.beam"], claims: ["lid-motion", "pause-node"],
    beats: [
      { title: "Engraving, lid closed", text: "The raster job runs with the lid closed and the interlock satisfied.", pose: { lid: 0, motion: "raster", fire: 1, smoke: "flow", ring: "run", status: "Running" }, cam: C(-34, 28, 2400, [527, 420, 720]) },
      { title: "Lid lifted", text: "Opening the lid stops the beam firing, but the carriage keeps moving. Moving parts are now within reach.", pose: { lid: 1, motion: "raster", fire: 0 }, culprit: true, cam: C(-30, 28, 2700, [527, 420, 910]), callouts: [{ part: "head.cover", text: "Still moving" }, { part: "lid.front", text: "Interlock: beam off" }] },
      { title: "Rows missing", text: "Rows engraved while the lid was open are missing. Resuming won’t put them back.", pose: { lid: 1, motion: "halt", fire: 0 }, culprit: true, cam: C(-14, 62, 1300, [450, 430, 666]), callouts: [{ anchor: "gap", text: "Missing rows" }] },
      { title: "Pause first, then open", text: "Press Go/Stop and wait for the head to stop before you lift the lid. After a pause, close the lid and press Go/Stop to carry on.", pose: { lid: 0, motion: "halt", fire: 0, ring: "idle", status: "Idle" }, cam: C(-12, 48, 900, [900, 240, 900]), callouts: [{ part: "controls.go", text: "Pause here first" }] },
    ] },
  { id: "smoke", key: "4", title: "Smoke lingers in the cabinet", symptom: "Smoke hangs around the carriage, or you smell it in the room.",
    culprits: ["exhaust.", "rear.port"], claims: ["exhaust-leaks", "extraction-on", "exhaust-flow"],
    beats: [
      { title: "Normal extraction", text: "Working extraction pulls smoke to the rear plenum and out through the port.", pose: { motion: "raster", fire: 1, smoke: "flow" }, cam: C(70, 20, 1900, [527, 560, 670]), cut: true, callouts: [{ part: "exhaust.plenum", off: [230, 0, 0], text: "Plenum" }] },
      { title: "Extraction fails", text: "A blocked filter, a loose hose or a clogged plenum leaves the smoke in the cabinet. The fan can still sound normal.", pose: { motion: "raster", fire: 1, smoke: "linger" }, culprit: true, cam: C(70, 20, 1900, [527, 560, 670]), cut: true, callouts: [{ part: "exhaust.plenum", off: [230, 0, 0], text: "No flow" }, { anchor: "cut", text: "Smoke at the lens" }] },
      { title: "Fumes reach the room", text: "Fumes escaping round the lid are a health hazard. Smoke on the optics also damages them.", pose: { motion: "raster", fire: 1, smoke: "linger" }, culprit: true, cam: C(-24, 22, 2600, [527, 417, 820]), callouts: [{ part: "lid.front", text: "Odour at the lid" }] },
      { title: "Stop and call staff", text: "Stop the job and keep the lid shut while the smoke clears. Staff inspect the exhaust path for leaks and blockages before anyone restarts.", pose: { motion: "halt", fire: 0, smoke: "flow", ring: "idle", status: "Idle" }, cam: C(160, 20, 2600, [527, 600, 520]), callouts: [{ part: "rear.port", text: "Check the whole path" }] },
    ] },
  { id: "moved", key: "5", title: "Sheet moved between passes", symptom: "The second pass misses the first.",
    culprits: ["stock."], claims: ["registration", "pause-node"],
    beats: [
      { title: "Cutting a circle", text: "The head cuts the circle in machine coordinates. Partway round, the job is paused.", pose: { fresh: true, sxFrom: 0, syFrom: 0, sx: 0, sy: 0, lid: 0, motion: "arc", arc: [ARC0, CUT_AT], fire: 1, mark: "good" }, cam: MOVED_CAM, callouts: [{ anchor: "arc", t: 0.75, pass: 1, text: "First part of the cut" }] },
      { title: "The sheet is nudged", text: "Someone lifts the lid during the pause and moves the sheet 25 mm. The machine can’t know.", pose: { fresh: true, prepaint: [[ARC0, CUT_AT]], sxFrom: 0, syFrom: 0, sx: MOVE[0], sy: MOVE[1], lid: 0.55, motion: "hold", ...PAUSED_AT, fire: 0 }, culprit: true, cam: MOVED_CAM, callouts: [{ part: "stock.sheet", off: [0, 100, 0], text: "Moved 25 mm" }] },
      { title: "Resume: cut lands 25 mm off", text: "The job resumes where it stopped, in machine coordinates. The rest of the circle is cut where the sheet used to be, so it misses the first part by 25 mm.", pose: { fresh: true, prepaint: [[ARC0, CUT_AT]], sx: MOVE[0], sy: MOVE[1], lid: 0, motion: "arc", arc: [CUT_AT, ARC1], parkAfter: true, fire: 1, mark: "good" }, culprit: true, cam: MOVED_CAM, callouts: [{ anchor: "arc", t: 0.75, pass: 1, text: "Before the pause" }, { anchor: "arc", t: 1.25, pass: 2, text: "After the pause: 25 mm off" }] },
      { title: "Redo setup", text: "The part is ruined: the two halves of the circle don’t meet. Stop the job and set it up again with staff. Resuming lines up only if the sheet hasn’t moved.", pose: { fresh: true, prepaint: [[ARC0, CUT_AT], [CUT_AT, ARC1, -MOVE[0], -MOVE[1]]], sx: MOVE[0], sy: MOVE[1], lid: 0, motion: "park", fire: 0, ring: "idle", status: "Idle" }, cam: MOVED_TOP, callouts: [{ anchor: "arc", t: 0.75, pass: 1, text: "Before the pause" }, { anchor: "arc", t: 1.25, pass: 2, text: "After the pause: 25 mm off" }] },
    ] },
  { id: "debris", key: "6", title: "Offcuts in the tray", symptom: "Small pieces build up under the grid.",
    culprits: ["table.tray", "table.debris"], claims: ["debris-fire", "debris-clean", "familiar-flare", "pause-node"],
    beats: [
      { ...TRAY_SECTION, title: "Small parts fall through", text: "Cut-outs drop through the grid into the tray under your sheet.", pose: { motion: "vector", fire: 1, debris: 1, ember: 0, flame: 0 }, callouts: [{ anchor: "tray", x: 383, y: 181, text: "Offcuts in the tray" }] },
      { ...TRAY_SECTION, title: "Fuel builds up", text: "Left there, they are fuel right under the beam.", pose: { motion: "halt", fire: 0, debris: 1, ember: 0, flame: 0 }, culprit: true, callouts: [{ anchor: "tray", x: 610, y: 373, text: "Fuel under the sheet" }] },
      { ...TRAY_SECTION, title: "Ember smoulders", text: "A hot fragment can smoulder unseen under the grid, even after the job ends.", pose: { motion: "halt", fire: 0, debris: 1, ember: 1, flame: 0, smoke: "linger" }, cam: HOT_CAM, culprit: true, culpritsOverride: ["table.debris.hot"], callouts: [{ anchor: "hot", text: "Smouldering" }] },
      { ...TRAY_SECTION, title: "Fire under the sheet", text: "The smouldering pile can ignite and set the sheet alight from below. Press Go/Stop, keep the lid shut and get staff.", pose: { motion: "halt", fire: 0, debris: 1, ember: 1, flame: 1, flameSrc: "hot", smoke: "linger" }, cam: HOT_CAM, culprit: true, culpritsOverride: ["table.debris.hot"], callouts: [{ anchor: "hot", text: "Fire under the sheet" }] },
      { ...TRAY_SECTION, title: "Staff empty the tray", text: "Take your parts and scraps out after every job. If you see offcuts under the grid, tell staff; they lift the grid and clean the tray.", pose: { motion: "park", fire: 0, debris: 0, ember: 0, flame: 0, smoke: "flow" }, callouts: [{ anchor: "tray", x: 527, y: 200, text: "Clean tray" }] },
    ] },
  { id: "optics", key: "7", title: "Weak, uneven mark", symptom: "The same settings mark lighter than before.",
    culprits: ["head.lens", "optics."], claims: ["optics-contam", "optics-solution", "pm-weekly"],
    beats: [
      { title: "Clean optics", text: "A clean lens delivers the full beam to the surface.", pose: { motion: "raster", rasterSpeed: 3.2, rasterOnce: true, rasterOy: 0, fire: 1, mark: "good", dirt: 0, power: 1 }, cam: OPTICS_CAM },
      { ghost: ["head.tube"], ghostLabel: "nozzle tube", title: "Residue on the lens", text: "Smoke residue builds up on the lens and mirrors and absorbs energy.", pose: { motion: "hold", hx: STOCK.x + 30, hy: STOCK.y + 150, fire: 0, mark: "weak", dirt: 1, power: 0.45 }, culprit: true, cam: { ...C(40, 10, 520, [0, 0, 0]), follow: "head" }, cut: true, callouts: [{ part: "head.lens", text: "Dirty lens" }] },
      { title: "Don’t add power", text: "The mark fades. More power just heats the dirty optic further and can crack it.", pose: { motion: "raster", rasterSpeed: 3.2, rasterOnce: true, rasterOy: WEAK_OY, fire: 1, mark: "weak", dirt: 1, power: 0.45 }, cam: OPTICS_CAM, callouts: [{ anchor: "art", dx: 150, dy: 0, text: "Clean lens" }, { anchor: "art", dx: 150, dy: WEAK_OY, text: "Lighter engraving" }] },
      { ghost: ["head.tube"], ghostLabel: "nozzle tube", title: "Report to staff", text: "Stop and tell staff. They clean the optics with approved solution, never isopropyl, and check for damage.", pose: { motion: "park", fire: 0, mark: "good", dirt: 0, power: 1 }, cam: { ...C(34, 22, 760, [0, 0, 0]), follow: "head" }, cut: true, callouts: [{ part: "head.lens", text: "Staff task" }] },
    ] },
  { id: "drive", key: "8", title: "Red ring on Go/Stop", symptom: "The head stops dead and the ring turns red.",
    culprits: ["controls.ring", "bridge.", "head.carriage"], claims: ["ring-colours"],
    beats: [
      { title: "Running: green ring", text: "A green ring means the machine is running or tracing a job.", pose: { motion: "raster", fire: 1, ring: "run", status: "Running" }, cam: C(-20, 40, 1200, [800, 300, 860]), callouts: [{ part: "controls.ring", text: "Green: running" }] },
      { title: "Red: drive failed", text: "Red means a drive has failed. Motion and firing stop.", pose: { motion: "halt", fire: 0, ring: "red", status: "Drive fault" }, culprit: true, cam: C(-12, 50, 760, [930, 230, 905]), callouts: [{ part: "controls.ring", text: "Red ring" }] },
      { title: "Leave it, call staff", text: "Don’t push the carriage by hand or keep restarting. Note the job and what you saw, then call staff. Staff contact Epilog support.", pose: { motion: "halt", fire: 0, ring: "red" }, culprit: true, cam: C(-30, 36, 1500, [527, 500, 720]), cut: true, callouts: [{ part: "bridge.beam", text: "Don’t move it by hand" }] },
    ] },
  { id: "pvc", key: "9", title: "Unknown plastic", symptom: "A sheet with no label: is it acrylic, polycarbonate or PVC?",
    culprits: ["stock."], claims: ["pvc", "sds", "corrosion"],
    beats: [
      { title: "No label", text: "Clear or grey plastic all looks alike. How well it cuts tells you nothing about its fumes.", pose: { motion: "hold", fire: 0, plastic: 1 }, culprit: true, cam: C(-24, 40, 1200, [450, 450, 660]), callouts: [{ part: "stock.sheet", text: "Unknown composition" }] },
      { title: "PVC fumes", text: "PVC and vinyl give off hydrogen chloride when they burn. It harms people and corrodes the machine. The real gas is colourless: it’s tinted here only so you can see it.", pose: { motion: "raster", fire: 1, plastic: 1, smoke: "gas" }, culprit: true, cam: C(-34, 26, 1500, [527, 470, 690]), cut: true, callouts: [{ anchor: "cut", text: "HCl in the fumes" }] },
      { title: "Corrosion inside", text: "Repeated exposure corrodes the optics and the polished guides, and voids the warranty.", pose: { motion: "halt", fire: 0, plastic: 1, smoke: "gas", rust: 1 }, culprit: true, culpritsOverride: ["optics.", "guide.", "bridge.beam"], cam: C(45, 24, 1500, [400, 560, 720]), cut: true, callouts: [{ part: "guide.left", text: "Corroded guide" }, { part: "optics.m3", at: "top", text: "Mirror" }] },
      { title: "Identify first", text: "Don’t put it in. Find the safety data sheet, or ask staff. If no one can identify it, it doesn’t go in.", pose: { motion: "park", fire: 0, plastic: 1, smoke: "off", rust: 0 }, cam: C(-24, 40, 1200, [450, 450, 660]), callouts: [{ part: "stock.sheet", text: "Not until identified" }] },
    ] },
];
export const BEAT_LEN = 5.2;
