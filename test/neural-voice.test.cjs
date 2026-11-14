'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {create}=require('../public/neural/voice.js');
function fixture({local=true,available='available',deferred=false}={}){
 const rows={states:[],notices:[],transcripts:[],instances:[],spoken:[],starts:0,aborts:0,cancels:0,availabilityChecks:0},timers=new Map();let nextTimer=0,grant;
 class Recognition{static available(){rows.availabilityChecks++;return deferred?new Promise(resolve=>grant=resolve):Promise.resolve(available);}constructor(){rows.instances.push(this);}start(){rows.starts++;}abort(){rows.aborts++;}}
 Recognition.prototype.processLocally=false;
 const host={isSecureContext:true,document:{hidden:false},SpeechRecognition:Recognition,SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},speechSynthesis:{getVoices:()=>[{lang:'en-US',localService:local}],speak:item=>rows.spoken.push(item),cancel:()=>rows.cancels++},setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
 const voice=create({host,onState:s=>rows.states.push(s),onNotice:s=>rows.notices.push(s),onTranscript:s=>rows.transcripts.push(s)});return {host,rows,voice,timers,grant:value=>grant(value)};
}
test('voice construction neither starts recording nor selects a remote service',()=>{const f=fixture();assert.equal(f.rows.starts,0);assert.equal(f.rows.availabilityChecks,0);assert.equal(f.rows.spoken.length,0);});
test('on-device dictation uses explicit start, never submits text, and releases on stop',async()=>{
 const f=fixture();await f.voice.dictate();const rec=f.rows.instances[0];assert.equal(rec.processLocally,true);assert.equal(rec.continuous,false);assert.equal(f.rows.starts,1);assert.ok(!f.rows.states.includes('listening'));rec.onstart();assert.equal(f.rows.states.at(-1),'listening');rec.onresult({resultIndex:0,results:[Object.assign([{transcript:'Review this text before sending.'}],{isFinal:true})]});assert.deepEqual(f.rows.transcripts,['Review this text before sending.']);f.voice.stop();assert.equal(f.rows.aborts,1);assert.equal(f.rows.states.at(-1),'idle');assert.equal(f.timers.size,0);
});
test('missing speech packs and unsupported local recognition never fall back to cloud dictation',async()=>{
 const f=fixture({available:'downloadable'});await f.voice.dictate();assert.equal(f.rows.starts,0);assert.ok(f.rows.notices.at(-1).includes('no cloud'));const absent=fixture();delete absent.host.SpeechRecognition;await absent.voice.dictate();assert.equal(absent.rows.starts,0);
});
test('late availability, microphone callbacks and hidden documents cannot restart capture',async()=>{
 const f=fixture({deferred:true}),pending=f.voice.dictate();f.voice.stop();f.grant('available');await pending;assert.equal(f.rows.starts,0);
 const late=fixture();await late.voice.dictate();const rec=late.rows.instances[0];late.voice.stop();rec.onstart();assert.ok(!late.rows.states.includes('listening'));assert.ok(late.rows.aborts>=1);
 const hidden=fixture();hidden.host.document.hidden=true;await hidden.voice.dictate();assert.equal(hidden.rows.starts,0);
});
test('only explicitly local voices speak; cancellation and stale callbacks are safe',()=>{
 const remote=fixture({local:false});remote.voice.speak('A completed answer.');assert.equal(remote.rows.spoken.length,0);assert.ok(remote.rows.notices.at(-1).includes('No on-device'));
 const f=fixture();f.voice.speak('A completed answer.');const item=f.rows.spoken[0];assert.equal(item.voice.localService,true);assert.ok(!f.rows.states.includes('speaking'));item.onstart();assert.equal(f.rows.states.at(-1),'speaking');f.voice.stop();assert.equal(f.rows.cancels,1);item.onstart();assert.equal(f.rows.states.at(-1),'idle');
});
test('capture and playback limits stop activities, and disposal prevents later starts',async()=>{
 const f=fixture();await f.voice.dictate();[...f.timers.values()][0]();assert.equal(f.rows.aborts,1);f.voice.speak('A completed answer.');[...f.timers.values()][0]();assert.equal(f.rows.cancels,1);f.voice.dispose();await f.voice.dictate();f.voice.speak('Another answer.');assert.equal(f.rows.starts,1);assert.equal(f.rows.spoken.length,1);
});
test('stop replaces an active microphone notice with an explicit off indicator',async()=>{
 const f=fixture();await f.voice.dictate();f.rows.instances[0].onstart();assert.ok(f.rows.notices.at(-1).includes('Microphone active'));f.voice.stop();assert.equal(f.rows.notices.at(-1),'Microphone and playback are off.');assert.equal(f.rows.states.at(-1),'idle');
});
test('conversation controls remain inside the existing hidden account guard and never persist prompts',()=>{
 const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'public/platform/index.html'),'utf8'),guard=html.indexOf('<main id="platform-content" class="market-shell" hidden>');assert.ok(guard>=0);assert.ok(html.indexOf('data-engine-form')>guard);assert.ok(html.indexOf('data-engine-form')<html.indexOf('</main>',guard));
 assert.ok(html.indexOf('src="/neural/voice.js"')<html.indexOf('src="/neural/conversation.js"'));assert.ok(html.indexOf('src="/neural/conversation.js"')<html.indexOf('src="/neural/experience.js"'));
 const code=fs.readFileSync(path.join(root,'public/neural/conversation.js'),'utf8');assert.ok(code.includes('answer.textContent=text'));assert.ok(!/localStorage|sessionStorage|sendBeacon|innerHTML|console\./.test(code));assert.ok(code.includes("document.body.dataset.authenticated!=='true'"));assert.equal(require('../public/release-manifest.json').engineAvailable,false);
});
