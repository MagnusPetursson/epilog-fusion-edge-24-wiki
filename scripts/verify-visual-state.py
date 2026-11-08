"""Visible-state contract for the WebGL viewer: metadata-only state changes must not pass. Three assertions, per theme:
1. staged fault beats change what you SEE (canvas pixels), and re-rendering an unchanged state does not;
2. negative control: changing only metadata (caption, beat label, callout text) leaves the pixels unchanged, and the
   pixel check REJECTS it as a visual state, so the verifier cannot be satisfied by metadata;
3. reset (fault off, same camera) restores the initial frame.
The exhaustive per-beat sweep over all faults is scripts/verify-gl-beats.py; this script is the contract test."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_support import browser_options
ROOT=Path(__file__).resolve().parents[1]
GL_ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
MIN_FRAC=0.10    # a real beat changes at least 10 % of pixels
MAX_SAME=0.02    # re-rendering an unchanged state (ambient ring pulse etc.)
SEED="Math.random=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647})();"

def grab(page,pre=''):
    return page.evaluate("() => {"+pre+"; const c=document.querySelector('.sb-gl-stage canvas'); const g=document.createElement('canvas'); g.width=240; g.height=Math.round(240*c.height/c.width); const x=g.getContext('2d'); x.drawImage(c,0,0,g.width,g.height); return Array.from(x.getImageData(0,0,g.width,g.height).data); }")

def diff(a,b):
    n=len(a)//4;d=0
    for i in range(0,len(a),4):
        if abs(a[i]-b[i])+abs(a[i+1]-b[i+1])+abs(a[i+2]-b[i+2])>24:d+=1
    return d/n

def visible_state(a,b):
    """The contract: a state change counts only if the pixels change."""
    return diff(a,b)>=MIN_FRAC

def main():
    result={'themes':[],'metadata_only_negative_rejected':False}
    with sync_playwright() as p:
        opts=browser_options();opts['args']=list(opts.get('args',[]))+GL_ARGS
        browser=p.chromium.launch(**opts)
        try:
            for theme in ['', 'light/']:
                page=browser.new_page(viewport={'width':1100,'height':760},reduced_motion='reduce')
                errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
                page.goto((ROOT/'dist'/theme/'webgl.html').as_uri()+'?embed')
                page.wait_for_function('window.__epilog !== undefined',timeout=20000);page.wait_for_timeout(800)
                page.evaluate('__epilog.stop()')
                first=grab(page,SEED+"__epilog.fault('smoke',0); __epilog.settle(5.2)")
                # 2. negative control: metadata only. Pixels must not change, and the visible-state check must reject it.
                page.evaluate("""()=>{document.querySelectorAll('[data-caption],[data-beat]').forEach(e=>e.textContent='Capture fails · No flow');
                  document.querySelectorAll('.sbx-callout').forEach(e=>{e.hidden=false;e.textContent='Smoke at the lens'});}""")
                meta=grab(page,'')
                assert diff(first,meta)<=MAX_SAME,'Metadata edit changed the canvas; the control is not metadata-only'
                if visible_state(first,meta):raise AssertionError('Negative control passed: verifier accepts invisible metadata as a visual state')
                result['metadata_only_negative_rejected']=True
                # 1. real beats change the picture; re-rendering the same beat does not
                frames=[first]
                for k in [1,2,3]:
                    frames.append(grab(page,f"__epilog.beat({k}); __epilog.settle(5.2)"))
                    page.locator('.sb-gl-stage').screenshot(path=str(ROOT/'qa'/f'{theme.strip("/") or "dark"}-smoke-beat-{k}.png'))
                fracs=[round(diff(frames[i],frames[i+1]),4) for i in range(3)]
                assert all(f>=MIN_FRAC for f in fracs),f'A beat did not visibly change the scene: {fracs}'
                same=round(diff(frames[-1],grab(page,'__epilog.settle(3)')),4)
                assert same<=MAX_SAME,f'Unchanged state re-render differs by {same}'
                # 3. reset (fault off, whole-machine view) restores the same frame whichever beat it left from
                base=grab(page,SEED+"__epilog.fault(null); __epilog.view('whole'); __epilog.settle(8)")
                again=grab(page,SEED+"__epilog.fault('smoke',0); __epilog.settle(5.2); __epilog.beat(2); __epilog.settle(5.2); __epilog.fault(null); __epilog.view('whole'); __epilog.settle(8)")
                reset=round(diff(base,again),4)
                assert reset<=MAX_SAME,f'Reset does not restore the visible initial frame ({reset})'
                assert not errs,errs
                result['themes'].append({'theme':theme or 'dark','beat_change_fractions':fracs,'same_state_rerender':same,'reset_diff':reset,
                                         'visible_transition':True,'reset_restores_frame':True,'metadata_only_negative_rejected':True})
                page.close()
        finally:browser.close()
    (ROOT/'qa/visual-state-regression.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
if __name__=='__main__':main()
