#!/usr/bin/env python3
"""Regression for cutaway lag: a cutaway change must take effect on the first press, and the F02 cone beats must show the
material. step() has to read the cutaway state for its "crossed 0.5" check before updating it, or the part modes (hidden
shells) are not refreshed when the animation finishes. __epilog.settle() renders once at the end and would hide that, so
this test uses the live per-frame path (__epilog.frame) only, and asserts the rendered part modes, not the metadata.
usage: verify-cutaway-live.py <webgl.html> <out.json>"""
import sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from browser_support import browser_options
from playwright.sync_api import sync_playwright

html = pathlib.Path(sys.argv[1]).resolve().as_uri(); outp = pathlib.Path(sys.argv[2])
# hidden shells = part mode 3 in the part texture; "shellsHidden" counts shell parts whose mode is 3 or 4
PROBE = """() => { const d = __epilog.partModes(); return { cut: __epilog.state().cut, hidden: d.shellHidden, shells: d.shells }; }"""
rows, ok = [], True
def check(name, cond, detail):
    global ok; ok &= bool(cond); rows.append({"check": name, "ok": bool(cond), "detail": detail})
with sync_playwright() as p:
    o = browser_options(); b = p.chromium.launch(**{**o, "args": list(o.get("args", [])) + ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]})
    pg = b.new_page(viewport={"width": 1440, "height": 900}); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(html); pg.wait_for_timeout(2000); pg.evaluate("__epilog.stop()")
    run = lambda n=60: pg.evaluate(f"for (let i = 0; i < {n}; i++) __epilog.frame(1 / 30)")
    # 1. Views tab: one press of a cutaway view hides the shells; one press of a normal view restores them
    pg.evaluate("__epilog.view('bed')"); run(); s = pg.evaluate(PROBE)
    check("view 'Into the cabinet' (cutaway) hides all shells after ONE press", s["cut"] == 1 and s["hidden"] == s["shells"], s)
    pg.evaluate("__epilog.view('whole')"); run(); s = pg.evaluate(PROBE)
    check("view 'Whole machine' restores all shells after ONE press", s["cut"] == 0 and s["hidden"] == 0, s)
    pg.evaluate("__epilog.view('head')"); run(); pg.evaluate("__epilog.view('front')"); run(); s = pg.evaluate(PROBE)
    check("cutaway view → normal view: shells restored", s["hidden"] == 0, s)
    # 2. C key / toggle
    pg.evaluate("__epilog.toggle('cut')"); run(); s = pg.evaluate(PROBE)
    check("toggle cutaway on: shells hidden", s["hidden"] == s["shells"], s)
    pg.evaluate("__epilog.toggle('cut')"); run(); s = pg.evaluate(PROBE)
    check("toggle cutaway off: shells restored", s["hidden"] == 0, s)
    # 3. F02 cone beats (cut: true) from a cold start: shells hidden, sheet drawn
    pg.evaluate("__epilog.fault('focus')"); run(90); s = pg.evaluate(PROBE); sheet = pg.evaluate("__epilog.partModes().sheet")
    check("F02 beat 1 (cutaway): shells hidden in the live loop", s["hidden"] == s["shells"], s)
    check("F02 beat 1: the sheet is drawn (mode not hidden)", sheet not in (3, 5), sheet)
    pg.evaluate("__epilog.beat(2)"); run(90); sheet = pg.evaluate("__epilog.partModes().sheet")
    check("F02 beat 3 (thickness blank): the sheet is drawn, not greyed out", sheet == 1, sheet)
    check("no page errors", not errs, errs)
    b.close()
outp.write_text(json.dumps({"ok": ok, "rows": rows}, indent=1))
for r in rows: print("PASS" if r["ok"] else "FAIL", r["check"], "" if r["ok"] else r["detail"])
sys.exit(0 if ok else 1)
