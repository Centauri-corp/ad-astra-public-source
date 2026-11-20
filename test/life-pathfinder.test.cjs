'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','public','life');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'pathfinder.js'),'utf8');
const css=fs.readFileSync(path.join(root,'pathfinder.css'),'utf8');
test('visible Life pathway picker includes clear human-oriented directions and working workspace links',()=>{
 assert.match(html,/id="find-your-path"/);
 assert.match(html,/id="pathfinder-title"/);
 assert.match(html,/role="status" aria-live="polite"/);
 for(const id of ['day','learn','career']){
  assert.match(html,new RegExp('name="pathfinder-goal" value="'+id+'"'));
  assert.match(js,new RegExp("href:'/workspace/\\?product="+id+"'"));
  assert.ok(html.includes('href="/workspace/?product='+id+'"'));
 }
});
test('pathfinder collects no personal data and cannot activate payments, model inference or production',()=>{
 assert.match(html,/saves nothing, and makes no AI or payment requests/);
 assert.match(html,/subject to sign-in and release checks/);
 assert.doesNotMatch(js,/\bfetch\s*\(|localStorage|sessionStorage|XMLHttpRequest|sendBeacon|postMessage/);
 assert.doesNotMatch(html,/name="pathfinder-goal"[\s\S]*?type="submit"/);
 assert.ok(!js.includes('innerHTML'));
 assert.ok(js.includes('textContent'));
});
test('pathfinder follows keyboard, mobile and reduced-motion accessibility',()=>{
 assert.match(html,/<fieldset class="pathfinder-choices">/);
 assert.match(html,/<legend>What would you like to focus on\?/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
