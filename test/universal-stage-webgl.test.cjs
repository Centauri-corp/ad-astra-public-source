'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const load=p=>fs.readFileSync(path.join(__dirname,'../public/',p),'utf8');
test('Universal Stage has a customer-opt-in renderer with a documented static fallback',()=>{
 const html=load('products/index.html');
 const js=load('products/graphics-adapter.js');
 const css=load('products/style.css');
 assert.match(html,/src="graphics-adapter\.js" defer/);
 assert.match(html,/id="stage-graphics-toggle" aria-pressed="false"/);
 assert.match(html,/id="stage-graphics-status" role="status"/);
 assert.match(js,/getContext\("webgl2"/);
 assert.match(js,/MAX_DURATION_MS = 12000/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(js,/navigator\.connection\?\.saveData/);
 assert.match(js,/webglcontextlost/);
 assert.match(js,/IntersectionObserver/);
 assert.match(js,/cancelAnimationFrame/);
 assert.match(css,/universal-stage-webgl/);
 assert.match(html,/name="robots" content="noindex,follow"/);
});
test('Graphics adapter cannot activate inference, billing, telemetry or public launch',()=>{
 const js=load('products/graphics-adapter.js');
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|eval\s*\(|Function\s*\(/);
 assert.doesNotMatch(js,/stripe|checkout|supabase|approveRelease|deployProduction|publishSite|startMicrophone/i);
});

test('Procedural orbital rendering has depth lighting, globe coordinates and stable fallback',()=>{
 const js=load('products/graphics-adapter.js');
 assert.match(js,/vec3 normal=normalize\(vec3\(uv\/sphereRadius,z\)\)/);
 assert.match(js,/longitude=atan\(rotated\.z,rotated\.x\)/);
 assert.match(js,/float lambert=max/);
 assert.match(js,/float atmosphere=/);
 assert.match(js,/uniform1f\(uniforms\.motif/);
 assert.match(js,/webglcontextlost/);
 assert.match(js,/stop\("Graphics unavailable\. Static visual restored\."\)/);
 assert.doesNotMatch(js,/https?:\/\/|\bfetch\s*\(|localStorage|sessionStorage/);
});
