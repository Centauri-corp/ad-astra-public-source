'use strict';
const {test,expect}=require('@playwright/test');
const axe=require('axe-core');
const base='http://127.0.0.1:4173';
const informationPages=[['/access/','A new horizon.'],['/intelligence/','Better questions.'],['/brain/','A visible architecture']];

async function isolate(context){
  // Only public art/fonts and the local source fixture may be contacted.
  // In particular, no Clerk session, model provider or production API is used.
  await context.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.origin===base || ['cdn.sanity.io','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return route.continue();
    return route.abort('blockedbyclient');
  });
}
async function noHorizontalOverflow(page){
  const dimensions=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  expect(dimensions.document,JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport+1);
  expect(dimensions.body,JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport+1);
}
async function capture(page,testInfo,name){
  if(new URL(page.url()).pathname==='/'){
    // Let the real lazy asset enter the viewport and decode before recording a
    // full page. A screenshot alone does not trigger offscreen image loading.
    const experienceImage=page.locator('#experience-image');
    await experienceImage.scrollIntoViewIfNeeded();
    await expect.poll(()=>experienceImage.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
    await experienceImage.evaluate(img=>img.decode());
    await page.evaluate(async()=>{
      window.scrollTo(0,0);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    });
    await noHorizontalOverflow(page);
    const width=page.viewportSize().width;
    if([390,1440].includes(width)){
      await testInfo.attach(`home-header-${width}`,{body:await page.screenshot({fullPage:false,animations:'disabled'}),contentType:'image/png'});
    }
  }
  await testInfo.attach(name,{body:await page.screenshot({fullPage:true,animations:'disabled'}),contentType:'image/png'});
}
test.beforeEach(async({context})=>isolate(context));

for(const width of [320,390,768,1024,1440]){
  for(const [route,title] of [['/','Beyond the'],...informationPages]){
    test(`${route} renders without horizontal overflow at ${width}px`,async({page},testInfo)=>{
      const failures=[];page.on('pageerror',e=>failures.push(e.message));
      await page.setViewportSize({width,height:900});
      const response=await page.goto(route);
      expect(response.status()).toBe(200);
      await expect(page.getByRole('heading',{level:1})).toContainText(title);
      await page.evaluate(()=>document.fonts.ready);
      await noHorizontalOverflow(page);
      expect(failures).toEqual([]);
      if(route!=='/'){
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://adastra.global${route}`);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,follow');
        await expect(page.locator('form')).toHaveCount(route==='/access/'?1:0);
      }
      await capture(page,testInfo,`page-${route.replaceAll('/','')||'home'}-${width}`);
    });
  }
}

test('desktop navigation leads to truthful same-origin access status',async({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:'Customer platform — public access coming soon',exact:true}).click();
  await expect(page).toHaveURL(`${base}/access/`);
  await expect(page.getByRole('heading',{level:1})).toContainText('Coming soon.');
  await expect(page.getByText('Public access coming soon',{exact:true})).toBeVisible();
});

test('touch navigation closes with Escape and restores focus',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await isolate(context);const page=await context.newPage();
  try{
    await page.goto(base+'/');
    const menu=page.locator('button.menu');
    await expect(menu).toHaveAccessibleName('Open navigation');
    await menu.tap();
    await expect(page.locator('#mobile-nav')).toBeVisible();
    await expect(menu).toHaveAttribute('aria-expanded','true');
    await expect(menu).toHaveAccessibleName('Close navigation');
    await page.keyboard.press('Escape');
    await expect(page.locator('#mobile-nav')).toBeHidden();
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAccessibleName('Open navigation');
    await noHorizontalOverflow(page);
  }finally{await context.close();}
});

test('neural states and research tabs support keyboard navigation',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('group',{name:'Original AD ASTRA neural artwork display',exact:true})).toBeVisible();
  await expect(page.getByRole('group',{name:'Explore our approach',exact:true})).toBeVisible();
  const neural=page.locator('[data-neural-state="analyzing"]');
  await neural.focus();await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-neural-state="reasoning"]')).toBeFocused();
  await expect(page.locator('[data-neural-state="reasoning"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#neural-state-title')).toHaveText('Reasoning');
  await expect(page.locator('#neural-state-description')).toContainText('not a live system measurement');
  await page.locator('#tab-ask').focus();await page.keyboard.press('End');
  await expect(page.locator('#tab-explore')).toBeFocused();
  await expect(page.locator('#tab-explore')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#experience-panel')).toHaveAttribute('aria-labelledby','tab-explore');
});

test('reduced motion starts paused and keeps the original artwork usable',async({page})=>{
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/paused/);
  await expect(page.locator('.motion')).toHaveAccessibleName('Play motion');
  expect(await page.locator('.motion-video').evaluateAll(videos=>videos.every(v=>v.paused))).toBe(true);
  await page.locator('#neural-intelligence').scrollIntoViewIfNeeded();
  await expect(page.locator('#neural-effects-toggle')).toHaveText('Reduced motion enabled');
  await expect(page.locator('#neural-effects-toggle')).toBeDisabled();
  await expect.poll(()=>page.locator('.neural-original-master').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
});

