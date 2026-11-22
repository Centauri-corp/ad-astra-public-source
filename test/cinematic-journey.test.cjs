'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('shared cinematic journey is the first-class staging visual',()=>{
  const root=path.join(__dirname,'..','public');
  const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const products=fs.readFileSync(path.join(root,'products','index.html'),'utf8');
  for(const html of [home,products]){
    assert.match(html,/cinematic-journey\.css/);
    assert.match(html,/cinematic-journey\.js/);
    assert.match(html,/data-cinematic-host/);
    assert.match(html,/data-cinematic-journey/);
    assert.match(html,/data-cinematic-status/);
    assert.match(html,/Drag to orbit/);
  }
  assert.match(home,/From Earth\\.<br><em>Beyond the expected\\./);
  assert.match(home,/data-cinema-mode="film"/);
  assert.match(home,/data-cinema-switch/);
  assert.match(products,/whole system visible/);
  const engine=fs.readFileSync(path.join(root,'graphics','cinematic-journey.js'),'utf8');
  assert.match(engine,/getContext\('webgl2'/);
  assert.match(engine,/sphereHit/);
  assert.match(engine,/wheel/);
  assert.match(engine,/IntersectionObserver/);
  assert.match(engine,/static fallback/);
});