"""Browser regression checks. Analytics requests never reach Google."""
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from threading import Thread
from urllib.parse import unquote, urlsplit
from urllib.request import urlopen
from playwright.sync_api import sync_playwright
from check_site import ROOT, PAGES

AXE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js'
AXE_SHA = '880970c081707360e64f34cea25ff91892f5bc95675b0776925b9709dd8a68bb'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass

def main():
    with urlopen(AXE_URL, timeout=30) as response:
        axe = response.read()
    assert hashlib.sha256(axe).hexdigest() == AXE_SHA, 'Unexpected accessibility checker content'
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/'
    try:
        with sync_playwright() as p:
            options = {'headless': True}
            if os.environ.get('BROWSER_CHANNEL'):
                options['channel'] = os.environ['BROWSER_CHANNEL']
            browser = p.chromium.launch(**options)
            context = browser.new_context(reduced_motion='reduce')
            failures = []
            context.on('page', lambda page: page.on('pageerror', lambda error: failures.append(str(error))))
            page = context.new_page()
            for name in PAGES:
                response = page.goto(base + name, wait_until='networkidle')
                assert response.status == 200, name
                for width in (320, 390, 768, 1440):
                    page.set_viewport_size({'width': width, 'height': 900})
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{name}: overflow at {width}px'
                for img in page.locator('img').all():
                    img.scroll_into_view_if_needed()
                    img.evaluate('(img) => img.decode()')
                page.evaluate('window.scrollTo(0,0)')
                page.add_script_tag(content=axe.decode('utf-8'))
                violations = page.evaluate("""async () => (await axe.run(document, {
                    runOnly: {type:'tag', values:['wcag2a','wcag2aa','wcag21aa','best-practice']}
                })).violations.map(v => ({id:v.id, nodes:v.nodes.map(n => n.target)}))""")
                assert not violations, f'{name}: accessibility {violations}'
                page.set_viewport_size({'width':390, 'height':844})
                page.locator('.mobile-menu summary').click()
                assert page.locator('.mobile-menu').get_attribute('open') is not None, name + ': menu cannot open'
                page.locator('.mobile-menu a').first.click()
                page.wait_for_load_state('networkidle')
                assert page.locator('.mobile-menu').get_attribute('open') is None, name + ': menu does not close'
                print(f'PASS: {name}, four widths, images, accessibility and mobile menu', flush=True)
            assert not failures, failures
            context.close()
            consent(browser)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()

def consent(browser):
    context = browser.new_context()
    google_requests = []
    def route(request_route):
        url = urlsplit(request_route.request.url)
        if url.hostname == 'cedatoutfaire.org':
            file = ROOT / (unquote(url.path).lstrip('/') or 'index.html')
            if file.is_file() and ROOT in file.resolve().parents:
                request_route.fulfill(path=str(file))
            else:
                request_route.fulfill(status=404)
        else:
            google_requests.append(request_route.request.url)
            request_route.fulfill(status=200, content_type='application/javascript', body='')
    context.route('**/*', route)
    page = context.new_page()
    page.goto('https://cedatoutfaire.org/', wait_until='networkidle')
    assert page.locator('#cookie-banner').is_visible() and not google_requests
    page.locator('#cookie-decline').click()
    page.reload(wait_until='networkidle')
    assert page.locator('#cookie-banner').is_hidden() and not google_requests
    page.locator('#cookie-settings').click()
    page.locator('#cookie-accept').click()
    page.wait_for_load_state('networkidle')
    page.locator('#cookie-settings').click()
    page.locator('#cookie-accept').click()
    configs = page.evaluate("dataLayer.filter(x => x[0] === 'config').map(x => x[1])")
    assert configs == ['G-6GML1CR323'], 'Duplicate or incorrect GA configuration'
    assert len(google_requests) == 1 and 'googletagmanager.com/gtag/js?id=G-6GML1CR323' in google_requests[0]
    context.add_cookies([{'name':'_ga', 'value':'test-only', 'domain':'.cedatoutfaire.org', 'path':'/'}])
    second = context.new_page()
    second.goto('https://cedatoutfaire.org/realisations.html', wait_until='networkidle')
    assert second.locator('#cookie-banner').is_hidden()
    page.locator('#cookie-settings').click()
    page.locator('#cookie-decline').click()
    second.wait_for_function("window['ga-disable-G-6GML1CR323'] === true")
    assert not any(cookie['name'].startswith('_ga') for cookie in context.cookies())
    count = len(google_requests)
    page.reload(wait_until='networkidle')
    assert len(google_requests) == count and page.locator('#cookie-banner').is_hidden()
    page.evaluate("localStorage.setItem('ga_consent', JSON.stringify({version:1,value:'granted',expiresAt:1}))")
    page.reload(wait_until='networkidle')
    assert len(google_requests) == count and page.locator('#cookie-banner').is_visible()
    context.close()
    print('PASS: consent gating, refusal, single GA configuration, withdrawal across tabs, cookie deletion and expiry (Google mocked)')

if __name__ == '__main__':
    main()
