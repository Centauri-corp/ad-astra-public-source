'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('cinematic global experience is the sole public visual entrypoint',()=>{
  const root=path.join(__dirname,'..','public');
  const homepage=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'experience-manifest.json'),'utf8'));
  const order=['id="top"','id="neural-lab"','id="human-stage"','id="intelligence-layer"','id="film"'];
  const positions=order.map(marker=>homepage.indexOf(marker));
  assert.ok(positions.every(position=>position>=0));
  assert.ok(positions.every((position,i)=>i===0||position>positions[i-1]));
  assert.equal(homepage.includes('/atlas/'),false);
  assert.equal(homepage.includes('Atlas Universal'),false);
  assert.equal(manifest.visualArchitecture.atlasUniversal,undefined);
  assert.equal(manifest.visualArchitecture.humanToHuman.route,'/');
  assert.equal(fs.existsSync(path.join(root,'atlas')),false);
  assert.equal(fs.existsSync(path.join(__dirname,'..','lib','atlas-universal-platform.cjs')),false);
});
