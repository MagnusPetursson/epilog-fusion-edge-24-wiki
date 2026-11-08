#!/usr/bin/env python3
"""Vendor the ShopBot PRSalpha wiki's design system so the Epilog site is a true sibling.
Copies the CSS template literals verbatim (no interpolation inside them) plus the viewer CSS,
and records the source commit. Re-run when the ShopBot design changes."""
import re, subprocess, json, pathlib, hashlib
SB = pathlib.Path.home() / "Documents/Repos/shopbot-prsalpha-wiki"
SRC = SB / "generator/figures/shopbot"
OUT = pathlib.Path(__file__).resolve().parent.parent / "generator/sb/design.mjs"
commit = subprocess.run(["git", "-C", str(SB), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
parts = {}
for f, name in [("site.mjs", "SHELL_CSS"), ("site.mjs", "SITE_CSS"), ("prose.mjs", "PROSE_CSS"), ("visuals.mjs", "VIS_CSS"), ("site.mjs", "FONTS")]:
    t = (SRC / f).read_text()
    m = re.search(r"export const " + name + r" = `(.*?)`;", t, re.S)
    assert m and "${" not in m.group(1), name
    parts[name] = m.group(1)
parts["GL_CSS"] = (SRC / "gl.css").read_text()
iso = (SB / "generator/kit/iso-kit.mjs").read_text()
m = re.search(r"export const ISO_CSS = `(.*?)`;", iso, re.S); assert m and "${" not in m.group(1)
parts["ISO_CSS"] = m.group(1)
lines = [f"// Vendored verbatim from shopbot-prsalpha-wiki @ {commit} by scripts/vendor-design.py. Do not edit here.",
         "// Sibling-site design system: masthead, editorial layout, prose, visuals, viewer shell, Anatomy theme tokens."]
for k, v in parts.items():
    lines.append(f"export const {k} = " + json.dumps(v) + ";")
OUT.write_text("\n".join(lines) + "\n")
print(json.dumps({"commit": commit, "bytes": {k: len(v) for k, v in parts.items()}, "sha256": hashlib.sha256(OUT.read_bytes()).hexdigest()}))

# step 2: the ShopBot handbook's print stylesheet (HB_CSS, ${FOOT}/${PF_CSS} kept as tokens) and stripMedia()
import re as _re
_t = (SRC / "handbook.mjs").read_text()
_css = _re.search(r"const HB_CSS = `(.*?)`;\n", _t, _re.S).group(1)
_fn = _re.search(r"function stripMedia\(css\) \{.*?\n\}\n", _t, _re.S).group(0)
_out = OUT.parent / "print.mjs"
_out.write_text("// Vendored verbatim from shopbot-prsalpha-wiki handbook.mjs (HB_CSS with ${FOOT}/${PF_CSS} left as tokens) by scripts/vendor-design.py step 2. Do not edit here.\nexport const HB_CSS_RAW = " + json.dumps(_css) + ";\nexport " + _fn)
