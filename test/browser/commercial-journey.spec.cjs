'use strict';
const {test, expect} = require('@playwright/test');
const axe = require('axe-core');
const base = 'http://127.0.0.1:4173';
const endpoint = 'https://wewznejqpnsmiwkbozgw.supabase.co/functions/v1/astra-early-access';

async function isolated(context) {
  await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort('blockedbyclient'));
}
test.beforeEach(async ({context}) => isolated(context));

test('planned product to consented request, recoverable service failure, then receipt', async ({page}) => {
  const posts = [];
  await page.route(endpoint, async route => {
    const headers = {'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Content-Type': 'application/json', 'Cache-Control': 'no-store'};
    if (route.request().method() === 'OPTIONS') return route.fulfill({status: 204, headers, body: ''});
    posts.push(JSON.parse(route.request().postData() || '{}'));
    return route.fulfill({status: posts.length === 1 ? 503 : 200, headers, body: JSON.stringify(posts.length === 1 ? {ok: false, error: 'service_unavailable'} : {ok: true})});
  });
  await page.goto('/pricing/');
  for (const name of ['AI Pro', 'Business Agents', 'Enterprise Intelligence OS']) await expect(page.getByRole('heading', {name, exact: true})).toBeVisible();
  await expect(page.locator('.plan-status')).toHaveText(['In development', 'In development', 'In development']);
  await expect(page.locator('body')).not.toContainText(/\$\s*\d/);
  await expect(page.locator('a[href*="checkout"],a[href*="buy.stripe"],button')).toHaveCount(0);
  await page.getByRole('link', {name: 'Request early access to Business Agents', exact: true}).click();
  await expect(page).toHaveURL(base + '/access/#early-access-title');
  await page.getByLabel('Work email').fill('preview-fixture@example.com');
  await page.getByRole('button', {name: 'Request early access'}).click();
  expect(posts).toEqual([]);
  await page.getByLabel(/I agree to receive AD ASTRA/).check();
  await page.getByRole('button', {name: 'Request early access'}).click();
  await expect(page.locator('#early-access-status')).toContainText('temporarily unavailable');
  await expect(page.getByLabel('Work email')).toHaveValue('preview-fixture@example.com');
  await expect(page.getByRole('button', {name: 'Request early access'})).toBeEnabled();
  await page.getByRole('button', {name: 'Request early access'}).click();
  await expect(page.locator('#early-access-status')).toContainText('No account or subscription was created');
  await expect(page.locator('#early-access-status')).toContainText('Existing communication preferences still apply');
  expect(posts).toHaveLength(2);
  expect(posts[1]).toEqual({email: 'preview-fixture@example.com', full_name: '', company: '', website: '', consent: true});
  await expect(page.getByLabel('Work email')).toHaveValue('');
});

test('contact leads to the real intake and describes the support boundary', async ({page}) => {
  await page.goto('/contact/');
  await expect(page.getByRole('heading', {name: 'Customer support', exact: true})).toBeVisible();
  await expect(page.locator('main')).toContainText('not an urgent-support channel');
  await page.getByRole('link', {name: 'Request early access', exact: false}).click();
  await expect(page.getByRole('form', {name: 'Request early access'})).toBeVisible();
  await page.getByRole('link', {name: 'privacy information', exact: true}).first().click();
  await expect(page.getByRole('heading', {name: 'Early-access requests', exact: true})).toBeVisible();
});

test('signed-out workspace has a preview sign-in and early-access fallback without model calls', async ({page}) => {
  const modelCalls = [];
  page.on('request', request => {if (request.url().includes('/api/ask')) modelCalls.push(request.url());});
  await page.addInitScript(() => {window.Clerk = {load: async () => {}, session: null};});
  await page.goto('/knowledge/?mode=research#ask-ad-astra');
  await expect(page.locator('#knowledge-auth')).toBeVisible();
  await expect(page.locator('#main')).toBeHidden();
  const signIn = page.locator('#knowledge-auth a.button').first();
  await expect(signIn).toHaveAttribute('href', '/sign-in/?return=%2Fknowledge%2F%3Fmode%3Dresearch%23ask-ad-astra');
  await page.locator('#knowledge-auth').getByRole('link', {name: 'Request early access'}).click();
  await expect(page.getByRole('form', {name: 'Request early access'})).toBeVisible();
  expect(modelCalls).toEqual([]);
  await page.goto('/platform/');
  await expect(page.locator('#platform-content')).toBeHidden();
  await expect(page.locator('#platform-sign-out')).toBeHidden();
});

