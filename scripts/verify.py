"""Verify the generated site (pages + WebGL viewer + two PDFs) under a project subpath; write results to qa/.
Checks: local links/fragments/duplicate IDs, both themes in a browser, one h1 and site navigation per page, theme attribute,
no JS errors, no non-font external requests, PDF text/fonts/canonical content and HTTP download, mobile overflow,
the WebGL viewer (part tour, faults, lid key, reset) and a no-JavaScript fallback."""
import functools
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import subprocess
import threading
from urllib.parse import urlsplit, unquote
from playwright.sync_api import sync_playwright
from browser_support import browser_options

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
QA=ROOT/'qa'
PDFS=['epilog-handbook','epilog-wiki']
FONT_HOSTS={'fonts.googleapis.com','fonts.gstatic.com'}  # the ShopBot design system loads its web fonts from Google Fonts
GL_ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']

class Document(HTMLParser):
    def __init__(self,path):
        super().__init__();self.ids=[];self.links=[];self.feed(path.read_text(encoding='utf-8'))
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        for key in ['href','src']:
            if key in a and not (a[key] or '').startswith('data:'):self.links.append(a[key])

class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
    def translate_path(self,path):
        return super().translate_path(path.removeprefix('/demo-project'))

def norm(s):return re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',s).replace('\u00ad','')).strip()

