'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {header}=require('../scripts/lib/site-shell.cjs');
const {applyBrandMetadata,metadataForRoute}=require('../scripts/lib/brand-metadata.cjs');
const root=path.join(__dirname,'../public');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
test('visible Explore text supplies the summary accessible name without an overriding label',()=>{
 const summary=header('/').match(/<summary[^>]*>[\s\S]*?<\/summary>/)[0];
 assert.match(summary,/^<summary aria-controls="site-navigation"><span class="site-menu-label">Explore<\/span>/);assert.ok(!summary.includes('aria-label='));
});
test('every route has one canonical brand icon and complete static social identity',()=>{
 const files=walk(root).filter(f=>f.endsWith('/index.html'));
 assert.deepEqual(files.map(f=>'/'+path.relative(root,f).replaceAll('\\','/').replace(/index\.html$/,'')).sort(),require('../public/route-release-evidence.json').routes.map(r=>r.path).sort());
 for(const file of files){
  const html=fs.readFileSync(file,'utf8'),route='/'+path.relative(root,file).replaceAll('\\','/').replace(/index\.html$/,'');
  assert.equal((html.match(/rel="icon"/g)||[]).length,1,file);
  for(const key of ['og:title','og:description','og:type','og:url','og:image','og:image:alt','twitter:card','twitter:image','twitter:image:alt'])assert.equal((html.match(new RegExp('(?:property|name)="'+key+'"','g'))||[]).length,1,file+' '+key);
  assert.ok(html.includes('content="'+metadataForRoute(route).image+'"'),file);
  assert.ok(html.includes('name="robots" content="noindex,follow"'),file);
  assert.ok(!html.includes('aria-label="Open navigation"'),file);
  assert.equal(applyBrandMetadata(html,route),html,file+' metadata must be byte-idempotent');
 }
});
test('metadata regeneration escapes untrusted text and preserves source security and body content',()=>{
 const html='<html><head><title>A &amp; B &quot;test&quot; &lt;script&gt;</title><meta name="description" content="A &quot;quoted&quot; description"><meta name="robots" content="noindex,follow"><meta property="og:image" content="https://obsolete.invalid/a.png"><meta property="og:image" content="https://obsolete.invalid/b.png"></head><body><main>Do not alter</main></body></html>';
 const result=applyBrandMetadata(html,'/products/');assert.equal(applyBrandMetadata(result,'/products/'),result);
 assert.equal((result.match(/property="og:image"/g)||[]).length,1);assert.ok(!result.includes('obsolete.invalid'));
 assert.ok(result.includes('content="A &amp; B &quot;test&quot; &lt;script&gt;"'));assert.ok(!result.includes('&amp;amp;'));
 assert.ok(result.includes('<main>Do not alter</main>'));assert.ok(result.includes('name="robots" content="noindex,follow"'));
 for(const bad of ['https://evil.invalid/','/../','/?mode=ask','/<script>/'])assert.throws(()=>metadataForRoute(bad));
});
test('static preview and authentication wrappers use valid named roles',()=>{
 const preview=fs.readFileSync(path.join(root,'platform-preview/index.html'),'utf8');
 assert.match(preview,/<figure class="wp-scene-art" aria-label="Glass neural spiral above an Earth horizon. Visual concept of Astra Polaris.">/);
 assert.match(preview,/<img id="neural-image"[^>]+alt=""/);
 assert.match(fs.readFileSync(path.join(root,'sign-in/index.html'),'utf8'),/id="sign-in" role="region" aria-label="Ad Astra sign-in"/);
});
