'use strict';
const {test, expect} = require('@playwright/test');

const widths = [320, 390, 768, 1024, 1440];

async function openHomepage(page, width) {
  const writes = [];
  const external = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['GET', 'HEAD'].includes(request.method())) writes.push({method: request.method(), url: request.url()});
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) external.push(request.url());
  });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    return route.continue();
  });
  await page.setViewportSize({width, height: 1000});
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.homeExperience === 'active');
  await page.locator('#hx-products').waitFor({state: 'attached'});
  return {writes, external};
}

for (const width of widths) {
  test(`product-led homepage and neural model at ${width}px`, async ({page}) => {
    const {writes} = await openHomepage(page, width);

    await expect(page.locator('h1')).toContainText('Intelligence for');
    await expect(page.locator('.site-header .status')).toContainText('PLATFORM PREVIEW');
    await expect(page.locator('#hx-pathways')).toBeVisible();
    await expect(page.locator('.hx-product-card')).toHaveCount(6);
    await expect(page.locator('.hx-solution-card')).toHaveCount(6);
    await expect(page.locator('.hx-pathway-grid a')).toHaveCount(6);

    const neural = page.locator('#neural-lab .neural-stage');
    await expect(neural).toHaveAttribute('role', 'region');
    await expect(neural).toHaveAttribute('aria-label', /Interactive neural 3D product model/);
    await expect(page.locator('#hx-neural-canvas')).toBeVisible();
    await expect(page.locator('.hx-neural-controls [data-model]')).toHaveCount(3);
    await expect(page.locator('.hx-model-readout')).toContainText('NO LIVE TELEMETRY');

    const canvasDataLength = await page.locator('#hx-neural-canvas').evaluate((canvas) => canvas.toDataURL().length);
    expect(canvasDataLength).toBeGreaterThan(500);

    await page.locator('.hx-neural-controls [data-model="agents"]').click();
    await expect(page.locator('.hx-model-readout')).toContainText('AGENT ORCHESTRATION');
    await page.locator('.hx-neural-controls [data-model="earth"]').click();
    await expect(page.locator('.hx-model-readout')).toContainText('EARTH + SPACE INTELLIGENCE');

    await page.locator('.hx-solution-filter [data-audience="business"]').click();
    await expect(page.locator('.hx-filter-status')).toContainText('3 solution pathways');
    await expect(page.locator('.hx-solution-card:not([hidden])')).toHaveCount(3);

    const ordered = await page.evaluate(() => {
      const ids = ['top', 'hx-pathways', 'neural-lab', 'intelligence-layer', 'hx-products', 'hx-solutions', 'film'];
      const elements = ids.map((id) => document.getElementById(id));
      return elements.every(Boolean) && elements.slice(0, -1).every((element, index) =>
        Boolean(element.compareDocumentPosition(elements[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
    });
    expect(ordered).toBe(true);

    const uniqueIds = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
      return ids.length === new Set(ids).size;
    });
    expect(uniqueIds).toBe(true);

    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(noOverflow).toBe(true);
    expect(writes).toEqual([]);
  });
}

test('reduced-motion model begins paused and remains keyboard operable', async ({page}) => {
  await openHomepage(page, 390);
  const motion = page.locator('.hx-model-motion');
  await expect(motion).toHaveAttribute('aria-pressed', 'true');
  await expect(motion).toHaveText('Play model');
  await motion.focus();
  await page.keyboard.press('Enter');
  await expect(motion).toHaveAttribute('aria-pressed', 'false');
  await expect(motion).toHaveText('Pause model');

  const productLink = page.locator('.hx-product-card a').first();
  await productLink.focus();
  await expect(productLink).toBeFocused();
});

test('homepage enhancement is progressively loaded only on the root route', async ({page}) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    return route.continue();
  });
  await page.goto('/knowledge/');
  await expect(page.locator('body')).not.toHaveAttribute('data-home-experience', 'active');
  await expect(page.locator('#hx-products')).toHaveCount(0);
});
