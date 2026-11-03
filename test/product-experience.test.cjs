'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {states,stages,scenarios,clamp,nextStep,canAnimate,orbitPoint}=require('../public/brain/experience.js');
test('neural states are finite conceptual content, not model telemetry',()=>{
 assert.equal(Object.keys(states).length,6);
 for(const [id,s] of Object.entries(states)){assert.match(id,/^[a-z]+$/);assert.equal(s.color.length,3);assert.ok(s.description.length>30);assert.ok(s.color.every(x=>x>=0&&x<=255));}
 assert.match(states.acting.description,/executes no actions/);
 assert.match(states.learning.description,/not live model training/);
});
test('three bounded examples each have four prewritten stages with limitations',()=>{
 assert.deepEqual(stages,['Intent','Evidence','Reasoning','Oversight']);
 assert.equal(Object.keys(scenarios).length,3);
 for(const s of Object.values(scenarios)){assert.equal(s.steps.length,4);assert.ok(s.question.length>20);for(const entry of s.steps){assert.equal(entry.length,4);assert.equal(entry[2].length,3);assert.ok(entry[3].length>30);}}
});
test('motion is denied for reduced-motion, data-saving, hidden and offscreen views',()=>{
 const enabled={reduced:false,saveData:false,paused:false,visible:true,hidden:false,intensity:45};
 assert.equal(canAnimate(enabled),true);
 for(const p of [{reduced:true},{saveData:true},{paused:true},{visible:false},{hidden:true},{intensity:0}])assert.equal(canAnimate({...enabled,...p}),false);
});
test('visual parameters and manual journey transitions are bounded',()=>{
 assert.equal(clamp(Infinity,0,100),0);assert.equal(clamp(-9,0,100),0);assert.equal(clamp(200,0,100),100);
 assert.equal(nextStep(0),1);assert.equal(nextStep(3),0);assert.equal(nextStep('bad'),1);
 for(let r=0;r<3;r++)for(let t=0;t<20;t++){const p=orbitPoint(t/10,r,t,300,300,0);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.x>=0&&p.x<=300&&p.y>=0&&p.y<=300);}
});
test('experience code cannot dispatch inference, send telemetry, or persist inputs',()=>{
 const js=read('public/brain/experience.js');
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|\.innerHTML\s*=|eval\s*\(/);
 assert.doesNotMatch(js,/\/api\/ask|\/api\/session|supabase\.co|api\.openai\.com/);
 assert.match(js,/requestAnimationFrame/);assert.match(js,/cancelAnimationFrame/);assert.match(js,/IntersectionObserver/);assert.match(js,/visibilitychange/);assert.match(js,/1000\/30/);
});
test('original neural source and disclosure survive the visual pass',()=>{
 const html=read('public/brain/index.html'),css=read('public/brain/experience.css');
 assert.match(css,/443f89273eb4071329cac3fa151d2674b37e6eaf-1672x941\.png/);
 assert.match(html,/noindex,follow/);assert.match(html,/https:\/\/adastra\.global\/brain\//);
 assert.match(html,/not generated answers/i);assert.match(html,/Not live inference/);assert.match(html,/AGI and ASI are research objectives/);
 assert.match(html,/aria-label="Conceptual neural states"/);assert.match(html,/id="motion-toggle"/);assert.match(html,/<noscript>/);
});
test('fallback, keyboard and motion controls are present without weakening availability',()=>{
 const html=read('public/brain/index.html'),css=read('public/brain/experience.css');
 assert.match(html,/class="experience-skip"/);assert.match(html,/id="motion-intensity" type="range" min="0" max="100"/);
 assert.match(html,/Original neural artwork unavailable/);assert.match(html,/\/access\/#early-access-title/);
 assert.doesNotMatch(html,/<form|contenteditable|textarea|name="prompt"/);
 assert.match(css,/prefers-reduced-motion/);assert.match(css,/:focus-visible/);
});
test('shared design treatment retains the original market stylesheet after one import',()=>{
 const crypto=require('node:crypto');const css=read('public/markets/style.css');
 assert.ok(css.startsWith("@import url('/experience-system.css');\n"));
 const original=css.slice(css.indexOf('\n')+1);const bytes=Buffer.from(original);
 const sha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 assert.equal(sha,'09e93985e12957ee5388bf7bd5df96a90d1224f5');
 assert.ok(read('public/experience-system.css').length<4000);
});
