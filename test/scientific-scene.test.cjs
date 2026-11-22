'use strict';
const test=require('node:test'), assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const scientific=require('../public/scientific/scene-model.js');
const read=p=>fs.readFileSync(path.join(__dirname,'../public',p),'utf8');
test('scientific scene is deterministic, spatial, bounded and explicitly synthetic',()=>{
 const a=scientific.buildFrame(3), b=scientific.buildFrame(3);
 assert.deepEqual(a,b);
 assert.equal(a.points.length,529);
 assert.equal(a.source,'synthetic-illustrative');
 assert.equal(a.measured,false);
 assert.equal(scientific.STEPS.length,9);
 assert.ok(a.min<a.max);
 assert.equal(scientific.sample(.15,.25,2),scientific.sample(.15,.25,2));
 assert.notEqual(scientific.sample(.15,.25,0),scientific.sample(.15,.25,8));
 assert.notDeepEqual(scientific.project({x:.3,y:.2,z:.1},.2),scientific.project({x:.3,y:.2,z:.1},.9));
 assert.throws(()=>scientific.buildFrame(9),RangeError);
 assert.throws(()=>scientific.buildFrame(0,1000),RangeError);
 assert.throws(()=>scientific.sample(NaN,0,1),RangeError);
 assert.throws(()=>scientific.sample(1.5,0,1),RangeError);
});
test('scientific viewport has keyboard, time and numeric alternative with no live-data claims',()=>{
 const html=read('products/index.html'), js=read('scientific/viewer.js');
 for(const token of ['id="scientific-surface"','id="scientific-time"','id="scientific-left"','id="scientific-right"','id="scientific-reset"','id="scientific-animation"','id="scientific-surface-caption"'])
 assert.ok(html.includes(token),token);
 assert.match(html,/synthetic scientific graphics prototype/);
 assert.match(html,/role="status" aria-live="polite"/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(js,/navigator\.connection\?\.saveData/);
 assert.match(js,/cancelAnimationFrame/);
 assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|sendBeacon/);
 const source=read('scientific/scene-model.js');
 assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|sendBeacon/);
});

test('scientific route and products inline studio share a stop-and-reset controller',()=>{
 const html=read('scientific/index.html'),product=read('products/index.html'),js=read('scientific/viewer.js');
 for(const page of [html,product])assert.match(page,/id="scientific-reset" aria-label="Reset synthetic scientific camera and time"/);
 assert.match(js,/reset\?\.addEventListener\("click"/);
 assert.match(js,/stop\(\);yaw=\.58;step=0;time\.value="0";draw\(\)/);
 assert.match(js,/View reset to time step 0/);
 assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|sendBeacon/);
});
