'use strict';
// Optional local browser regression: provide an existing Playwright installation
// through NODE_PATH. No hosted services, credentials or provider requests are used.
// PREVIEW_BROWSER_EXECUTABLE may select an already-installed Chromium binary.
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../../public');
const config=require('../../vercel.json');
const headers=Object.fromEntries(config.headers[0].headers.map(item=>[item.key,item.value]));
const csp=Object.keys(headers).find(key=>key.toLowerCase()==='content-security-policy');
// Only the HTTPS-upgrade directive is omitted for the isolated loopback fixture.
if(csp)headers[csp]=headers[csp].split(';').filter(value=>value.trim()!=='upgrade-insecure-requests').join(';');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
let server,browser,origin;
before(async()=>{
 server=http.createServer((req,res)=>{
  if(req.method!=='GET'){res.writeHead(405).end();return;}
  const url=new URL(req.url,'http://127.0.0.1');
  let file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{
   if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
   const body=fs.readFileSync(file);
   res.writeHead(200,{...headers,'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);
  }catch{res.writeHead(404).end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,...(process.env.PREVIEW_BROWSER_EXECUTABLE?{executablePath:process.env.PREVIEW_BROWSER_EXECUTABLE}:{})});
});
after(async()=>{
 await browser?.close();
 if(server)await new Promise(resolve=>server.close(resolve));
});

for(const width of [390,1440])for(const mode of ['enabled','disabled','script-blocked']){
 test(`local preview privacy: ${mode}, ${width}px`,async()=>{
  const context=await browser.newContext({javaScriptEnabled:mode!=='disabled',viewport:{width,height:900},reducedMotion:'reduce'});
  try{
   const requests=[],external=[],errors=[];
   await context.route('**/*',async route=>{
    const request=route.request();
    requests.push({url:request.url(),body:request.postData()||'',method:request.method()});
    if(new URL(request.url()).origin!==origin){external.push(request.url());await route.abort();return;}
    if(mode==='script-blocked'&&new URL(request.url()).pathname==='/markets/agent.js'){await route.abort();return;}
    await route.continue();
   });
   const page=await context.newPage();
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(origin+'/agent/',{waitUntil:'load'});
   const marker='SYNTHETIC_LOCAL_PRIVACY_20261107';
   const initialRequests=requests.length;
   assert.equal(await page.locator('form').count(),0);
   await page.locator('#concierge-input').fill(marker);
   await page.locator('#concierge-input').press('Enter');
   const button=page.locator('#concierge-start');
   if(mode==='enabled'){
    assert.equal(await button.isEnabled(),true);
    await button.click();
    await page.waitForFunction(()=>document.querySelector('#concierge-response').dataset.state==='guided');
    assert.match(await page.locator('#concierge-response-title').textContent(),/question underneath/);
    await page.locator('label').filter({has:page.locator('input[value="learn"]')}).click();
    assert.equal(await page.locator('input[value="learn"]').isChecked(),true);
    await button.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#concierge-response-title').textContent.includes('part you want to make clear'));
    assert.equal(await page.locator('#concierge-unavailable').isVisible(),false);
   }else{
    assert.equal(await button.isDisabled(),true);
    assert.equal(await page.locator('#concierge-unavailable').isVisible(),true);
    await button.scrollIntoViewIfNeeded();
    const bounds=await button.boundingBox();
    await page.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
   }
   await page.waitForTimeout(250);
   assert.equal(page.url(),origin+'/agent/');
   assert.equal(requests.length,initialRequests,'Input interaction must not create network requests');
   assert.deepEqual(external,[]);
   assert.deepEqual(errors,[]);
   assert.ok(!requests.some(request=>(request.url+request.body).includes(marker)));
   assert.ok(requests.every(request=>request.method==='GET'));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  }finally{await context.close();}
 });
}
