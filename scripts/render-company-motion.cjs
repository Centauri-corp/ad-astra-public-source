'use strict';
// Offline rendering only. Start the static site locally, then pass its loopback URL.
const {chromium}=require('playwright'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
(async()=>{
 const origin=new URL(process.argv[2]||'http://127.0.0.1:4191');
 if(origin.protocol!=='http:'||origin.hostname!=='127.0.0.1'||origin.username||origin.password)throw Error('Loopback site required');
 const frames=fs.mkdtempSync(path.join(os.tmpdir(),'ad-astra-motion-')),output=path.resolve(__dirname,'../public/assets/brand');
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
  await page.goto(origin.href,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{document.body.innerHTML='<div id="render"></div>';document.head.querySelectorAll('link[rel="stylesheet"],style').forEach(x=>x.remove());document.body.style='margin:0;background:#060b12';const host=document.getElementById('render');host.style='width:960px;height:540px;background:radial-gradient(ellipse at center,#123348,#060b12 70%)';const m=await import('/neural/company-scene.js');window.motionScene=m.createCompanyScene(host);});
  for(let frame=0;frame<288;frame++){
   await page.evaluate(t=>window.motionScene.renderAt(t),frame/24);
   await page.screenshot({path:path.join(frames,String(frame).padStart(4,'0')+'.png')});
   if(frame%72===0)console.log('Rendered frame '+frame+'/288');
  }
  execFileSync('ffmpeg',['-y','-framerate','24','-i',path.join(frames,'%04d.png'),'-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart','-an',path.join(output,'ad-astra-neural-study.mp4')],{stdio:'ignore'});
  execFileSync('ffmpeg',['-y','-i',path.join(frames,'0000.png'),'-frames:v','1',path.join(output,'ad-astra-neural-study.jpg')],{stdio:'ignore'});
  console.log('Rendered original twelve-second silent motion study. No publication approval asserted.');
 }finally{await browser.close();fs.rmSync(frames,{recursive:true,force:true});}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
