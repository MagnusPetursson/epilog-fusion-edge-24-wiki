"""Check actual tools and browser launch, not host-specific paths."""
import importlib.util
import json
import shutil
import subprocess
import sys
from browser_support import browser_options


def main():
    report = {'python': sys.version.split()[0], 'tools': {}, 'errors': []}
    if sys.version_info < (3,10): report['errors'].append('Python 3.10+ required')
    for name in ['node', 'pdfinfo', 'pdftotext', 'pdffonts', 'pdftoppm']:
        path=shutil.which(name)
        report['tools'][name]=path
        if not path: report['errors'].append(f'Missing {name}')
    if report['tools']['node']:
        version=subprocess.check_output(['node','--version'],text=True).strip()
        report['node_version']=version
        if int(version.lstrip('v').split('.')[0])<22: report['errors'].append('Node 22+ required')
    if importlib.util.find_spec('playwright') is None:
        report['errors'].append('Install requirements.txt into the selected Python environment')
    else:
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser=p.chromium.launch(**browser_options())
                report['browser_version']=browser.version
                browser.close()
        except Exception as e: report['errors'].append(f'Browser launch failed: {e}')
    print(json.dumps(report,indent=2))
    return bool(report['errors'])

if __name__=='__main__': sys.exit(main())
