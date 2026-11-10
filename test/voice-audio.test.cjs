'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../public/app.js'),'utf8');
function fixture(media){
 let stopped=0,closed=0,created=0;const stream={getTracks:()=>[{stop(){stopped++;}}]};
 const context={document:{hidden:false},navigator:{mediaDevices:{getUserMedia:()=>media?media(stream):Promise.resolve(stream)}},window:{AudioContext:class{constructor(){created++;}createAnalyser(){return{disconnect(){}};}createMediaStreamSource(){return{connect(){}};}close(){closed++;return Promise.resolve();}}},Uint8Array};
 const start=source.indexOf('  let audioContext = '),end=source.indexOf('  function sampleAudio()',start);assert.ok(start>0&&end>start);vm.runInNewContext(source.slice(start,end)+'\nglobalThis.controls={startAudioMeter,stopAudioMeter};',context);
 return{context,...context.controls,counts:()=>({stopped,closed,created})};
}
test('stopping active audio releases tracks and AudioContext',async()=>{const f=fixture();assert.equal(await f.startAudioMeter(),true);f.stopAudioMeter();assert.deepEqual(f.counts(),{stopped:1,closed:1,created:1});});
test('late microphone permission after cancellation cannot start audio',async()=>{let grant;const f=fixture(stream=>new Promise(resolve=>{grant=()=>resolve(stream);}));const pending=f.startAudioMeter();f.stopAudioMeter();grant();assert.equal(await pending,false);assert.deepEqual(f.counts(),{stopped:1,closed:0,created:0});});
test('hidden document rejects newly granted microphone and permission denial fails safely',async()=>{const f=fixture();f.context.document.hidden=true;assert.equal(await f.startAudioMeter(),false);assert.equal(f.counts().stopped,1);const denied=fixture(()=>Promise.reject(Error('denied')));assert.equal(await denied.startAudioMeter(),false);assert.equal(denied.counts().created,0);});
