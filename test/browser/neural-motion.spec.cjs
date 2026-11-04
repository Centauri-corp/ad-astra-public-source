'use strict';
const {test, expect} = require('@playwright/test');

test.beforeEach(async ({page}) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === 'http://127.0.0.1:4173' && ['GET','HEAD'].includes(route.request().method())
      ? route.continue() : route.abort();
  });
});

async function openModel(page) {
  await page.goto('/');
  const stage = page.locator('#neural-lab .neural-stage');
  await expect(stage.locator('#hx-neural-canvas')).toHaveCount(1);
  await stage.scrollIntoViewIfNeeded();
  return stage;
}

test('reduced motion is static and keyboard model selection remains available', async ({page}) => {
  const stage = await openModel(page);
  await expect(stage).toHaveAttribute('data-model-motion', 'static');
  await expect(stage.locator('.hx-model-motion')).toBeDisabled();
  const knowledge = stage.locator('[data-model="knowledge"]');
  await knowledge.focus();
  await page.keyboard.press('ArrowRight');
  await expect(stage.locator('[data-model="agents"]')).toBeFocused();
  await expect(stage.locator('[data-model="agents"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(stage.locator('.hx-model-readout small')).toContainText('NO LIVE TELEMETRY');
});

test('local pause stops actual Canvas draws and survives preference changes', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.addInitScript(() => {
    window.__modelDraws = 0;
    const original = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function(...args) {
      if (this.canvas.id === 'hx-neural-canvas') window.__modelDraws++;
      return original.apply(this, args);
    };
  });
  const stage = await openModel(page);
  // Explicitly permit site motion after any browser autoplay fallback.
  await page.evaluate(() => document.body.classList.remove('paused', 'motion-suspended'));
  await expect(stage).toHaveAttribute('data-model-motion', 'running');
  await stage.locator('.hx-model-motion').click();
  await expect(stage).toHaveAttribute('data-model-motion', 'static');
  await page.waitForTimeout(100);
  const before = await page.evaluate(() => window.__modelDraws);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__modelDraws)).toBe(before);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await expect(stage).toHaveAttribute('data-model-motion', 'static');
});

test('site pause blocks the model even with local motion enabled', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  const stage = await openModel(page);
  await page.evaluate(() => document.body.classList.add('paused'));
  await expect(stage).toHaveAttribute('data-model-motion', 'static');
  await expect(stage.locator('.hx-model-motion')).toBeDisabled();
});

test('unavailable Canvas retains truthful text and usable controls', async ({page}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(...args) {
      return this.id === 'hx-neural-canvas' ? null : original.apply(this, args);
    };
  });
  const stage = await openModel(page);
  await expect(stage).toHaveAttribute('data-model-motion', 'unavailable');
  await expect(stage.locator('#hx-neural-canvas')).toBeHidden();
  await stage.locator('[data-model="earth"]').click();
  await expect(stage.locator('[data-model="earth"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(stage.locator('.hx-model-readout small')).toContainText('NO LIVE TELEMETRY');
});