test('failed provider can retry and never offers implicit account creation', async ({page}) => {
  await page.goto('/sign-in/?return=https%3A%2F%2Fevil.example%2F');
  await expect(page.locator('#sign-in-status')).toContainText('could not be verified');
  await expect(page.getByRole('button', {name: 'Retry secure sign-in'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Request early access'})).toBeVisible();
  await page.evaluate(() => {
    window.Clerk = {session: null, load: async () => {}, mountSignIn(node, options) {window.__signInOptions = options; node.textContent = 'Existing-account fixture';}};
  });
  await page.getByRole('button', {name: 'Retry secure sign-in'}).click();
  await expect(page.locator('#sign-in-status')).toContainText('existing authorized preview account');
  await expect(page.getByRole('button', {name: 'Retry secure sign-in'})).toBeHidden();
  const options = await page.evaluate(() => window.__signInOptions);
  expect(options).toMatchObject({forceRedirectUrl: '/platform/', fallbackRedirectUrl: '/platform/', withSignUp: false, transferable: false, signUpUrl: '/access/#early-access-title'});
});

test('server-verified preview reaches workspace while the model execution gate remains closed', async ({page}) => {
  const modelCalls = [];
  page.on('request', request => {if (request.url().includes('/api/ask')) modelCalls.push(request.url());});
  await page.addInitScript(() => {window.Clerk = {load: async () => {}, session: {getToken: async () => 'noncredential-ci-fixture'}, user: {username: 'Preview fixture'}};});
  await page.route('**/api/session', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({authenticated: true})}));
  await page.route('**/api/status', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({available: false, message: 'Live AI responses remain paused.'})}));
  await page.goto('/sign-in/?return=%2Fplatform%2F');
  await expect(page).toHaveURL(base + '/platform/');
  await expect(page.locator('#platform-content')).toBeVisible();
  await expect(page.locator('#platform-auth')).toBeHidden();
  await expect(page.locator('#platform-sign-out')).toBeVisible();
  await page.getByRole('link', {name: 'Open Research', exact: false}).click();
  await expect(page).toHaveURL(base + '/knowledge/?mode=research#ask-ad-astra');
  await expect(page.locator('#main')).toBeVisible();
  await expect(page.locator('#knowledge-auth')).toBeHidden();
  await expect(page.locator('#live-ai-submit')).toBeDisabled();
  expect(modelCalls).toEqual([]);
});

for (const width of [320, 768, 1440]) {
  test(`commercial and preview routes stay usable at ${width}px`, async ({page}, testInfo) => {
    await page.setViewportSize({width, height: 900});
    for (const route of ['pricing', 'contact', 'services', 'sign-in', 'platform', 'knowledge']) {
      const errors = [];
      const onError = error => errors.push(error.message);
      page.on('pageerror', onError);
      await page.goto(`/${route}/`);
      await expect(page.getByRole('navigation', {name: 'Primary'}).getByRole('link', {name: 'Early access', exact: true})).toBeVisible();
      expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth + 1)).toBe(true);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://adastra.global/${route}/`);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
      expect(errors).toEqual([]);
      if (width === 320 || width === 1440) await testInfo.attach(`${route}-${width}`, {body: await page.screenshot({fullPage: true, animations: 'disabled'}), contentType: 'image/png'});
      page.off('pageerror', onError);
    }
  });
}

test('commercial pages pass automated accessibility checks', async ({page}, testInfo) => {
  for (const route of ['pricing', 'contact', 'sign-in']) {
    await page.goto(`/${route}/`);
    await page.evaluate(axe.source);
    const results = await page.evaluate(async () => window.axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}}));
    await testInfo.attach(`${route}-accessibility`, {body: JSON.stringify(results.violations, null, 2), contentType: 'application/json'});
    expect(results.violations.map(item => ({id: item.id, nodes: item.nodes.map(node => node.target)}))).toEqual([]);
  }
});
