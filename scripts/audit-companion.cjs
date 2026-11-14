'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const base='http://127.0.0.1:'+(process.env.AD_ASTRA_AUDIT_PORT||4175);
const output=process.env.AD_ASTRA_AUDIT_OUTPUT||path.join(__dirname,'../LStra/companion-review');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function syntheticDevice(){
 const state=window.__companionQA={starts:0,aborts:0,spoken:[],recognitions:[],tokenCalls:0};
 const listeners=new Set();
 window.Clerk={loaded:true,load:async()=>{},session:{id:'sess_synthetic',getToken:async()=>{state.tokenCalls++;return 'synthetic-session-token';}},user:{id:'user_synthetic'},organization:null,
  addListener(fn){listeners.add(fn);fn(this);return()=>listeners.delete(fn);}};
 state.switchOrg=id=>{Clerk.organization=id?{id}:null;for(const fn of listeners)fn(Clerk);};
 class Recognition{
  static async available(){return 'available';}
  constructor(){state.recognitions.push(this);}
  start(){state.starts++;queueMicrotask(()=>this.onstart?.());}
  abort(){state.aborts++;this.onend?.();}
 }
 Recognition.prototype.processLocally=false;
 Object.defineProperty(window,'SpeechRecognition',{value:Recognition,configurable:true});
 Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(text){this.text=text;}},configurable:true});
 Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'en-US',localService:true}],speak(item){state.spoken.push(item);queueMicrotask(()=>item.onstart?.());},cancel(){state.spoken.at(-1)?.onerror?.({error:'interrupted'});}},configurable:true});
 state.transcribe=text=>{const rec=state.recognitions.at(-1),result=[{transcript:text}];result.isFinal=true;rec.onresult?.({resultIndex:0,results:[result]});rec.onend?.();};
 state.finishPlayback=()=>state.spoken.at(-1)?.onend?.();
}
async function routeTo(page,route){
 // Isolate route continuity from the separate real-menu acceptance suite.
 await page.evaluate(route=>{const link=document.createElement('a');link.href=route;link.textContent='QA route';document.querySelector('main').append(link);link.click();},route);
 await settled(page,route);
}
async function settled(page,route){
 await page.waitForURL(base+route);
 await page.waitForFunction(route=>new URL(document.querySelector('link[rel=canonical]').href).pathname===new URL(route,location.origin).pathname&&document.querySelector('.astra-companion')?.dataset.routeState==='ready',route);
}
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({executablePath:fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 const report={schema:'ad-astra-companion-browser-review/v1',observedAt:new Date().toISOString(),scope:'Local browser and synthetic identity/engine/device services only; no live provider, billing, CRM or customer acceptance.',checks:[]};
 const pass=name=>{report.checks.push({name,status:'pass'});console.log('AD_ASTRA_COMPANION_PASS '+name);};
 let current;
 try{
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),external=[],errors=[],requests=[];current=page;
   await context.route('**/*',r=>{const q=r.request();requests.push(q.url());if(new URL(q.url()).origin!==base||q.method()!=='GET'){external.push(q.url());return r.abort();}return r.continue();});
   page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/');await settled(page,'/');
   await page.evaluate(()=>window.__publicDocument='same-document');
   assert.equal(await page.locator('.astra-companion').count(),1);assert.ok(await page.locator('#astra-companion-question').isDisabled());
   await page.locator('.astra-companion__toggle').click();assert.ok(await page.locator('#astra-companion-panel').isVisible());await page.keyboard.press('Escape');assert.ok(await page.locator('#astra-companion-panel').isHidden());
   for(const route of ['/products/','/products/core-intelligence/','/services/','/start/','/platform-preview/','/']){
    await routeTo(page,route);assert.equal(await page.evaluate(()=>window.__publicDocument),'same-document');assert.equal(await page.locator('[data-neural-hero] canvas').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    if(route==='/start/'){await page.locator('[data-direction-choice=create]').click();assert.ok(await page.locator('[data-direction-panel=create]').isVisible());}
    if(route==='/platform-preview/'){assert.ok(await page.locator('#preview-prompt').isEnabled());}
   }
   await page.goBack();await settled(page,'/platform-preview/');await page.goForward();await settled(page,'/');
   assert.equal(await page.getByRole('heading',{level:1}).count(),1);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
   assert.ok(!requests.some(url=>/clerk|\/api\/(?:ask|session)|cinematic-scene|vendor\/three/.test(url)),'Anonymous reduced-motion visits must not initialize auth, engine or WebGL.');
   await page.screenshot({path:path.join(output,'companion-home-'+width+'.png')});await context.close();pass(width+'px anonymous navigation, history, remounted controls, static fallback and no provider side effects');
  }
  {
   const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'}),page=await context.newPage();current=page;
   await context.route('**/*',r=>new URL(r.request().url()).origin===base&&r.request().method()==='GET'?r.continue():r.abort());
   await page.goto(base+'/');await page.waitForFunction(()=>document.querySelector('[data-neural-hero]')?.dataset.neuralState==='ready',null,{timeout:30000});
   await page.locator('[data-motion-toggle]').click();await page.evaluate(()=>window.__sameCanvas=document.querySelector('[data-neural-hero] canvas'));
   for(const route of ['/products/','/products/core-intelligence/','/services/','/']){
    await routeTo(page,route);assert.ok(await page.evaluate(()=>window.__sameCanvas===document.querySelector('[data-neural-hero] canvas')),'Route transitions must preserve the actual canvas, not recreate a lookalike.');
    assert.equal(await page.locator('[data-neural-hero] canvas').count(),1);assert.equal(await page.locator('body').getAttribute('data-motion'),'off');
   }
   await page.screenshot({path:path.join(output,'persistent-scene.png')});await context.close();pass('One actual WebGL canvas survives home/product/family/service transitions and preserves pause');
  }
  {
   const context=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),calls=[],external=[],errors=[];current=page;let delayed=false,releaseDelayed,sawDelayed;
   await context.addInitScript(syntheticDevice);
   await context.route('**/*',async route=>{
    const q=route.request(),url=new URL(q.url());
    if(url.origin!==base){external.push(q.url());return route.abort();}
    if(url.pathname==='/api/session'&&q.method()==='POST'){calls.push({path:url.pathname});return route.fulfill({json:{protocol:'ad-astra-customer-session/v1',authenticated:true}});}
    if(url.pathname==='/api/ask'&&q.method()==='POST'){
     const body=q.postDataJSON();calls.push({path:url.pathname,body});const requestId=randomUUID();
     const events=['accepted','requesting','answer','completed'].map((type,i)=>({schema:'ad-astra-engine-event/v1',requestId,sequence:i+1,type,at:new Date().toISOString(),...(type==='answer'?{answer:'A synthetic completed answer. <img src=x onerror=alert(1)>',agentId:body.agentId,mode:body.mode}:{})}));
     if(delayed){sawDelayed();await new Promise(resolve=>{releaseDelayed=resolve;});}
     try{return await route.fulfill({status:200,headers:{'content-type':'text/event-stream','x-request-id':requestId},body:events.map(e=>'event: '+e.type+'\ndata: '+JSON.stringify(e)+'\n\n').join('')});}catch{return;}
    }
    if(q.method()!=='GET'){external.push(q.method()+' '+url.pathname);return route.abort();}return route.continue();
   });
   page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/');await settled(page,'/');
   assert.equal(calls.length,0);assert.equal(await page.evaluate(()=>__companionQA.starts+__companionQA.tokenCalls),0);
   await page.locator('.astra-companion__toggle').click();await page.locator('[data-companion-connect]').click();await page.waitForFunction(()=>!document.querySelector('#astra-companion-question').disabled);
   assert.equal(calls.filter(x=>x.path==='/api/session').length,1);await page.locator('#astra-companion-tone').selectOption('clear');await page.locator('[data-companion-context]').check();
   await page.locator('#astra-companion-question').fill('Compare the synthetic energy scenarios.');await page.locator('[data-companion-form] [type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('.astra-companion__answer').textContent.includes('synthetic completed'));
   assert.equal(await page.locator('.astra-companion__answer img').count(),0,'Untrusted answer markup must remain text.');
   await routeTo(page,'/services/');await page.locator('#astra-companion-question').fill('What should be considered next?');await page.locator('[data-companion-form] [type=submit]').click();
   await page.waitForFunction(()=>!document.querySelector('#astra-companion-question').disabled);const asks=calls.filter(x=>x.path==='/api/ask');
   assert.equal(asks.length,2);assert.match(asks[1].body.question,/Compare the synthetic energy scenarios/);assert.match(asks[1].body.question,/clear, measured/);assert.ok(asks[1].body.question.length<=4000);
   delayed=true;const arrived=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Delayed synthetic request did not arrive')),6000);sawDelayed=()=>{clearTimeout(timer);resolve();};});
   await page.locator('#astra-companion-question').fill('This synthetic answer must become stale.');await page.locator('[data-companion-form] [type=submit]').click();
   await arrived;await page.evaluate(()=>__companionQA.switchOrg('org_synthetic_b'));releaseDelayed();await wait(100);
   assert.equal(await page.locator('.astra-companion__answer').textContent(),'');assert.ok(await page.locator('#astra-companion-question').isDisabled());assert.ok(!(await page.locator('[data-companion-context]').isChecked()));
   delayed=false;await page.locator('[data-companion-connect]').click();await page.waitForFunction(()=>!document.querySelector('#astra-companion-question').disabled);
   assert.equal(await page.evaluate(()=>__companionQA.starts),0);await page.locator('[data-companion-voice]').click();await page.waitForFunction(()=>__companionQA.starts===1);
   await page.evaluate(()=>__companionQA.transcribe('Explain this synthetic scenario aloud.'));await page.waitForFunction(()=>document.querySelector('.astra-companion').dataset.activity==='speaking');
   assert.equal(await page.evaluate(()=>__companionQA.spoken.length),1);await page.evaluate(()=>__companionQA.finishPlayback());await page.waitForFunction(()=>__companionQA.starts===2);
   await page.locator('[data-companion-stop]').click();const count=calls.filter(x=>x.path==='/api/ask').length;await page.evaluate(()=>__companionQA.transcribe('A late result after stop must be ignored.'));await wait(80);
   assert.equal(calls.filter(x=>x.path==='/api/ask').length,count);assert.equal(await page.evaluate(()=>__companionQA.starts),2);assert.equal(await page.locator('[data-companion-voice]').getAttribute('aria-pressed'),'false');
   assert.deepEqual(external,[]);assert.deepEqual(errors,[]);await page.screenshot({path:path.join(output,'synthetic-voice.png')});await context.close();pass('Explicit verified access, safe SSE text, cross-page context, stale-account rejection and opt-in local voice/stop');
  }
  report.status='pass';
 }catch(error){report.status='failed';report.error=String(error.stack||error);if(current&&!current.isClosed())await current.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});process.exitCode=1;}
 finally{fs.writeFileSync(path.join(output,'companion-review.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify(report,null,2));}
})().catch(error=>{console.error(error);process.exitCode=1;});
