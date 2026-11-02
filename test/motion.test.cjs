'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the actual production controller with deterministic media events.
// These are behavior regressions, not video decoding or physical-device QA.
const source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const start = source.indexOf('// Motion has one authority:');
const end = source.indexOf('// Film premiere is withheld', start);
assert.ok(start >= 0 && end > start);
const controller = source.slice(start, end);
function classes() {
  const values = new Set();
  return {add:v=>values.add(v), remove:v=>values.delete(v), contains:v=>values.has(v),
    toggle(v,on) { if(on === undefined) on = !values.has(v); on ? values.add(v) : values.delete(v); return on; }};
}
function events(target={}) {
  const listeners = new Map();
  target.addEventListener = (name, fn) => {
    if (!listeners.has(name)) listeners.set(name, []);
    listeners.get(name).push(fn);
  };
  target.emit = (name, value={}) => { for (const fn of listeners.get(name)||[]) fn(value); };
  return target;
}
function media(loop=false) {
  const video=events({loop, paused:true, ended:false, muted:false, dataset:{}, classList:classes(), playCalls:0, reject:null});
  video.sources = [events({dataset:{},closest:()=>video})];
  video.querySelectorAll = selector => selector==='source' ? video.sources : [];
  let time=0;
  Object.defineProperty(video,'currentTime',{get:()=>time,set:value=>{time=value;video.ended=false;}});
  video.play = () => {
    video.playCalls++;
    if(video.reject) return Promise.reject(video.reject);
    video.paused=false;video.emit('playing');return Promise.resolve();
  };
  video.pause = () => {if(!video.paused){video.paused=true;video.emit('pause');}};
  video.finish = () => {time=10;video.ended=true;video.paused=true;video.emit('ended');};
  return video;
}
function fixture({reduced=false,saveData=false}={}) {
  const hero=media(), horizon=media(true), attributes={};
  const button=events({dataset:{},disabled:false,innerHTML:'',setAttribute:(key,value)=>{attributes[key]=value;}});
  const body={classList:classes()};
  const document=events({hidden:false,body,querySelector:selector=>selector==='.motion'?button:null,
    querySelectorAll:selector=>selector==='.motion-video'?[hero,horizon]:selector==='.motion-video source'?[...hero.sources,...horizon.sources]:[],getElementById:()=>null});
  const preference=events({matches:reduced});
  let observer;
  class IntersectionObserver {constructor(callback){observer=callback;}observe(){}}
  const window={IntersectionObserver};
  vm.runInNewContext(controller,{document,window,navigator:{connection:{saveData}},matchMedia:()=>preference,IntersectionObserver,Promise,Set,Boolean});
  const settle=()=>new Promise(resolve=>setImmediate(resolve));
  return {hero,horizon,button,attributes,body,document,preference,settle,
    visible(...videos){observer([hero,horizon].map(target=>({target,isIntersecting:videos.includes(target)})));},
    click(){button.emit('click');},
    hide(hidden){document.hidden=hidden;document.emit('visibilitychange');}};
}
test('ended hero exposes Replay and one click restarts it without pausing global effects',async()=>{
  const f=fixture();f.visible(f.hero);await f.settle();
  assert.equal(f.attributes['aria-label'],'Pause motion');
  f.hero.finish();
  assert.equal(f.attributes['aria-label'],'Replay motion');
  assert.equal(f.attributes['aria-pressed'],'true');
  assert.equal(f.hero.classList.contains('playing'),false);
  assert.equal(f.body.classList.contains('motion-suspended'),false);
  f.click();await f.settle();
  assert.equal(f.hero.playCalls,2);assert.equal(f.hero.currentTime,0);
  assert.equal(f.hero.paused,false);assert.equal(f.attributes['aria-label'],'Pause motion');
});
test('ending an offscreen hero does not stop the visible looping horizon',async()=>{
  const f=fixture();f.visible(f.hero);await f.settle();f.visible(f.horizon);await f.settle();
  f.hero.finish();
  assert.equal(f.horizon.paused,false);assert.equal(f.attributes['aria-label'],'Pause motion');
  f.click();assert.equal(f.horizon.paused,true);assert.equal(f.attributes['aria-label'],'Play motion');
});
test('explicit pause survives background/foreground and viewport changes',async()=>{
  const f=fixture();f.visible(f.hero);await f.settle();f.click();f.hide(true);f.hide(false);f.visible(f.horizon);await f.settle();
  assert.equal(f.hero.paused,true);assert.equal(f.horizon.paused,true);
  assert.equal(f.body.classList.contains('motion-suspended'),true);assert.equal(f.attributes['aria-label'],'Play motion');
});
test('reduced-motion and Save-Data start without playback',async()=>{
  for(const options of [{reduced:true},{saveData:true}]){
    const f=fixture(options);f.visible(f.hero,f.horizon);await f.settle();
    assert.equal(f.hero.playCalls+f.horizon.playCalls,0);assert.equal(f.attributes['aria-label'],'Play motion');
  }
});
test('autoplay rejection restores a truthful play action and pauses all video',async()=>{
  const f=fixture();f.hero.reject=Object.assign(new Error('autoplay denied'),{name:'NotAllowedError'});
  f.visible(f.hero,f.horizon);await f.settle();
  assert.equal(f.attributes['aria-label'],'Play motion');assert.equal(f.hero.paused,true);assert.equal(f.horizon.paused,true);
  assert.equal(f.hero.classList.contains('playing'),false);
});
test('media failure preserves an enabled global pause control for decorative effects',async()=>{
  const f=fixture();f.hero.reject=Object.assign(new Error('unsupported media'),{name:'NotSupportedError'});
  f.visible(f.hero);await f.settle();
  assert.equal(f.attributes['aria-label'],'Pause effects');assert.equal(f.button.disabled,false);
  assert.equal(f.hero.classList.contains('playing'),false);
  f.click();assert.equal(f.body.classList.contains('motion-suspended'),true);
  assert.equal(f.attributes['aria-label'],'Resume effects');
  f.click();assert.equal(f.body.classList.contains('motion-suspended'),false);
  assert.equal(f.attributes['aria-label'],'Pause effects');
});
test('pending playback can be cancelled before a media play request starts',async()=>{
  const f=fixture();f.visible(f.hero);assert.equal(f.attributes['aria-label'],'Cancel loading');f.click();await f.settle();
  assert.equal(f.hero.playCalls,0);assert.equal(f.hero.paused,true);assert.equal(f.attributes['aria-label'],'Play motion');
});
test('a non-bubbling source error clears pending playback and keeps global effects controllable',async()=>{
  const f=fixture();f.hero.play=()=>{f.hero.playCalls++;return new Promise(()=>{});};
  f.visible(f.hero);await f.settle();assert.equal(f.attributes['aria-label'],'Cancel loading');
  f.hero.sources[0].emit('error');
  assert.equal(f.hero.dataset.failed,'true');assert.equal(f.button.disabled,false);
  assert.equal(f.attributes['aria-label'],'Pause effects');
  f.click();assert.equal(f.attributes['aria-label'],'Resume effects');
  assert.equal(f.body.classList.contains('motion-suspended'),true);
});
