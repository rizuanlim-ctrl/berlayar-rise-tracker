import os
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
from zipfile import ZipFile
from playwright.sync_api import sync_playwright

base = os.environ.get('TRACKER_TEST_URL', 'http://127.0.0.1:8765')
if base.startswith('http://127.0.0.1:'):
    server = ThreadingHTTPServer(('127.0.0.1',8765),SimpleHTTPRequestHandler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get('TRACKER_TEST_CHROMIUM'), args=['--no-sandbox'])
    page = browser.new_page(accept_downloads=True, viewport={'width':1280,'height':800})
    def set_input(field, value):
        locator = page.locator('#'+field)
        if locator.get_attribute('type') == 'number':
            locator.evaluate("(element, value) => { element.value=value; element.dispatchEvent(new Event('input',{bubbles:true})); }",value)
        else:
            locator.fill(value)
    errors, requests = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: requests.append((request.method,request.url)))
    response = page.goto(base+'/financial-planning.html')
    assert response.status == 200
    page.locator('#tenureMode').select_option('manual')
    standard = dict(oa='90000',oadate='2026-11-26',monthlyOA='900',loan='210000',grant='15000',
        reserve='20000',bookDate='2026-12-01',aflDate='2027-05-01',keyDate='2031-09-01',tenure='20',
        income1='4200',availableCash='30000',netIncome='3400',livingExpense='2000',
        birthDate='1979-08-01',frs55='230000',sa55='120000')
    for field, value in standard.items():
        set_input(field,value)
    metrics = page.evaluate('financeMetrics')
    assert metrics['maximum'] > metrics['conservativeMaximum'] > 0
    assert metrics['conservativeCash'] >= 0
    assert 'saved' in page.locator('#chosenlabel').text_content().lower()
    assert all(method=='GET' and urlparse(url).netloc==urlparse(base).netloc for method,url in requests), requests
    planner_keys = page.evaluate('Object.keys(localStorage).sort()')
    assert planner_keys == ['berlayar-finance-active-room','berlayar-finance-theme'], planner_keys
    for _ in range(3):
        page.locator('#jumpUnits').click()
        page.locator('#unitgrid button').nth(_).click()
    page.locator('[data-tab=compare]').click()
    assert page.locator('#comparison thead th').count() == 4
    assert page.locator('#comparison').get_by_text('Cash shortfall',exact=True).count() == 1
    with page.expect_download() as capture:
        page.locator('#exportExcel').click()
    download = capture.value
    with ZipFile(download.path()) as workbook:
        assert workbook.testzip() is None
        assert b'Conservative maximum price' in workbook.read('xl/worksheets/sheet2.xml')
        comparison = workbook.read('xl/worksheets/sheet3.xml')
        assert b'Cash shortfall' in comparison and comparison.count(b'Blk ') == 3
    page.locator('[data-tab=planner]').click()
    for label in ['3R','4R']:
        page.locator('[data-room="'+label+'"]').click()
        page.locator('#buyerProfile').select_option('family')
        set_input('income2','3900')
        set_input('monthlyOA2','700')
        assert page.evaluate('financeMetrics.maximum') > 0
        assert page.locator('#optionFee').input_value() == {'3R':'1000','4R':'2000'}[label]
    page.locator('#loanType').select_option('bank')
    set_input('mortRate','3.5')
    assert '%' in page.locator('#tdsrResult').text_content()
    page.locator('[data-room="2R"]').click()
    page.locator('#leaseCategory').select_option('short')
    assert 'short-lease price' in page.locator('#warnings').text_content()
    set_input('price','150000')
    set_input('cpfUseLimit','65000')
    assert page.locator('#mmonthly').text_content() == 'S$0'
    assert page.evaluate('financeMetrics.maximum') > 0
    page.locator('#theme-toggle').click()
    for width in [1280, 820, 390]:
        page.set_viewport_size({'width':width,'height':850})
        assert page.locator('html').get_attribute('data-finance-theme') == 'light'
        assert page.evaluate('document.documentElement.scrollWidth === innerWidth'), width
        height = page.locator('#availableCash').evaluate('(element)=>element.getBoundingClientRect().height')
        assert height == 44, height
    page.locator('#finance-exit').click()
    page.wait_for_url(base+'/')
    page.go_back()
    page.wait_for_url('**/financial-planning.html')
    assert page.locator('#availableCash').input_value() == ''
    assert page.locator('#oa').input_value() == ''
    assert not errors, errors
    tracker = browser.new_page()
    assert tracker.goto(base+'/').status == 200
    tracker.locator('#financial-planning-open').wait_for(state='visible')
    tracker.locator('#unit-3d-explorer-open').wait_for(state='attached')
    tracker.get_by_text('Queue Progress', exact=True).first.wait_for(state='attached')
    tracker.get_by_text('Selection Counters', exact=True).first.wait_for(state='attached')
    tracker.locator('#financial-planning-open').click()
    tracker.wait_for_url('**/financial-planning.html')
    assert tracker.locator('#statuspill').text_content() == 'Inputs needed'
    for route in ['/berlayar-3d.html','/unit-3d-explorer.html','/stack-139-walkthrough.html']:
        assert tracker.request.get(base+route).ok
    print('Browser checks passed: room tabs, totals, comparison, workbook, short lease, layouts, theme, privacy and history.')
