# Epilog Fusion Edge 24 — Fab Lab Saga teaching wiki

A student-facing training guide for the Epilog Fusion Edge 24 laser cutter at Fab Lab Saga: machine anatomy, safety and stops, focus, preflight, file-to-job workflow, materials, care, troubleshooting and self-checks, with an interactive WebGL teaching model and printable handbook PDFs.

**Training and staff authorization are required before using the machine.** This is not an official Epilog publication. Where the guide says "ask lab staff", follow their answer.

Live site: https://magnusp.is/epilog-fusion-edge-24-wiki/ · Light edition: `light/` · Third-party licences: `licenses/`.

This repository holds both the source and the built site. GitHub Pages serves the built pages from the repository root (`index.html`, `light/`, `webgl.html`, the two PDFs); everything else is the source that produces them.

## Layout

| Path | Contents |
|---|---|
| `generator/sbsite/` | Reader text (`content.mjs`), page templates (`site.mjs`), schematic figures (`visuals.mjs`) and the PDF layouts (`print.mjs`) |
| `generator/gl/` | The 3D teaching model: geometry (`model.mjs`), tour, demonstration job and fault beats (`scenes.mjs`), raw WebGL2 viewer (`viewer.js`), page builder (`build-gl.mjs`) |
| `generator/sb/` | Shared design system, vendored from the ShopBot PRSalpha wiki by `scripts/vendor-design.py` |
| `sources/claims.mjs` | Every machine-specific statement: our wording and its source number and page |
| `kit/` | Anatomy drawing kit (MIT), pinned by hash in `provenance.json` |
| `assets/` | Web fonts (OFL) and the print stills, rendered from the 3D model by `scripts/print-stills.py` |
| `scripts/` | Claim check, test suite and the publish step |
| `licenses/` | Third-party licence texts, copied into the built site |

The model is a teaching reconstruction from the published dimensions (1055 × 834 × 967 mm overall, 610 × 610 mm work area) and Epilog's own photographs and manuals. Internal positions, stand construction, panel thicknesses and grid spacing are illustrative.

## Build

Requirements: Node 22+, Python 3.10+, Playwright with Chromium, and Poppler (`pdfinfo`, `pdftotext`, `pdffonts`, `pdftoppm`). No npm packages are needed.

```sh
uv venv .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python -m playwright install chromium
.venv/bin/python scripts/doctor.py
node build.mjs                      # -> dist/ (dark), dist/light/, both PDFs
node scripts/publish-site.mjs       # -> copies dist/ to the repository root
```

`node build.mjs --no-pdf` skips the PDFs for quick layout work. Set `CHROME` to use an existing Chromium executable.

**Claim check.** With an archive of the cited sources in `research/` (or a folder named by `EPILOG_ARCHIVE`): their page text plus `claim-quotes.json`, one verbatim quote per claim, `node build.mjs` first confirms every claim's quote is on the cited printed page and stops if one is not. The archive holds manufacturer text and is not redistributed here; without it the build prints a notice and skips the check. Every source is linked in full on the site's Sources list.

## Test

```sh
node scripts/test-reader-voice.mjs
.venv/bin/python scripts/verify.py
.venv/bin/python scripts/verify-extra.py
.venv/bin/python scripts/verify-visual-state.py
.venv/bin/python scripts/test-copy.py
for t in gl-beats label-stability occlusion cutaway-live; do .venv/bin/python scripts/verify-$t.py dist/webgl.html qa/$t.json; done
```

`verify.py` serves the site under a non-root subpath on loopback and checks local links and fragments, both themes, the 3D viewer's tour and faults, keyboard controls, mobile overflow, PDF text, fonts and downloads, and the no-JavaScript fallback. `verify-extra.py` adds 320 and 640 px layouts, reduced motion, touch-target size, use from a local file and the provenance hashes. `test-copy.py` keeps button and tab labels short and headings plain. The four `verify-*` viewer tests check that every fault beat changes the picture, that callout labels hold still, that the machine body does not hide what a beat is pointing at, and that the cutaway responds on the first press. Results are written to `qa/`. None of these is a test of the physical machine.

## Rights

No licence is granted for the project's own text, code and 3D model; all rights are reserved. Epilog Laser retains the rights to its manuals, product names and branding; the manuals are linked, not included. Third-party components keep their own licences, retained in `licenses/`: the Anatomy kit (MIT), IBM Plex and Source Serif 4 (SIL Open Font License) and DejaVu (its own licence).
