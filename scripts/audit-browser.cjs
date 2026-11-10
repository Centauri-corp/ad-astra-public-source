'use strict';
// Local-only browser -> public routes -> conservative availability API audit.
// Not independent approval, authenticated customer QA, or provider evidence.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.join(__dirname,'..'),base='http://127.0.0.1:'+(process.env.AD_ASTRA_AUDIT_PORT||4175);
const out=process.env.AD_ASTRA_AUDIT_OUTPUT||path.join(root,'LStra/evidence');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const htmlFiles=walk(path.join(root,'public')).filter(f=>f.endsWith('/index.html'));
const routes=htmlFiles.map(f=>'/'+path.relative(path.join(root,'public'),f).replace(/index\.html$/,''));
const report={schema:'ad-astra-browser-audit/v2',observedAt:new Date().toISOString(),baseCommit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceFingerprint:require('../config/website-source-integrity.json').fingerprint,scope:'working-candidate-loopback-not-provider-or-production-acceptance',pages:[],interactions:[],screenshots:[]};
fs.mkdirSync(out,{recursive:true});
const result=name=>report.interactions.push({name,result:'PASS'});
(async()=>{
 const browser=await chromium.launch({executablePath:fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();let errors=[],failedRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).origin===base)failedRequests.push({path:new URL(r.url()).pathname,status:r.status()});});
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   for(const route of routes){
    errors=[];failedRequests=[];
    const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:20000});
    await page.evaluate(async()=>{for(const image of document.images)image.loading='eager';await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));});
    const state=await page.evaluate(()=>({resolvedPath:location.pathname,overflow:document.documentElement.scrollWidth>innerWidth+1,visibleH1s:[...document.querySelectorAll('h1')].filter(e=>e.checkVisibility()).length,brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.getAttribute('src')),products:!!document.querySelector('a[href="/products/"]'),availability:!!document.querySelector('a[href="/status/"]'),sharedHeader:document.querySelectorAll('.site-header').length,sharedFooter:document.querySelectorAll('.site-footer').length}));
    // A fresh unauthenticated browser must not expose protected workspace content.
    const guardedContentHidden=route==='/platform/'?await page.locator('#platform-content').isHidden():route==='/knowledge/'?await page.locator('#main').isHidden():null;
    report.pages.push({route,width,status:response.status(),...state,guardedContentHidden,errors:[...errors],failedRequests:[...failedRequests]});
    if(['/','/intelligence/','/services/','/products/','/products/core-intelligence/','/status/'].includes(route)&&[390,1440].includes(width)){
     const name=route==='/'?'home':route.split('/').filter(Boolean).join('-');
     for(const full of route==='/'?[false,true]:[true]){const file=path.join(out,`candidate-${name}-${width}${full?'-full':''}.png`);await page.screenshot({path:file,fullPage:full});report.screenshots.push(path.basename(file));}
    }
   }
  }
  for(const file of htmlFiles)for(const [,href]of fs.readFileSync(file,'utf8').matchAll(/(?:href|src)="(\/(?!\/)[^"?#]*)(?:[?#][^"]*)?"/g))assert.ok(fs.existsSync(path.join(root,'public',href)),'Broken first-party link: '+href+' in '+file);
  result('first-party route and asset links resolve to checked source');
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/');
  assert.equal(await page.locator('#story .chapter-image img').evaluate(e=>getComputedStyle(e).objectPosition),'0% 50%');
  const menu=page.locator('.site-menu');await menu.locator('summary').click();assert.notEqual(await menu.getAttribute('open'),null);await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('open'),null);assert.ok(await menu.locator('summary').evaluate(e=>e===document.activeElement));
  await menu.locator('summary').click();await menu.getByRole('link',{name:'Products',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/products/');result('mobile menu routes, escapes and returns focus');
  await page.goto(base+'/intelligence/');await page.locator('.thinking-modes a[href="/products/?mode=research"]').click();assert.equal(await page.locator('button[data-mode="research"]').getAttribute('aria-pressed'),'true');result('intelligence to research filter without AI execution');
  const families=require('../config/public-product-families.json').families;
  for(const mode of ['all','ask','research','create','learn','explore']){await page.locator(`button[data-mode="${mode}"]`).click();assert.equal(await page.locator('[data-family]:visible').count(),mode==='all'?6:families.filter(f=>f.modes.includes(mode)).length);}
  await page.goBack();assert.equal(await page.locator('button[data-mode="learn"]').getAttribute('aria-pressed'),'true');result('six filters and browser history');
  await page.goto(base+'/');for(const id of ['story','ways-of-working','products','future','global','beyond'])assert.equal(await page.locator('#'+id).count(),1);
  await page.getByText('What can I use today?',{exact:true}).click();assert.ok(await page.getByText('You can explore this website, product directions',{exact:false}).isVisible());assert.equal(await page.locator('input,textarea,video,audio,iframe').count(),0);result('complete non-executing story and readable availability disclosure');
  await page.goto(base+'/status/');await page.waitForFunction(()=>document.getElementById('availability-update').textContent.includes('refreshed'));assert.equal(await page.locator('[data-service]').count(),7);result('browser to operating API to seven conservative status cards');
  await page.route('**/api/operating-status',r=>r.abort());await page.locator('#availability-refresh').click();await page.waitForFunction(()=>document.getElementById('availability-update').textContent.includes('could not be checked'));assert.equal(await page.locator('[data-state="available"]').count(),0);result('API error removes stale positive availability');
  await page.goto(base+'/platform-preview/');const tabs=page.getByRole('tab');await tabs.first().focus();await page.keyboard.press('ArrowRight');assert.equal(await tabs.nth(1).getAttribute('aria-selected'),'true');result('existing preview keyboard interaction preserved');
  const staticContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),staticPage=await staticContext.newPage();await staticPage.goto(base+'/');await staticPage.locator('.site-menu summary').click();assert.ok(await staticPage.locator('.site-menu[open] a[href="/products/"]').isVisible());assert.equal(await staticPage.getByRole('heading',{level:1}).count(),1);await staticPage.goto(base+'/products/');assert.equal(await staticPage.locator('[data-family]:visible').count(),6);assert.equal(await staticPage.locator('[data-mode-filter]:visible').count(),0);await staticContext.close();result('no-JavaScript story, mobile menu and product fallback');
  const motionContext=await browser.newContext({reducedMotion:'no-preference',viewport:{width:1440,height:1000}}),motionPage=await motionContext.newPage();let forbidden=[];
  motionPage.on('request',r=>{if(r.method()!=='GET'||/\/api\/(ask|session)|stripe|zoho|openai|google-analytics/.test(r.url()))forbidden.push(r.url());});
  await motionPage.goto(base+'/');const control=motionPage.locator('[data-motion-toggle]');assert.ok(await control.isVisible());await control.click();assert.equal(await motionPage.locator('body').getAttribute('data-motion'),'off');await control.click();assert.equal(await motionPage.locator('body').getAttribute('data-motion'),'on');await motionPage.emulateMedia({reducedMotion:'reduce'});await motionPage.waitForFunction(()=>document.body.dataset.motion==='off');assert.ok(await control.isHidden());assert.deepEqual(forbidden,[]);await motionContext.close();result('motion pause, reduced motion and zero provider or customer writes');
 }catch(error){report.error=error.stack;process.exitCode=1;}finally{await browser.close();}
 report.failures=report.pages.filter(p=>p.status!==200||p.overflow||(p.guardedContentHidden===null?p.visibleH1s!==1:!p.guardedContentHidden||p.visibleH1s>1)||p.errors.length||p.brokenImages.length||p.failedRequests.length||!p.products||!p.availability||p.sharedHeader!==1||p.sharedFooter!==1);
 report.pass=!report.error&&report.failures.length===0;fs.writeFileSync(path.join(out,'browser-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:report.pass,observations:report.pages.length,interactions:report.interactions,failures:report.failures,error:report.error},null,2));if(!report.pass)process.exitCode=1;
})();
