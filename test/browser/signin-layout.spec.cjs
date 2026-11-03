'use strict';
const {test, expect} = require('@playwright/test');

const base = 'http://127.0.0.1:4173';
test.beforeEach(async ({context}) => {
  // No live identity or customer data is accessed by this layout regression.
  await context.route('**/*', route =>
    route.request().url().startsWith(base) ? route.continue() : route.abort('blockedbyclient'));
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`private sign-in remains readable and reaches early access at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 900});
    await page.addInitScript(() => {
      window.Clerk = {
        session: null,
        load: async () => {},
        mountSignIn(node, options) {
          window.__previewSignInOptions = options;
          const footer = document.createElement('div');
          footer.className = 'cl-footerAction';
          footer.textContent = 'Sign up';
          node.append(footer);
        },
      };
    });
    const response = await page.goto('/sign-in/');
    expect(response.status()).toBe(200);
    await expect(page.locator('link[href="/sign-in/style.css"]')).toHaveCount(1);
    const heading = page.locator('.sign-in-shell .market-hero h1');
    await expect(heading).toBeVisible();
    const font = await heading.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(font).toBeLessThanOrEqual(56.1);
    const cta = page.getByRole('link', {name: /Request early access/i});
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    expect(box.y + box.height).toBeLessThan(900);
    await expect(page.locator('.cl-footerAction')).toBeHidden();
    const opts = await page.evaluate(() => window.__previewSignInOptions);
    expect(opts).toMatchObject({
      withSignUp: false,
      transferable: false,
      signUpUrl: '/access/#early-access-title',
      waitlistUrl: '/access/#early-access-title',
    });
    expect(await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth + 1
    )).toBe(true);
    await cta.click();
    await expect(page).toHaveURL(base + '/access/#early-access-title');
    await expect(page.getByRole('form', {name: 'Request early access'})).toBeVisible();
  });
}
