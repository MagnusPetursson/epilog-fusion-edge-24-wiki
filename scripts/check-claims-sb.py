#!/usr/bin/env python3
"""Check every claim in sources/claims.mjs against archived copies of its sources.
The archive (manual page text, support-article text and claim-quotes.json, one verbatim quote per claim id) is not
redistributed with this repository; point EPILOG_ARCHIVE at it (default: research/ in the checkout, which is gitignored). For manuals, the quote must be on the PRINTED page named in loc
("p. 30" or "p. 273–274"). Writes qa/claim-ledger.json (claimId, wording, source, url, locator, quote, verified, where)
and qa/claims-sb.json. Exit 1 if any claim fails or any cited claim id is unknown; exit 2 if the archive is missing."""
import os
import json, re, subprocess, sys, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
A = pathlib.Path(os.environ.get("EPILOG_ARCHIVE") or R / "research")
if not (A / "pages").is_dir():
    print(f"claim check: no source archive at {A}", file=sys.stderr); sys.exit(2)
(R / "qa").mkdir(exist_ok=True)
QUOTES = json.loads((A / "claim-quotes.json").read_text())
data = json.loads(subprocess.run(["node", "-e", "import('./generator/sbsite/content.mjs').then(async m=>console.log(JSON.stringify({C:m.CLAIMS,S:[...m.SOURCES,...(await import('./sources/claims.mjs')).PRIVATE_SOURCES],F:m.FAULTS.flatMap(f=>f[6])})))"], cwd=R, capture_output=True, text=True, check=True).stdout)
def norm(s): return re.sub(r"\s+", " ", s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"').replace("″", '"').replace("\u00ad", "")).lower().strip()
pages = {n: json.loads((A / "pages" / f"{f}.json").read_text()) for n, f in [(2, "m17000"), (3, "legacy"), (4, "m2021")]}
web = {1: "product-current.txt", 5: "support/reducing-fire-hazards-with-your-laser.txt", 6: "support/material-safety-and-your-laser.txt",
       7: "support/laser-machine-unsafe-materials.txt", 8: "support/can-you-cut-engrave-polycarbonate-with-laser-machine.txt",
       9: "support/material-compatibility-for-co2-and-fiber-laser-engravers.txt", 10: "support/control-panel-tour.txt",
       11: "support/cleaning-procedures-fusion-maker-edge-and-pro.txt", 12: "support/optics-cleaning-fusion-maker-edge-pro.txt",
       13: "support/engraver-table-weight-limits.txt", 14: "support/autofocus-calibration-wizard.txt", 15: "support/focus-calibrations-fusion-maker-edge-and-pro.txt",
       16: "support/lens-removal-and-installation.txt", 18: "local-configuration.md"}
src = {s[0]: s for s in data["S"]}
out, bad = [], []
for cid, c in data["C"].items():
    n, q = c["s"], norm(QUOTES[cid]); ok, where = False, ""
    if n in pages:
        m = re.findall(r"\d+", c["loc"].split(",")[0]); want = set(range(int(m[0]), int(m[-1]) + 1)) if m else set()
        hits = [(p, v["printed"]) for p, v in pages[n].items() if q in norm(v["text"])]
        on = [h for h in hits if h[1] in want]
        ok = bool(on); where = f"PDF p.{on[0][0]} = printed p.{on[0][1]}" if on else f"found on printed {sorted({h[1] for h in hits})}" if hits else "not found"
    elif n in web:
        t = norm((A / web[n]).read_text()); ok = q in t; where = web[n] if ok else "not found in " + web[n]
    elif n == 17:
        ok, where = True, "image (visual comparison)"
    rec = {"claimId": cid, "wording": c["t"], "sourceN": n, "source": src[n][1], "url": src[n][2], "locator": c["loc"], "quote": QUOTES[cid], "verified": ok, "where": where}
    out.append(rec); (bad.append(rec) if not ok else None)
# every cited id must exist; collect citations from content
txt = (R / "generator/sbsite/content.mjs").read_text() + (R / "generator/gl/scenes.mjs").read_text()
used = set(re.findall(r'C\(((?:"[^"]+",?\s*)+)\)', txt))
ids = set(x for u in used for x in re.findall(r'"([^"]+)"', u))
scene_ids = set(x for u in re.findall(r"claims: \[([^\]]*)\]", (R / "generator/gl/scenes.mjs").read_text()) for x in re.findall(r'"([^"]+)"', u))
ids |= set(data["F"])
unknown = sorted((ids | scene_ids) - set(data["C"]))
(R / "qa/claim-ledger.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
summary = {"claims": len(out), "verified": len(out) - len(bad), "failed": [(b["claimId"], b["where"]) for b in bad], "unknownCited": unknown, "sceneClaims": len(scene_ids), "uncitedClaims": sorted(set(data["C"]) - ids - scene_ids)}
(R / "qa/claims-sb.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False)); print(json.dumps(summary, indent=1, ensure_ascii=False))
sys.exit(1 if bad or unknown else 0)
