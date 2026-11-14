import './state.js';
import '../neural/engine-client.js';
import '../neural/voice.js';
import {publicNavigation} from './navigation.js';
import {createCompanionIdentity} from './identity.js';

const session = AdAstraCompanionState.createSession();
const reduced = matchMedia('(prefers-reduced-motion: reduce)'), connection = navigator.connection;
const prefersStill = () => reduced.matches || connection?.saveData === true;
const root = document.createElement('aside'); root.className = 'astra-companion'; root.setAttribute('aria-label','Astra Polaris companion');
root.innerHTML = `<div class="astra-companion__dock">
 <img class="astra-companion__still" src="/assets/neural-master/delivery/neural-core-800.avif" width="800" height="450" alt="" aria-hidden="true">
 <button type="button" class="astra-companion__motion" data-companion-motion aria-label="Pause companion motion">Pause</button>
</div>
<button type="button" class="astra-companion__toggle" aria-expanded="false" aria-controls="astra-companion-panel">Astra Polaris <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13 13 3M4 3h9v9"/></svg></button>
<section id="astra-companion-panel" class="astra-companion__panel" aria-labelledby="astra-companion-title" hidden>
 <p class="astra-companion__eyebrow">AD ASTRA / YOUR COMPANION</p><h2 id="astra-companion-title">A little perspective.</h2>
 <p class="astra-companion__intro">Explore a question, shape an idea, or find your next step. Choose a communication style that feels right for you.</p>
 <nav class="astra-companion__links" aria-label="Companion destinations"><a href="/products/">Explore products ↗</a><a href="/services/">Find a solution ↗</a><a href="/platform/">Customer workspace ↗</a></nav>
 <label for="astra-companion-tone">Communication style</label><select id="astra-companion-tone"><option value="warm">Warm and considerate</option><option value="clear">Clear and measured</option><option value="concise">Concise and direct</option></select>
 <form data-companion-form><label for="astra-companion-question">Your question</label><textarea id="astra-companion-question" maxlength="2000" rows="3" placeholder="What would you like to explore?" disabled></textarea>
 <label class="astra-companion__context"><input type="checkbox" data-companion-context> Keep context for this visit</label>
 <div class="astra-companion__actions"><button type="submit" disabled>Ask Ad Astra</button><button type="button" data-companion-connect>Check signed-in access</button><button type="button" data-companion-dictate disabled>Dictate</button><button type="button" data-companion-voice aria-pressed="false" disabled>Start voice conversation</button><button type="button" data-companion-read disabled>Read answer</button><button type="button" data-companion-stop>Stop</button><button type="button" data-companion-clear>Clear context</button></div></form>
 <p class="astra-companion__status" role="status">Customer AI access requires a verified account and available service. Explore the workspace for current access.</p>
 <p class="astra-companion__answer" aria-live="polite"></p>
</section>`;
document.body.append(root);
const $ = selector => root.querySelector(selector), toggle = $('.astra-companion__toggle'), panel = $('.astra-companion__panel');
const form = $('[data-companion-form]'), input = $('#astra-companion-question'), submit = form.querySelector('[type=submit]'), status = $('.astra-companion__status'), answer = $('.astra-companion__answer');
const host = document.querySelector('[data-neural-hero]') || document.createElement('div');
host.className = 'ad-neural-live'; host.dataset.neuralHero = ''; host.setAttribute('aria-hidden','true');
let hero, sequence, routeEvents, observer, scene, loading = false, disposed = false, raf = 0, last = 0, time = 0, x = 0, y = 0, busy = false, activity = 'idle', answerText = '', request, generation = 0, authScope = null, previousBounds, travel, identity, voiceMode = false, voiceScope = null, dictated = false;
const scope = () => identity?.scope() || null;
function setActivity(value) { activity = value; root.dataset.activity = value; }
function voiceChoice() { const button=$('[data-companion-voice]');button.setAttribute('aria-pressed',String(voiceMode));button.textContent=voiceMode?'End voice conversation':'Start voice conversation'; }
function endVoice() { voiceMode=false;voiceScope=null;dictated=false;voiceChoice(); }
function speechStyle() { return session.snapshot().tone==='warm'?{rate:.94,pitch:1.02}:session.snapshot().tone==='concise'?{rate:1.1,pitch:1}:{rate:1,pitch:1}; }
async function listen() { if(!voiceMode||scope()!==voiceScope||document.hidden){endVoice();return;}dictated=false;const started=await voice.dictate();if(!started)endVoice(); }
const voice = AdAstraVoice.create({onState:setActivity,
 onTranscript:text => { if (!busy && scope()) { input.value=text.slice(0,2000);dictated=true;syncForm(); } },
 onNotice:text => { status.textContent=text; },
 onFailure:()=>endVoice(),
 onEnd:kind=>{if(!voiceMode||scope()!==voiceScope||document.hidden)return;if(kind==='dictation'){if(dictated&&input.value.trim().length>=5)sendQuestion(true);else{endVoice();status.textContent='Voice conversation stopped. Enter a question or start again when ready.';}}else if(kind==='playback'&&!busy)listen();}
});
function stop(message) { generation++; request?.abort(); request=null; busy=false;endVoice();voice.stop();setActivity('idle');if(message)status.textContent=message;syncForm(); }
function clearContext() { session.clear(); answerText=''; answer.textContent=''; input.value=''; syncForm(); }
function syncAuth() {
 const next=scope(); if (next!==authScope) { stop(); clearContext();authScope=next;session.setScope(next);session.setRemember(false);$('[data-companion-context]').checked=false; }
 syncForm();
}
function syncForm() { const allowed=Boolean(scope()); input.disabled=!allowed||busy; submit.disabled=!allowed||busy||input.value.trim().length<5; $('[data-companion-dictate]').disabled=!allowed||busy; $('[data-companion-voice]').disabled=!allowed||busy&&!voiceMode; $('[data-companion-read]').disabled=!allowed||!answerText||busy; }
identity=createCompanionIdentity({onChange:()=>syncAuth(),onNotice:text=>{status.textContent=text;}});
toggle.addEventListener('click', () => { const open=panel.hidden; panel.hidden=!open; toggle.setAttribute('aria-expanded',String(open)); if(open){syncAuth();$('#astra-companion-tone').focus();} });
root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();event.preventDefault();}});
$('#astra-companion-tone').addEventListener('change',event=>{session.setTone(event.target.value);scene?.setMode(event.target.value==='warm'?'create':event.target.value==='clear'?'research':'plan');});
$('[data-companion-context]').addEventListener('change',event=>{session.setRemember(event.target.checked);status.textContent=event.target.checked?'Context stays in this page session and is cleared when your account changes. It is not saved to browser storage.':'Conversation context cleared. Each question stands on its own.';});
$('[data-companion-clear]').addEventListener('click',()=>{stop();clearContext();status.textContent='Conversation context cleared.';});
$('[data-companion-stop]').addEventListener('click',()=>stop('Stopped. Already accepted engine work may still consume capacity.'));
$('[data-companion-connect]').addEventListener('click',async event=>{event.target.disabled=true;try{await identity.ensure({interactive:true});syncAuth();if(scope())status.textContent='Account verified. Choose text or start an on-device voice conversation.';}finally{event.target.disabled=false;}});
$('[data-companion-dictate]').addEventListener('click',()=>{if(!busy&&scope()){endVoice();voice.dictate();}});
$('[data-companion-voice]').addEventListener('click',()=>{if(voiceMode){stop('Voice conversation ended. The microphone is off.');return;}if(!busy&&scope()){voiceMode=true;voiceScope=scope();voiceChoice();listen();}});
$('[data-companion-read]').addEventListener('click',()=>{if(answerText&&!busy){endVoice();voice.speak(answerText,speechStyle());}});
input.addEventListener('input',syncForm);
form.addEventListener('submit',event=>{event.preventDefault();endVoice();sendQuestion();});
async function sendQuestion(fromVoice=false){
 if(busy||!scope())return;syncAuth();const account=scope(), question=input.value.trim();
 let prompt;try{prompt=session.question(question);}catch{status.textContent='Enter a question between 5 and 2,000 characters.';return;}
 voice.stop();busy=true;answerText='';answer.textContent='';syncForm();const current=++generation;request=new AbortController();const controller=request;
 status.textContent='Verifying access to Ad Astra.';setActivity('idle');const timer=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await AdAstraEngineClient.ask({question:prompt,agentId:'guide',mode:'ask',signal:controller.signal,getToken:()=>identity.token(account),onEvent:event=>{if(current!==generation||scope()!==account)return;setActivity(event.type==='accepted'||event.type==='requesting'?'requesting':event.type==='answer'?'responding':event.type==='failed'?'error':'idle');status.textContent=event.type==='completed'?'Answer complete.':event.type==='failed'?'Ad Astra could not complete this request.':'Ad Astra is processing your request.';}});
  if(current!==generation||scope()!==account)return;answerText=response;answer.textContent=response;session.complete(question,response);status.textContent='AI-generated answer. Review important claims. Voice playback is optional.';setActivity('idle');
 }catch(error){if(current===generation){endVoice();setActivity('error');status.textContent=controller.signal.aborted?'Request stopped or timed out.':error.message==='release_or_provider_unavailable'?'Customer AI access is not currently available. Your question was not answered.':error.message==='authentication_required'?'Please sign in to continue.':'The request could not complete. Check account access or try later.';}}
 finally{clearTimeout(timer);if(current===generation){busy=false;request=null;syncForm();if(fromVoice&&voiceMode&&scope()===voiceScope&&answerText&&!document.hidden)voice.speak(answerText,speechStyle());}}
}
function still(state='static') { travel?.cancel();cancelAnimationFrame(raf);raf=0;last=0;scene?.dispose();scene=null;host.querySelectorAll('canvas').forEach(canvas=>canvas.remove());host.dataset.neuralState=state;root.classList.remove('has-live-scene');hero?.classList.remove('is-live');const caption=hero?.querySelector('[data-neural-caption]');if(caption)caption.textContent='Neural sculpture · Still artwork';const controls=hero?.querySelector('.ad-scene-controls');if(controls)controls.hidden=true;layout(); }
function layout(){sequence?.classList.toggle('is-story-ready',Boolean(scene&&!prefersStill()&&innerWidth>=900));}
function progress(){if(!sequence?.classList.contains('is-story-ready'))return 0;const box=sequence.getBoundingClientRect();return Math.max(0,Math.min(1,-box.top/Math.max(1,sequence.offsetHeight-hero.offsetHeight)));}
function active(){const target=hero||root,box=target.getBoundingClientRect();return scene&&!disposed&&!document.hidden&&!prefersStill()&&document.body.dataset.motion!=='off'&&box.bottom>0&&box.top<innerHeight;}
function frame(now){if(!active())return;if(last)time+=Math.min((now-last)/1000,.05);last=now;const scroll=progress();sequence?.style.setProperty('--ad-story-progress',scroll.toFixed(4));scene.renderAt(time,{x,y,scroll,activity});raf=requestAnimationFrame(frame);}
function sync(){cancelAnimationFrame(raf);raf=0;last=0;$('[data-companion-motion]').hidden=!scene||prefersStill();if(prefersStill()){still();return;}if(!scene&&host.dataset.neuralState==='static'){load();return;}layout();if(active())raf=requestAnimationFrame(frame);const off=document.body.dataset.motion==='off';if(off)travel?.finish();$('[data-companion-motion]').textContent=off?'Play':'Pause';$('[data-companion-motion]').setAttribute('aria-label',off?'Play companion motion':'Pause companion motion');}
async function load(){if(scene||loading||disposed||prefersStill())return;loading=true;host.dataset.neuralState='loading';try{const {createCinematicScene}=await import('../neural/cinematic-scene.js');if(disposed||prefersStill())return;scene=createCinematicScene(host);host.dataset.neuralState='ready';root.classList.add('has-live-scene');hero?.classList.add('is-live');const controls=hero?.querySelector('.ad-scene-controls');if(controls)controls.hidden=false;const caption=hero?.querySelector('[data-neural-caption]');if(caption)caption.textContent='Interactive neural sculpture · Visual preview';sync();}catch{still('fallback');}finally{loading=false;}}
function mountRoute(){
 root.dataset.routeState='loading';
 routeEvents?.abort();routeEvents=new AbortController();observer?.disconnect();hero=document.querySelector('.ad-arrival');sequence=hero?.closest('[data-arrival-sequence]');root.dataset.home=String(Boolean(hero));
 if(hero){const placeholder=hero.querySelector('[data-neural-hero]');if(placeholder&&placeholder!==host)placeholder.replaceWith(host);else if(!hero.contains(host))hero.append(host);hero.classList.toggle('is-live',Boolean(scene));const controls=hero.querySelector('.ad-scene-controls');if(controls)controls.hidden=!scene;hero.addEventListener('pointermove',event=>{x=(event.clientX/innerWidth-.5)*2;y=(event.clientY/innerHeight-.5)*2;},{passive:true,signal:routeEvents.signal});hero.querySelectorAll('[data-neural-mode]').forEach(button=>button.addEventListener('click',()=>{hero.querySelectorAll('[data-neural-mode]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));scene?.setMode(button.dataset.neuralMode);},{signal:routeEvents.signal}));}
 else $('.astra-companion__dock').prepend(host);
 observer=new IntersectionObserver(sync,{threshold:.01});observer.observe(hero||root);sync();if(!prefersStill())load();else still();
 if(previousBounds&&scene&&!prefersStill()&&document.body.dataset.motion!=='off'){
  const box=host.getBoundingClientRect(),scale=Math.min(previousBounds.width/Math.max(1,box.width),previousBounds.height/Math.max(1,box.height));
  travel?.cancel();travel=host.animate([{transformOrigin:'0 0',transform:`translate(${previousBounds.left-box.left}px,${previousBounds.top-box.top}px) scale(${scale})`},{transformOrigin:'0 0',transform:'none'}],{duration:650,easing:'cubic-bezier(.22,.7,.25,1)'});
 }
 previousBounds=null;
 mountAdapters(routeEvents.signal);
}
async function mountAdapters(signal){
 const adapters=[
  ['[data-explore-tab]','AdAstraHomeInteractions',()=>import('../customer-experience.js')],
  ['[data-knowledge-map]','AdAstraKnowledgeMap',()=>import('../platform-preview/knowledge-map.js')],
  ['[data-mode-filter]','AdAstraProductDiscovery',()=>import('../products/discovery.js')],
  ['[data-company-experience]','AdAstraCompanyExperience',()=>import('../homepage-experience.js')],
  ['[data-direction-controls]','AdAstraStartExperience',()=>import('../start/experience.js')],
  ['.wp-app','AdAstraWorkspacePreview',()=>import('../platform-preview/app.js')],
  ['#california-subscription-status','AdAstraCaliforniaPage',()=>import('../markets/california/app.js')],
  ['#availability-update','AdAstraStatusPage',()=>import('../status/status.js')],
  ['#neural-experience','AdAstraNeuralExperience',async()=>{await import('../neural/state.js');return import('../neural/experience.js');}]
 ];
 try{
  await Promise.all(adapters.filter(([selector])=>document.querySelector(selector)).map(async([,name,load])=>{if(!globalThis[name])await load();if(!signal.aborted)globalThis[name]?.mount(document);}));
  const products=await import('../neural/product-showcase.js');if(!signal.aborted)products.mountProductShowcases?.(document);
  if(!signal.aborted)root.dataset.routeState='ready';
 }catch{if(!signal.aborted){root.dataset.routeState='fallback';status.textContent='Some page interactions could not load. Reload this page to try again.';}}
}
$('[data-companion-motion]').addEventListener('click',()=>window.dispatchEvent(new CustomEvent('ad-astra:motion-choice',{detail:{paused:document.body.dataset.motion!=='off'}})));
host.addEventListener('webglcontextlost',event=>{event.preventDefault();still('fallback');},true);
new MutationObserver(()=>{sync();syncAuth();if(document.body.dataset.authenticated==='true')identity.ensure();}).observe(document.body,{attributes:true,attributeFilter:['data-motion','data-authenticated']});
reduced.addEventListener('change',sync);connection?.addEventListener('change',sync);window.addEventListener('resize',()=>{layout();sync();},{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('Paused while this page is hidden.');sync();});
publicNavigation({beforeChange(){previousBounds=host.getBoundingClientRect();routeEvents?.abort();observer?.disconnect();$('.astra-companion__dock').prepend(host);},afterChange:mountRoute});
window.addEventListener('pagehide',()=>{disposed=true;stop();clearContext();still();observer?.disconnect();routeEvents?.abort();});
window.addEventListener('pageshow',event=>{if(event.persisted){disposed=false;mountRoute();identity.ensure().then(syncAuth);}});
window.addEventListener('ad-astra:engine-activity',event=>{if(['idle','listening','requesting','responding','speaking','error'].includes(event.detail?.state))setActivity(event.detail.state);});
mountRoute();syncAuth();identity.ensure().then(syncAuth);
