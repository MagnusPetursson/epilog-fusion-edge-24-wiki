#!/usr/bin/env python3
"""Copy regression: fails if an action label is longer than three words or a heading reads like a slogan.
Checks the rendered site in a browser (both themes, desktop 1440x900 and phone 390x844), including the 3D viewer's
runtime-generated fault step lists, so labels built in JS are covered too.

Action labels (max 3 words): <button> outside item lists, role=tab, the start-page call to action and the 3D stage link.
  Not counted: the key/number badge (.sbx-e, kbd), icons and the arrow glyphs ‹ › → .
  Allowlisted as item selectors, not actions: buttons in the 3D fault list, part list and fault step list. Their label is the
  item's own title (e.g. "Flame during a vector cut"), so they are held to the heading rule below instead.
Headings (h1–h6, <summary>, eyebrows, step titles, item-selector buttons) fail on: a trailing ? or !, "again", "let's",
  "we'll", "make it", second-person teaser openers ("your first", "new here", "where are you"), or known marketing patterns.
usage: test-copy.py [siteDir]   (default dist/)"""
import os, glob, json, pathlib, re, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist"
EXE = sorted(glob.glob(os.path.expanduser('~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell')))[-1]
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
PAGES = ["index", "rules", "machine", "run", "focus", "preflight", "trouble", "materials", "maintain", "quiz", "webgl"]
MAX_WORDS = 3
SLOGAN = re.compile(r"[?!]\s*$|\bagain\b|\blet[’']s\b|\bwe[’']ll\b|\bmake it\b|^your first\b|^new here|^where are you|"
                    r"\blearn the machine\b|\bmeet the\b|\bhow hard to\b|^what moves\b|^before you touch\b|^something (went|is|’s) wrong$|"
                    r"\bon paper\b|\bfrozen\b|^around the\b|\bthe whole site\b|\bdoes the remembering\b", re.I)

COLLECT = r"""() => {
  const T = (e) => { const c = e.cloneNode(true); c.querySelectorAll('.sbx-e,.sbx-fsym,kbd,svg,.sb-cite').forEach(x => x.remove());
    return c.textContent.replace(/[‹›→]/g, ' ').replace(/\s+/g, ' ').trim(); };
  const ITEM = '.sbx-faults button, .sbx-parts button, [data-fault-detail] button';
  const actions = [...document.querySelectorAll('button, [role=tab], a.sb-cta, .sb-stage-note a')].filter(e => !e.matches(ITEM)).map(T);
  const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,summary,.sb-eyebrow,.sb-step-t,.sb-where-h,.sb-phase-h,' + ITEM)]
    .map(e => { const c = e.cloneNode(true); c.querySelectorAll('.sbx-e,.sbx-fsym,kbd,svg,.sb-cite,.sb-fid,.sb-fkey,.sb-navm-k,.n').forEach(x => x.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); });
  return { actions, heads };
}"""

def main():
    fails, seen = [], {"actions": set(), "heads": set()}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=EXE, args=ARGS)
        for theme in ["", "light/"]:
            for w, h in [(1440, 900), (390, 844)]:
                pg = b.new_page(viewport={"width": w, "height": h})
                for name in PAGES:
                    pg.goto((SITE / f"{theme}{name}.html").resolve().as_uri(), wait_until="load")
                    pg.wait_for_timeout(1500 if name == "webgl" else 150)
                    states = [pg.evaluate(COLLECT)]
                    if name == "webgl":
                        for k in "123456789":
                            pg.focus('.sb-gl-stage'); pg.keyboard.press(k); pg.wait_for_timeout(120); states.append(pg.evaluate(COLLECT))
                    for st in states:
                        for a in st["actions"]:
                            if not a: continue
                            seen["actions"].add(a)
                            if len(a.split()) > MAX_WORDS: fails.append(f"{theme}{name}: action label > {MAX_WORDS} words: {a!r}")
                        for t in st["heads"]:
                            if not t: continue
                            seen["heads"].add(t)
                            if SLOGAN.search(t): fails.append(f"{theme}{name}: slogan-like heading: {t!r}")
                pg.close()
        b.close()
    fails = sorted(set(fails))
    out = ROOT / "qa"; out.mkdir(exist_ok=True)
    (out / "copy-check.json").write_text(json.dumps({"actions": sorted(seen["actions"]), "headings": sorted(seen["heads"]), "failures": fails}, ensure_ascii=False, indent=1))
    if fails:
        print("\n".join(fails)); print(f"FAIL: {len(fails)} copy problems"); sys.exit(1)
    print(f"Copy check passed: {len(seen['actions'])} action labels ≤ {MAX_WORDS} words, {len(seen['heads'])} headings without slogan patterns (both themes, desktop and phone).")

if __name__ == "__main__":
    main()
