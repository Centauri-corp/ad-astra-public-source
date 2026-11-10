'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const {productFiles,validate}=require('../scripts/lib/product-architecture.cjs');
const catalog=require('../config/public-product-families.json'),visual=require('../config/public-visual-architecture.json');
const files=productFiles(catalog,visual),root=path.join(__dirname,'..');
test('all six family pages and seven graphics are deterministic and match checked source',()=>{
 assert.deepEqual(productFiles(catalog,visual),files);assert.equal(files.size,16);
 for(const [file,body] of files)assert.equal(fs.readFileSync(path.join(root,file),'utf8'),body,file);
 for(const family of catalog.families){const html=files.get(`public/products/${family.id}/index.html`);assert.ok(html.includes(`https://adastra.global/products/${family.id}/`));assert.ok(html.includes('noindex,follow'));assert.ok(html.includes('no model request is executed'));assert.ok(html.includes('href="/status/"'));assert.equal((html.match(/<h1\b/g)||[]).length,1);}
});
test('graphics are distinct, hashed, rights-pending and usable without motion',()=>{
 const manifest=JSON.parse(files.get('public/assets/products/manifest.json'));assert.equal(manifest.assets.length,7);assert.equal(new Set(manifest.assets.map(a=>a.sha256)).size,7);
 for(const asset of manifest.assets){const svg=files.get('public'+asset.exports[0]);assert.equal(asset.sha256,crypto.createHash('sha256').update(svg).digest('hex'));assert.equal(asset.fileSize,Buffer.byteLength(svg));assert.equal(asset.approvalState,'pending-review');assert.equal(asset.approvedVersion,null);assert.equal(asset.reducedMotionFallback,asset.exports[0]);assert.ok(!/<script|https?:\/\/(?!www.w3.org)/.test(svg));}
});
test('invalid modes, catalogs and active motion cannot enter product generation',()=>{
 for(const mutate of [c=>c.availability='available',c=>c.families[0].modes.push('admin'),c=>c.families.reverse()]){const c=structuredClone(catalog);mutate(c);assert.throws(()=>validate(c,visual));}
 const v=structuredClone(visual);v.motion.autoplay=true;assert.throws(()=>validate(catalog,v));
});
test('product text is escaped and cannot inject executable markup',()=>{
 const c=structuredClone(catalog);c.families[0].summary='<img src=x onerror=alert(1)>';const output=productFiles(c,visual).get('public/products/index.html');assert.ok(output.includes('&lt;img src=x onerror=alert(1)&gt;'));assert.ok(!output.includes('<img src=x'));
});
test('filter preserves static fallback, handles invalid deep links and browser history',()=>{
 const cards=catalog.families.map(f=>({dataset:{modes:f.modes.join(' ')},hidden:false}));
 const buttons=['all',...visual.modes].map(mode=>({dataset:{mode},attrs:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,cb){this[k]=cb;}}));
 const result={textContent:''},filter={hidden:true,querySelectorAll:()=>buttons},listeners={},location={href:'https://adastra.global/products/?mode=__proto__'},history={pushState(_,__,url){location.href=String(url);}};
 const context={URL,location,history,document:{querySelector:()=>filter,querySelectorAll:()=>cards,getElementById:()=>result},window:{addEventListener(k,cb){listeners[k]=cb;}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'public/products/discovery.js'),'utf8'),context);
 assert.equal(filter.hidden,false);assert.ok(cards.every(c=>!c.hidden));
 for(const mode of visual.modes){buttons.find(b=>b.dataset.mode===mode).click();assert.equal(cards.filter(c=>!c.hidden).length,catalog.families.filter(f=>f.modes.includes(mode)).length);assert.equal(new URL(location.href).searchParams.get('mode'),mode);assert.equal(buttons.filter(b=>b.attrs['aria-pressed']==='true').length,1);}
 location.href='https://adastra.global/products/?mode=ask';listeners.popstate();assert.equal(cards.filter(c=>!c.hidden).length,3);
 const html=files.get('public/products/index.html');assert.match(html,/data-mode-filter hidden/);assert.ok(!/data-family="[^"]+"[^>]*\bhidden/.test(html));
});
test('every public page exposes product discovery and availability, and modes match the API contract',()=>{
 function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
 const htmlFiles=walk(path.join(root,'public')).filter(f=>f.endsWith('/index.html'));assert.equal(htmlFiles.length,38);
 for(const f of htmlFiles){const body=fs.readFileSync(f,'utf8');assert.ok(body.includes('href="/products/"'),f);assert.ok(body.includes('href="/status/"'),f);assert.ok(body.includes('href="/intelligence/"'),f);}
 assert.deepEqual(require('../lib/modes').MODE_IDS,require('../public/release-manifest.json').customerModes);assert.deepEqual(require('../lib/model-catalog').MODELS[0].modes,visual.modes);
});
