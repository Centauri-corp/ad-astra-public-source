'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../public-v3');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(root),html=files.filter(f=>f.endsWith('.html'));
assert.equal(html.length,53,'Preserve every V3 page');
for(const file of files){
 const text=fs.readFileSync(file,'utf8');
 assert.ok(!/SANITY_READ_TOKEN|sk-proj-|ad-astra-cognitive|Bearer sk-|energy-america/i.test(text),'Private source in '+file);
 if(file.endsWith('.html')){
  assert.equal((text.match(/<h1[ >]/g)||[]).length,1,'One h1 '+file);
  const canonical=text.match(/rel="canonical" href="([^"]+)"/);assert.ok(canonical&&canonical[1].startsWith('https://adastra.global/'),'canonical '+file);
  assert.ok(!/<video|<audio|<iframe/i.test(text),'Unapproved media '+file);
  for(const m of text.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)){
   const rel=m[1];if(rel.startsWith('/api/'))continue;
   const target=path.join(root,rel,rel.endsWith('/')?'index.html':'');assert.ok(fs.existsSync(target),'Broken local link '+rel+' from '+file);
  }
 }
}
for(const m of fs.readFileSync(path.join(root,'sitemap.xml'),'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)){
 const url=new URL(m[1]);assert.equal(url.origin,'https://adastra.global');
 const text=fs.readFileSync(path.join(root,url.pathname,'index.html'),'utf8');
 assert.ok(!/name="robots" content="noindex/.test(text),'Noindex URL in sitemap');
}
const cfg=JSON.parse(fs.readFileSync(path.join(root,'../vercel.json')));assert.equal(cfg.outputDirectory,'public-v3');assert.equal(cfg.git.deploymentEnabled,false);
for(const route of ['ask','status','session'])assert.ok(fs.existsSync(path.join(root,'../api',route+'.js')),'Missing API '+route);
console.log('AD_ASTRA_V3_RELEASE_PASS pages='+html.length+' links=valid film=withheld private_content=absent api=present');
