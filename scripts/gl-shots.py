#!/usr/bin/env python3
"""Headless captures of the WebGL viewer through its window.__epilog test hook.
usage: gl-shots.py <webgl.html> <outdir> <spec.json>
spec: [{"name":..., "theme":"dark", "view":"whole"|null, "fault":id|null, "beat":0, "settle":5.2, "part":id|null,
        "toggle":["cut"], "job":t|null, "w":1440, "h":900, "canvas":true}]
Prints JSON: per shot the PNG path, console errors and the viewer state."""
import asyncio, json, sys, glob, pathlib
from playwright.async_api import async_playwright

import sys as _s; _s.path.insert(0, str(pathlib.Path(__file__).parent)); from browser_support import browser_options as _bo; EXE = _bo()['executable_path']
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']


async def shot(b, url, out, s):
    pg = await b.new_page(viewport={'width': s.get('w', 1440), 'height': s.get('h', 900)}, device_scale_factor=s.get('dpr', 1))
    errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    await pg.goto(url + ('?embed' if s.get('embed') else ''))
    await pg.wait_for_function('window.__epilog !== undefined', timeout=20000)
    await pg.wait_for_timeout(600)
    js = []
    if s.get('theme'): js.append(f"__epilog.theme({json.dumps(s['theme'])})")
    if s.get('view'): js.append(f"__epilog.view({json.dumps(s['view'])})")
    if s.get('part'): js.append(f"__epilog.part({json.dumps(s['part'])})")
    for t in s.get('toggle', []): js.append(f"__epilog.toggle({json.dumps(t)})")
    if s.get('job') is not None: js.append(f"__epilog.job({s['job']})")
    if s.get('fault'):
        js.append(f"__epilog.fault({json.dumps(s['fault'])}, 0)")
        if s.get('beat'):
            js.append("__epilog.settle(%s)" % s.get('pre', 5.2))
            js.append(f"__epilog.beat({s['beat']})")
    js.append("__epilog.settle(%s)" % s.get('settle', 3))
    st = await pg.evaluate("() => {" + ";".join(js) + "; return __epilog.state(); }")
    await pg.wait_for_timeout(250)
    if s.get('canvas'):
        await pg.locator('.sb-gl-stage').screenshot(path=out)
    else:
        await pg.screenshot(path=out)
    caption = await pg.evaluate("() => (document.querySelector('[data-beat]')?.textContent||'') + ' | ' + (document.querySelector('[data-caption]')?.textContent||'')")
    callouts = await pg.evaluate("() => [...document.querySelectorAll('.sbx-callout')].filter(e=>!e.hidden).map(e=>e.textContent.trim())")
    await pg.close()
    return {'png': out, 'errors': errs, 'state': st, 'caption': caption, 'callouts': callouts}


async def main():
    html, outdir, spec = sys.argv[1], pathlib.Path(sys.argv[2]), json.load(open(sys.argv[3]))
    outdir.mkdir(parents=True, exist_ok=True)
    url = pathlib.Path(html).resolve().as_uri()
    res = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=EXE, args=ARGS)
        for s in spec:
            res.append({'name': s['name'], **await shot(b, url, str(outdir / (s['name'] + '.png')), s)})
        await b.close()
    print(json.dumps(res, indent=1))


asyncio.run(main())
