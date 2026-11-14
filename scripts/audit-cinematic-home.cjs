'use strict';
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const base = 'http://127.0.0.1:' + (process.env.AD_ASTRA_AUDIT_PORT || 4175);
const output = process.env.AD_ASTRA_AUDIT_OUTPUT || path.join(root, 'LStra/cinematic-review');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
 fs.mkdirSync(output, {recursive: true});
 const browser = await chromium.launch({executablePath: fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined,
  headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']});
 const evidence = {schema: 'ad-astra-cinematic-review/v1', observedAt: new Date().toISOString(), scope: 'Local visual and interaction checks; no live customer or engine acceptance', widths: [], assertions: []};
 try {
  for (const width of [390, 1440]) {
   const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'no-preference'});
   const page = await context.newPage(), errors = [], forbidden = [];
   await context.route('**/*', route => { const request = route.request(); if (new URL(request.url()).origin !== base || request.method() !== 'GET') { forbidden.push(request.method() + ' ' + new URL(request.url()).pathname); return route.abort(); } return route.continue(); });
   page.on('pageerror', error => errors.push(error.message));
   await page.goto(base + '/', {waitUntil: 'networkidle'});
   await page.waitForFunction(() => document.querySelector('[data-neural-hero]')?.dataset.neuralState === 'ready', {timeout: 30000});
   assert.equal(await page.locator('[data-neural-hero] canvas').count(), 1);
   const canvas = page.locator('[data-neural-hero] canvas');
   const dimensions = await canvas.boundingBox();
   assert.ok(dimensions.width >= 300 && dimensions.height >= 300, 'The hero must render a full-size 3D scene, not a hidden or one-pixel canvas.');
   const first = await canvas.screenshot(); await delay(350);
   assert.equal(first.equals(await canvas.screenshot()), false, 'The actual rendered neural sculpture must move.');
   if(width===1440){
    await page.evaluate(()=>{const sequence=document.querySelector('[data-arrival-sequence]'),hero=document.querySelector('.ad-arrival');scrollTo({top:(sequence.offsetHeight-hero.offsetHeight)*.65,behavior:'instant'});});
    await page.waitForFunction(()=>Number(document.querySelector('[data-arrival-sequence]').style.getPropertyValue('--ad-story-progress'))>.5);
    assert.equal(await page.locator('.ad-arrival').evaluate(element=>getComputedStyle(element).position),'sticky');
    assert.ok(await page.locator('.ad-arrival-phase').evaluate(element=>Number(getComputedStyle(element).opacity)>.99));
    assert.equal(await page.locator('#arrival-title').evaluate(element=>Number(getComputedStyle(element).opacity)),0,'The first headline must disappear before the next narrative becomes readable.');
   }
   await page.locator('[data-motion-toggle]').click();
   assert.equal(await page.locator('body').getAttribute('data-motion'), 'off');
   const stopped = await canvas.screenshot(); await delay(200);
   assert.equal(stopped.equals(await canvas.screenshot()), true, 'Pause must freeze the actual canvas pixels.');
   await page.getByRole('button', {name: 'Create', exact: true}).click();
   assert.equal(await page.locator('[data-neural-mode="create"]').getAttribute('aria-pressed'), 'true');
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
   await page.screenshot({path: path.join(output, 'cinematic-home-' + width + '.png')});
   await page.screenshot({path: path.join(output, 'cinematic-home-' + width + '-full.png'), fullPage: true});
   evidence.widths.push({width, liveCanvas: true, renderedMotion: true, scrollDirectedStory:width===1440, pausePixelsStable: true, noHorizontalOverflow: true, errors, forbiddenRequests: forbidden});
   assert.deepEqual(errors, []); assert.deepEqual(forbidden, []);
   await context.close();
  }
  for (const width of [320, 768]) {
   const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'}), page = await context.newPage();
   await page.goto(base + '/');
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
   assert.equal(await page.locator('[data-neural-hero] canvas').count(), 0);
   assert.equal(await page.locator('.ad-neural-art img').isVisible(), true);
   await context.close();
  }
  evidence.assertions.push('Moving rendered pixels at desktop/mobile', 'Desktop scroll directs sticky scene and narrative without overlapping headlines', 'Pause freezes rendered pixels', 'Intent controls change visual mode', 'Reduced motion retains static artwork without WebGL', 'No remote provider traffic or writes', 'No horizontal overflow at 320/390/768/1440');
  evidence.pass = true;
 } finally {
  await browser.close(); fs.writeFileSync(path.join(output, 'cinematic-review.json'), JSON.stringify(evidence, null, 2) + '\n');
 }
 console.log('AD_ASTRA_CINEMATIC_REVIEW_PASS ' + output);
})().catch(error => { console.error(error); process.exitCode = 1; });
