'use strict';
const {test,expect} = require('@playwright/test');

for(const width of [320,390,768,1024,1440]) {
  test(`global resource network is usable at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:1000});
    const writes=[];
    page.on('request',request=>{
      const url=new URL(request.url());
      if(request.method()!=='GET'||url.pathname.startsWith('/api/')) writes.push(`${request.method()} ${url.pathname}`);
    });
    await page.goto('/resources/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-domain]')).toHaveCount(12);
    await expect(page.locator('main')).toContainText('Five read-only connector candidates');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,follow');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://adastra.global/resources/');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    expect(writes).toEqual([]);
  });
}

test('resource network remains keyboard usable without JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/resources/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeVisible();
  } finally { await context.close(); }
});
