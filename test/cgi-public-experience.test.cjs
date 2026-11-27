'use strict';const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const root=path.join(__dirname,'..');
test('shared CGI study has a static fallback on core pages',()=>{for(const route of ["public/index.html","public/products/index.html","public/markets/index.html","public/life/index.html","public/company/index.html","public/services/index.html","public/about/index.html","public/agent/index.html","public/film/index.html","public/pricing/index.html","public/platform-preview/index.html"]){const h=fs.readFileSync(path.join(root,route),'utf8');assert.match(h,/data-aa-cgi data-seed=/);assert.match(h,/aria-pressed="false" aria-controls="aa-cgi-canvas" hidden/);assert.match(h,/not live model output or telemetry/);const a=h.match(/class="aa-cgi-art" src="(\/assets\/[^"]+)"/);assert.ok(a);assert.ok(fs.existsSync(path.join(root,'public',a[1].slice(1))));}});
test('renderer has safeguards',()=>{const js=fs.readFileSync(path.join(root,'public/cgi-experience.js'),'utf8');new Function(js);for(const m of ['prefers-reduced-motion','visibilitychange','IntersectionObserver','12000','cancelAnimationFrame'])assert.ok(js.includes(m));assert.doesNotMatch(js,/\b(fetch|WebSocket|getUserMedia)\s*\(/);});

const vm=require('node:vm');
function harness({reduced=false,context='ok'}={}){
 const listeners=()=>({events:{},addEventListener(n,f){this.events[n]=f;}});
 const doc=Object.assign(listeners(),{hidden:false});
 const win=Object.assign(listeners(),{devicePixelRatio:3,matchMedia:()=>media});
 const media=Object.assign(listeners(),{matches:reduced});
 const button=Object.assign(listeners(),{hidden:true,disabled:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;}});
 const status={textContent:''};let dimensions={width:640,height:400},draws=0,clock=100,seq=0;const frames=new Map();
 const ctx=new Proxy({clearRect(){draws++;}},{get(t,k){return k in t?t[k]:()=>{};}});
 const canvas={getContext(){if(context==='throws')throw Error('unavailable');return context==='none'?null:ctx;}};
 const field={getBoundingClientRect:()=>dimensions};
 const stage={dataset:{seed:'1'},querySelector:s=>({'canvas':canvas,'button':button,'[data-aa-status]':status,'.aa-cgi-field':field}[s])};
 doc.querySelectorAll=()=>[stage];let intersection,resize;
 class IO{constructor(cb){intersection=cb;}observe(){}}
 class RO{constructor(cb){resize=cb;}observe(){}}
 Object.assign(win,{IntersectionObserver:IO,ResizeObserver:RO});
 vm.runInNewContext(fs.readFileSync(path.join(root,'public/cgi-experience.js'),'utf8'),{window:win,document:doc,matchMedia:win.matchMedia,IntersectionObserver:IO,ResizeObserver:RO,performance:{now:()=>clock},requestAnimationFrame:f=>{frames.set(++seq,f);return seq;},cancelAnimationFrame:i=>frames.delete(i)});
 return {doc,win,media,button,canvas,status,frames,visible:v=>intersection([{isIntersecting:v}]),click:()=>button.events.click(),advance:t=>{clock=t;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(t));},resize:(w,h)=>{dimensions={width:w,height:h};resize();},draws:()=>draws};
}
test('renderer starts only when visible, respects DPR, and expires',()=>{const h=harness();assert.equal(h.button.disabled,true);assert.equal(h.canvas.width,960);h.visible(true);h.click();assert.equal(h.button.attrs['aria-pressed'],'true');assert.equal(h.frames.size,1);h.advance(200);assert.ok(h.draws()>1);h.advance(12200);assert.equal(h.frames.size,0);assert.equal(h.button.attrs['aria-pressed'],'false');});
test('pause, viewport exit, hidden tab and reduced-motion stop animation',()=>{const h=harness();h.visible(true);h.click();h.click();assert.equal(h.frames.size,0);h.click();h.visible(false);assert.equal(h.frames.size,0);h.visible(true);h.click();h.doc.hidden=true;h.doc.events.visibilitychange();assert.equal(h.frames.size,0);h.doc.hidden=false;h.doc.events.visibilitychange();h.click();h.media.matches=true;h.media.events.change();assert.equal(h.frames.size,0);assert.equal(h.button.hidden,true);});
test('zero-size and unavailable canvas fail safely; resize preserves active state',()=>{for(const context of ['none','throws'])assert.equal(harness({context}).button.hidden,true);const h=harness();h.visible(true);h.click();h.resize(320,200);assert.equal(h.button.attrs['aria-pressed'],'true');h.resize(0,0);assert.equal(h.frames.size,0);assert.equal(h.button.disabled,true);h.resize(320,200);assert.equal(h.button.disabled,false);});
test('reduced motion is static from first load',()=>{const h=harness({reduced:true});h.visible(true);h.click();assert.equal(h.button.hidden,true);assert.equal(h.frames.size,0);});
