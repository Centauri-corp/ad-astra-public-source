'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {test}=require('node:test');
const script=fs.readFileSync(path.join(__dirname,'../scripts/redis-acceptance.cjs'),'utf8');

async function check(env,release={engineAvailable:false,publicLaunchEnabled:false}){
 const output=[];let commands=0;
 const processFixture={env,exitCode:0};
 const requireFixture=(name)=>{
  if(name==='../public/release-manifest.json')return release;
  if(name==='../lib/quota')return {SCRIPT:'synthetic-only',command:async(args)=>{
   commands++;
   if(args[0]==='DEL')return 0;
   throw new Error('No Redis configuration or credentials in this synthetic test');
  }};
  if(name==='node:assert/strict'||name==='node:crypto')return require(name);
  throw new Error('Unexpected module');
 };
 await vm.runInNewContext(script,{require:requireFixture,process:processFixture,
  console:{log:(message)=>output.push(message),error:(message)=>output.push(message)},
  setTimeout,clearTimeout},{timeout:1000});
 return {commands,output,exitCode:processFixture.exitCode};
}

test('paused non-live Vercel preview builds without Redis and never claims production acceptance',async()=>{
 const result=await check({VERCEL:'1',VERCEL_ENV:'preview'});
 assert.equal(result.commands,0);assert.equal(result.exitCode,0);
 assert.deepEqual(result.output,['AD_ASTRA_REDIS_ACCEPTANCE_DEFERRED target=preview engine=paused productionAccepted=false']);
});
test('local source tests still defer remote integration without provider access',async()=>{
 const result=await check({});
 assert.equal(result.commands,0);assert.equal(result.exitCode,0);
 assert.ok(!result.output.some(line=>line.includes('ACCEPTANCE_PASS')));
});
for(const target of ['production','staging','development',undefined]){
 test(`Vercel ${target??'unknown'} target still requires real Redis acceptance`,async()=>{
  const result=await check({VERCEL:'1',...(target?{VERCEL_ENV:target}:{})});
  assert.ok(result.commands>0);assert.equal(result.exitCode,1);
  assert.ok(result.output.some(line=>line.includes('ACCEPTANCE_FAILED')));
  assert.ok(!result.output.some(line=>line.includes('ACCEPTANCE_DEFERRED')));
 });
}
for(const release of [
 {engineAvailable:true,publicLaunchEnabled:false},
 {engineAvailable:false,publicLaunchEnabled:true},
 {engineAvailable:false},
 {publicLaunchEnabled:false},
 {engineAvailable:'false',publicLaunchEnabled:false},
 {}]){
 test(`preview cannot defer for an executable, public or incomplete release: ${JSON.stringify(release)}`,async()=>{
  const result=await check({VERCEL:'1',VERCEL_ENV:'preview'},release);
  assert.ok(result.commands>0);assert.equal(result.exitCode,1);
  assert.ok(!result.output.some(line=>line.includes('ACCEPTANCE_DEFERRED')));
 });
}
