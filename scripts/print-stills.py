#!/usr/bin/env python3
"""Regenerate assets/print-stills/*.jpg (the handbook/wiki PDF stills) from the built viewer, so print figures follow the model.
usage: print-stills.py [dist/light/webgl.html]   then rebuild the PDFs with `node build.mjs`.
Poses: light theme, embedded stage, 1252 × 860 stage (viewport 1600 × 936; flare beats 852 × 860)."""
import json, pathlib, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
HTML = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / 'dist' / 'light' / 'webgl.html')
OUT = ROOT / 'assets' / 'print-stills'
B = {"theme": "light", "embed": True, "canvas": True, "w": 1600, "h": 936}
SPEC = [
    {**B, "name": "hero", "view": "whole"},
    {**B, "name": "controls", "part": "controls", "settle": 4},
    {**B, "name": "cutaway", "view": "bed", "settle": 4},
    {**B, "name": "debris-b2", "fault": "debris", "beat": 2},
    {**B, "name": "flare-b0", "fault": "flare", "w": 1200},
    {**B, "name": "flare-b1", "fault": "flare", "beat": 1, "w": 1200},
    {**B, "name": "flare-b2", "fault": "flare", "beat": 2, "w": 1200},
    {**B, "name": "flare-b3", "fault": "flare", "beat": 3, "w": 1200},
    {**B, "name": "focus-b1", "fault": "focus", "beat": 2},  # thickness left blank (cone view)
    {**B, "name": "focus-good", "fault": "focus", "beat": 1, "settle": 3},  # correct focus: the finished engraving
    {**B, "name": "focus-bad", "fault": "focus", "beat": 3, "settle": 3},  # 6 mm out of focus: the same artwork
    {**B, "name": "lid-b1", "fault": "lid", "beat": 1},
    {**B, "name": "smoke-b1", "fault": "smoke", "beat": 1},
]

with tempfile.TemporaryDirectory() as td:
    spec = pathlib.Path(td) / 'spec.json'; spec.write_text(json.dumps(SPEC))
    res = json.loads(subprocess.check_output([sys.executable, str(ROOT / 'scripts' / 'gl-shots.py'), HTML, td, str(spec)]))
    bad = [r for r in res if r['errors']]
    if bad: sys.exit('viewer errors: ' + json.dumps(bad)[:800])
    for r in res:
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', r['png'], '-q:v', '3', str(OUT / (r['name'] + '.jpg'))], check=True)
        print(r['name'], r['caption'][:70], r['callouts'][:2])
