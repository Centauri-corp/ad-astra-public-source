'use strict';
const {test,expect}=require('@playwright/test');
for(const width of [320,390,768,1024,1440]){
 test(`reconciled experience routes at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  const writes=[];
  page.on('request',r=>{if(r.method()!=='GET'||new URL(r.url()).pathname.startsWith('/api/'))writes.push(r.url());});
  await page.goto('/products/intelligence/');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('[data-product-id]')).toHaveCount(9);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://adastra.global/products/intelligence/');
  await expect(page.locator('main')).toContainText('25 product directions');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.goto('/experience/');
  await expect(page.locator('.card')).toHaveCount(8);
  await expect(page.locator('main')).toContainText('Restricted');
  await expect(page.locator('main a[href="/products/intelligence/"]')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(writes).toEqual([]);
 });
}
test('offering page is keyboard usable without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});
 const page=await context.newPage();
 try{
  await page.goto('http://127.0.0.1:4173/products/intelligence/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeVisible();
 }finally{await context.close();}
});
