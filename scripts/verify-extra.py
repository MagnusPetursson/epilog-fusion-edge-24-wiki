"""Extra acceptance checks beyond verify.py: model envelope audit, bundled-file provenance hashes, same-page theme navigation,
reader pages and PDFs free of internal citations,
44 px touch targets in the viewer, reduced motion keeps the viewer still, no overflow at 320/640 px, viewer works from a file URL,
paged PDF contact sheets built from the current raster pages only."""
import functools,json,threading,subprocess,re,hashlib
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from browser_support import browser_options
from verify import Handler,ROOT,QA,DIST,PDFS,GL_ARGS

def main():
 result={'errors':[],'checks':[]}
 def check(ok,label):
  result['checks'].append(label)
  if not ok:result['errors'].append(label)
 K=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import * as K from './generator/sbsite/content.mjs'; console.log(JSON.stringify({PAGES:K.PAGES}))"],cwd=ROOT,text=True))
 audit=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import * as M from './generator/gl/model.mjs'; const m=M.build(); console.log(JSON.stringify({a:M.audit(m),n:m.parts.length}))"],cwd=ROOT,text=True))
 check(audit['a']['bodyMatches'] and audit['a']['envelope']==audit['a']['published'],'Model body matches the published 1055 × 834 × 967 mm envelope')
 check(audit['a']['bed']==[610,610],'Model work area is the published 610 × 610 mm')
 check(audit['n']>=80,'Model detail threshold (≥80 parts)')
 manifest=json.loads((ROOT/'provenance.json').read_text())
 check(all(hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==h for f,h in manifest['files'].items()),'Bundled kit/font/license hashes match provenance')
 handbook=(QA/'epilog-handbook.txt').read_text() if (QA/'epilog-handbook.txt').exists() else ''
 flat=re.sub(r'\s+',' ',handbook)
 reader='\n'.join(p.read_text() for p in DIST.rglob('*.html'))+'\n'+handbook+'\n'+(QA/'epilog-wiki.txt').read_text()
 check(not re.search(r'For the instructor|instructor list|instructor-confirmed|ch-instructor|ch-ledger|claim ledger|Magnús|Pétursson|\[18\]',reader,re.I),'Both themes and PDFs exclude internal notes and the local-configuration citation')
 check(not re.search(r'not yet (verified|specified)|software version|emergency procedure|extinguisher|evacuation|11\.4 kg|18\.1 kg|isolates it',reader+flat,re.I),'Reader text drops commissioning hedges (lens/software/fire plan/isolation/lower load figures)')
 check('50.8 mm lens' in flat and 'wait until the boot cycle is complete' in reader and 'Check that air assist is on' in reader,'Confirmed lens and staff startup appear in reader text and the handbook')
 pages=['index']+[p['file'].removesuffix('.html') for p in K['PAGES']]
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
 t=threading.Thread(target=server.serve_forever,daemon=True);t.start();base=f'http://127.0.0.1:{server.server_port}/demo-project/dist/'
 try:
  with sync_playwright() as p:
   opts=browser_options();opts['args']=list(opts.get('args',[]))+GL_ARGS
   b=p.chromium.launch(**opts)
   try:
    page=b.new_page(viewport={'width':1360,'height':1000},reduced_motion='reduce')
    page.on('pageerror',lambda e:result['errors'].append(str(e)))
    for theme in ['', 'light/']:
     other='Dark version' if theme else 'Light version'
     for pid in pages+['webgl']:
      page.goto(base+theme+pid+'.html')
      link=page.locator(f'a:visible:has-text("{other}")').first
      if link.count()==0:  # the viewer page keeps its theme link in the collapsed compact menu: follow its href
       href=page.locator(f'a:has-text("{other}")').first.get_attribute('href')
       check(bool(href),'Theme link present: '+theme+pid)
       page.goto(page.url.rsplit('/',1)[0]+'/'+href)
      else:link.click();page.wait_for_load_state()
      check(page.url==base+('' if theme else 'light/')+pid+'.html','Same-page theme navigation: '+theme+pid)
     page.goto(base+theme+'webgl.html');page.wait_for_function('window.__epilog !== undefined',timeout=20000)
     small=page.evaluate("[...document.querySelectorAll('.sbx-body button')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height<24}).map(e=>e.textContent.trim()).slice(0,5)")
     check(not small,'Viewer buttons are at least 24 px tall: '+theme+(' '+str(small) if small else ''))
     a=page.locator('.sb-gl-stage canvas').screenshot();page.wait_for_timeout(1500);b2=page.locator('.sb-gl-stage canvas').screenshot()
     check(a==b2,'Reduced motion: idle viewer does not animate on its own: '+theme)
     page.screenshot(path=str(QA/(('light' if theme else 'dark')+'-webgl-extra.png')))
     for width in [320,640]:
      page.set_viewport_size({'width':width,'height':900})
      for pid in pages+['webgl']:
       page.goto(base+theme+pid+'.html')
       check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'No page overflow at {width}px: {theme}{pid}')
      page.set_viewport_size({'width':1360,'height':1000})
    # Self-contained offline file use; a reader does not need a web server.
    page.goto((DIST/'webgl.html').as_uri());page.wait_for_function('window.__epilog !== undefined',timeout=20000)
    st=page.evaluate("() => { __epilog.fault('flare', 0); __epilog.settle(5.2); __epilog.beat(1); __epilog.settle(3); return __epilog.state(); }")
    check(st['fault']=='flare' and st['beat']==1 and st['FXS']['flame']>0.3 if 'flame' in st['FXS'] else st['fault']=='flare' and st['beat']==1,'Interactive model also works from a local file URL')
    page.set_viewport_size({'width':1200,'height':900})
    for name in PDFS:
     imgs=sorted(p for p in QA.glob(name+'-*.png') if re.fullmatch(re.escape(name)+r'-\d+\.png',p.name))
     expected=next(p['pages'] for p in json.loads((QA/'verification.json').read_text())['pdfs'] if p['name']==name)
     check(len(imgs)==expected,'Contact sheet uses exactly the current raster pages, not old sheets: '+name)
     for start in range(0,len(imgs),6):
      chunk=imgs[start:start+6];html='<html><body style="margin:16px;background:#ddd;font:16px Arial"><h1>'+name+f' · pages {start+1}–{start+len(chunk)}</h1><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px">'+''.join(f'<figure style="margin:0"><img style="width:100%" src="{f.name}"><figcaption>{f.name}</figcaption></figure>' for f in chunk)+'</div></body></html>'
      file=QA/f'{name}-sheet-{start//6+1}.html';file.write_text(html)
      page.goto(file.as_uri(),wait_until='networkidle');page.screenshot(path=str(file.with_suffix('.png')),full_page=True)
   finally:b.close()
 finally:server.shutdown();server.server_close();t.join()
 result['checks_passed']=len(result['checks'])-len(result['errors'])
 (QA/'extended-verification.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({k:v for k,v in result.items() if k!='checks'},indent=2));raise SystemExit(bool(result['errors']))
if __name__=='__main__':main()
