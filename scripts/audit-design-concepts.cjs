'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base='http://127.0.0.1:'+(process.env.AD_ASTRA_AUDIT_PORT||4175);
const out=process.env.AD_ASTRA_AUDIT_OUTPUT||path.resolve(__dirname,'../LStra/design-concept-review');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const observations=[];
 try{
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),violations=[];
   await context.route('**/*',route=>{const request=route.request();if(new URL(request.url()).origin!==base||request.method()!=='GET'){violations.push(request.method()+' '+new URL(request.url()).pathname);return route.abort();}return route.continue();});
   await page.goto(base+'/',{waitUntil:'networkidle'});
   const picks=page.locator('[data-product-pick]'),views=page.locator('[data-product-view]');
   assert.equal(await picks.count(),6);
   const images=[];
   for(const button of await picks.all()){
    await button.click();const id=await button.getAttribute('data-product-pick');
    assert.equal(await button.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-product-view]:visible').count(),1);
    const active=page.locator('[data-product-view="'+id+'"]');
    images.push(await active.locator('img').getAttribute('src'));
    assert.equal(await active.getByRole('link').getAttribute('href'),'/products/'+id+'/');
    const figureBox=await active.boundingBox(),captionBox=await active.locator('figcaption').boundingBox();
    assert.ok(captionBox.width>=Math.min(300,figureBox.width),'Product captions must retain a readable measure at every viewport.');
   }
   assert.equal(new Set(images).size,6,'Each product needs a distinct selected artwork role.');
   await picks.first().focus();await page.keyboard.press('End');assert.equal(await picks.last().getAttribute('aria-pressed'),'true');
   const map=page.locator('[data-knowledge-map]');await map.getByRole('button',{name:'Evidence',exact:false}).click();
   assert.match(await map.locator('[data-map-related]').innerText(),/Question.*Alternatives/);
   assert.equal(await map.locator('[data-map-edge].is-connected').count(),2);
   await map.getByRole('button',{name:'Evidence',exact:false}).focus();await page.keyboard.press('ArrowRight');
   assert.equal(await map.locator('[data-map-node="context"]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await map.screenshot({path:path.join(out,'knowledge-map-'+width+'.png')});
   await page.locator('[data-product-showcase]').screenshot({path:path.join(out,'product-showcase-'+width+'.png')});
   assert.deepEqual(violations,[]);observations.push({width,distinctProductArt:6,productKeyboardSelection:true,selectableGraph:true,connectedEdgesCorrect:true,externalWrites:0});await context.close();
  }
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}}),fallback=await nojs.newPage();await fallback.goto(base+'/');
  assert.equal(await fallback.locator('.ad-knowledge-map__fallback:visible').count(),5);assert.equal(await fallback.locator('.ad-product-list>a').count(),6);await nojs.close();
  fs.writeFileSync(path.join(out,'design-concept-review.json'),JSON.stringify({schema:'ad-astra-design-concept-review/v1',observedAt:new Date().toISOString(),pass:true,observations,noScriptFallback:true,scope:'Local curated design interactions; no live customer or model execution'},null,2)+'\n');
 }finally{await browser.close();}
 console.log('AD_ASTRA_DESIGN_CONCEPT_REVIEW_PASS '+out);
})().catch(error=>{console.error(error);process.exitCode=1;});
