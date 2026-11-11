'use strict';
(() => {
 const section=document.getElementById('neural-experience');if(!section)return;
 const stage=section.querySelector('[data-neural-stage]'),controls=section.querySelector('[data-neural-controls]');
 const load=section.querySelector('[data-neural-load]'),pause=section.querySelector('[data-neural-pause]'),renderStatus=section.querySelector('[data-neural-render-status]');
 const check=section.querySelector('[data-neural-check]'),connection=section.querySelector('[data-neural-connection-status]');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let scene=null,loading=false,disposed=false,paused=true,request=null,expiry=null,refreshGeneration=0,loadGeneration=0;
 let activity='idle';
 const conversation=globalThis.AdAstraConversation?.mount(section.closest('[data-neural-workspace]')||section,{onActivity:value=>{activity=value;stage.dataset.activity=value;scene?.setActivity(value);}});
 controls.hidden=false;check.hidden=false;
 function syncControls(){
  for(const button of controls.querySelectorAll('button:not([data-neural-load])'))button.disabled=!scene;
  pause.disabled=!scene||reduced.matches;
  pause.textContent=reduced.matches?'Reduced motion: manual controls only':paused?'Play automatic motion':'Pause automatic motion';
  pause.setAttribute('aria-pressed',String(paused));
 }
 function staticFallback(message){
  scene?.dispose();scene=null;stage.dataset.scene='static';stage.querySelector('.neural-poster').hidden=false;
  load.disabled=false;load.textContent='Retry interactive 3D';renderStatus.textContent=message;syncControls();
 }
 load.addEventListener('click',async()=>{
  if(loading||disposed||scene)return;const generation=++loadGeneration;loading=true;load.disabled=true;renderStatus.textContent='Loading the local 3D scene. No AI request is being made.';
  try{
   const module=await import('/neural/scene.js');if(disposed||generation!==loadGeneration)return;
   scene=module.createScene(stage,{reducedMotion:reduced.matches,onContextLost:()=>staticFallback('3D rendering stopped. Static artwork is available; you can retry.')});
   paused=reduced.matches;scene.setPaused(paused);scene.setActivity(activity);stage.querySelector('.neural-poster').hidden=true;
   stage.dataset.scene='interactive';load.textContent='Interactive 3D loaded';
   renderStatus.textContent='Interactive concept scene loaded. Pointer movement and the labelled controls change only this local artwork.';syncControls();
  }catch{if(!disposed&&generation===loadGeneration)staticFallback('Interactive 3D is unavailable on this device or connection. The static artwork remains available.');}
  finally{if(generation===loadGeneration)loading=false;}
 });
 pause.addEventListener('click',()=>{if(!scene||reduced.matches)return;paused=!paused;scene.setPaused(paused);syncControls();});
 for(const[key,x,y]of[['left',0,-.18],['right',0,.18],['up',-.12,0],['down',.12,0]])section.querySelector('[data-neural-'+key+']').addEventListener('click',()=>scene?.rotate(x,y));
 section.querySelector('[data-neural-reset]').addEventListener('click',()=>scene?.reset());
 reduced.addEventListener('change',()=>{if(reduced.matches)paused=true;scene?.setReducedMotion(reduced.matches);scene?.setPaused(paused);syncControls();});
 function unknown(message){
  clearTimeout(expiry);for(const card of section.querySelectorAll('[data-neural-service]')){card.textContent='Not verified';card.dataset.state='unknown';}
  connection.textContent=message;
 }
 check.addEventListener('click',async()=>{
  if(disposed)return;const generation=++refreshGeneration;request?.abort();clearTimeout(expiry);request=new AbortController();
  const current=request;check.disabled=true;unknown('Checking public availability. No customer session is being opened.');
  const timeout=setTimeout(()=>current.abort(),8000);
  try{
   const response=await fetch('/api/operating-status',{method:'GET',cache:'no-store',credentials:'omit',redirect:'error',signal:current.signal});
   if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Status unavailable');
   const reader=response.body.getReader();let bytes=0,text='';const decoder=new TextDecoder();
   try{for(;;){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>65536){await reader.cancel();throw Error('Status too large');}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
   const status=globalThis.AdAstraNeuralStatus.parseAvailability(JSON.parse(text));
   if(disposed||generation!==refreshGeneration)return;
   for(const card of section.querySelectorAll('[data-neural-service]')){const state=status.services[card.dataset.neuralService];card.textContent=state.label;card.dataset.state=state.state;}
   connection.textContent='Public availability checked. No active AI session or customer operation is represented.';
   expiry=setTimeout(()=>unknown('Status expired. Check again before relying on availability.'),Math.max(0,status.expiresAt-Date.now()));
  }catch{if(!disposed&&generation===refreshGeneration)unknown('Availability could not be verified. No active AI session is represented.');}
  finally{clearTimeout(timeout);if(!disposed&&generation===refreshGeneration)check.disabled=false;}
 });
 window.addEventListener('pagehide',()=>{disposed=true;refreshGeneration++;loadGeneration++;request?.abort();clearTimeout(expiry);conversation?.dispose();scene?.dispose();scene=null;});
 window.addEventListener('pageshow',event=>{if(!event.persisted)return;disposed=false;loading=false;check.disabled=false;conversation?.restore();staticFallback('Static artwork restored. Choose interactive 3D to load the scene again.');unknown('Connection not checked. No active AI session.');});
 syncControls();
})();
