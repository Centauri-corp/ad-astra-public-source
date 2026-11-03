'use strict';
// Real UI, deterministic prewritten examples. No user data, provider requests or live intake.
const {test,expect}=require('@playwright/test');
const artwork='https://cdn.sanity.io/images/6a4vgjc9/production/443f89273eb4071329cac3fa151d2674b37e6eaf-1672x941.png';
async function openStudy(page){
  await page.route(artwork,route=>route.abort());
  await page.goto('/brain/');
  await expect(page.locator('.brain-observatory')).toHaveAttribute('data-initialized','true');
}
for(const width of [320,390,768,1024,1440]){
 test('neural study fits '+width+'px without horizontal scrolling',async({page})=>{
  await page.setViewportSize({width,height:1000});
  await openStudy(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const selector of ['#brain-title','.brain-motion-controls','.experience-console']){
   const box=await page.locator(selector).boundingBox();
   expect(box).not.toBeNull();expect(box.width).toBeGreaterThan(0);
   expect(box.x).toBeGreaterThanOrEqual(-1);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
  }
 });
}
test('all six conceptual states work with a static reduced-motion view',async({page})=>{
 await openStudy(page);
 for(const state of ['analyzing','reasoning','planning','acting','learning','aligning']){
  await page.locator('[data-state="'+state+'"]').click();
  await expect(page.locator('#state-name')).toHaveText(new RegExp('^'+state+'$','i'));
  await expect(page.locator('[data-state][aria-pressed="true"]')).toHaveCount(1);
 }
 await expect(page.locator('.brain-observatory')).toHaveAttribute('data-motion','static');
 await expect(page.locator('#motion-toggle')).toBeDisabled();
 await expect(page.locator('.brain-readout-note')).toContainText('Not a system measurement');
});
test('three scenarios and twelve stages never dispatch a customer request',async({page})=>{
 const unsafe=[];const errors=[];
 page.on('request',r=>{if(r.method()!=='GET'||new URL(r.url()).pathname.startsWith('/api/'))unsafe.push(r.url());});
 page.on('pageerror',e=>errors.push(e.message));
 await openStudy(page);
 for(const scenario of ['research','create','plan']){
  await page.locator('[data-scenario="'+scenario+'"]').click();
  for(let step=0;step<4;step++){
   await expect(page.locator('[data-step="'+step+'"]').first()).toHaveAttribute('aria-pressed','true');
   await expect(page.locator('#example-boundary')).not.toHaveText('');
   await page.locator('#example-next').click();
  }
  await expect(page.locator('[data-step="0"]')).toHaveAttribute('aria-pressed','true');
 }
 expect(unsafe).toEqual([]);expect(errors).toEqual([]);
 await expect(page.locator('.experience-scenario-note')).toContainText('No model connected');
});
test('keyboard users can select scenarios and stages',async({page})=>{
 await openStudy(page);
 const scenario=page.locator('[data-scenario="create"]');await scenario.focus();await page.keyboard.press('Enter');
 await expect(scenario).toHaveAttribute('aria-pressed','true');
 const stage=page.locator('[data-step="2"]');await stage.focus();await page.keyboard.press('Space');
 await expect(stage).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#example-title')).toHaveText('Explore distinct directions.');
});
test('motion pause, zero intensity and offscreen visibility are honored',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await openStudy(page);
 const root=page.locator('.brain-observatory');
 await expect(root).toHaveAttribute('data-motion','running');
 await page.locator('#motion-toggle').click();await expect(root).toHaveAttribute('data-motion','static');
 await page.locator('#motion-toggle').click();await expect(root).toHaveAttribute('data-motion','running');
 await page.locator('#motion-intensity').fill('0');await expect(root).toHaveAttribute('data-motion','static');
 await page.locator('#motion-intensity').fill('45');await expect(root).toHaveAttribute('data-motion','running');
 await page.locator('footer').scrollIntoViewIfNeeded();await expect(root).toHaveAttribute('data-motion','static');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.scrollTo(0,0));
 await expect(root).toHaveAttribute('data-motion','static');await expect(page.locator('#motion-toggle')).toBeDisabled();
});
test('missing original art has an explicit fallback, not a substituted image',async({page})=>{
 await openStudy(page);
 await expect(page.locator('.brain-artwork-fallback')).toBeVisible();
 await expect(page.locator('.brain-artwork-fallback')).toContainText('Original neural artwork unavailable');
 await expect(page.locator('.brain-artwork')).toHaveCSS('background-image',new RegExp('443f89273eb4071329cac3fa151d2674b37e6eaf'));
});
test('no-JavaScript presentation remains readable without pretend controls',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 try{
  const page=await context.newPage();await page.route(artwork,r=>r.abort());
  await page.goto('http://127.0.0.1:4173/brain/');
  await expect(page.locator('#example-title')).toHaveText('Make the question specific.');
  await expect(page.locator('#example-next')).toBeDisabled();
  await expect(page.locator('noscript')).toContainText('JavaScript is off');
  await expect(page.locator('.brain-flow li')).toHaveCount(4);
 }finally{await context.close();}
});
test('data saving suppresses decorative animation',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true}));
 await openStudy(page);
 await expect(page.locator('.brain-observatory')).toHaveAttribute('data-motion','static');
 await expect(page.locator('#motion-toggle')).toBeDisabled();
 await expect(page.locator('#motion-status')).toContainText('Data-saver preference respected');
});
test('unavailable canvas does not block the prewritten product examples',async({page})=>{
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
 await openStudy(page);
 await expect(page.locator('.brain-motion-controls')).toBeHidden();
 await page.locator('[data-scenario="plan"]').click();
 await expect(page.locator('#example-title')).toHaveText('Define the outcome.');
 await page.locator('#example-next').click();
 await expect(page.locator('#example-title')).toHaveText('Surface the dependencies.');
});
