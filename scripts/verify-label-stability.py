#!/usr/bin/env python3
"""Regression for callout jitter: labels must not jump with the moving head, even on low-refresh displays. For every fault beat: settle, then drive the live per-frame path at 15 fps (a slow display)
for 3 s and read where each callout label is actually drawn (its CSS transform). A beat fails if any label moves more than
MAX_STEP px between two consecutive frames, or wanders more than MAX_RANGE px overall, once the camera has settled.
usage: verify-label-stability.py <webgl.html> <out.json>"""
import sys, json, pathlib, re
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from browser_support import browser_options
from playwright.sync_api import sync_playwright

MAX_STEP, MAX_RANGE, FPS, SECS = 8.0, 60.0, 15, 3.0
html = pathlib.Path(sys.argv[1]).resolve().as_uri() + "?embed"; outp = pathlib.Path(sys.argv[2])
READ = """() => [...document.querySelectorAll('.sbx-callout[data-kind="label"]')].map((el) => {
  if (el.hidden) return null; const m = /translate\\(([-\\d.]+)px, ([-\\d.]+)px\\)/.exec(el.style.transform || ''); return m ? [+m[1], +m[2], el.textContent.trim()] : null; })"""
rows, ok = [], True
with sync_playwright() as p:
    o = browser_options(); b = p.chromium.launch(**{**o, "args": list(o.get("args", [])) + ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]})
    pg = b.new_page(viewport={"width": 1100, "height": 760}); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(html); pg.wait_for_timeout(2000); pg.evaluate("__epilog.stop()")
    for f in pg.evaluate("__epilog.data.faults"):
        for k in range(f["beats"]):
            pg.evaluate(f"__epilog.fault({json.dumps(f['id'])}, {k})")
            pg.evaluate(f"for (let i = 0; i < {3 * FPS}; i++) __epilog.frame(1 / {FPS})")  # camera settles, labels appear
            track = {}
            for _ in range(int(SECS * FPS)):
                pg.evaluate(f"__epilog.frame(1 / {FPS})")
                for i, v in enumerate(pg.evaluate(READ)):
                    if v: track.setdefault((i, v[2]), []).append((v[0], v[1]))
            for (i, text), pts in track.items():
                step = max((abs(a[0] - c[0]) + abs(a[1] - c[1]) for a, c in zip(pts, pts[1:])), default=0.0)
                rng = max(max(x for x, _ in pts) - min(x for x, _ in pts), max(y for _, y in pts) - min(y for _, y in pts))
                good = step <= MAX_STEP and rng <= MAX_RANGE; ok &= good
                rows.append({"fault": f["id"], "beat": k + 1, "label": text, "maxStepPx": round(step, 1), "rangePx": round(rng, 1), "pass": good})
    b.close()
ok &= not errs
outp.write_text(json.dumps({"pass": ok, "maxStep": MAX_STEP, "maxRange": MAX_RANGE, "fps": FPS, "rows": rows, "pageErrors": errs}, indent=1))
for r in rows:
    if not r["pass"]: print("FAIL", r)
print(("PASS" if ok else "FAIL"), sum(r["pass"] for r in rows), "/", len(rows), "labels steady")
sys.exit(0 if ok else 1)
