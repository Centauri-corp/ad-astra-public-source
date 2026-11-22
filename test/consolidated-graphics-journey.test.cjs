'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('seven-system canonical browser compiler matches server-reviewed compiler',()=>{
 const server=read('lib/graphics-intelligence-core.cjs');
 const browser=read('public/graphics/core.js');
 const original='module.exports={GRAPHICS_CORE_VERSION,SYSTEMS,VISUAL_TOKENS,CORE_SCENES,compileScene,buildGraphicsAtlas,validateScene};';
 assert.ok(server.includes(original));
 assert.equal(browser,'/* Public-safe mirror of the canonical Graphics Intelligence Core. Test requires exact source equivalence except export. No tenant data. */\n'+server.replace(original,'window.AdAstraGraphicsCore=Object.freeze({GRAPHICS_CORE_VERSION,SYSTEMS,VISUAL_TOKENS,CORE_SCENES,compileScene,buildGraphicsAtlas,validateScene});'));
 const core=require('../lib/graphics-intelligence-core.cjs');
 assert.equal(core.buildGraphicsAtlas().scenes.length,7);
});
test('Universal Stage binds seven selectable systems to opt-in WebGL2',()=>{
 const html=read('public/products/index.html');
 const controller=read('public/graphics/atlas-controller.js');
 const adapter=read('public/products/graphics-adapter.js');
 assert.match(html,/src="\/graphics\/core\.js"/);
 assert.match(html,/src="\/graphics\/atlas-controller\.js"/);
 assert.match(html,/data-graphics-systems/);
 assert.match(controller,/aria-pressed/);
 assert.match(controller,/atlas\.scenes\.length!==7/);
 assert.match(adapter,/stage\.dataset\.graphicsSystem/);
 assert.match(adapter,/getContext\("webgl2"/);
 assert.doesNotMatch(controller,/fetch\(|localStorage|sessionStorage|WebSocket|eval\(/);
 assert.doesNotMatch(adapter,/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage/);
});
test('one public route journey uses shared entry and preview-only release',()=>{
 const routes=[['public/index.html','arrival'],['public/knowledge/index.html','intelligence'],['public/life/index.html','life'],['public/products/index.html','products'],['public/workspace/index.html','workspace']];
 for(const [p,id] of routes){
  const html=read(p);
  assert.match(html,/src="\/journey\/continuity\.js"/);
  assert.match(html,/src="\/journey\/navigation\.js"/);
  assert.ok(html.includes('data-current-journey="'+id+'"'),p);
  assert.match(html,/name="robots" content="noindex,follow"/);
 }
 const manifest=JSON.parse(read('public/release-manifest.json'));
 assert.equal(manifest.publicLaunchEnabled,false);
 assert.equal(manifest.engineAvailable,false);
 assert.deepEqual(manifest.indexableRoutes,[]);
 const vercel=JSON.parse(read('vercel.json'));
 assert.equal(vercel.git.deploymentEnabled,false);
});
