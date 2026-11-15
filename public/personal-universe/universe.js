// AD ASTRA Personal Intelligence Universe (development preview).
// One shared, locally-rendered 3D sculpture; protected AI calls only after
// explicit customer action + the existing verified identity and server gates.
import {createCompanionIdentity} from '../companion/identity.js';
const $=id=>document.getElementById(id);
const status=$('scene-status'), neural=$('universe-visual'), poster=neural.querySelector('img');
const choice=$('vertical-choice'), colorChoice=$('color-choice'), motion=$('motion-toggle');
const question=$('universe-question'), ask=$('ask-intelligence'), dictate=$('voice-dictate'), output=$('universe-answer');
const verify=$('verify-account'), voiceState=$('voice-state'), serviceState=$('service-state');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const verticals=globalThis.AdAstraCustomerVerticals;
if(!verticals)throw Error('vertical_catalog_unavailable');
const session=verticals.createSession(verticals.resolveRoute(location.search).id);
let scene=null,animation=0,started=0,elapsed=0,active=false,disposed=false;
let voice=null,identity=null,currentScope=null,request=null,requestGeneration=0,lastVoiceAnswer='';
const palettes={cyan:'research',champagne:'create',cobalt:'plan',vertical:null};
function calm(){return reduced.matches||$('calm-motion').checked||navigator.connection?.saveData===true}
function sceneMode(){return colorChoice.value==='vertical'?session.current().sceneMode:palettes[colorChoice.value]}
function updateTheme(){
 const profile=session.current();
 const accent=colorChoice.value==='cyan'?'#b6deed':colorChoice.value==='champagne'?'#d5ba91':colorChoice.value==='cobalt'?'#aec9ed':profile.accent;
 document.documentElement.style.setProperty('--accent',accent);
 $('mapped-agent').textContent=profile.agentId.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).replace(/^/,'Astra ');
 $('vertical-description').textContent='Selected: '+profile.label+'. This is a visual preference and agent request hint, not a provider authorization.';
 scene?.setMode(sceneMode());
 syncMotion();
}
for(const {id,label} of session.choices()){
 const opt=document.createElement('option');opt.value=id;opt.textContent=label;choice.append(opt);
}
choice.value=session.current().id;
choice.addEventListener('change',()=>{session.choose(choice.value);stopRequest();updateTheme();});
colorChoice.addEventListener('change',updateTheme);
$('calm-motion').addEventListener('change',()=>{syncMotion();});
function pause(){
 if(animation)cancelAnimationFrame(animation);animation=0;started=0;
}
function loop(t){
 if(!scene||!active||disposed||document.hidden||calm())return;
 if(started)elapsed+=Math.min((t-started)/1000,.05);started=t;
 scene.renderAt(elapsed,{activity:request?'requesting':'idle'});
 animation=requestAnimationFrame(loop);
}
function syncMotion(){
 pause();active=!!scene&&!calm()&&motion.getAttribute('aria-pressed')!=='true';
 document.body.classList.toggle('is-calm',calm());
 if(scene&&!disposed)scene.renderAt(elapsed,{activity:request?'requesting':'idle'});
 motion.disabled=!scene||calm();motion.textContent=calm()?'Motion disabled':active?'Pause motion':'Resume motion';
 if(active)animation=requestAnimationFrame(loop);
}
$('load-3d').addEventListener('click',async()=>{
 if(scene||disposed)return;
 const btn=$('load-3d');btn.disabled=true;status.textContent='Preparing the first-party neural visualization. No AI request is being made.';
 try{
  const {createCinematicScene}=await import('../neural/cinematic-scene.js');
  if(disposed)return;
  scene=createCinematicScene(neural);scene.setMode(sceneMode());poster.hidden=true;
  motion.setAttribute('aria-pressed','false');
  status.textContent='Interactive 3D loaded. Color and motion are visual preferences; no private model reasoning is shown.';
  btn.textContent='3D Ready';syncMotion();
 }catch{status.textContent='3D is unavailable on this device. Static artwork remains available.';btn.disabled=false;}
});
motion.addEventListener('click',()=>{
 motion.setAttribute('aria-pressed',String(motion.getAttribute('aria-pressed')!=='true'));
 syncMotion();
});
reduced.addEventListener('change',syncMotion);
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopRequest();voice?.stop();}syncMotion();});
function syncAuth(){
 const next=identity?.scope()||null;
 if(next!==currentScope){stopRequest();currentScope=next;output.textContent='';question.value='';lastVoiceAnswer='';}
 question.disabled=!next;ask.disabled=!next||question.value.trim().length<5;dictate.disabled=!next;
 serviceState.textContent=next?'Account verified. AI availability is enforced by the server.':'AI connection not verified';
}
function stopRequest(){
 requestGeneration++;request?.abort();request=null;voice?.stop();ask.disabled=!currentScope;
}
voice=globalThis.AdAstraVoice?.create({
 onState:state=>{voiceState.textContent=state==='listening'?'Microphone active on this device.':state==='speaking'?'On-device voice playback.':'Microphone off.';},
 onTranscript:value=>{if(currentScope){question.value=value.slice(0,2000);syncAuth();}},
 onNotice:value=>{voiceState.textContent=value;},
 onFailure:()=>{voiceState.textContent='Voice unavailable. You can type instead.';}
});
identity=createCompanionIdentity({onChange:syncAuth,onNotice:value=>{serviceState.textContent=value;}});
verify.addEventListener('click',async()=>{
 verify.disabled=true;
 try{await identity.ensure({interactive:true});syncAuth();}
 catch{serviceState.textContent='Account verification unavailable.';}
 finally{verify.disabled=false;}
});
question.addEventListener('input',()=>{ask.disabled=!currentScope||question.value.trim().length<5;});
dictate.addEventListener('click',()=>{if(currentScope&&!request)void voice?.dictate();});
$('stop-activity').addEventListener('click',()=>{stopRequest();voiceState.textContent='Voice and request stopped.';});
ask.addEventListener('click',async()=>{
 if(!currentScope||request)return;
 const questionText=question.value.trim();
 if(questionText.length<5||questionText.length>2000)return;
 const tokenScope=currentScope,profile=session.current(),generation=++requestGeneration;
 request=new AbortController();ask.disabled=true;output.textContent='Verifying available customer intelligence...';
 const abortTimeout=setTimeout(()=>request?.abort(),30000);
 try{
  const answer=await globalThis.AdAstraEngineClient.ask({
   question:questionText,mode:profile.interaction,agentId:profile.agentId,
   getToken:()=>identity.token(tokenScope),signal:request.signal,
   onEvent:evt=>{if(generation===requestGeneration&&currentScope===tokenScope)
    voiceState.textContent=evt.type==='requesting'?'Verified request processing...':evt.type==='answer'?'Receiving answer...':'Voice remains off.';}
  });
  if(generation===requestGeneration&&currentScope===tokenScope){
   lastVoiceAnswer=answer;output.textContent=answer;voiceState.textContent='Answer ready as text. Voice playback has not started.';
  }
 }catch{
  if(generation===requestGeneration)output.textContent='The protected AI service is unavailable or access is not yet approved. No simulated answer is shown.';
 }finally{
  clearTimeout(abortTimeout);
  if(generation===requestGeneration){request=null;ask.disabled=!currentScope||question.value.trim().length<5;syncMotion();}
 }
});
window.addEventListener('pagehide',()=>{
 disposed=true;stopRequest();pause();scene?.dispose();scene=null;voice?.dispose();identity?.dispose();
},{once:true});
updateTheme();syncAuth();


