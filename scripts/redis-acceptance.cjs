'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {command,SCRIPT}=require('../lib/quota');
async function run(){
 if(!process.env.VERCEL){console.log('Redis integration acceptance: deferred to Vercel build with connected secrets');return;}
 const root='ad-astra:acceptance:'+crypto.randomUUID();
 const keys=[];
 const make=(label)=>{const k=root+':'+label;keys.push(k);return k;};
 const user=make('user'),budget=make('budget');
 const attempt=(u,b,limit=12,cap=10000000)=>command(['EVAL',SCRIPT,2,u,b,limit,20000,cap]);
 try{
  const parallel=await Promise.all(Array.from({length:24},()=>attempt(user,budget)));
  assert.equal(parallel.filter(r=>r[0]===1).length,12);assert.equal(parallel.filter(r=>r[0]===0).length,12);
  assert.equal(Number(await command(['GET',user])),12);
  assert.equal(Number(await command(['HGET',budget,'used'])),240000);
  assert.ok(Number(await command(['TTL',user]))>0);assert.ok(Number(await command(['TTL',budget]))>0);
  const globalBudget=make('global');
  const perUser=Array.from({length:16},(_,i)=>make('u'+i));
  const global=await Promise.all(perUser.map(u=>attempt(u,globalBudget,12,100000)));
  assert.equal(global.filter(r=>r[0]===1).length,5);assert.equal(global.filter(r=>r[0]===2).length,11);
  assert.equal(Number(await command(['HGET',globalBudget,'used'])),100000);
  const currentDay=Number(await command(['HGET',globalBudget,'day']));
  await command(['HSET',globalBudget,'day',currentDay-1]);
  assert.equal((await attempt(make('new-day-user'),globalBudget,12,100000))[0],1);
  assert.equal(Number(await command(['HGET',globalBudget,'used'])),20000);
  await command(['SET',user,12,'EX',1]);
  await new Promise(r=>setTimeout(r,1100));
  assert.equal((await attempt(user,budget))[0],1);
  // Independent module instance sees the same real shared state.
  delete require.cache[require.resolve('../lib/quota')];
  assert.equal(Number(await require('../lib/quota').command(['GET',user])),1);
  console.log('AD_ASTRA_REDIS_ACCEPTANCE_PASS concurrent_user=24 allowed=12 global_attempts=16 allowed=5 atomic_budget=100000 ttl=verified reset=verified persistence=verified');
 } finally {if(keys.length)await command(['DEL',...keys]);}
}
run().catch(()=>{console.error('AD_ASTRA_REDIS_ACCEPTANCE_FAILED: release blocked; no credential values logged');process.exitCode=1;});
