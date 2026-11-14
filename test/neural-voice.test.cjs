'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {create}=require('../public/neural/voice.js');
function fixture({local=true,available='available',deferred=false}={}){
 const rows={states:[],notices:[],transcripts:[],ends:[],failures:[],instances:[],spoken:[],delays:[],starts:0,aborts:0,cancels:0,availabilityChecks:0,availabilityOptions:[],installs:0},timers=new Map(),grants=[];let nextTimer=0;
 class Recognition{static available(options){rows.availabilityChecks++;rows.availabilityOptions.push(options);return deferred?new Promise((resolve,reject)=>grants.push({resolve,reject})):Promise.resolve(available);}static install(){rows.installs++;throw new Error('Speech packs must never be downloaded.');}constructor(){rows.instances.push(this);}start(){rows.starts++;}abort(){rows.aborts++;}}
 Recognition.prototype.processLocally=false;
 const host={isSecureContext:true,document:{hidden:false},SpeechRecognition:Recognition,SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},speechSynthesis:{getVoices:()=>[{lang:'en-US',localService:local}],speak:item=>rows.spoken.push(item),cancel:()=>rows.cancels++},setTimeout(fn,delay){const id=++nextTimer;rows.delays.push(delay);timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
 const voice=create({host,onState:s=>rows.states.push(s),onNotice:s=>rows.notices.push(s),onTranscript:s=>rows.transcripts.push(s),onEnd:kind=>rows.ends.push(kind),onFailure:reason=>rows.failures.push(reason)});return {host,rows,voice,timers,grant:value=>grants.shift().resolve(value),reject:error=>grants.shift().reject(error)};
}
test('voice construction neither starts recording nor selects a remote service',()=>{const f=fixture();assert.equal(f.rows.starts,0);assert.equal(f.rows.availabilityChecks,0);assert.equal(f.rows.spoken.length,0);});
test('on-device dictation uses explicit start, never submits text, and releases on stop',async()=>{
 const f=fixture();assert.equal(await f.voice.dictate(),true);const rec=f.rows.instances[0];assert.equal(rec.processLocally,true);assert.equal(rec.continuous,false);assert.equal(rec.interimResults,false);assert.equal(rec.lang,'en-US');assert.deepEqual(f.rows.availabilityOptions,[{langs:['en-US'],processLocally:true}]);assert.equal(f.rows.starts,1);assert.ok(!f.rows.states.includes('listening'));rec.onstart();assert.equal(f.rows.states.at(-1),'listening');rec.onresult({resultIndex:0,results:[Object.assign([{transcript:'Review this text before sending.'}],{isFinal:true})]});assert.deepEqual(f.rows.transcripts,['Review this text before sending.']);f.voice.stop();assert.equal(f.rows.aborts,1);assert.equal(f.rows.states.at(-1),'idle');assert.equal(f.timers.size,0);assert.deepEqual(f.rows.ends,[]);assert.deepEqual(f.rows.failures,[]);
});
test('missing speech packs and unsupported local recognition never fall back to cloud dictation',async()=>{
 for(const available of ['downloadable','downloading','unavailable']){const f=fixture({available});assert.equal(await f.voice.dictate(),false);assert.equal(f.rows.starts,0);assert.equal(f.rows.installs,0);assert.ok(f.rows.notices.at(-1).includes('no cloud'));assert.deepEqual(f.rows.failures,['dictation-unavailable']);assert.deepEqual(f.rows.ends,[]);}
 for(const remove of [f=>{delete f.host.SpeechRecognition;},f=>{f.host.isSecureContext=false;},f=>{delete f.host.SpeechRecognition.available;},f=>{delete f.host.SpeechRecognition.prototype.processLocally;}]){const absent=fixture();remove(absent);assert.equal(await absent.voice.dictate(),false);assert.equal(absent.rows.starts,0);assert.equal(absent.rows.availabilityChecks,0);assert.deepEqual(absent.rows.failures,['dictation-unsupported']);assert.deepEqual(absent.rows.ends,[]);}
});
test('late availability, microphone callbacks and hidden documents cannot restart capture',async()=>{
 const f=fixture({deferred:true}),pending=f.voice.dictate();f.voice.stop();f.grant('available');assert.equal(await pending,false);assert.equal(f.rows.starts,0);assert.deepEqual(f.rows.failures,[]);assert.deepEqual(f.rows.ends,[]);
 const late=fixture();await late.voice.dictate();const rec=late.rows.instances[0];late.voice.stop();rec.onstart();assert.ok(!late.rows.states.includes('listening'));assert.ok(late.rows.aborts>=1);
 const hidden=fixture();hidden.host.document.hidden=true;assert.equal(await hidden.voice.dictate(),false);assert.equal(hidden.voice.speak('A completed answer.'),false);assert.equal(hidden.rows.starts,0);assert.equal(hidden.rows.availabilityChecks,0);assert.equal(hidden.rows.spoken.length,0);assert.deepEqual(hidden.rows.failures,[]);
});
test('only explicitly local voices speak; cancellation and stale callbacks are safe',()=>{
 const remote=fixture({local:false});assert.equal(remote.voice.speak('A completed answer.'),false);assert.equal(remote.rows.spoken.length,0);assert.ok(remote.rows.notices.at(-1).includes('No on-device'));assert.deepEqual(remote.rows.failures,['playback-unavailable']);assert.deepEqual(remote.rows.ends,[]);
 const f=fixture();assert.equal(f.voice.speak('A completed answer.'),true);const item=f.rows.spoken[0];assert.equal(item.voice.localService,true);assert.ok(!f.rows.states.includes('speaking'));item.onstart();assert.equal(f.rows.states.at(-1),'speaking');f.voice.stop();assert.equal(f.rows.cancels,1);item.onstart();assert.equal(f.rows.states.at(-1),'idle');assert.deepEqual(f.rows.ends,[]);assert.deepEqual(f.rows.failures,[]);
});
test('capture and playback limits stop activities, and disposal prevents later starts',async()=>{
 const f=fixture();assert.equal(await f.voice.dictate(),true);const rec=f.rows.instances[0],dictationTimeout=[...f.timers.values()][0];dictationTimeout();assert.equal(f.rows.aborts,1);assert.deepEqual(f.rows.failures,['dictation-timeout']);assert.equal(f.timers.size,0);rec.onend();dictationTimeout();assert.equal(f.voice.speak('A completed answer.'),true);const item=f.rows.spoken[0],playbackTimeout=[...f.timers.values()][0];playbackTimeout();assert.equal(f.rows.cancels,1);assert.equal(f.timers.size,0);item.onend();playbackTimeout();assert.deepEqual(f.rows.failures,['dictation-timeout','playback-timeout']);assert.deepEqual(f.rows.ends,[]);assert.deepEqual(f.rows.delays,[30000,120000]);f.voice.dispose();assert.equal(await f.voice.dictate(),false);assert.equal(f.voice.speak('Another answer.'),false);assert.equal(f.rows.starts,1);assert.equal(f.rows.spoken.length,1);assert.equal(f.rows.failures.length,2);
});
test('stop replaces an active microphone notice with an explicit off indicator',async()=>{
 const f=fixture();await f.voice.dictate();f.rows.instances[0].onstart();assert.ok(f.rows.notices.at(-1).includes('Microphone active'));f.voice.stop();assert.equal(f.rows.notices.at(-1),'Microphone and playback are off.');assert.equal(f.rows.states.at(-1),'idle');
});
test('natural completion reports each kind once, cleans up, and never restarts services',async()=>{
 const f=fixture();assert.equal(await f.voice.dictate(),true);const rec=f.rows.instances[0],dictationTimeout=[...f.timers.values()][0];
 rec.onstart();rec.onresult({resultIndex:0,results:[Object.assign([{transcript:'A final question.'}],{isFinal:true})]});assert.deepEqual(f.rows.ends,[]);
 rec.onend();assert.deepEqual(f.rows.ends,['dictation']);assert.equal(f.rows.states.at(-1),'idle');assert.equal(f.timers.size,0);assert.equal(f.rows.aborts,0);
 rec.onend();rec.onerror({error:'network'});dictationTimeout();assert.deepEqual(f.rows.ends,['dictation']);assert.deepEqual(f.rows.failures,[]);assert.equal(f.rows.starts,1);assert.equal(f.rows.spoken.length,0);
 assert.equal(f.voice.speak('A completed answer.'),true);const item=f.rows.spoken[0],playbackTimeout=[...f.timers.values()][0];item.onstart();item.onend();assert.deepEqual(f.rows.ends,['dictation','playback']);assert.equal(f.rows.states.at(-1),'idle');assert.equal(f.timers.size,0);assert.equal(f.rows.cancels,0);
 item.onend();item.onerror({error:'synthesis-failed'});playbackTimeout();assert.deepEqual(f.rows.ends,['dictation','playback']);assert.deepEqual(f.rows.failures,[]);assert.equal(f.rows.starts,1);assert.equal(f.rows.spoken.length,1);f.voice.stop();f.voice.dispose();assert.deepEqual(f.rows.ends,['dictation','playback']);
});
test('permission denials and service errors report failures without natural completion',async()=>{
 for(const [error,reason] of [['not-allowed','dictation-permission-denied'],['service-not-allowed','dictation-permission-denied'],['audio-capture','dictation-error'],['no-speech','dictation-error'],['network','dictation-error'],['aborted','dictation-error']]){
  const f=fixture();await f.voice.dictate();const rec=f.rows.instances[0];rec.onerror({error});rec.onend();rec.onerror({error});assert.deepEqual(f.rows.failures,[reason]);assert.deepEqual(f.rows.ends,[]);assert.equal(f.rows.states.at(-1),'idle');assert.equal(f.timers.size,0);assert.equal(f.rows.aborts,1);assert.equal(f.rows.starts,1);
 }
 for(const [error,reason] of [['not-allowed','playback-permission-denied'],['synthesis-failed','playback-error'],['canceled','playback-error']]){
  const f=fixture();f.voice.speak('A completed answer.');const item=f.rows.spoken[0];item.onerror({error});item.onend();item.onerror({error});assert.deepEqual(f.rows.failures,[reason]);assert.deepEqual(f.rows.ends,[]);assert.equal(f.rows.states.at(-1),'idle');assert.equal(f.timers.size,0);assert.equal(f.rows.cancels,1);assert.equal(f.rows.spoken.length,1);
 }
});
test('dictation support, constructor and start exceptions return false and report one failure',async()=>{
 for(const stage of ['available-throw','available-reject','constructor','start','permission','error-event']){
  const f=fixture(),error=Object.assign(new Error('Synthetic speech failure.'),{name:stage==='permission'?'NotAllowedError':'Error'});
  if(stage==='available-throw')f.host.SpeechRecognition.available=()=>{throw error;};
  else if(stage==='available-reject')f.host.SpeechRecognition.available=()=>Promise.reject(error);
  else if(stage==='constructor')f.host.SpeechRecognition=class extends f.host.SpeechRecognition{constructor(){throw error;}};
  else if(stage==='error-event')f.host.SpeechRecognition.prototype.start=function(){this.onerror({error:'audio-capture'});};
  else f.host.SpeechRecognition.prototype.start=function(){throw error;};
  assert.equal(await f.voice.dictate(),false,stage);assert.deepEqual(f.rows.failures,[stage==='permission'?'dictation-permission-denied':'dictation-error'],stage);assert.deepEqual(f.rows.ends,[]);assert.equal(f.rows.states.at(-1),'idle');assert.equal(f.timers.size,0);
 }
});
test('playback API exceptions return false, release queued work and report one failure',()=>{
 for(const stage of ['voices','constructor','speak','permission','error-event']){
  const f=fixture(),error=Object.assign(new Error('Synthetic playback failure.'),{name:stage==='permission'?'NotAllowedError':'Error'});
  if(stage==='voices')f.host.speechSynthesis.getVoices=()=>{throw error;};
  else if(stage==='constructor')f.host.SpeechSynthesisUtterance=class{constructor(){throw error;}};
  else if(stage==='error-event')f.host.speechSynthesis.speak=item=>{f.rows.spoken.push(item);item.onerror({error:'synthesis-failed'});};
  else f.host.speechSynthesis.speak=item=>{f.rows.spoken.push(item);throw error;};
  assert.equal(f.voice.speak('A completed answer.'),false,stage);assert.deepEqual(f.rows.failures,[stage==='permission'?'playback-permission-denied':'playback-error'],stage);assert.deepEqual(f.rows.ends,[]);assert.equal(f.rows.states.at(-1),'idle');assert.equal(f.timers.size,0);
  if(f.rows.spoken.length){f.rows.spoken[0].onend();assert.equal(f.rows.cancels,1);assert.deepEqual(f.rows.ends,[]);}
 }
});
test('stop and dispose suppress synchronous abort/cancel events and every late callback',async()=>{
 for(const action of ['stop','dispose']){
  const f=fixture();await f.voice.dictate();const rec=f.rows.instances[0],timeout=[...f.timers.values()][0];rec.onstart();rec.abort=()=>{f.rows.aborts++;rec.onerror({error:'aborted'});rec.onend();};
  f.voice[action]();assert.equal(f.rows.states.at(-1),'idle');assert.equal(f.rows.notices.at(-1),'Microphone and playback are off.');const states=f.rows.states.slice(),notices=f.rows.notices.slice();rec.onstart();rec.onresult({resultIndex:0,results:[Object.assign([{transcript:'Stale question.'}],{isFinal:true})]});rec.onerror({error:'not-allowed'});rec.onend();timeout();
  assert.deepEqual(f.rows.ends,[],action);assert.deepEqual(f.rows.failures,[],action);assert.deepEqual(f.rows.transcripts,[]);assert.deepEqual(f.rows.states,states);assert.deepEqual(f.rows.notices,notices);assert.equal(f.timers.size,0);
  const g=fixture();g.voice.speak('A completed answer.');const item=g.rows.spoken[0],playbackTimeout=[...g.timers.values()][0];item.onstart();g.host.speechSynthesis.cancel=()=>{g.rows.cancels++;item.onerror({error:'canceled'});item.onend();};
  g.voice[action]();assert.equal(g.rows.states.at(-1),'idle');assert.equal(g.rows.notices.at(-1),'Microphone and playback are off.');const playbackStates=g.rows.states.slice(),playbackNotices=g.rows.notices.slice();item.onstart();item.onerror({error:'not-allowed'});item.onend();playbackTimeout();
  assert.deepEqual(g.rows.ends,[],action);assert.deepEqual(g.rows.failures,[],action);assert.deepEqual(g.rows.states,playbackStates);assert.deepEqual(g.rows.notices,playbackNotices);assert.equal(g.timers.size,0);assert.equal(g.rows.cancels,1);
 }
});
test('late playback callbacks cannot cancel or complete a newer utterance',()=>{
 const f=fixture();f.voice.speak('First answer.');const old=f.rows.spoken[0],timeout=[...f.timers.values()][0];f.voice.speak('Second answer.');const current=f.rows.spoken[1];current.onstart();
 old.onstart();old.onend();old.onerror({error:'synthesis-failed'});timeout();assert.equal(f.rows.cancels,1);assert.equal(f.rows.states.at(-1),'speaking');assert.equal(f.timers.size,1);assert.deepEqual(f.rows.ends,[]);assert.deepEqual(f.rows.failures,[]);
 current.onend();assert.deepEqual(f.rows.ends,['playback']);assert.equal(f.timers.size,0);
});
test('replacing dictation with playback ignores old transcripts, errors and timers',async()=>{
 const f=fixture();await f.voice.dictate();const old=f.rows.instances[0],timeout=[...f.timers.values()][0];f.voice.speak('A completed answer.');
 old.onstart();old.onresult({resultIndex:0,results:[Object.assign([{transcript:'Stale question.'}],{isFinal:true})]});old.onerror({error:'not-allowed'});old.onend();timeout();
 assert.deepEqual(f.rows.transcripts,[]);assert.deepEqual(f.rows.ends,[]);assert.deepEqual(f.rows.failures,[]);assert.equal(f.timers.size,1);f.rows.spoken[0].onend();assert.deepEqual(f.rows.ends,['playback']);
});
test('superseded, hidden and disposed availability checks cannot start or report failure',async()=>{
 const f=fixture({deferred:true}),old=f.voice.dictate(),current=f.voice.dictate();f.grant('unavailable');assert.equal(await old,false);assert.deepEqual(f.rows.failures,[]);f.grant('available');assert.equal(await current,true);assert.equal(f.rows.starts,1);
 const rejected=fixture({deferred:true}),pending=rejected.voice.dictate();rejected.voice.speak('A completed answer.');rejected.reject(new Error('Stale support check.'));assert.equal(await pending,false);assert.equal(rejected.timers.size,1);assert.deepEqual(rejected.rows.failures,[]);assert.deepEqual(rejected.rows.ends,[]);
 for(const action of ['hide','dispose']){const g=fixture({deferred:true}),pending=g.voice.dictate();if(action==='hide')g.host.document.hidden=true;else g.voice.dispose();g.grant('available');assert.equal(await pending,false);assert.equal(g.rows.starts,0);assert.deepEqual(g.rows.ends,[]);assert.deepEqual(g.rows.failures,[]);}
});
test('hidden documents release active services without completion or failure callbacks',async()=>{
 for(const event of ['onstart','onresult','onerror','onend','timeout']){
  const f=fixture();await f.voice.dictate();const rec=f.rows.instances[0];f.host.document.hidden=true;
  if(event==='timeout')[...f.timers.values()][0]();else rec[event]({error:'not-allowed',resultIndex:0,results:[]});
  assert.ok(f.rows.aborts>=1,event);assert.equal(f.timers.size,0,event);assert.deepEqual(f.rows.ends,[]);assert.deepEqual(f.rows.failures,[]);assert.deepEqual(f.rows.transcripts,[]);
 }
 for(const event of ['onstart','onerror','onend','timeout']){
  const f=fixture();f.voice.speak('A completed answer.');f.host.document.hidden=true;
  if(event==='timeout')[...f.timers.values()][0]();else f.rows.spoken[0][event]({error:'synthesis-failed'});
  assert.equal(f.rows.cancels,1,event);assert.equal(f.timers.size,0,event);assert.deepEqual(f.rows.ends,[]);assert.deepEqual(f.rows.failures,[]);
 }
});
test('speech style accepts only finite numbers and clamps rate and pitch to 0.8 through 1.2',()=>{
 const cases=[
  [undefined,1,1],[{},1,1],[null,1,1],[{rate:.9,pitch:1.1},.9,1.1],[{rate:.8,pitch:1.2},.8,1.2],
  [{rate:-100,pitch:100},.8,1.2],[{rate:100,pitch:-100},1.2,.8],[{rate:0,pitch:0},.8,.8],
  [{rate:NaN,pitch:Infinity},1,1],[{rate:-Infinity,pitch:NaN},1,1],[{rate:'1.1',pitch:'0.9'},1,1],
  [{rate:null,pitch:false},1,1],[{rate:[],pitch:{}},1,1],[{rate:1n,pitch:Symbol('pitch')},1,1]
 ];
 for(const [options,rate,pitch] of cases){const f=fixture();assert.equal(f.voice.speak('A completed answer.',options),true);const item=f.rows.spoken[0];assert.equal(item.rate,rate);assert.equal(item.pitch,pitch);assert.equal(item.voice.localService,true);assert.deepEqual(f.rows.failures,[]);assert.equal(f.rows.starts,0);}
});
test('playback support checks select only local English voices',()=>{
 const f=fixture(),local={lang:'en-GB',localService:true};f.host.speechSynthesis.getVoices=()=>[{lang:'en-US',localService:false},{lang:'en-US',localService:1},{lang:'fr-FR',localService:true},local];
 assert.equal(f.voice.speak('A completed answer.'),true);assert.equal(f.rows.spoken[0].voice,local);assert.equal(f.rows.spoken[0].lang,'en-GB');
 for(const remove of [f=>{delete f.host.speechSynthesis;},f=>{delete f.host.speechSynthesis.getVoices;},f=>{delete f.host.speechSynthesis.speak;},f=>{delete f.host.SpeechSynthesisUtterance;},f=>{f.host.speechSynthesis.getVoices=()=>[{lang:'fr-FR',localService:true}];}]){const g=fixture();remove(g);assert.equal(g.voice.speak('A completed answer.'),false);assert.equal(g.rows.spoken.length,0);assert.deepEqual(g.rows.failures,['playback-unavailable']);assert.deepEqual(g.rows.ends,[]);}
});
test('length and empty-input failures cannot be mistaken for natural completion',async()=>{
 for(const text of ['', '   ',null,123,'x'.repeat(6001)]){const f=fixture();assert.equal(f.voice.speak(text),false);assert.deepEqual(f.rows.failures,['playback-invalid-text']);assert.deepEqual(f.rows.ends,[]);assert.equal(f.rows.spoken.length,0);}
 const playback=fixture();assert.equal(playback.voice.speak('x'.repeat(6000)),true);
 const f=fixture();await f.voice.dictate();const rec=f.rows.instances[0],result=text=>({resultIndex:0,results:[Object.assign([{transcript:text}],{isFinal:true})]});
 rec.onresult(result('x'.repeat(4000)));assert.equal(f.rows.transcripts[0].length,4000);assert.deepEqual(f.rows.failures,[]);rec.onresult(result('x'.repeat(4001)));rec.onend();assert.equal(f.rows.transcripts.length,1);assert.deepEqual(f.rows.failures,['dictation-too-long']);assert.deepEqual(f.rows.ends,[]);assert.equal(f.rows.aborts,1);assert.equal(f.timers.size,0);
});
test('legacy callers can omit both new callbacks',async()=>{
 const f=fixture(),voice=create({host:f.host});assert.equal(await voice.dictate(),true);f.rows.instances[0].onend();assert.equal(voice.speak('A completed answer.'),true);f.rows.spoken[0].onend();
 f.host.isSecureContext=false;assert.equal(await voice.dictate(),false);f.host.speechSynthesis.getVoices=()=>[];assert.equal(voice.speak('Another answer.'),false);voice.dispose();assert.equal(f.timers.size,0);
});
test('natural completion releases resources before a caller explicitly starts the next turn',async()=>{
 const f=fixture();let pending;const voice=create({host:f.host,onEnd:kind=>{assert.equal(f.timers.size,0);if(kind==='playback')pending=voice.dictate();}});
 assert.equal(voice.speak('A completed answer.'),true);const old=f.rows.spoken[0];old.onend();assert.equal(await pending,true);assert.equal(f.rows.starts,1);assert.equal(f.rows.cancels,0);
 old.onstart();old.onerror({error:'synthesis-failed'});old.onend();assert.equal(f.timers.size,1);assert.equal(f.rows.cancels,0);voice.stop();assert.equal(f.rows.aborts,1);
});
test('disposal blocks reentrant starts from idle notifications',async()=>{
 const f=fixture();let disposing=false,dictation,playback;const voice=create({host:f.host,onState:state=>{if(disposing&&state==='idle'){dictation=voice.dictate();playback=voice.speak('Another answer.');}}});
 assert.equal(voice.speak('A completed answer.'),true);disposing=true;voice.dispose();assert.equal(await dictation,false);assert.equal(playback,false);assert.equal(f.rows.starts,0);assert.equal(f.rows.spoken.length,1);assert.equal(f.rows.cancels,1);assert.equal(f.timers.size,0);voice.dispose();assert.equal(f.rows.cancels,1);
});
test('conversation controls remain inside the existing hidden account guard and never persist prompts',()=>{
 const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'public/platform/index.html'),'utf8'),guard=html.indexOf('<main id="platform-content" class="market-shell" hidden>');assert.ok(guard>=0);assert.ok(html.indexOf('data-engine-form')>guard);assert.ok(html.indexOf('data-engine-form')<html.indexOf('</main>',guard));
 assert.ok(html.indexOf('src="/neural/voice.js"')<html.indexOf('src="/neural/conversation.js"'));assert.ok(html.indexOf('src="/neural/conversation.js"')<html.indexOf('src="/neural/experience.js"'));
 const code=fs.readFileSync(path.join(root,'public/neural/conversation.js'),'utf8');assert.ok(code.includes('answer.textContent=text'));assert.ok(!/localStorage|sessionStorage|sendBeacon|innerHTML|console\./.test(code));assert.ok(code.includes("document.body.dataset.authenticated!=='true'"));assert.equal(require('../public/release-manifest.json').engineAvailable,false);
});