// Daily Life Intelligence — a genuine human-first journey, not a fake AI answer.
// This session only holds the choices and checked steps in browser memory.
const dailyCatalog=globalThis.AdAstraDailyLife;
if(dailyCatalog){
 const daily=dailyCatalog.createSession();
 const selection=$('daily-choices'),questionEl=$('daily-question'),steps=$('daily-steps'),progress=$('daily-status');
 function renderDaily(){
  const value=daily.current();
  selection.replaceChildren();
  for(const item of daily.list()){
   const button=document.createElement('button');button.type='button';button.textContent=item.label;
   button.setAttribute('aria-pressed',String(item.id===value.id));
   button.addEventListener('click',()=>{
    daily.choose(item.id);
    // Changing the daily goal does not trigger a model request or infer a mood.
    document.documentElement.style.setProperty('--accent',item.accent);
    renderDaily();
   });
   selection.append(button);
  }
  questionEl.textContent=value.question;
  steps.replaceChildren();
  for(const [index,text] of value.steps.entries()){
   const label=document.createElement('label'),checkbox=document.createElement('input'),caption=document.createElement('span');
   checkbox.type='checkbox';checkbox.checked=daily.isDone(index);caption.textContent=text;
   checkbox.addEventListener('change',()=>{daily.setDone(index,checkbox.checked);updateDailyProgress();});
   label.append(checkbox,caption);steps.append(label);
  }
  updateDailyProgress();
 }
 function updateDailyProgress(){
  const snap=daily.snapshot();
  progress.textContent=snap.completed+' of '+snap.total+' chosen steps marked complete. Only you can confirm progress; it is not recorded after leaving this page.';
 }
 $('daily-ask').addEventListener('click',()=>{
  const value=daily.current();
  // The user must explicitly verify and submit through the existing protected AI path.
  question.value=value.prompt;
  question.dispatchEvent(new Event('input',{bubbles:true}));
  $('universe-question').scrollIntoView({behavior:calm()?'instant':'smooth',block:'center'});
  if(!currentScope)serviceState.textContent='Verify your account to submit this question. No AI request has been made.';
 });
 renderDaily();
}
// Environment parallax remains decorative and honors privacy, accessibility,
// motion preferences, hidden pages, and mobile performance.
let driftFrame=0,driftX=0,driftY=0;
function applyDrift(){
 driftFrame=0;
 if(disposed||document.hidden||calm())return;
 document.documentElement.style.setProperty('--parallax-x',(driftX*9).toFixed(1)+'px');
 document.documentElement.style.setProperty('--parallax-y',(driftY*7).toFixed(1)+'px');
}
window.addEventListener('pointermove',event=>{
 if(event.pointerType==='touch'||calm()||document.hidden)return;
 driftX=(event.clientX/innerWidth-.5)*2;driftY=(event.clientY/innerHeight-.5)*2;
 if(!driftFrame)driftFrame=requestAnimationFrame(applyDrift);
},{passive:true});
reduced.addEventListener('change',()=>{
 if(calm()){cancelAnimationFrame(driftFrame);driftFrame=0;document.documentElement.style.setProperty('--parallax-x','0px');document.documentElement.style.setProperty('--parallax-y','0px');}
});
