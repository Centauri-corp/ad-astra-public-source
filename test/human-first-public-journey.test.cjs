'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const home=read('public/index.html');
const stylesheet=read('public/graphics/human-journey.css');
const controller=read('public/graphics/human-journey.js');
const manifest=JSON.parse(read('public/release-manifest.json'));

test('customer-first experience is the first section following the hero',()=>{
 assert.match(home,/id="human-journey"/);
 assert.ok(home.indexOf('id="human-journey"')>home.indexOf('id="top"'));
 assert.ok(home.indexOf('id="human-journey"')<home.indexOf('id="flagship-proof"'));
 assert.match(home,/<a class="cinema-hero-primary" href="#human-journey">Start your journey/);
 assert.match(home,/href="\/graphics\/human-journey\.css"/);
 assert.match(home,/src="\/graphics\/human-journey\.js"/);
 assert.equal((home.match(/data-human-chapter="[0-2]"/g)||[]).length,3);
 for (const [name,route] of [['life preview','/workspace/'],['products','/products/']]){
   assert.match(home,new RegExp('href="'+route.replaceAll('/','\\/')+'"'),name);
 }
});

test('all three human-first panels have bounded truthful public value',()=>{
 for(const text of [
  'It starts with a','Understanding grows','One world.',
  'Live AI and paid services are not yet authorized',
  'Not live scientific data or verified customer AI',
  'Availability varies by release clearance',
  'Clarity earns trust.'
 ]) assert.ok(home.includes(text),text);
 assert.equal(manifest.publicLaunchEnabled,false);
 assert.equal(manifest.engineAvailable,false);
 assert.equal(manifest.filmPublicPlayback,false);
});

test('continuous journey remains keyboard and no-motion accessible',()=>{
 assert.match(stylesheet,/\.human-journey-grid\s*\{/);
 assert.match(stylesheet,/data-human-scene="0"/);
 assert.match(stylesheet,/data-human-scene="1"/);
 assert.match(stylesheet,/data-human-scene="2"/);
 assert.match(stylesheet,/@media\(max-width:800px\)/);
 assert.match(stylesheet,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(stylesheet,/focus-visible/);
 assert.match(controller,/addEventListener\('focusin'/);
 assert.match(controller,/addEventListener\('scroll', onTravel, \{passive:true\}\)/);
 assert.doesNotMatch(controller,/\bfetch\(|XMLHttpRequest|localStorage|serviceWorker|\.play\(/);
});

test('linked public launch routes exist within the exact build tree',()=>{
 for (const route of ['agent','film','markets/positioning','products','pricing','workspace']){
  const file=path.join(root,'public',route,'index.html');
  assert.ok(fs.existsSync(file),route+' not present in public build');
  assert.match(fs.readFileSync(file,'utf8'),/name="robots" content="noindex,follow"/);
 }
});

test('the three cinematic story stages can be explicitly selected by touch and keyboard',()=>{
 assert.match(home,/class="human-stage-controls" aria-label="Choose the next chapter"/);
 for(const id of ['0','1','2']){
   assert.match(home,new RegExp('id="human-stage-'+id+'"'));
   assert.match(home,new RegExp('data-human-step="'+id+'"'));
 }
 assert.match(controller,/querySelectorAll\('\[data-human-step\]'\)/);
 assert.match(controller,/setAttribute\('aria-current','step'\)/);
 assert.match(controller,/selectors\.forEach\(\(link,index\) => link\.addEventListener\('click'/);
 assert.match(stylesheet,/CRC human journey explicit stage controls/);
 assert.match(stylesheet,/body :where\(a,button,summary,input,textarea,select,\[tabindex\]\):focus/);
 assert.match(stylesheet,/@media\(forced-colors:active\)/);
});
