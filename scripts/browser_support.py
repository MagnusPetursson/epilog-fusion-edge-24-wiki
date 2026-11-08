"""Browser selection shared by doctor, printer and verifier.

Order: $CHROME, a system Chrome/Chromium, Playwright's own expected build, then any
Chromium already present in the Playwright cache (any revision). The last step
fixes hosts where the installed playwright package expects a browser revision that
was never downloaded, while an older revision sits in ~/.cache/ms-playwright.
"""
import glob
import os
from pathlib import Path
import shutil


def _cache_dirs():
    env = os.environ.get('PLAYWRIGHT_BROWSERS_PATH')
    if env and env != '0':
        yield Path(env).expanduser()
    yield Path.home() / '.cache' / 'ms-playwright'                 # Linux
    yield Path.home() / 'Library' / 'Caches' / 'ms-playwright'     # macOS
    local = os.environ.get('LOCALAPPDATA')
    if local:
        yield Path(local) / 'ms-playwright'                         # Windows


def _cached_chromium():
    patterns = ['chromium-*/chrome-linux*/chrome', 'chromium_headless_shell-*/chrome-headless-shell-linux*/chrome-headless-shell',
                'chromium-*/chrome-mac*/*.app/Contents/MacOS/*', 'chromium-*/chrome-win*/chrome.exe']
    found = []
    for base in _cache_dirs():
        for pat in patterns:
            found += [p for p in glob.glob(str(base / pat)) if os.access(p, os.X_OK)]
    def revision(p):
        part = Path(p).relative_to(Path(p).anchor).parts
        for seg in part:
            if seg.startswith(('chromium-', 'chromium_headless_shell-')):
                try: return int(seg.rsplit('-', 1)[1])
                except ValueError: return 0
        return 0
    return sorted(found, key=revision, reverse=True)


def _playwright_expected():
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            path = p.chromium.executable_path
        return path if path and Path(path).is_file() else None
    except Exception:
        return None


def browser_candidates():
    requested = os.environ.get('CHROME')
    if requested:
        candidate = shutil.which(requested) or str(Path(requested).expanduser())
        if not Path(candidate).is_file():
            raise RuntimeError(f'CHROME={requested!r} does not name an executable')
        return [candidate]
    out = [c for c in (shutil.which(n) for n in ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'chrome']) if c]
    expected = _playwright_expected()
    if expected:
        out.append(expected)
    out += _cached_chromium()
    seen = []
    for c in out:
        if c not in seen:
            seen.append(c)
    return seen


def browser_options():
    cands = browser_candidates()
    if cands:
        return {'executable_path': cands[0], 'headless': True}
    raise RuntimeError('No Chrome/Chromium found. Fix one of: set CHROME=/path/to/chrome; install chromium; '
                       'or, if downloads are authorized, run `python -m playwright install chromium`.')
