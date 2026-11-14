'use strict';
// Mounted only inside the existing verified-account workspace. Server auth is authoritative.
((root)=>{
 function mount(section,{onActivity=()=>{}}={}){
  const form=section.querySelector('[data-engine-form]');if(!form)return {dispose(){},restore(){}};
  const input=form.querySelector('[name=question]'),mode=form.querySelector('[name=mode]'),agent=form.querySelector('[name=agentId]'),submit=form.querySelector('[type=submit]');
  const stop=section.querySelector('[data-conversation-stop]'),dictate=section.querySelector('[data-voice-dictate]'),read=section.querySelector('[data-voice-read]');
  const status=section.querySelector('[data-conversation-status]'),answer=section.querySelector('[data-engine-answer]'),notice=section.querySelector('[data-voice-notice]');
  if(!agent||!root.AdAstraEngineClient)return {dispose(){},restore(){}};
  const agents=[...agent.options].map(option=>({id:option.value,name:option.textContent,defaultMode:option.dataset.defaultMode}));
  const catalog=new Map(agents.map(profile=>[profile.id,profile]));
  let busy=false,disposed=false,controller=null,generation=0,completedAnswer='';
  const labels={accepted:'Request accepted by the authenticated server.',requesting:'The server has requested a model response.',answer:'A response was received; validating completion.',completed:'Response complete. Review important claims.',failed:'The model request could not complete.'};
  function activity(value){onActivity(value);root.dispatchEvent?.(new CustomEvent('ad-astra:engine-activity',{detail:{state:value,source:'workspace'}}));section.querySelector('[data-request-activity]').textContent={idle:'No active request',listening:'On-device microphone active',requesting:'Model request in progress',responding:'Response received',speaking:'On-device voice playback',error:'Request stopped or unavailable'}[value]||'No active request';}
  function sync(){submit.disabled=busy||disposed||input.value.trim().length<5||!catalog.has(agent.value);agent.disabled=busy;mode.disabled=busy;dictate.disabled=busy;read.disabled=busy||!completedAnswer;stop.disabled=false;}
  const createVoice=()=>root.AdAstraVoice.create({onState:activity,onTranscript:text=>{if(disposed||busy)return;input.value=text;sync();input.focus();},onNotice:text=>{notice.textContent=text;}});
  let voice=createVoice();
  function cancel(message='Stopped. An already accepted request may still consume reserved capacity.'){
   generation++;controller?.abort();controller=null;busy=false;voice.stop();activity('idle');status.textContent=message;sync();
  }
  function clearResponse(){completedAnswer='';answer.textContent='';delete answer.dataset.agentId;delete answer.dataset.requestId;}
  input.addEventListener('input',sync);
  agent.addEventListener('change',()=>{cancel('Profile changed. No request has been sent.');clearResponse();mode.value=catalog.get(agent.value)?.defaultMode||'ask';sync();});
  mode.addEventListener('change',()=>{cancel('Way of working changed. No request has been sent.');clearResponse();sync();});
  dictate.addEventListener('click',()=>{if(!busy&&!disposed)voice.dictate();});
  read.addEventListener('click',()=>{if(!busy&&!disposed)voice.speak(completedAnswer);});
  stop.addEventListener('click',()=>cancel());
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(busy||disposed)return;voice.stop();
   if(document.body.dataset.authenticated!=='true'||!root.Clerk?.session){activity('error');status.textContent='A verified account session is required. Sign in again before sending.';return;}
   if(input.value.trim().length<5||input.value.trim().length>4000){status.textContent='Enter a question between 5 and 4,000 characters.';return;}
   if(!catalog.has(agent.value)){status.textContent='Select a supported Ad Astra profile.';return;}
   const selected={agentId:agent.value,mode:mode.value},session=root.Clerk.session;let requestId=null;
   const current=++generation;controller=new AbortController();const abort=controller;
   busy=true;clearResponse();status.textContent='Verifying your session and requesting access. No model activity is claimed yet.';activity('idle');sync();
   const timeout=setTimeout(()=>abort.abort(),30000);
   try{
    const text=await root.AdAstraEngineClient.ask({question:input.value,mode:selected.mode,agentId:selected.agentId,getToken:async()=>{const token=await session.getToken();if(root.Clerk?.session!==session)throw Error('authentication_required');return token;},signal:abort.signal,onEvent:event=>{
     if(disposed||current!==generation)return;requestId=event.requestId;status.textContent=labels[event.type];
     if(event.type==='accepted'||event.type==='requesting')activity('requesting');
     if(event.type==='answer')activity('responding');if(event.type==='failed')activity('error');
    }});
    if(disposed||current!==generation)return;if(root.Clerk?.session!==session)throw Error('authentication_required');completedAnswer=text;answer.textContent=text;answer.dataset.agentId=selected.agentId;answer.dataset.requestId=requestId;status.textContent='Response complete. '+catalog.get(selected.agentId).name+' · '+selected.mode+'. AI-generated; verify important claims. Voice playback is optional.';activity('idle');
   }catch(error){
    if(disposed||current!==generation)return;
    completedAnswer='';answer.textContent='';activity('error');
    status.textContent=abort.signal.aborted?'Request stopped or timed out. No automatic retry was made.':error.message==='authentication_required'?'Your session could not be verified. Please sign in again.':error.message==='access_denied'?'Access was denied. Check your account and subscription before sending another request.':error.message==='request_replayed'?'This request was already attempted. It was not sent to the model again.':error.message==='capacity_reached'?'Request capacity has been reached. Please try later.':error.message==='release_or_provider_unavailable'?'The engine is release-gated or temporarily unavailable. No answer was produced.':'The request could not be verified or completed. No automatic retry was made.';
   }finally{clearTimeout(timeout);if(!disposed&&current===generation){busy=false;controller=null;sync();}}
  });
  function visibility(){if(document.hidden&&!disposed)cancel('Paused because the page is hidden. Microphone, playback and the local request were stopped.');}
  document.addEventListener('visibilitychange',visibility);
  function dispose(){if(disposed)return;disposed=true;cancel('Workspace interaction stopped.');voice.dispose();}
  function restore(){if(!disposed)return;disposed=false;voice=createVoice();status.textContent='Session and availability must be checked again before use.';sync();}
  const initial=root.AdAstraEngineClient.selection(location.search,agents);agent.value=initial.agentId;mode.value=initial.mode;
  if(initial.invalid)status.textContent='That profile or mode link is unsupported. A supported selection is shown; no request was sent.';
  sync();return {dispose,restore};
 }
 root.AdAstraConversation=Object.freeze({mount});
})(globalThis);
