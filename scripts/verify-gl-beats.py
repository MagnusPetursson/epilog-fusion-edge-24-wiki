#!/usr/bin/env python3
"""Regression: every fault beat in the WebGL viewer must change what you SEE.
For each fault, render each beat (settled, fixed camera from the beat) and compare consecutive canvas frames.
A beat whose frame differs from the previous one by < MIN_FRAC of pixels fails (metadata-only change).
Also renders a negative control: the same beat twice must be identical (proves the metric isn't noise).
usage: verify-gl-beats.py <webgl.html> <out.json>"""
import os, sys, json, pathlib, glob, io
from playwright.sync_api import sync_playwright
EXE = sorted(glob.glob(os.path.expanduser('~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell')))[-1]
MIN_FRAC = 0.10   # beats must change >=10 % of pixels
MAX_CONTROL = 0.05  # ambient animation (status-ring pulse, extraction flow) between identical states
html, outp = pathlib.Path(sys.argv[1]).resolve().as_uri() + "?embed", sys.argv[2]
def grab(pg, pre=""):
    return pg.evaluate("""() => { """ + pre + """; const c = document.querySelector('.sb-gl-stage canvas'); const g = document.createElement('canvas'); g.width = 240; g.height = Math.round(240 * c.height / c.width); const x = g.getContext('2d'); x.drawImage(c, 0, 0, g.width, g.height); return Array.from(x.getImageData(0, 0, g.width, g.height).data); }""")
def sig(pg):
    s = pg.evaluate("(() => { const s = __epilog.state(); const r = v => typeof v === 'number' ? Math.round(v * 10) / 10 : v; const o = {}; for (const [k, v] of Object.entries({...s.P, ...s.FXS})) o[k] = r(v); o.callouts = [...document.querySelectorAll('.sbx-callout')].filter(e => !e.hidden).map(e => e.textContent.trim()).join('|'); o.flames = s.flames > 0; return o; })()")
    return s
def diff(a, b):
    n = len(a) // 4; d = 0
    for i in range(0, len(a), 4):
        if abs(a[i] - b[i]) + abs(a[i + 1] - b[i + 1]) + abs(a[i + 2] - b[i + 2]) > 24: d += 1
    return d / n
res, ok = [], True
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=EXE, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={"width": 1100, "height": 760}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(html, wait_until="load"); pg.wait_for_timeout(1500)
    pg.evaluate("__epilog.stop()"); data = pg.evaluate("__epilog.data.faults"); nbeats = {f["id"]: f["beats"] for f in data}; faults = list(nbeats)
    for fid in faults:
        nb = nbeats[fid]
        prevsig = None
        prev = grab(pg, f"Math.random=(()=>{{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647}})(); __epilog.fault({json.dumps(fid)}, 0); __epilog.settle(5.2)"); rows = []
        for k in range(1, nb):
            if prevsig is None: prevsig = sig(pg)
            cur = grab(pg, f"__epilog.beat({k}); __epilog.settle(5.2)"); cursig = sig(pg)
            changed = sorted(k2 for k2 in cursig if cursig[k2] != prevsig.get(k2))
            f = diff(prev, cur); good = f >= MIN_FRAC and bool(changed)
            rows.append({"beat": k + 1, "changedFraction": round(f, 4), "nonCameraChanges": changed, "pass": good}); ok &= good; prev, prevsig = cur, cursig
        res.append({"fault": fid, "beats": nb, "transitions": rows})
    # negative control: a settled beat re-rendered after more time with nothing changed must be (near) identical
    a = grab(pg, "__epilog.fault('drive', 0); __epilog.settle(12)"); c = grab(pg, "__epilog.settle(3)")
    control = round(diff(a, c), 4)
    b.close()
out = {"minChangedFraction": MIN_FRAC, "faults": res, "negativeControlSameBeat": control, "maxControl": MAX_CONTROL, "negativeControlPass": control <= MAX_CONTROL, "pageErrors": errs, "pass": ok and control <= MAX_CONTROL and not errs}
pathlib.Path(outp).write_text(json.dumps(out, indent=1)); print(json.dumps({"pass": out["pass"], "control": control, "min": min(r["changedFraction"] for f in res for r in f["transitions"]), "n": sum(len(f["transitions"]) for f in res), "errors": errs}))
sys.exit(0 if out["pass"] else 1)
