'use strict';
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const sharp = require('sharp');
const root = path.join(__dirname, '..');
const base = 'http://127.0.0.1:' + (process.env.AD_ASTRA_AUDIT_PORT || 4175);
const output = process.env.AD_ASTRA_AUDIT_OUTPUT || path.join(root, 'LStra/cinematic-review');
const widthArgument = process.argv.find(argument => argument.startsWith('--width='));
const widths = widthArgument ? [Number(widthArgument.slice(8))] : [390, 1440];
assert.ok(widths.every(width => [390, 1440].includes(width)), 'Use --width=390 or --width=1440 for a focused check. CI checks both by default.');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function pixelChange(first, second) {
 const a = await sharp(first).ensureAlpha().raw().toBuffer({resolveWithObject: true});
 const b = await sharp(second).ensureAlpha().raw().toBuffer({resolveWithObject: true});
 assert.deepEqual(a.info, b.info, 'Captured canvas dimensions must remain stable.');
 let changed = 0;
 for (let i = 0; i < a.data.length; i += 4) {
  // A composited element crop includes foreground text. Ignore only tiny
  // rasterization noise; the independent GPU check requires zero drawing.
  if ([0, 1, 2, 3].some(channel => Math.abs(a.data[i + channel] - b.data[i + channel]) > 3)) changed++;
 }
 return {changedPixels: changed, ratio: changed / (a.info.width * a.info.height)};
}
function observeWebGL() {
 const getContext = HTMLCanvasElement.prototype.getContext, seen = new WeakSet();
 HTMLCanvasElement.prototype.getContext = function(type, ...args) {
  const gl = getContext.call(this, type, ...args);
  if (!gl || !String(type).startsWith('webgl') || seen.has(gl)) return gl;
  seen.add(gl);
  const stats = this.__adGpuAudit = {operations: 0, draws: 0};
  for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'clear', 'clearBufferfv', 'clearBufferiv', 'clearBufferuiv', 'blitFramebuffer']) {
   const operation = gl[name];
   if (typeof operation !== 'function') continue;
   gl[name] = function(...values) { stats.operations++; if (name.startsWith('draw')) stats.draws++; return operation.apply(this, values); };
  }
  return gl;
 };
}
const gpuState = canvas => canvas.evaluate(element => ({...element.__adGpuAudit, width: element.width, height: element.height}));
(async () => {
 fs.mkdirSync(output, {recursive: true});
 const browser = await chromium.launch({executablePath: fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined,
  headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']});
 const evidence = {schema: 'ad-astra-cinematic-review/v1', observedAt: new Date().toISOString(), scope: 'Local visual and interaction checks; no live customer or engine acceptance', widths: [], assertions: []};
 let currentPage, currentWidth, stage = 'initialization';
 const mark = value => { stage = value; console.log('AD_ASTRA_CINEMATIC_STAGE '+JSON.stringify({width: currentWidth, stage})); };
 try {
  for (const width of widths) {
   const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'no-preference'});
   await context.addInitScript(observeWebGL);
   const page = await context.newPage(), errors = [], forbidden = [];
   currentPage = page; currentWidth = width; mark('load');
   await context.route('**/*', route => { const request = route.request(); if (new URL(request.url()).origin !== base || request.method() !== 'GET') { forbidden.push(request.method() + ' ' + new URL(request.url()).pathname); return route.abort(); } return route.continue(); });
   page.on('pageerror', error => errors.push(error.message));
   await page.goto(base + '/', {waitUntil: 'networkidle'});
   await page.waitForFunction(() => document.querySelector('[data-neural-hero]')?.dataset.neuralState === 'ready', {timeout: 30000});
   assert.equal(await page.locator('[data-neural-hero] canvas').count(), 1);
   const canvas = page.locator('[data-neural-hero] canvas');
   await page.evaluate(() => document.fonts.ready);
   await page.evaluate(() => Promise.all(document.querySelector('[data-neural-hero]').getAnimations().map(animation => animation.finished.catch(() => {}))));
   const dimensions = await canvas.boundingBox();
   assert.ok(dimensions.width >= 300 && dimensions.height >= 300, 'The hero must render a full-size 3D scene, not a hidden or one-pixel canvas.');
   const movingGpu = await gpuState(canvas), first = await canvas.screenshot(); await delay(350);
   const movingPixels = await pixelChange(first, await canvas.screenshot());
   assert.ok(movingPixels.changedPixels > 10 && (await gpuState(canvas)).draws > movingGpu.draws, 'The actual neural scene must render changing geometry, not just a composited fade.');
   if(width===1440){
    await page.evaluate(()=>{const sequence=document.querySelector('[data-arrival-sequence]'),hero=document.querySelector('.ad-arrival');scrollTo({top:(sequence.offsetHeight-hero.offsetHeight)*.65,behavior:'instant'});});
    await page.waitForFunction(()=>Number(document.querySelector('[data-arrival-sequence]').style.getPropertyValue('--ad-story-progress'))>.5);
    assert.equal(await page.locator('.ad-arrival').evaluate(element=>getComputedStyle(element).position),'sticky');
    assert.ok(await page.locator('.ad-arrival-phase').evaluate(element=>Number(getComputedStyle(element).opacity)>.99));
    assert.equal(await page.locator('#arrival-title').evaluate(element=>Number(getComputedStyle(element).opacity)),0,'The first headline must disappear before the next narrative becomes readable.');
   }
   mark('pause');
   await page.locator('[data-motion-toggle]').click();
   assert.equal(await page.locator('body').getAttribute('data-motion'), 'off');
   await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
   assert.equal(await page.locator('[data-neural-hero]').evaluate(element => element.getAnimations().filter(animation => animation.playState === 'running' || animation.pending).length), 0, 'Pause must stop the entrance transition as well as WebGL motion.');
   const pausedGpu = await gpuState(canvas), stopped = await canvas.screenshot(); await delay(250);
   const pausedPixels = await pixelChange(stopped, await canvas.screenshot());
   assert.deepEqual(await gpuState(canvas), pausedGpu, 'Pause must issue zero WebGL draw/clear operations and retain canvas dimensions.');
   assert.ok(pausedPixels.ratio <= .0001, 'Paused composited pixels must remain visually stable, allowing only tiny text-rasterization noise.');
   await page.getByRole('button', {name: 'Create', exact: true}).click();
   assert.equal(await page.locator('[data-neural-mode="create"]').getAttribute('aria-pressed'), 'true');
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
   mark('resume');
   await page.locator('[data-motion-toggle]').click();
   await page.waitForFunction(previous => document.querySelector('[data-neural-hero] canvas').__adGpuAudit.draws > previous, (await gpuState(canvas)).draws);
   mark('runtime-reduced-motion');
   await page.emulateMedia({reducedMotion: 'reduce'});
   await page.waitForFunction(() => document.querySelector('[data-neural-hero]').dataset.neuralState === 'static');
   assert.equal(await canvas.count(), 0, 'A runtime reduced-motion preference must dispose the live scene.');
   assert.equal(await page.locator('.ad-neural-art img').isVisible(), true);
   mark('restore-motion');
   await page.emulateMedia({reducedMotion: 'no-preference'});
   await page.waitForFunction(() => document.querySelector('[data-neural-hero]').dataset.neuralState === 'ready');
   assert.equal(await canvas.count(), 1, 'Restoring motion must create exactly one scene.');
   await page.locator('[data-motion-toggle]').click();
   await page.getByRole('button', {name: 'Create', exact: true}).click();
   // Full-page capture can change viewport/intersection state in Chromium.
   // Keep evidence collection after all live interaction assertions.
   mark('capture');
   await page.screenshot({path: path.join(output, 'cinematic-home-' + width + '.png')});
   await page.screenshot({path: path.join(output, 'cinematic-home-' + width + '-full.png'), fullPage: true});
   evidence.widths.push({width, liveCanvas: true, renderedMotion: true, scrollDirectedStory:width===1440, pauseGpuOperations: 0, pausedPixels, dynamicReducedMotion: true, singleSceneRestored: true, noHorizontalOverflow: true, errors, forbiddenRequests: forbidden});
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
  const pendingContext = await browser.newContext({viewport: {width: 320, height: 900}, reducedMotion: 'reduce'});
  currentWidth = 320; mark('pending-module-preference');
  let release;
  const moduleReleased = new Promise(resolve => { release = resolve; });
  await pendingContext.route('**/*', async route => {
   const request = route.request(), url = new URL(request.url());
   if (url.origin !== base || request.method() !== 'GET') return route.abort();
   if (url.pathname === '/neural/cinematic-scene.js') await moduleReleased;
   return route.continue();
  });
  const pendingPage = await pendingContext.newPage();
  currentPage = pendingPage;
  await pendingPage.goto(base + '/');
  const moduleRequested = pendingPage.waitForRequest(request => new URL(request.url()).pathname === '/neural/cinematic-scene.js', {timeout: 10000});
  await pendingPage.emulateMedia({reducedMotion: 'no-preference'});
  await moduleRequested;
  await pendingPage.emulateMedia({reducedMotion: 'reduce'});
  release();
  await pendingPage.waitForLoadState('networkidle');
  assert.equal(await pendingPage.locator('[data-neural-hero] canvas').count(), 0, 'A pending module load cannot create a scene after reduced motion was enabled.');
  assert.equal(await pendingPage.locator('[data-neural-hero]').getAttribute('data-neural-state'), 'static');
  await pendingContext.close();
  evidence.assertions.push('Moving rendered geometry and GPU draws at each tested width ('+widths.join(', ')+')', ...(widths.includes(1440)?['Desktop scroll directs sticky scene and narrative without overlapping headlines']:[]), 'Pause issues zero GPU operations and retains a visually stable frame', 'Intent controls change visual mode', 'Reduced motion retains static artwork without WebGL at initial load and after a runtime preference change', 'Motion restoration creates exactly one scene', 'Pending scene imports respect a changed motion preference', 'No remote provider traffic or writes', 'No horizontal overflow at the tested live widths and 320/768 static fallbacks');
  evidence.pass = true;
 } catch (error) {
  evidence.failure = {width: currentWidth, stage, error: error.message};
  evidence.failure.runtime = await currentPage?.evaluate(() => ({motion: document.body.dataset.motion, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, visibility: document.visibilityState, state: document.querySelector('[data-neural-hero]')?.dataset.neuralState, canvases: document.querySelectorAll('[data-neural-hero] canvas').length, heroBounds: document.querySelector('.ad-arrival')?.getBoundingClientRect().toJSON()})).catch(() => null);
  throw error;
 } finally {
  await browser.close(); fs.writeFileSync(path.join(output, 'cinematic-review.json'), JSON.stringify(evidence, null, 2) + '\n');
 }
 console.log('AD_ASTRA_CINEMATIC_REVIEW_PASS ' + output);
})().catch(error => { console.error(error); process.exitCode = 1; });
