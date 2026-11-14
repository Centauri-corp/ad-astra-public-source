'use strict';
(() => {
 if(globalThis.AdAstraCompanyExperience){globalThis.AdAstraCompanyExperience.mount();return;}
 const mounted=new WeakMap();
 function mount(scope=document){
 const section=scope.matches?.('[data-company-experience]')?scope:scope.querySelector('[data-company-experience]');if(!section)return;
 if(mounted.has(section))return mounted.get(section);
 const stage=section.querySelector('[data-company-stage]'),load=section.querySelector('[data-company-load]'),toggle=section.querySelector('[data-company-motion]'),status=section.querySelector('[data-company-status]');
 if(!stage||!load||!toggle||!status)return;
 const events=new AbortController(),{signal}=events;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let scene=null,frame=0,time=0,last=0,paused=true,disposed=false,visible=true;
 function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
 function tick(now){if(paused||disposed||document.hidden||reduced.matches||!visible)return;if(last)time+=Math.min((now-last)/1000,.1);last=now;scene?.renderAt(time);frame=requestAnimationFrame(tick);}
 function sync(){if(disposed)return;stop();toggle.textContent=paused?'Play neural motion':'Pause neural motion';toggle.setAttribute('aria-pressed',String(!paused));if(scene&&!paused&&!reduced.matches&&!document.hidden&&visible)frame=requestAnimationFrame(tick);}
 const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting===true;sync();});observer.observe(stage);
 const controller={dispose(){if(disposed)return;disposed=true;events.abort();stop();observer.disconnect();section.querySelector('video')?.pause();scene?.dispose();scene=null;mounted.delete(section);}};
 mounted.set(section,controller);
 stage.addEventListener('webglcontextlost',event=>{event.preventDefault();stop();scene?.dispose();scene=null;paused=true;stage.classList.remove('has-scene');load.hidden=false;load.disabled=false;toggle.hidden=true;status.textContent='3D rendering stopped. Static artwork remains available; you can load the scene again.';},{capture:true,signal});
 load.addEventListener('click',async()=>{if(scene||load.disabled||disposed)return;load.disabled=true;status.textContent='Loading the local 3D artwork…';try{const module=await import('/neural/company-scene.js');if(disposed)return;scene=module.createCompanyScene(stage);stage.classList.add('has-scene');toggle.hidden=false;load.hidden=true;status.textContent='Interactive neural concept. Decorative artwork; no live AI or customer data.';scene.renderAt(0);}catch{if(disposed)return;load.disabled=false;status.textContent='3D is unavailable on this device. The artwork and film remain available.';}},{signal});
 toggle.addEventListener('click',()=>{if(!scene)return;if(reduced.matches){status.textContent='Reduced motion is enabled. The neural sculpture stays still.';return;}paused=!paused;sync();},{signal});
 reduced.addEventListener('change',()=>{if(reduced.matches){paused=true;section.querySelector('video')?.pause();}sync();},{signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)section.querySelector('video')?.pause();sync();},{signal});
 window.addEventListener('pagehide',controller.dispose,{signal});
 window.addEventListener('ad-astra:before-route-change',controller.dispose,{signal});
 load.disabled=false;load.hidden=false;toggle.hidden=true;stage.classList.remove('has-scene');sync();
 return controller;
 }
 globalThis.AdAstraCompanyExperience=Object.freeze({mount});
 window.addEventListener('pageshow',event=>{if(event.persisted){mount();const status=document.querySelector('[data-company-status]');if(status)status.textContent='Artwork restored. Choose interactive 3D to load the scene again.';}});
 mount();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(),{once:true});
})();
