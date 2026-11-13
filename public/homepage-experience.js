'use strict';
(() => {
 const section=document.querySelector('[data-company-experience]');if(!section)return;
 const stage=section.querySelector('[data-company-stage]'),load=section.querySelector('[data-company-load]'),toggle=section.querySelector('[data-company-motion]'),status=section.querySelector('[data-company-status]');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let scene=null,frame=0,time=0,last=0,paused=true,disposed=false,visible=true;
 function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
 function tick(now){if(paused||disposed||document.hidden||reduced.matches||!visible)return;if(last)time+=Math.min((now-last)/1000,.1);last=now;scene?.renderAt(time);frame=requestAnimationFrame(tick);}
 function sync(){stop();toggle.textContent=paused?'Play neural motion':'Pause neural motion';toggle.setAttribute('aria-pressed',String(!paused));if(scene&&!paused&&!reduced.matches&&!document.hidden&&visible)frame=requestAnimationFrame(tick);}
 const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting===true;sync();});observer.observe(stage);
 stage.addEventListener('webglcontextlost',event=>{event.preventDefault();stop();scene?.dispose();scene=null;paused=true;stage.classList.remove('has-scene');load.hidden=false;load.disabled=false;toggle.hidden=true;status.textContent='3D rendering stopped. Static artwork remains available; you can load the scene again.';},true);
 load.addEventListener('click',async()=>{if(scene||load.disabled)return;load.disabled=true;status.textContent='Loading the local 3D artwork…';try{const module=await import('/neural/company-scene.js');if(disposed)return;scene=module.createCompanyScene(stage);stage.classList.add('has-scene');toggle.hidden=false;load.hidden=true;status.textContent='Interactive neural concept. Decorative artwork; no live AI or customer data.';scene.renderAt(0);}catch{load.disabled=false;status.textContent='3D is unavailable on this device. The artwork and film remain available.';}});
 toggle.addEventListener('click',()=>{if(!scene)return;if(reduced.matches){status.textContent='Reduced motion is enabled. The neural sculpture stays still.';return;}paused=!paused;sync();});
 reduced.addEventListener('change',()=>{if(reduced.matches){paused=true;section.querySelector('video')?.pause();}sync();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)section.querySelector('video')?.pause();sync();});
 window.addEventListener('pagehide',()=>{disposed=true;stop();observer.disconnect();scene?.dispose();scene=null;});
 window.addEventListener('pageshow',event=>{if(!event.persisted)return;disposed=false;load.disabled=false;load.hidden=false;toggle.hidden=true;stage.classList.remove('has-scene');paused=true;observer.observe(stage);status.textContent='Artwork restored. Choose interactive 3D to load the scene again.';});
})();
