'use strict';
const {chromium}=require('playwright'),axe=require('axe-core'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const origin=new URL(process.argv[2]||'http://127.0.0.1:4191');assert.equal(origin.hostname,'127.0.0.1');
 const out=path.resolve(__dirname,'../LStra/website-homepage-audit-20261113');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 const observations=[];
 try{for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],api=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',route=>{api.push(new URL(route.request().url()).pathname);return route.abort();});
  await page.goto(origin.href,{waitUntil:'networkidle'});
  assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('.architecture-rail a').count(),6);
  assert.equal(await page.locator('video').evaluate(v=>v.paused),true);
  await page.locator('[data-company-load]').click();await page.waitForFunction(()=>document.querySelector('[data-company-stage] canvas'));
  await page.locator('[data-company-motion]').click();await page.waitForTimeout(180);
  await page.locator('[data-company-motion]').click();
  const canvas=page.locator('[data-company-stage] canvas');
  const before=await canvas.screenshot();await page.waitForTimeout(180);assert.ok(before.equals(await canvas.screenshot()),'Pause must freeze scene pixels');
  await page.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('video').currentTime>0);
  await page.locator('video').evaluate(v=>v.pause());
  assert.ok(await page.locator('video').evaluate(v=>v.videoWidth===960&&v.videoHeight===540&&v.duration===12));
  await page.addScriptTag({content:axe.source});
  const accessibility=await page.evaluate(()=>axe.run({include:['[data-company-experience]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  assert.deepEqual(accessibility.violations.map(x=>({id:x.id,impact:x.impact})),[]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);assert.deepEqual(api,[]);
  await page.locator('[data-company-stage]').screenshot({path:path.join(out,'neural-'+width+'.png')});
  await page.screenshot({path:path.join(out,'homepage-'+width+'.png'),fullPage:true});
  observations.push({width,neuralLoad:true,pausePixelStable:true,videoDecoded:true,videoSeconds:12,automatedAccessibilityViolations:0,horizontalOverflow:false,apiRequests:0,pageErrors:[]});await context.close();
 }
 const reduced=await browser.newContext({reducedMotion:'reduce'}),page=await reduced.newPage();await page.goto(origin.href,{waitUntil:'networkidle'});await page.locator('[data-company-load]').click();await page.waitForFunction(()=>document.querySelector('[data-company-stage] canvas'));await page.locator('[data-company-motion]').click();assert.match(await page.locator('[data-company-status]').innerText(),/Reduced motion/);assert.equal(await page.locator('video').evaluate(v=>v.paused),true);await reduced.close();
 const nojs=await browser.newContext({javaScriptEnabled:false}),fallback=await nojs.newPage();await fallback.goto(origin.href);assert.equal(await fallback.locator('.architecture-rail a').count(),6);assert.ok(await fallback.locator('[data-company-stage] img').isVisible());await nojs.close();
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({observedAt:new Date().toISOString(),scope:'local homepage and new company experience only',observations,reducedMotion:true,noScriptFallback:true,hostedAcceptance:false},null,2)+'\n');console.log('Homepage browser audit passed: desktop/mobile, video decode, 3D, pause, reduced motion, no-script, accessibility and zero API requests.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
