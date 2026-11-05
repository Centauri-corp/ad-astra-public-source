'use strict';
const {test, expect} = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const root = path.resolve(__dirname, '../../public');
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => entry.isDirectory()
    ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
const pages = walk(root).filter(file => file.endsWith('/index.html')).map(file =>
  '/' + path.relative(root, file).replaceAll('\\', '/').replace(/index\.html$/, ''));

test('every public page has an exact canonical, indexing policy and existing local destinations', async ({request}) => {
  const destinations = new Set();
  for (const route of pages) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    const html = await response.text();
    expect(html, route).toContain(`href="https://adastra.global${route}"`);
    expect(html, route).toMatch(route === '/' ? /name="robots" content="index,follow"/ : /name="robots" content="noindex,follow"/);
    for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
      const url = new URL(match[1], 'http://127.0.0.1:4173' + route);
      if (url.origin === 'http://127.0.0.1:4173' && !url.pathname.startsWith('/api/')) destinations.add(url.pathname);
    }
  }
  for (const destination of destinations) expect((await request.head(destination)).status(), destination).toBe(200);
});

test('every public page passes automated WCAG 2.1 A/AA checks', async ({page}) => {
  await page.route('**/*', route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.pathname === '/__audit__/axe-core.js') {
      return route.fulfill({status: 200, contentType: 'application/javascript', body: axeSource});
    }
    if (!['127.0.0.1', 'localhost'].includes(requestUrl.hostname)) return route.abort();
    return route.continue();
  });

  for (const route of pages) {
    const response = await page.goto(route, {waitUntil: 'domcontentloaded'});
    expect(response?.status(), route).toBe(200);
    await page.addScriptTag({url: '/__audit__/axe-core.js'});
    const violations = await page.evaluate(async () => {
      const result = await window.axe.run(document, {
        runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']}
      });
      return result.violations.map(item => `${item.impact}:${item.id}`);
    });
    expect(violations, route).toEqual([]);
  }
});
