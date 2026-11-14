'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {parseAvailability}=require('../public/neural/state.js');
const {operatingStatus}=require('../lib/operating-status');
const {neuralSection,decorateNeuralExperience}=require('../scripts/lib/neural-experience.cjs');
const root=path.join(__dirname,'..'),now=Date.parse('2026-11-11T01:00:00.000Z');
const payload=()=>({...operatingStatus(false),generatedAt:new Date(now).toISOString()});
test('neural status binds complete fresh metadata without claiming execution',()=>{
 const result=parseAvailability(payload(),now);assert.equal(result.services.engine.state,'paused');assert.equal(result.services.crm.state,'planned');assert.equal(result.services.billing.state,'planned');assert.equal(result.services.outreach.state,'paused');
 assert.equal(result.expiresAt,now+60000);assert.deepEqual(Object.keys(result).sort(),['at','expiresAt','services']);
});
test('unknown, stale, incomplete and duplicated service statuses fail closed',()=>{
 const cases=[p=>p.schema='other',p=>p.basis='browser-assertion',p=>p.generatedAt='2026-02-30T01:00:00.000Z',p=>p.generatedAt=new Date(now-60001).toISOString(),p=>p.generatedAt=new Date(now+5001).toISOString(),p=>p.services.pop(),p=>p.services[1]=p.services[0],p=>p.services[1].state='generating',p=>p.services[1].state='__proto__',p=>p.services[1].id='private-tenant'];
 for(const mutate of cases){const p=payload();mutate(p);assert.throws(()=>parseAvailability(p,now));}
 assert.throws(()=>parseAvailability(null,now));assert.throws(()=>parseAvailability(payload(),NaN));
});
test('untrusted provider strings never become neural UI labels',()=>{
 const p=payload();p.services[1].label='<script>bad</script>';p.services[1].description='secret operational record';
 const result=parseAvailability(p,now);assert.equal(result.services.engine.label,'Paused');assert.ok(!JSON.stringify(result).includes('secret'));assert.ok(!JSON.stringify(result).includes('<script>'));
});
test('service availability is not an active AI request, voice session or entitlement',()=>{
 const p=payload();p.services[1].state='available';const result=parseAvailability(p,now);
 assert.equal(result.services.engine.label,'Service reports available');assert.ok(!Object.hasOwn(result,'session'));assert.ok(!Object.hasOwn(result,'entitlement'));
});
test('neural geometry dependency is pinned, self-hosted, hashed and licensed',()=>{
 const manifest=require('../public/neural/vendor/manifest.json');assert.equal(manifest.version,require('../package.json').devDependencies.three);assert.equal(manifest.license,'MIT');assert.equal(manifest.files.length,3);
 for(const file of manifest.files){const bytes=fs.readFileSync(path.join(root,'public',file.path));assert.equal(bytes.length,file.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256);}
 assert.ok(fs.readFileSync(path.join(root,'public/neural/vendor/LICENSE.txt'),'utf8').includes('The MIT License'));
});
test('scene is an explicit-load visual concept with static and text fallbacks',()=>{
 const html=fs.readFileSync(path.join(root,'public/intelligence/index.html'),'utf8');
 assert.ok(html.includes(neuralSection().replaceAll('<span aria-hidden="true">↗</span>',require('../scripts/lib/site-shell.cjs').iconize('<span aria-hidden="true">↗</span>'))));
 assert.ok(!/<canvas\b|<video\b|<audio\b|<form\b/.test(html));assert.ok(html.includes('data-neural-controls hidden'));assert.ok(html.includes('Voice conversation is not enabled'));
 assert.throws(()=>decorateNeuralExperience('<html><head></head><main>No insertion point</main></html>'));
 const js=fs.readFileSync(path.join(root,'public/neural/experience.js'),'utf8');assert.ok(js.includes("import('/neural/scene.js')"));assert.ok(js.includes("credentials:'omit'"));assert.ok(js.includes("method:'GET'"));assert.ok(js.includes('bytes>65536'));assert.ok(js.includes('expiresAt-Date.now()'));
 for(const file of ['experience.js','scene.js']){const code=fs.readFileSync(path.join(root,'public/neural',file),'utf8');assert.ok(!/getUserMedia|SpeechRecognition|sendBeacon|localStorage|EventSource|WebSocket|innerHTML/.test(code));}
});
test('renderer lifecycle covers bounded motion, reduced motion, visibility and GPU teardown',()=>{
 const code=fs.readFileSync(path.join(root,'public/neural/scene.js'),'utf8');
 for(const marker of ['Math.min(devicePixelRatio||1,1.5)','IntersectionObserver','ResizeObserver','document.hidden','cancelAnimationFrame','webglcontextlost','renderer.dispose()','environment.dispose()','canvas.remove()','reducedMotion','clamp(yaw+y,-1.1,1.1)'])assert.ok(code.includes(marker),marker);
 const controller=fs.readFileSync(path.join(root,'public/neural/experience.js'),'utf8');assert.ok(controller.includes('generation!==loadGeneration'));assert.ok(controller.includes("'pagehide'"));assert.ok(controller.includes("'pageshow'"));
});
test('deployment install is reproducible without lifecycle scripts or auto-promotion',()=>{
 const config=require('../vercel.json');assert.equal(config.installCommand,'npm ci --include=dev --ignore-scripts --no-audit --no-fund');assert.equal(config.git.deploymentEnabled,false);assert.equal(require('../public/release-manifest.json').engineAvailable,false);
});
