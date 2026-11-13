'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {TRUST_ROUTES} = require('../scripts/lib/customer-trust.cjs');
const publicRoot = path.join(__dirname, '../public');

test('trust pages: desktop/mobile accessibility, keyboard navigation, no external requests and no-JS reading', {timeout: 60000}, async t => {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    let file = path.resolve(publicRoot, '.' + decodeURIComponent(pathname));
    if (!file.startsWith(publicRoot + path.sep)) { res.writeHead(404); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml'};
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless: true});
  t.after(() => browser.close());
  const external = [], writes = [];
  for (const width of [390, 1280]) {
    const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
    await context.route('**/*', request => {
      if (!request.request().url().startsWith(origin + '/')) { external.push(request.request().url()); return request.abort(); }
      if (request.request().method() !== 'GET') writes.push(request.request().method());
      return request.continue();
    });
    for (const route of TRUST_ROUTES) {
      const page = await context.newPage();
      const errors = [], failed = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) failed.push(response.url()); });
      await page.goto(origin + route, {waitUntil: 'networkidle'});
      assert.ok(await page.locator('h1').isVisible());
      assert.equal(await page.locator('nav[aria-label="Customer trust"] a[aria-current="page"]').getAttribute('href'), route);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, route + ' overflow at ' + width);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to content');
      await page.keyboard.press('Enter');
      assert.equal(new URL(page.url()).hash, '#main');
      if (width === 390) {
        await page.locator('.site-menu summary').click();
        assert.equal(await page.locator('.site-menu').evaluate(menu => menu.open), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.site-menu').evaluate(menu => menu.open), false);
      }
      for (const href of TRUST_ROUTES) assert.ok(await page.locator('.site-footer a[href="' + href + '"]').isVisible());
      await page.addScriptTag({path: require.resolve('axe-core/axe.min.js')});
      const violations = await page.evaluate(async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}})).violations.map(v => ({id: v.id, nodes: v.nodes.map(n => n.target)})));
      assert.deepEqual(violations, [], route + ' accessibility at ' + width);
      assert.deepEqual(errors, [], route);
      assert.deepEqual(failed, [], route);
      await page.close();
    }
    await context.close();
  }
  const plain = await browser.newContext({javaScriptEnabled: false, viewport: {width: 320, height: 800}});
  for (const route of TRUST_ROUTES) {
    const page = await plain.newPage();
    await page.goto(origin + route);
    assert.ok(await page.locator('h1').isVisible());
    assert.ok(await page.locator('.trust-section').first().isVisible());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, route + ' no-JS overflow');
    await page.locator('.trust-contents a').first().click();
    assert.ok(new URL(page.url()).hash.length > 1);
    await page.close();
  }
  await plain.close();
  assert.deepEqual(external, []);
  assert.deepEqual(writes, []);
});