test('real hero MP4 decodes, pauses, ends and replays with one click',async({page},testInfo)=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/');
  const video=page.locator('.hero-video');const control=page.locator('.motion');
  await expect.poll(()=>video.evaluate(v=>v.readyState>=2 || Boolean(v.error))).toBe(true);
  expect(await video.evaluate(v=>v.error?.message||null)).toBeNull();
  const duration=await video.evaluate(v=>v.duration);
  expect(Number.isFinite(duration)&&duration>0).toBe(true);
  await video.evaluate(v=>{
    window.__adAstraHeroEvents=[];
    for(const name of ['playing','pause','waiting','seeking','seeked','ended','error']){
      v.addEventListener(name,event=>window.__adAstraHeroEvents.push({event:name,trusted:event.isTrusted,time:v.currentTime,paused:v.paused,ended:v.ended,readyState:v.readyState}));
    }
  });
  try{
    if(await control.getAttribute('data-motion-action')==='play')await control.click();
    await expect.poll(()=>video.evaluate(v=>!v.paused&&v.currentTime>0&&v.videoWidth>0)).toBe(true);
    await control.click();await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);
    await expect(control).toHaveAccessibleName('Play motion');
    await control.click();
    await expect.poll(()=>video.evaluate(v=>!v.paused)).toBe(true);
    // Visitors have play/pause/replay controls, not a seek bar. Observe the real
    // clip ending instead of forcing a seek into its final two encoded frames.
    await expect.poll(()=>video.evaluate(v=>v.ended),{timeout:Math.ceil(duration*1000)+5000}).toBe(true);
    expect(await page.evaluate(()=>window.__adAstraHeroEvents.some(e=>e.event==='ended'&&e.trusted))).toBe(true);
    await expect(control).toHaveAccessibleName('Replay motion');
    await control.click();
    await expect.poll(()=>video.evaluate(v=>!v.paused&&!v.ended&&v.currentTime>0&&v.currentTime<2)).toBe(true);
  }finally{
    const metadata=await video.evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight,readyState:v.readyState,currentTime:v.currentTime,paused:v.paused,ended:v.ended,error:v.error?.message||null,events:window.__adAstraHeroEvents}));
    await testInfo.attach('decoded-hero-metadata',{body:JSON.stringify(metadata,null,2),contentType:'application/json'});
  }
});

test('a failed hero still permits pausing all ambient effects',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.route('**/*orbital-motion.mp4',route=>route.abort('failed'));
  await page.goto('/');
  await expect(page.locator('.hero-video')).toHaveAttribute('data-failed','true');
  const control=page.locator('.motion');
  await expect(control).toBeEnabled();
  await expect(control).toHaveAccessibleName('Pause effects');
  await control.click();
  await expect(page.locator('body')).toHaveClass(/motion-suspended/);
  await expect(control).toHaveAccessibleName('Resume effects');
});

test('without JavaScript the private platform has readable access information',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  await isolate(context);const page=await context.newPage();
  try{
    await page.goto(base+'/platform/');
    await expect(page.locator('#platform-auth')).toBeVisible();
    // Text locators omit noscript nodes even when scripting is disabled and the
    // fallback is rendered. Address the actual visible fallback element.
    const fallback=page.locator('#platform-auth noscript p');
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText('JavaScript is required for secure preview sign-in.');
    await expect(page.locator('#platform-content')).toBeHidden();
    await noHorizontalOverflow(page);
  }finally{await context.close();}
});

for(const authenticated of [false,true]){
  test(`knowledge remains private with ${authenticated?'unverified':'absent'} identity`,async({page})=>{
    const providerCalls=[];page.on('request',request=>{if(request.url().includes('/api/ask'))providerCalls.push(request.url());});
    await page.addInitScript(signedIn=>{
      window.Clerk={load:async()=>{},session:signedIn?{getToken:async()=>'noncredential-ci-fixture'}:null};
    },authenticated);
    await page.goto('/knowledge/?mode=research#ask-ad-astra');
    await expect(page.locator('#knowledge-auth')).toBeVisible();
    await expect(page.locator('#knowledge-auth p')).toContainText(authenticated?'could not load':'private preview');
    await expect(page.locator('#main')).toBeHidden();
    await expect(page.locator('#live-ai-submit')).toBeDisabled();
    await expect(page).toHaveURL(`${base}/knowledge/?mode=research#ask-ad-astra`);
    expect(providerCalls).toEqual([]);
  });
}

for(const [route] of [['/'],...informationPages]){
  test(`WCAG automated checks for ${route}`,async({page},testInfo)=>{
    await page.goto(route);await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(axe.source);
    const results=await page.evaluate(async()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
    await testInfo.attach('accessibility-results',{body:JSON.stringify({violations:results.violations,incomplete:results.incomplete},null,2),contentType:'application/json'});
    expect(results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
  });
}
