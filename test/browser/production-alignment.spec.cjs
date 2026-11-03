'use strict';
const {test,expect}=require('@playwright/test');

for(const width of [320,390,768,1024,1440]){
  test(`homepage product system is usable at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:1000});
    await page.goto('/');
    const section=page.locator('#products-overview');
    await expect(section).toBeVisible();
    await expect(section.locator('.home-product-family')).toHaveCount(6);
    await expect(section).toContainText('25 DIRECTIONS · SIX FAMILIES');
    await expect(section).toContainText('Public AI inference, paid enrollment, checkout, automatic publication and unbounded autonomous actions remain disabled');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);

    if(width>900){
      const link=page.locator('.desktop-nav>.products-nav-link');
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href','/products/');
    }else{
      await page.locator('.menu').click();
      await expect(page.locator('#mobile-nav')).toBeVisible();
      const group=page.locator('#mobile-nav .products-mobile-nav');
      await group.locator('summary').click();
      await expect(group.locator('a[href="/products/"]')).toBeVisible();
    }
  });
}

test('chapter and footer navigation expose products without changing the primary CTA',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.chapter-nav a[href="#products-overview"]')).toHaveText('Products');
  await expect(page.locator('footer nav a[href="/products/"]')).toHaveText('Products');
  await expect(page.locator('#products-overview a[href="/access/#early-access-title"]')).toContainText('Request early access');
  await expect(page.locator('#products-overview a[href="/products/"]')).toContainText('Explore all products');
});

test('product overview makes no API or external-action requests',async({page})=>{
  const unsafe=[];
  page.on('request',request=>{
    const url=new URL(request.url());
    if(request.method()!=='GET'||url.pathname.startsWith('/api/'))unsafe.push(`${request.method()} ${url.pathname}`);
  });
  await page.goto('/');
  await page.locator('#products-overview').scrollIntoViewIfNeeded();
  await expect(page.locator('#products-overview')).toBeVisible();
  expect(unsafe).toEqual([]);
});

test('branded 404 provides accessible recovery routes',async({page})=>{
  const response=await page.goto('/404.html');
  expect(response.status()).toBe(200);
  await expect(page).toHaveTitle('Page not found | AD ASTRA');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,nofollow');
  await expect(page.locator('h1')).toContainText('Beyond this');
  await expect(page.locator('a[href="/products/"]')).toHaveCount(2);
  await expect(page.locator('a[href="/access/#early-access-title"]')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
