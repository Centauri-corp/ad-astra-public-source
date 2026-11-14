'use strict';
// Focused loopback acceptance of the public prototype; no provider acceptance implied.
// Run: node scripts/accept-platform-preview.cjs
// Optional: AD_ASTRA_PREVIEW_EVIDENCE=/tmp/portal-shots PLAYWRIGHT_MODULE=/path/to/playwright
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const axe = require('axe-core');
const root = path.resolve(__dirname, '../public');
const mime = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png'};
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  const file = path.resolve(root, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, content) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(content);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  const checks = [];
  try {
    browser = await chromium.launch({executablePath: fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined, headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
    const context = await browser.newContext({reducedMotion:'reduce'});
    const errors = [], badResponses = [], external = [], requests = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin !== base) { external.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    await context.addInitScript(() => {
      window.previewSensitiveCalls = [];
      const deny = name => () => { window.previewSensitiveCalls.push(name); throw new Error('Preview unexpectedly called ' + name); };
      window.fetch = deny('fetch');
      window.XMLHttpRequest = deny('XMLHttpRequest');
      navigator.sendBeacon = deny('sendBeacon');
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = deny('getUserMedia');
      Storage.prototype.setItem = deny('storage');
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) badResponses.push(response.url()); });
    page.on('request', request => requests.push({url:request.url(), method:request.method(), body:request.postData()}));
    async function layout() {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Horizontal overflow');
    }
    async function accessibility() {
      await page.evaluate(axe.source);
      const violations = await page.evaluate(async () => (await axe.run(document, {runOnly:{type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v => ({id:v.id, nodes:v.nodes.map(n => n.target)})));
      assert.deepEqual(violations, []);
    }
    const evidence = process.env.AD_ASTRA_PREVIEW_EVIDENCE;
    if (evidence) fs.mkdirSync(evidence, {recursive:true});
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:900});
      await page.goto(base + '/platform-preview/', {waitUntil:'networkidle'});
      await layout();
      assert.equal(await page.locator('#neural-image').evaluate(img => img.complete && img.naturalWidth > 0), true);
      if (width === 390) await accessibility();
      if (evidence && [390,1440].includes(width)) await page.screenshot({path:path.join(evidence, 'portal-' + width + '.png'),fullPage:true});
      for (const mode of ['research','create','plan']) {
        await page.locator('#mode-' + mode).click();
        for (let preset = 0; preset < 3; preset++) {
          await page.locator('[data-preset="' + preset + '"]').click();
          assert.equal(await page.locator('[data-preset="' + preset + '"]').getAttribute('aria-pressed'), 'true');
          await page.locator('#view-sample').click();
          assert.equal(await page.locator('#sample-result').isVisible(), true);
          assert.equal(await page.locator('#sample-sections>li').count(), 3);
          assert.match(await page.locator('#sample-boundary').textContent(), /Prewritten sample/);
          await layout();
        }
      }
      if (width === 390) {
        await accessibility();
        await page.locator('#sample-result [data-open-references]').click();
        assert.equal(await page.locator('#reference-dialog').evaluate(el => el.open), true);
        await accessibility();
        await layout();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#sample-result [data-open-references]').evaluate(el => document.activeElement === el), true);
      }
      checks.push(width + 'px: all nine samples, no overflow or broken scene');
    }
    for (const mode of ['research','create','plan']) {
      await page.goto(base + '/platform-preview/?mode=' + mode, {waitUntil:'networkidle'});
      assert.equal(await page.locator('#mode-' + mode).getAttribute('aria-selected'), 'true');
    }
    await page.goto(base + '/platform-preview/?mode=invalid', {waitUntil:'networkidle'});
    assert.equal(await page.locator('#mode-research').getAttribute('aria-selected'), 'true');
    await page.locator('#mode-research').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#mode-create').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.locator('#mode-plan').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('#mode-research').getAttribute('aria-selected'), 'true');
    checks.push('mode deep links, invalid fallback and roving keyboard tabs');
    const before = requests.length;
    await page.locator('#preview-prompt').fill('PRIVATE_PREVIEW_SENTINEL <script>example</script>');
    await page.locator('#preview-prompt').press('Control+Enter');
    assert.match(await page.locator('#sample-boundary').textContent(), /does not change this example/);
    assert.equal(await page.locator('#sample-result').textContent().then(text => text.includes('PRIVATE_PREVIEW_SENTINEL')), false);
    await page.locator('#preview-voice').click();
    assert.match(await page.locator('#composer-note').textContent(), /Voice activation will be available after customer access verification/);
    await page.locator('#reset-preview').click();
    assert.equal(await page.locator('#preview-prompt').inputValue(), '');
    assert.equal(await page.locator('#sample-result').isHidden(), true);
    assert.equal(requests.length, before, 'Interactions must make zero requests');
    assert.deepEqual(await page.evaluate(() => window.previewSensitiveCalls), []);
    checks.push('custom text stays local, voice notice, reset, zero network/storage/microphone calls');
    await page.locator('#preview-prompt').fill('EPHEMERAL_DRAFT');
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#preview-prompt').inputValue(), '');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(() => document.querySelector('#main').dataset.visualMotion === 'on');
    assert.equal(await page.locator('#main').getAttribute('data-visual-motion'), 'on');
    await page.locator('#preview-motion').click();
    assert.equal(await page.locator('#main').getAttribute('data-visual-motion'), 'off');
    await page.locator('#neural-scene').hover();
    assert.equal(await page.locator('#neural-scene').evaluate(el => el.style.getPropertyValue('--scene-x')), '');
    await page.locator('#preview-motion').click();
    await page.locator('#neural-scene').hover({position:{x:30,y:30}});
    assert.notEqual(await page.locator('#neural-scene').evaluate(el => el.style.getPropertyValue('--scene-x')), '');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(() => document.querySelector('#preview-motion').disabled);
    assert.equal(await page.locator('#main').getAttribute('data-visual-motion'), 'off');
    assert.equal(await page.locator('#preview-motion').isDisabled(), true);
    checks.push('refresh clears draft; pause, resume, pointer interaction and reduced-motion fallback');
    assert.deepEqual(errors, []);
    assert.deepEqual(badResponses, []);
    assert.deepEqual(external, []);
    console.log(JSON.stringify({pass:true, scope:'local interactive visual preview',checks,accessibility:'axe: 390px welcome, sample and reference dialog; no violations',evidence:evidence || null}, null, 2));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