def main():
    QA.mkdir(exist_ok=True)
    report={'errors':[],'html_pages':0,'local_links':0,'browser_pages':0,'state_checks':0,'pdfs':[]}
    def check(ok,msg):
        if not ok:report['errors'].append(msg)
    docs={p.resolve():Document(p) for p in DIST.rglob('*.html') if 'licenses' not in p.parts}
    report['html_pages']=len(docs)
    for path,doc in docs.items():
        check(len(doc.ids)==len(set(doc.ids)),f'Duplicate IDs: {path.name}')
        for href in doc.links:
            u=urlsplit(href)
            if u.scheme or u.netloc:continue
            report['local_links']+=1
            target=(path.parent/unquote(u.path)).resolve() if u.path else path
            check(target==DIST or DIST in target.parents,f'Link escapes dist: {href}')
            check(target.is_file(),f'Missing target: {path.name} -> {href}')
            if u.fragment and target in docs and not u.fragment.startswith(('view=','fault=','part=')):
                check(unquote(u.fragment) in docs[target].ids,f'Missing fragment: {path.name} -> {href}')
    K=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import * as K from './generator/sbsite/content.mjs'; console.log(JSON.stringify({MACHINE:K.MACHINE,PAGES:K.PAGES,RULES:K.RULES,STEPS:K.STEPS,QUIZ:K.QUIZ,FAULTS:K.FAULTS}))"],cwd=ROOT,text=True))
    for name in PDFS:
        pdf=DIST/(name+'.pdf')
        info=subprocess.check_output(['pdfinfo',str(pdf)],text=True)
        count=int(re.search(r'^Pages:\s+(\d+)',info,re.M).group(1))
        text=subprocess.check_output(['pdftotext','-layout',str(pdf),'-'],text=True)
        font_text=subprocess.check_output(['pdffonts',str(pdf)],text=True)
        rows=font_text.splitlines()[2:]
        check(bool(rows) and all(re.search(r'\byes\s+(?:yes|no)\s+(?:yes|no)\s+\d+\s+\d+\s*$',r) for r in rows),f'Unembedded font: {name}')
        check(count>=2,f'Too few PDF pages: {name}')
        check(len(text.strip())>500,f'PDF lacks searchable text: {name}')
        flat=norm(text)
        def present(s,n=48):return norm(s)[:n] in flat
        check(present(K['MACHINE']['name']),f'Missing machine name: {name}')
        for r in K['RULES']:check(present(r[0]),f'Missing rule "{r[0]}": {name}')
        for sec in K['STEPS']:
            for st in sec[1]:check(present(st[0]),f'Missing step "{st[0]}": {name}')
        for f in K['FAULTS']:check(present(f[2],30),f'Missing fault {f[0]} "{f[2]}": {name}')
        if name=='epilog-wiki':
            for q in K['QUIZ']:check(present(q[0],40),f'Missing quiz prompt: {q[0][:40]}')
        (QA/(name+'.txt')).write_text(text,encoding='utf-8')
        (QA/(name+'-fonts.txt')).write_text(font_text,encoding='utf-8')
        for stale in QA.glob(name+'-*.png'):
            if re.search(r'-\d+\.png$',stale.name): stale.unlink()
        subprocess.run(['pdftoppm','-scale-to','900','-png',str(pdf),str(QA/name)],check=True,stdout=subprocess.DEVNULL)
        report['pdfs'].append({'name':name,'pages':count,'bytes':pdf.stat().st_size,'embedded_fonts':len(rows)})
    handler=functools.partial(Handler,directory=str(ROOT))
    server=ThreadingHTTPServer(('127.0.0.1',0),handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    base=f'http://127.0.0.1:{server.server_port}/demo-project/'
    pages=['index']+[p['file'].removesuffix('.html') for p in K['PAGES']]
    try:
        with sync_playwright() as p:
            opts=browser_options();opts['args']=list(opts.get('args',[]))+GL_ARGS
            browser=p.chromium.launch(**opts)
            try:
                page=browser.new_page(viewport={'width':1360,'height':1000},reduced_motion='reduce')
                page.on('pageerror',lambda e:report['errors'].append('JS: '+str(e)))
                local=lambda u:u.startswith(('data:','blob:')) or urlsplit(u).hostname in ('127.0.0.1',None) or urlsplit(u).hostname in FONT_HOSTS
                page.on('request',lambda r:check(local(r.url),f'External runtime request: {r.url}'))
                page.on('response',lambda r:check(r.status<400 or urlsplit(r.url).hostname in FONT_HOSTS,f'HTTP {r.status}: {r.url}'))
                for theme in ['', 'light/']:
                    for pid in pages+['webgl']:
                        response=page.goto(base+'dist/'+theme+pid+'.html',wait_until='load')
                        check(response.status==200,'Page not served')
                        report['browser_pages']+=1
                        check(page.locator('h1').count()==1,f'One h1 required: {theme}{pid}')
                        check(page.locator('nav[aria-label="Site"]').count()==1,f'Navigation missing: {theme}{pid}')
                        check(page.locator('body').get_attribute('data-theme')==('light' if theme else 'dark'),f'Wrong theme: {theme}{pid}')
                        if pid=='webgl':
                            page.wait_for_function('window.__epilog !== undefined',timeout=20000)
                            d=page.evaluate('__epilog.data')
                            check(len(d['faults'])>=9,'Viewer fault count')
                            for f in d['faults']:
                                st=page.evaluate(f"() => {{ __epilog.fault({json.dumps(f['id'])}, 0); __epilog.settle(1); return __epilog.state(); }}")
                                check(st['fault']==f['id'],f'Fault not staged: {f["id"]}');report['state_checks']+=1
                                for b in range(1,f['beats']):
                                    st=page.evaluate(f"() => {{ __epilog.beat({b}); __epilog.settle(0.5); return __epilog.state(); }}")
                                    check(st['beat']==b,f'Beat not reached: {f["id"]} {b}');report['state_checks']+=1
                            page.evaluate("() => { __epilog.fault(null); __epilog.settle(0.5); }")
                            lid0=page.evaluate('__epilog.state().P.lid')
                            page.locator('.sb-gl-stage').focus();page.keyboard.press('l');page.evaluate('__epilog.settle(3)')
                            check(page.evaluate('__epilog.state().P.lid')>lid0+0.5,'Keyboard lid toggle failed')
                            page.keyboard.press('l');page.evaluate('__epilog.settle(3)')
                            check(page.evaluate('__epilog.state().P.lid')<0.05,'Keyboard lid close failed')
                            page.screenshot(path=str(QA/(('light' if theme else 'dark')+'-webgl.png')))
                        if pid=='quiz':
                            n=page.locator('details').count()
                            for summary in page.locator('summary').all():
                                if summary.is_visible():summary.click()
                            check(page.locator('details[open]').count()>=len(K['QUIZ']),'Quiz disclosure failed')
                for filename in [n+'.pdf' for n in PDFS]:
                    response=page.request.get(base+'dist/'+filename)
                    check(response.status==200 and response.body().startswith(b'%PDF-'),'PDF HTTP download failed: '+filename)
                page.set_viewport_size({'width':390,'height':844})
                for theme in ['', 'light/']:
                    for pid in pages+['webgl']:
                        page.goto(base+'dist/'+theme+pid+'.html',wait_until='load')
                        check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'Mobile overflow: {theme}{pid}')
                page.set_viewport_size({'width':1200,'height':900})
                for pdf in report['pdfs']:
                    images=[f for f in sorted(QA.glob(pdf['name']+'-*.png')) if re.fullmatch(re.escape(pdf['name'])+r'-\d+\.png',f.name)]
                    check(len(images)==pdf['pages'],'PDF raster page count mismatch')
                    markup='<html><body style="background:#ddd;font:16px Arial"><h1>'+pdf['name']+'</h1><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">'+''.join(f'<figure style="margin:0"><img style="width:100%" src="{f.name}"><figcaption>{f.name}</figcaption></figure>' for f in images)+'</div></body></html>'
                    sheet=QA/(pdf['name']+'-contact.html');sheet.write_text(markup,encoding='utf-8')
                    page.goto(base+'qa/'+sheet.name,wait_until='networkidle')
                    page.screenshot(path=str(QA/(pdf['name']+'-contact.png')),full_page=True)
                offline=browser.new_page(java_script_enabled=False)
                for pid in pages:
                    offline.goto(base+'dist/'+pid+'.html')
                    check(offline.locator('h1').count()==1 and len(offline.locator('main, body').first.inner_text())>200,f'No-JS page empty: {pid}')
                offline.goto(base+'dist/machine.html')
                check(offline.locator('a[href^="webgl.html"]').count()>=1,'No-JS fallback: machine page lacks a link to the 3D model')
                report['no_js_fallback']=True
            finally:browser.close()
    finally:server.shutdown();server.server_close();thread.join()
    (QA/'verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2))
    return bool(report['errors'])

if __name__=='__main__':raise SystemExit(main())
