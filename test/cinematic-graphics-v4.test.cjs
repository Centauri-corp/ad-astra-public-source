'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../public/personal-universe'),read=name=>fs.readFileSync(path.join(dir,name),'utf8');
test('graphics evolution is progressive and remains a private development preview',()=>{
 const html=read('index.html'),runtime=read('universe.js'),shader=read('neural-gpu-field.js'),style=read('universe.css');
 assert.match(html,/id="load-3d"/);assert.match(html,/id="visual-voice"/);
 assert.match(html,/id="motion-energy"/);assert.match(html,/id="life-progress-chart"/);
 assert.match(html,/name="robots" content="noindex,follow"/);
 assert.match(runtime,/createCinematicScene/);assert.match(runtime,/createGPUField/);
 assert.match(runtime,/if\(!calm\(\)\)try/);assert.match(runtime,/gpuField\?\.dispose/);
 assert.match(shader,/navigator\.gpu\.requestAdapter/);assert.match(shader,/powerPreference:'low-power'/);
 assert.match(shader,/MAX=1600/);assert.match(shader,/WebGPU/);
 assert.match(style,/prefers-reduced-motion:reduce/);
 assert.match(style,/\.gpu-neural-field/);assert.match(style,/\.intelligence-viz/);
 assert.doesNotMatch(runtime,/localStorage|sessionStorage|autoSubmit|autoplaySpeech/);
});
test('personal progress graphs derive from actual checked steps, not fabricated data',()=>{
 const runtime=read('universe.js'),html=read('index.html');
 assert.match(runtime,/daily\.snapshot\(\)/);
 assert.match(runtime,/snap\.completed\/snap\.total/);
 assert.match(runtime,/life-progress-formula/);
 assert.match(html,/no invented personal intelligence scores/);
 assert.match(runtime,/const svgNS='http:\/\/www\.w3\.org\/2000\/svg'/);
});
test('visual voice commands are explicit, bounded and have no privileged side effect',()=>{
 const runtime=read('universe.js');
 assert.match(runtime,/function handleVisualCommand\(input\)/);
 for(const command of ['pause motion','resume motion','calm mode','cyan','champagne','cobalt','show progress'])assert.ok(runtime.includes("'"+command+"'"));
 assert.match(runtime,/AdAstraVoice\?\.create/);
 assert.match(runtime,/\$\('visual-voice'\)\?\.addEventListener\('click'/);
 assert.match(runtime,/if\(handleVisualCommand\(value\)\)return/);
 assert.match(runtime,/identity\.token\(tokenScope\)/);
});

test('cinematic progress is hidden until explicit user selection or voice control',()=>{
 const html=read('index.html'),runtime=read('universe.js'),style=read('universe.css');
 assert.match(html,/id="daily-visual"[^>]*hidden/);
 assert.match(html,/id="reveal-progress"[^>]*aria-expanded="false"/);
 assert.match(runtime,/function revealProgress\(open/);
 assert.match(runtime,/visual.hidden=!open/);
 assert.match(runtime,/reveal\?\.addEventListener\('click'/);
 assert.match(runtime,/'show progress':\(\)=>revealProgress\(true/);
 assert.match(style,/#daily-visual\[hidden\]\{display:none!important\}/);
 assert.match(html,/class="universe-enter"/);
});
