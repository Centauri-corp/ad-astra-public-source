'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {renderSocial,IMAGE} = require('../lib/social-metadata.cjs');
const root = path.resolve(__dirname,'../public-v3');
function walk(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
test('all public pages have one complete social card matching their canonical content',()=>{
  const pages=walk(root).filter(f=>f.endsWith('.html'));
  assert.equal(pages.length,53);
  for(const file of pages){
    const html=fs.readFileSync(file,'utf8');
    assert.equal(renderSocial(html),html,'Stale social metadata: '+file);
    for(const key of ['og:title','og:description','og:url','og:image','twitter:card','twitter:image'])
      assert.equal((html.match(new RegExp('(?:property|name)="'+key+'"','g'))||[]).length,1,file+' '+key);
    assert.ok(html.includes('content="summary_large_image"'));
  }
  const image=fs.readFileSync(path.join(root,new URL(IMAGE).pathname));
  assert.equal(image.readUInt16BE(0),0xffd8,'Social card must be a real JPEG');
});
test('metadata preserves escaped text, refreshes after editorial changes and rejects another origin',()=>{
  const template='<html><head><title>Research &amp; learning</title><meta name="description" content="A &quot;reviewed&quot; description"><link rel="canonical" href="https://adastra.global/research/"></head></html>';
  const first=renderSocial(template);
  assert.ok(first.includes('property="og:title" content="Research &amp; learning"'));
  assert.ok(!first.includes('&amp;amp;'));
  assert.equal(renderSocial(first),first);
  const changed=renderSocial(first.replace('<title>Research &amp; learning</title>','<title>Updated title</title>'));
  assert.ok(changed.includes('property="og:title" content="Updated title"'));
  assert.throws(()=>renderSocial(template.replace('https://adastra.global/','https://example.com/')),/canonical/);
});
