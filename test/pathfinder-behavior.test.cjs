'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/life/pathfinder.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../public/life/index.html'),'utf8');

test('pathway selection follows visitor choices and restored browser state',()=>{
 const choices=['day','learn','career'].map(value=>({value,checked:value==='day',addEventListener(event,fn){this[event]=fn}}));
 const nodes=Object.fromEntries(['pathfinder-type','pathfinder-result-title','pathfinder-result-copy','pathfinder-action'].map(id=>[id,{}]));
 const events={};
 vm.runInNewContext(source,{document:{querySelectorAll:()=>choices,getElementById:id=>nodes[id]},window:{addEventListener:(name,fn)=>events[name]=fn}});
 assert.equal(nodes['pathfinder-action'].href,'/workspace/?product=day');
 choices[0].checked=false; choices[1].checked=true; choices[1].change();
 assert.equal(nodes['pathfinder-action'].href,'/workspace/?product=learn');
 assert.match(nodes['pathfinder-result-title'].textContent,/curiosity/);
 choices[1].checked=false; choices[2].checked=true; events.pageshow();
 assert.equal(nodes['pathfinder-action'].href,'/workspace/?product=career');
 assert.match(nodes['pathfinder-result-title'].textContent,/next move/);
});

test('without JavaScript visitors are directed to the existing pathway links',()=>{
 assert.match(html,/<noscript>[\s\S]*?\.pathfinder-content\{display:none\}[\s\S]*?links above[\s\S]*?<\/noscript>/);
});
