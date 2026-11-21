'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const surfaces=[
  ['about','arrival'],['agent','intelligence'],['company','arrival'],['film','arrival'],
  ['markets','arrival'],['platform-preview','arrival'],['pricing','arrival'],['services','arrival'],
  ['knowledge','intelligence'],['life','life'],['products','products'],['workspace','workspace']
];

test('public surfaces share one governed journey navigation',()=>{
  const root=path.join(__dirname,'..','public');
  for(const [route,current] of surfaces){
    const html=fs.readFileSync(path.join(root,route,'index.html'),'utf8');
    assert.match(html,/data-journey-navigation/);
    assert.match(html,new RegExp('data-current-journey="'+current+'"'));
    assert.match(html,/href="\/journey\/style\.css"/);
    assert.match(html,/src="\/journey\/continuity\.js" defer/);
    assert.match(html,/src="\/journey\/navigation\.js" defer/);
  }
  const continuity=fs.readFileSync(path.join(root,'journey','continuity.js'),'utf8');
  const navigation=fs.readFileSync(path.join(root,'journey','navigation.js'),'utf8');
  for(const href of ['/knowledge/','/life/','/products/','/workspace/']) assert.match(continuity,new RegExp(href.replace('/','\\/')));
  assert.doesNotMatch(continuity,/fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage/);
  assert.doesNotMatch(navigation,/fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage/);
});
