'use strict';
// Local-only browser -> public routes -> conservative availability API audit.
// Not independent approval, authenticated customer QA, or provider evidence.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const axe=require('axe-core');
const root=path.join(__dirname,'..'),base='http://127.0.0.1:'+(process.env.AD_ASTRA_AUDIT_PORT||4175);
const out=process.env.AD_ASTRA_AUDIT_OUTPUT||path.join(root,'LStra/evidence');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const htmlFiles=walk(path.join(root,'public')).filter(f=>f.endsWith('/index.html'));
const routes=htmlFiles.map(f=>'/'+path.relative(path.join(root,'public'),f).replace(/index\.html$/,''));
const report={schema:'ad-astra-browser-audit/v3',observedAt:new Date().toISOString(),baseCommit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceFingerprint:require('../config/website-source-integrity.json').fingerprint,scope:'working-candidate-loopback-not-provider-or-production-acceptance',accessibilityEngine:axe.version,accessibility:[],pages:[],interactions:[],screenshots:[]};
fs.mkdirSync(out,{recursive:true});
const result=name=>report.interactions.push({name,result:'PASS'});
const checkpoint=stage=>{
 report.stage=stage;
 fs.writeFileSync(path.join(out,'browser-progress.json'),JSON.stringify({stage,at:new Date().toISOString(),activeNavigation:report.activeNavigation,pages:report.pages.length,scans:report.accessibility.length,interactions:report.interactions},null,2)+'\n');
 console.log('AD_ASTRA_BROWSER_PROGRESS '+JSON.stringify({stage,route:report.activeNavigation?.route,width:report.activeNavigation?.width,pages:report.pages.length}));
};
const deadline=setTimeout(()=>{
 report.error='Browser audit exceeded the eight-minute execution budget at '+report.stage;
 report.pass=false;fs.writeFileSync(path.join(out,'browser-audit.json'),JSON.stringify(report,null,2)+'\n');
 console.error(report.error);process.exit(1);
},480000);deadline.unref();
(async()=>{
 checkpoint('launch');
 const browser=await chromium.launch({executablePath:fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({reducedMotion:'reduce'});let page,errors=[],failedRequests=[];
  // This source audit verifies the offline/fail-closed public surface, not the
  // live identity provider. Loading the real SDK here introduces provider-driven
  // redirects/frames into axe's document scan. Real sign-in belongs to protected
  // customer QA; a separate fixture below tests the actual anonymous redirect.
  report.identityProviderScope='SDK-unavailable fail-closed routes plus synthetic anonymous redirect; live identity NOT accepted';
  report.blockedExternalOrigins=[];
  await context.route('**/*',route=>{
   const origin=new URL(route.request().url()).origin;
   if(origin!==base){if(!report.blockedExternalOrigins.includes(origin))report.blockedExternalOrigins.push(origin);return route.abort();}
   return route.continue();
  });
  // Protected routes can redirect asynchronously after Clerk loads. A document
  // from the previous route must never interrupt the next route's navigation.
  for(const width of [320,390,768,1440]){
   for(const route of routes){
    page=await context.newPage();await page.setViewportSize({width,height:900});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).origin===base)failedRequests.push({path:new URL(r.url()).pathname,status:r.status()});});
    errors=[];failedRequests=[];
    report.activeNavigation={route,width};
    checkpoint('route-navigation');
    try{
    const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:20000});
    await page.evaluate(async()=>{for(const image of document.images)image.loading='eager';await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));});
    const state=await page.evaluate(()=>({resolvedPath:location.pathname,overflow:document.documentElement.scrollWidth>innerWidth+1,visibleH1s:[...document.querySelectorAll('h1')].filter(e=>e.checkVisibility()).length,brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.getAttribute('src')),products:!!document.querySelector('a[href="/products/"]'),availability:!!document.querySelector('a[href="/status/"]'),sharedHeader:document.querySelectorAll('.site-header').length,sharedFooter:document.querySelectorAll('.site-footer').length}));
    // A fresh unauthenticated browser must not expose protected workspace content.
    const guardedContentHidden=route==='/platform/'?await page.locator('#platform-content').isHidden():route==='/knowledge/'?await page.locator('#main').isHidden():null;
    report.pages.push({route,width,status:response.status(),...state,guardedContentHidden,errors:[...errors],failedRequests:[...failedRequests]});
    if(width===390){
     checkpoint('route-accessibility');
     await page.evaluate(axe.source);
     const audit=await page.evaluate(async()=>{
      const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
      return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)})),manualReviewRules:r.incomplete.map(v=>v.id)};
     });
     report.accessibility.push({route,width,...audit});
    }
    if(['/','/start/','/intelligence/','/services/','/products/','/products/core-intelligence/','/status/'].includes(route)&&[390,1440].includes(width)){
     checkpoint('route-screenshot');
     const name=route==='/'?'home':route.split('/').filter(Boolean).join('-');
     for(const full of ['/','/start/'].includes(route)?[false,true]:[true]){const file=path.join(out,`candidate-${name}-${width}${full?'-full':''}.png`);await page.screenshot({path:file,fullPage:full});report.screenshots.push(path.basename(file));}
    }
    }finally{checkpoint('route-close');await page.close();}
   }
  }
  delete report.activeNavigation;
  checkpoint('interactions');
  page=await context.newPage();
  // Deliberately delayed auth redirect: reproduce the old cross-route race,
  // then assert real isolated navigation rather than retrying a failed goto.
  const authPage=await context.newPage();
  await authPage.route('**/knowledge/',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'public/knowledge/index.html'),'utf8').replace(/<script defer data-clerk-publishable-key[^>]*><\/script>/,'<script>window.Clerk={load:()=>new Promise(r=>setTimeout(r,80)),session:null};</script>')}));
  await authPage.goto(base+'/knowledge/',{waitUntil:'domcontentloaded'});
  await authPage.waitForURL(url=>url.pathname==='/platform/');
  assert.ok(await authPage.locator('#platform-content').isHidden());
  result('synthetic anonymous session follows the actual knowledge redirect without exposing protected content');
  await authPage.goto(base+'/knowledge/',{waitUntil:'domcontentloaded'});
  await authPage.close();
  await page.route('**/markets/agriculture-food/',async r=>{await new Promise(resolve=>setTimeout(resolve,250));await r.continue();});
  await page.goto(base+'/markets/agriculture-food/',{waitUntil:'domcontentloaded'});
  assert.equal(new URL(page.url()).pathname,'/markets/agriculture-food/');await page.unroute('**/markets/agriculture-food/');
  result('delayed protected-route redirect cannot abort the next isolated route');
  for(const file of htmlFiles)for(const [,href]of fs.readFileSync(file,'utf8').matchAll(/(?:href|src)="(\/(?!\/)[^"?#]*)(?:[?#][^"]*)?"/g))assert.ok(fs.existsSync(path.join(root,'public',href)),'Broken first-party link: '+href+' in '+file);
  result('first-party route and asset links resolve to checked source');
  assert.equal(report.accessibility.length,routes.length,'Every route requires a mobile accessibility scan');
  assert.deepEqual(report.accessibility.filter(r=>r.violations.length),[],'Automated accessibility violations block candidate QA; incomplete/manual review is not conformance approval');
  result(routes.length+'-route automated accessibility regression scan; manual review remains separate');
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/');
  assert.ok(await page.locator('.ad-neural-art img').evaluate(e=>e.complete&&e.naturalWidth>0),'Mobile hero artwork loads');
  const menu=page.locator('.site-menu');await menu.locator('summary').click();assert.notEqual(await menu.getAttribute('open'),null);await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('open'),null);assert.ok(await menu.locator('summary').evaluate(e=>e===document.activeElement));
  await menu.locator('summary').click();await menu.getByRole('link',{name:'Products',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/products/');result('mobile menu routes, escapes and returns focus');
  await page.goto(base+'/intelligence/');await page.locator('.thinking-modes a[href="/products/?mode=research"]').click();await page.waitForURL('**/products/?mode=research');await page.waitForFunction(()=>document.querySelector('button[data-mode="research"]')?.getAttribute('aria-pressed')==='true');assert.equal(await page.locator('button[data-mode="research"]').getAttribute('aria-pressed'),'true');result('intelligence to research filter without AI execution');
  const families=require('../config/public-product-families.json').families;
  for(const mode of ['all','ask','research','create','learn','explore']){await page.locator(`button[data-mode="${mode}"]`).click();assert.equal(await page.locator('[data-family]:visible').count(),mode==='all'?6:families.filter(f=>f.modes.includes(mode)).length);}
  await page.goBack();assert.equal(await page.locator('button[data-mode="learn"]').getAttribute('aria-pressed'),'true');result('six filters and browser history');
  await page.goto(base+'/');for(const id of ['possibilities','products','story','questions-title'])assert.equal(await page.locator('#'+id).count(),1);
  await page.getByText('What can I experience today?',{exact:true}).click();assert.ok(await page.getByText('Sample responses are curated examples.',{exact:false}).isVisible());assert.equal(await page.locator('input,textarea,audio,iframe').count(),0);assert.equal(await page.locator('video[controls]').count(),1);assert.equal(await page.locator('video').evaluate(video=>video.autoplay),false);result('complete local story with labelled opt-in motion study and readable availability disclosure');
  for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(base+'/');assert.equal(await page.locator('.ad-product-list>a').count(),6);assert.equal(await page.locator('h1').innerText(),'See beyond.\nThink further.');const homeTabs=page.getByRole('tab');await homeTabs.first().focus();await page.keyboard.press('ArrowRight');assert.equal(await homeTabs.nth(1).getAttribute('aria-selected'),'true');assert.ok(await page.locator('#home-create').isVisible());assert.ok(await page.locator('#home-research').isHidden());await page.keyboard.press('End');assert.ok(await page.locator('#home-plan').isVisible());}result('desktop and mobile artwork, six product paths and keyboard-operated local examples');
  await page.goto(base+'/markets/california/');await page.waitForFunction(()=>document.getElementById('california-subscription-status').textContent.includes('remains unavailable'));assert.ok(await page.getByRole('heading',{level:1}).innerText().then(text=>text.includes('qualification candidate')));result('reconciled California page reads the paused subscription endpoint without claiming live enrollment');
  await page.goto(base+'/status/');await page.waitForFunction(()=>document.getElementById('availability-update').textContent.includes('refreshed'));assert.equal(await page.locator('[data-service]').count(),7);result('browser to operating API to seven conservative status cards');
  await page.route('**/api/operating-status',r=>r.abort());await page.locator('#availability-refresh').click();await page.waitForFunction(()=>document.getElementById('availability-update').textContent.includes('could not be checked'));assert.equal(await page.locator('[data-state="available"]').count(),0);result('API error removes stale positive availability');
  await page.goto(base+'/platform-preview/');const tabs=page.getByRole('tab');await tabs.first().focus();await page.keyboard.press('ArrowRight');assert.equal(await tabs.nth(1).getAttribute('aria-selected'),'true');result('existing preview keyboard interaction preserved');
  const staticContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),staticPage=await staticContext.newPage();await staticPage.goto(base+'/');await staticPage.locator('.site-menu summary').click();assert.ok(await staticPage.locator('.site-menu[open] a[href="/products/"]').isVisible());assert.equal(await staticPage.getByRole('heading',{level:1}).count(),1);await staticPage.goto(base+'/products/');assert.equal(await staticPage.locator('[data-family]:visible').count(),6);assert.equal(await staticPage.locator('[data-mode-filter]:visible').count(),0);await staticPage.goto(base+'/start/');assert.equal(await staticPage.locator('[data-direction-panel]:visible').count(),6);assert.ok(await staticPage.locator('[data-direction-controls]').isHidden());assert.equal(await staticPage.locator('a[download]').count(),6);await staticContext.close();result('no-JavaScript story, mobile menu, products and six written samples');
  const journeyContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),journeyPage=await journeyContext.newPage(),journeyRequests=[];
  await journeyContext.route('**/*',route=>{const request=route.request();if(new URL(request.url()).origin!==base||request.method()!=='GET'){journeyRequests.push({url:request.url(),method:request.method()});return route.abort();}return route.continue();});
  await journeyPage.goto(base+'/');await journeyPage.locator('.site-menu summary').click();await journeyPage.locator('.site-menu a[href="/start/"]').click();await journeyPage.waitForURL(base+'/start/');
  const directions=require('../config/customer-experience-framework.json').directions;
  for(const direction of directions){await journeyPage.locator(`[data-direction-choice="${direction.id}"]`).click();assert.equal(await journeyPage.locator('[data-direction-panel]:visible').count(),1);assert.ok(await journeyPage.locator(`[data-direction-panel="${direction.id}"]`).isVisible());assert.equal(await journeyPage.locator(`[data-direction-choice="${direction.id}"]`).getAttribute('aria-pressed'),'true');assert.equal(new URL(journeyPage.url()).searchParams.get('direction'),direction.id);assert.ok(await journeyPage.getByRole('link',{name:'Explore '+families.find(f=>f.id===direction.family).name,exact:false}).isVisible());}
  await journeyPage.goBack();await journeyPage.waitForFunction(()=>document.querySelector('[data-direction-choice="build"]').getAttribute('aria-pressed')==='true');
  await journeyPage.goto(base+'/start/?direction=%3Cscript%3Euntrusted%3C%2Fscript%3E');assert.ok(await journeyPage.locator('[data-direction-panel="research"]').isVisible());assert.ok(!(await journeyPage.locator('[data-direction-announcement]').textContent()).includes('untrusted'));
  await journeyPage.locator('[data-direction-choice="research"]').focus();await journeyPage.keyboard.press('Tab');await journeyPage.keyboard.press('Space');assert.ok(await journeyPage.locator('[data-direction-panel="create"]').isVisible());
  const downloadPromise=journeyPage.waitForEvent('download');await journeyPage.getByRole('link',{name:'Download written sample',exact:false}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'ad-astra-create-sample.txt');const downloadPath=path.join(out,download.suggestedFilename());await download.saveAs(downloadPath);assert.equal(fs.readFileSync(downloadPath,'utf8'),fs.readFileSync(path.join(root,'public/start/samples/create.txt'),'utf8'));
  assert.equal(await journeyPage.locator('input,textarea,form,video,audio,iframe').count(),0);assert.deepEqual(journeyRequests,[]);await journeyContext.close();result('home to six directions, product links, back navigation, safe parameters, keyboard and exact sample download without external side effects');
  const motionContext=await browser.newContext({reducedMotion:'no-preference',viewport:{width:1440,height:1000}}),motionPage=await motionContext.newPage();let forbidden=[];
  motionPage.on('request',r=>{if(r.method()!=='GET'||/\/api\/(ask|session)|stripe|zoho|openai|google-analytics/.test(r.url()))forbidden.push(r.url());});
  await motionPage.goto(base+'/');const control=motionPage.locator('[data-motion-toggle]');assert.ok(await control.isVisible());await control.click();assert.equal(await motionPage.locator('body').getAttribute('data-motion'),'off');await control.click();assert.equal(await motionPage.locator('body').getAttribute('data-motion'),'on');await motionPage.emulateMedia({reducedMotion:'reduce'});await motionPage.waitForFunction(()=>document.body.dataset.motion==='off');assert.ok(await control.isHidden());assert.deepEqual(forbidden,[]);await motionContext.close();result('motion pause, reduced motion and zero provider or customer writes');
  const billingContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),billingPage=await billingContext.newPage(),billingRequests=[];
  await billingContext.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin!==base)return route.abort();
   if(url.pathname.startsWith('/api/')){
    if(url.pathname!=='/api/subscriptions')return route.abort();
    billingRequests.push(request.postDataJSON());
    return route.fulfill({contentType:'application/json',body:JSON.stringify({environment:'development',market:'US-CA',linked:true,linkingEnabled:false,checkoutEnabled:false,accessCurrent:false,workspaces:[],subscriptions:[]})});
   }
   return route.continue();
  });
  await billingPage.addInitScript(()=>{
   window.Clerk={load:async()=>{},session:null,mountSignIn(_element,options){window.syntheticBillingReturn=options.fallbackRedirectUrl;}};
  });
  await billingPage.goto(base+'/account/billing/');
  await billingPage.getByRole('link',{name:'Sign in to continue'}).click();
  await billingPage.waitForURL('**/sign-in/**');
  await billingPage.waitForFunction(()=>window.syntheticBillingReturn==='/account/billing/');
  assert.equal(await billingPage.evaluate(()=>window.syntheticBillingReturn),'/account/billing/');
  assert.equal(billingRequests.length,0);
  await billingPage.addInitScript(()=>{
   window.Clerk={load:async()=>{},session:{id:'sess_browser_fixture',getToken:async()=> 'synthetic-browser-token'},addListener(callback){window.syntheticBillingSessionChanged=callback;}};
  });
  await billingPage.goto(base+'/sign-in/?return=%2Faccount%2Fbilling%2F');
  await billingPage.waitForURL('**/account/billing/');
  await billingPage.waitForFunction(()=>document.getElementById('billing-message').textContent==='Your billing status is up to date.');
  assert.deepEqual(billingRequests,[{action:'account',input:{}}]);
  assert.ok(await billingPage.locator('#billing-start').isHidden());
  await billingPage.evaluate(()=>{
   window.Clerk.session={id:'sess_browser_other',getToken:async()=> 'other-synthetic-token'};
   window.syntheticBillingSessionChanged({session:window.Clerk.session});
  });
  assert.ok(await billingPage.locator('#billing-account').isHidden());
  await billingPage.locator('#billing-message').filter({hasText:'Your sign-in changed'}).waitFor();
  assert.deepEqual(billingRequests,[{action:'account',input:{}}]);
  result('synthetic session switch clears billing details without another customer request');
  await billingContext.close();
  result('synthetic billing sign-in returns to the account page and paused sales show no checkout form');
 }catch(error){report.error=error.stack;process.exitCode=1;}finally{checkpoint('browser-close');await browser.close();}
 report.failures=report.pages.filter(p=>p.status!==200||p.overflow||(p.guardedContentHidden===null?p.visibleH1s!==1:!p.guardedContentHidden||p.visibleH1s>1)||p.errors.length||p.brokenImages.length||p.failedRequests.length||!p.products||!p.availability||p.sharedHeader!==1||p.sharedFooter!==1);
 report.pass=!report.error&&report.failures.length===0&&report.accessibility.length===routes.length&&report.accessibility.every(r=>r.violations.length===0);fs.writeFileSync(path.join(out,'browser-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:report.pass,observations:report.pages.length,accessibilityScans:report.accessibility.length,automatedAccessibilityViolations:report.accessibility.reduce((n,r)=>n+r.violations.length,0),interactions:report.interactions,failures:report.failures,error:report.error},null,2));clearTimeout(deadline);if(!report.pass)process.exitCode=1;
})();
