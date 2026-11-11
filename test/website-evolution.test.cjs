'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync,readdirSync}=require('node:fs'),{resolve,join}=require('node:path'),{createHash}=require('node:crypto');
const root=resolve(__dirname,'../public');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const manifest=read('evolution/build-manifest.json'),site=read('evolution/site-map.json'),evidence=read('route-release-evidence.json');

test('evolution artifact inventory is complete, unique and byte-bound',()=>{
  assert.equal(manifest.schema,'ad-astra-website-evolution/v1');
  assert.equal(manifest.status,'review-candidate');
  assert.equal(manifest.artifactFingerprint,hash(JSON.stringify(manifest.artifacts)));
  assert.equal(new Set(manifest.artifacts.map(a=>a.path)).size,manifest.artifacts.length);
  for(const artifact of manifest.artifacts){
    assert.match(artifact.path,/^\/evolution\/(?!.*\.\.)/);
    assert.equal(hash(readFileSync(resolve(root,'.'+artifact.path))),artifact.sha256,artifact.path);
  }
  const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(dir,entry.name)):[join(dir,entry.name)]);
  assert.deepEqual(walk(resolve(root,'evolution')).map(p=>'/'+p.slice(root.length+1)).filter(p=>!p.endsWith('/build-manifest.json')).sort(),manifest.artifacts.map(a=>a.path).sort());
});

test('all evolution pages remain held and excluded from the production sitemap',()=>{
  const pages=manifest.artifacts.filter(a=>a.path.endsWith('/index.html'));
  assert.equal(pages.length,manifest.pageCount);
  assert.equal(manifest.publicRelease,false); assert.equal(manifest.customerExecutionEnabled,false);
  assert.equal(evidence.customerProductLaunchEnabled,false);
  for(const page of pages){
    const route=page.path.replace(/index\.html$/,'');
    const record=evidence.routes.find(r=>r.path===route);
    assert.ok(record,route); assert.equal(record.decision,'held');
    assert.ok(!evidence.approvedRoutes.includes(route));
    for(const gate of evidence.requiredRouteGates){assert.equal(record.gates[gate].status,'pending');assert.equal(record.gates[gate].evidenceRef,null);}
    const html=readFileSync(resolve(root,'.'+page.path),'utf8');
    assert.match(html,/name="robots" content="noindex,follow"/);
    assert.match(html,new RegExp('rel="canonical" href="https://adastra\\.global'+route+'"'));
    assert.ok(!/(?:href|src)="\/(?:concept|workspace)(?:\/|")/.test(html));
  }
  assert.ok(!readFileSync(resolve(root,'sitemap.xml'),'utf8').includes('/evolution/'));
  assert.equal(site.customerRoutes.filter(r=>r.available).length,0);
  assert.equal(site.customerRoutes[0].state,'release-held-redirect');
});

test('sector profiles share the existing public foundation model; redirects and API gates remain intact',()=>{
  const catalog=require('../lib/model-catalog');
  assert.deepEqual([manifest.foundationModel],catalog.publicModels());
  assert.equal(manifest.sectorProfiles,catalog.publicMarketProfiles().length);
  assert.equal(manifest.artifacts.filter(a=>/^\/evolution\/profiles\/[^/]+\/index.html$/.test(a.path)).length,manifest.sectorProfiles);
  assert.equal(manifest.marketContexts,15);
  const config=require('../vercel.json');
  assert.ok(config.redirects.some(r=>r.source==='/platform/:path*'&&r.destination==='/'));
  assert.ok(config.redirects.some(r=>r.source==='/sign-in/:path*'&&r.destination==='/'));
  const headers=config.headers.find(r=>r.source==='/evolution(.*)').headers;
  assert.ok(headers.some(h=>h.key==='X-Robots-Tag'&&h.value==='noindex, follow'));
  assert.equal(config.git.deploymentEnabled,false);
});
