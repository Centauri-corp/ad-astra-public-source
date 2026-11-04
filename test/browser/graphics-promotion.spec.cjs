'use strict';
const {test, expect} = require('@playwright/test');

async function open(page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-home-experience', 'active');
}

const field = page => page.locator('#neural-field').evaluate(canvas => canvas.toDataURL());
const frames = page => page.evaluate(() => new Promise(resolve => {
  let count = 0;
  function next() { if (++count === 12) resolve(); else requestAnimationFrame(next); }
  requestAnimationFrame(next);
}));

test('reduced-motion product model holds actual pixels until explicitly played', async ({page}) => {
  await open(page);
  const canvas = page.locator('#hx-neural-canvas');
  await canvas.scrollIntoViewIfNeeded();
  await frames(page);
  const pixels = () => canvas.evaluate(node => node.toDataURL());
  const still = await pixels();
  await frames(page);
  expect(await pixels()).toBe(still);
  await page.locator('.hx-model-motion').click();
  await expect.poll(pixels).not.toBe(still);
  await page.locator('.hx-model-motion').click();
  const paused = await pixels();
  await frames(page);
  expect(await pixels()).toBe(paused);
});

test('unavailable product canvas does not prevent product and solution navigation', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      if (this.id === 'hx-neural-canvas') throw new Error('Canvas unavailable');
      return original.apply(this, args);
    };
  });
  await open(page);
  await expect(page.locator('.hx-product-card')).toHaveCount(6);
  await expect(page.locator('.hx-model-motion')).toBeDisabled();
  await expect(page.locator('.hx-model-readout')).toContainText('Static illustration');
  expect(errors).toEqual([]);
});

test('hero motion renders, freezes and resumes without a blank fallback', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await expect(page.locator('.motion')).toHaveAttribute('aria-pressed', 'true');
  const still = await field(page);
  expect(still.length).toBeGreaterThan(500);
  await frames(page);
  expect(await field(page)).toBe(still);
  await page.locator('.motion').click();
  await expect.poll(() => field(page)).not.toBe(still);
  await page.locator('.motion').click();
  const paused = await field(page);
  await frames(page);
  expect(await field(page)).toBe(paused);
  await expect(page.locator('.hero-image')).toBeVisible();
  const layers = await page.evaluate(() => ['.neural-field', '.hero-video'].map(selector =>
    Number(getComputedStyle(document.querySelector(selector)).zIndex)));
  expect(layers[0]).toBeGreaterThan(layers[1]);
  expect(errors).toEqual([]);
});

test('unavailable hero canvas retains poster and working navigation', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      if (this.id === 'neural-field') throw new Error('Canvas unavailable');
      return original.apply(this, args);
    };
  });
  await open(page);
  await expect(page.locator('.hero-image')).toBeVisible();
  await page.locator('.motion').click();
  await expect(page.locator('.motion')).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('every enhanced homepage local destination exists', async ({page, request}) => {
  await open(page);
  const paths = await page.locator('a[href]').evaluateAll(links => [...new Set(links.map(link =>
    new URL(link.href)).filter(url => url.origin === location.origin).map(url => url.pathname))]);
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
});

for (const width of [320, 768, 1440]) {
  test(`product catalog is truthful and usable at ${width}px`, async ({page, request}) => {
    await page.setViewportSize({width, height: 900});
    await page.goto('/products/');
    await expect(page.locator('.family-card')).toHaveCount(6);
    await expect(page.locator('.product-list li')).toHaveCount(25);
    await expect(page.locator('#release-title')).toHaveText('Portfolio visible. Products not yet released.');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip')).toBeFocused();
    const paths = await page.locator('a[href]').evaluateAll(links => [...new Set(links.map(link => new URL(link.href).pathname))]);
    for (const path of paths) expect((await request.get(path)).status(), path).toBe(200);
  });
}
