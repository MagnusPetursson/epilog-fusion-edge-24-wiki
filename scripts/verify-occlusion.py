#!/usr/bin/env python3
"""Regression: the machine body must not hide what a fault beat is teaching.
For every fault beat, settle the beat, then ask the viewer which OPAQUE parts lie on the straight line from the camera eye to
each instructional target (the beat's callout anchors: the cut point, Go/Stop, the plenum ...). The test is against the real
rendered triangles (__epilog.targets -> occluders); parts hidden by a deliberate cutaway and the smoky glass are not counted.
A beat fails if any target is off-screen or has an occluder that is not explicitly allowed below.
Runs at desktop and phone viewport sizes. Also writes one canvas PNG per beat (desktop) for visual inspection.
usage: verify-occlusion.py <webgl.html> <out.json> [pngdir]"""
import sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from browser_support import browser_options
from playwright.sync_api import sync_playwright

# A target may sit "behind" something only where the geometry makes the straight probe line meaningless, each with its reason.
ALLOWED = {
    # the focal point lies 6 mm INSIDE/below the sheet in this beat; the viewer draws the focal ring x-ray on purpose
    ("focus", 3, "Focus (red): 6 mm below the surface"): ["stock.sheet"],
    # (the offcuts fault is now a front section with the tray front, grid frame and cross bars cut away: no exception needed)
    # the status ring surrounds Go/Stop; the probe aims at the ring's centre, which is under the button cap
    ("drive", 1, "Green: running"): ["controls.go"], ("drive", 2, "Red ring"): ["controls.go"],
}
VIEWPORTS = {"desktop": (1100, 760), "phone": (390, 844)}
html = pathlib.Path(sys.argv[1]).resolve().as_uri() + "?embed"
outp = pathlib.Path(sys.argv[2]); pngdir = pathlib.Path(sys.argv[3]) if len(sys.argv) > 3 else None
if pngdir: pngdir.mkdir(parents=True, exist_ok=True)
rows, ok = [], True
with sync_playwright() as p:
    opts = browser_options()
    b = p.chromium.launch(**{**opts, "args": list(opts.get("args", [])) + ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]})
    for vp, (w, h) in VIEWPORTS.items():
        pg = b.new_page(viewport={"width": w, "height": h}); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(html, wait_until="load"); pg.wait_for_function("window.__epilog !== undefined", timeout=20000); pg.wait_for_timeout(800)
        pg.evaluate("__epilog.stop()")
        faults = pg.evaluate("__epilog.data.faults")
        for f in faults:
            for k in range(f["beats"]):
                pre = f"__epilog.fault({json.dumps(f['id'])}, 0); __epilog.settle(5.2);" + (f" __epilog.beat({k}); __epilog.settle(5.2);" if k else "")
                t = pg.evaluate("() => { " + pre + " return __epilog.targets(); }")
                bad = []
                for x in t:
                    allowed = set(ALLOWED.get((f["id"], k + 1, x["text"]), []))
                    occ = [o for o in x["occluders"] if o not in allowed]
                    if not x["onScreen"] or occ: bad.append({"text": x["text"], "onScreen": x["onScreen"], "occluders": occ})
                good = not bad  # beats without callouts have no instructional target to occlude; listed as such
                ok &= good
                rows.append({"viewport": vp, "fault": f["id"], "beat": k + 1, "targets": [{"text": x["text"], "onScreen": x["onScreen"], "occluders": x["occluders"]} for x in t], "pass": good, "failures": bad, "noTargets": not t})
                if pngdir and vp == "desktop":
                    pg.locator(".sb-gl-stage").screenshot(path=str(pngdir / f"{f['id']}-b{k + 1}.png"))
        rows.append({"viewport": vp, "consoleErrors": errs}); ok &= not errs
        pg.close()
    b.close()
outp.write_text(json.dumps({"pass": ok, "rows": rows}, indent=1))
for r in rows:
    if "fault" in r and not r["pass"]: print("FAIL", r["viewport"], r["fault"], "beat", r["beat"], r["failures"] or "no targets")
print("PASS" if ok else "FAIL", sum(1 for r in rows if r.get("pass")), "/", sum(1 for r in rows if "fault" in r), "beats clear")
sys.exit(0 if ok else 1)
