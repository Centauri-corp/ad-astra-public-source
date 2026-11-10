'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const base='http://127.0.0.1:4175',root=path.join(__dirname,'..'),out=path.join(root,'LStra/evidence');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const routes=walk(path.join(root,'public')).filter(f=>f.endsWith('/index.html')).map(f=>'/'+path.relative(path.join(root,'public'),f).replace(/index\.html$/,''));
const report={schema:'ad-astra-browser-audit/v1',observedAt:new Date().toISOString(),sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope:'working-candidate-loopback-not-provider-or-production-acceptance',pages:[],interactions:[],screenshots:[]};
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   for(const route of routes){
    errors=[];const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:20000});await page.waitForTimeout(80);
    const state=await page.evaluate(()=>({resolvedPath:location.pathname,overflow:document.documentElement.scrollWidth>innerWidth+1,visibleH1s:[...document.querySelectorAll('h1')].filter(e=>e.checkVisibility()).length,brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.getAttribute('src')),products:!!document.querySelector('a[href="/products/"]'),availability:!!document.querySelector('a[href="/status/"]')}));
    report.pages.push({route,width,status:response.status(),...state,errors:[...errors]});
    if(route==='/'&&[390,1440].includes(width)){const file=path.join(out,`candidate-home-${width}.png`);await page.screenshot({path:file});report.screenshots.push(path.relative(root,file));}
    if(['/intelligence/','/products/','/products/core-intelligence/','/status/'].includes(route)&&[390,1440].includes(width)){const file=path.join(out,`candidate-${route.split('/').filter(Boolean).join('-')}-${width}.png`);await page.evaluate(async()=>{for(const image of document.images)image.loading='eager';await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));});await page.screenshot({path:file,fullPage:true});report.screenshots.push(path.relative(root,file));}
   }
  }
  await page.goto(base+'/intelligence/');
  assert.equal(await page.getByRole('heading',{level:1}).count(),1);
  assert.equal(await page.locator('.thinking-modes a').count(),5);
  assert.equal(await page.locator('input,textarea,video,audio,iframe').count(),0);
  await page.locator('.thinking-modes a[href="/products/?mode=research"]').click();
  assert.equal(new URL(page.url()).searchParams.get('mode'),'research');
  assert.equal(await page.locator('button[data-mode="research"]').getAttribute('aria-pressed'),'true');
  report.interactions.push({name:'intelligence page to research product filter without AI execution',result:'PASS'});
  await page.goto(base+'/');
  const researchTabs=page.locator('#possibilities [role="tab"]');
  const tierState=await page.locator('.intelligence-tab').evaluateAll(tabs=>tabs.map(t=>t.getAttribute('aria-selected')));
  await researchTabs.last().focus();await page.keyboard.press('ArrowRight');
  assert.equal(await researchTabs.first().getAttribute('aria-selected'),'true');
  await page.keyboard.press('ArrowLeft');assert.equal(await researchTabs.last().getAttribute('aria-selected'),'true');
  assert.deepEqual(await page.locator('.intelligence-tab').evaluateAll(tabs=>tabs.map(t=>t.getAttribute('aria-selected'))),tierState);
  assert.equal(await page.locator('#possibilities [role="tab"][tabindex="0"]').count(),1);
  report.interactions.push({name:'homepage mode keyboard navigation stays within its tab group',result:'PASS'});
  for(const video of await page.locator('.video-sneak video').all()){
   const result=await video.evaluate(async element=>{
    element.load();
    if(element.readyState<1)await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Video metadata timeout')),10000);element.addEventListener('loadedmetadata',()=>{clearTimeout(timeout);resolve();},{once:true});element.addEventListener('error',()=>{clearTimeout(timeout);reject(Error('Video decode error'));},{once:true});});
    const track=element.querySelector('track');const captions=await (await fetch(track.src)).text();
    const endTimes=[...captions.matchAll(/--> (\d\d):(\d\d):(\d\d\.\d{3})/g)].map(m=>Number(m[1])*3600+Number(m[2])*60+Number(m[3]));
    return {duration:element.duration,endTimes};
   });
   assert.ok(Number.isFinite(result.duration)&&result.duration>0);
   assert.ok(result.endTimes.length>0&&result.endTimes.every(end=>end<=result.duration));
  }
  report.interactions.push({name:'motion preview captions end within decoded video durations',result:'PASS'});
  await page.goto(base+'/products/');
  const families=require('../config/public-product-families.json').families;
  for(const mode of ['all','ask','research','create','learn','explore']){await page.locator(`button[data-mode="${mode}"]`).click();const shown=await page.locator('[data-family]:visible').count();assert.equal(shown,mode==='all'?6:families.filter(f=>f.modes.includes(mode)).length);}
  await page.goBack();assert.equal(await page.locator('button[data-mode="learn"]').getAttribute('aria-pressed'),'true');
  report.interactions.push({name:'six mode filters and history',result:'PASS'});
  await page.goto(base+'/platform-preview/');const tabs=page.getByRole('tab');await tabs.first().focus();await page.keyboard.press('ArrowRight');assert.equal(await tabs.nth(1).getAttribute('aria-selected'),'true');assert.equal(await page.locator('.profile-tab[tabindex="0"]').count(),1);report.interactions.push({name:'preview keyboard roving tab focus',result:'PASS'});
  await page.goto(base+'/status/');await page.waitForFunction(()=>document.getElementById('availability-update').textContent.includes('refreshed'));assert.equal(await page.locator('[data-service]').count(),7);report.interactions.push({name:'browser to operating API to status cards',result:'PASS'});
  await page.route('**/api/operating-status',r=>r.abort());await page.locator('#availability-refresh').click();await page.waitForFunction(()=>document.getElementById('availability-update').textContent.includes('could not be checked'));assert.equal(await page.locator('[data-state="available"]').count(),0);report.interactions.push({name:'status API failure returns conservative fallback',result:'PASS'});
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}}),staticPage=await nojs.newPage();await staticPage.goto(base+'/products/');assert.equal(await staticPage.locator('[data-family]:visible').count(),6);assert.equal(await staticPage.locator('[data-mode-filter]:visible').count(),0);report.interactions.push({name:'no JavaScript six-family fallback',result:'PASS'});await nojs.close();
  const fallback=await browser.newContext();await fallback.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:get.call(this,type,...args);};});const fallbackPage=await fallback.newPage();await fallbackPage.goto(base+'/');assert.equal(await fallbackPage.locator('#voice-command').isDisabled(),true);assert.equal(await fallbackPage.locator('#intelligence-input').isDisabled(),true);assert.equal(await fallbackPage.locator('#neural-field-canvas').isHidden(),true);report.interactions.push({name:'WebGL unavailable disables voice and local submit without a network action',result:'PASS'});await fallback.close();
 }catch(e){report.error=e.message;process.exitCode=1;}finally{await browser.close();}
 report.failures=report.pages.filter(p=>p.status!==200||p.overflow||p.errors.length||p.brokenImages.length||!p.products||!p.availability);report.pass=!report.error&&report.failures.length===0;
 fs.writeFileSync(path.join(out,'browser-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:report.pass,observations:report.pages.length,interactions:report.interactions,failures:report.failures,error:report.error},null,2));if(!report.pass)process.exitCode=1;
})();
