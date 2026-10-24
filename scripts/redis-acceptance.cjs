'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {command,SCRIPT}=require('../lib/quota');
// Redis hash fields are unordered. Compare field/value pairs without weakening
// the assertion that corrupt-state rejection leaves every stored value intact.
const hashSnapshot=async key=>{const fields=await command(['HGETALL',key]);return Object.fromEntries(Array.from({length:fields.length/2},(_,i)=>[fields[i*2],fields[i*2+1]]));};
let phase='setup';
async function run(){
 if(!process.env.VERCEL){console.log('Redis integration acceptance: deferred to Vercel build with connected secrets');return;}
 const root='ad-astra:acceptance:'+crypto.randomUUID();
 const keys=[];
 const make=(label)=>{const k=root+':'+label;keys.push(k);return k;};
 const user=make('user'),budget=make('budget');
 const attempt=(u,b,limit=12,cap=10000000)=>command(['EVAL',SCRIPT,2,u,b,limit,20000,cap]);
 try{
  phase='concurrent-user';
  const parallel=await Promise.all(Array.from({length:24},()=>attempt(user,budget)));
  assert.equal(parallel.filter(r=>r[0]===1).length,12);assert.equal(parallel.filter(r=>r[0]===0).length,12);
  assert.equal(Number(await command(['GET',user])),12);
  assert.equal(Number(await command(['HGET',budget,'used'])),240000);
  assert.ok(Number(await command(['TTL',user]))>0);assert.ok(Number(await command(['TTL',budget]))>0);
  const globalBudget=make('global');
  phase='concurrent-budget';
  const perUser=Array.from({length:16},(_,i)=>make('u'+i));
  const global=await Promise.all(perUser.map(u=>attempt(u,globalBudget,12,100000)));
  assert.equal(global.filter(r=>r[0]===1).length,5);assert.equal(global.filter(r=>r[0]===2).length,11);
  assert.equal(Number(await command(['HGET',globalBudget,'used'])),100000);
  const currentDay=Number(await command(['HGET',globalBudget,'day']));
  phase='day-reset';
  await command(['HSET',globalBudget,'day',currentDay-1]);
  assert.equal((await attempt(make('new-day-user'),globalBudget,12,100000))[0],1);
  assert.equal(Number(await command(['HGET',globalBudget,'used'])),20000);
  await command(['SET',user,12,'EX',1]);
  phase='user-expiry';
  await new Promise(r=>setTimeout(r,1100));
  assert.equal((await attempt(user,budget))[0],1);
  // Independent module instance sees the same real shared state.
  delete require.cache[require.resolve('../lib/quota')];
  assert.equal(Number(await require('../lib/quota').command(['GET',user])),1);
  // Corrupt durable state must deny without altering either counter.
  let corruptCases=0;
  for(const value of ['-1','0','1.5','9007199254740992','broken']){
   phase='corrupt-user-'+corruptCases;
   const badUser=make('bad-user-'+corruptCases),freshBudget=make('fresh-budget-'+corruptCases);
   await command(['SET',badUser,value,'EX',3600]);
   assert.deepEqual(await attempt(badUser,freshBudget),[-1,0,60]);
   assert.equal(await command(['GET',badUser]),value);
   assert.equal(Number(await command(['EXISTS',freshBudget])),0);corruptCases++;
  }
  const invalidLedgers=[['day',currentDay,'used','-1'],['day',currentDay,'used','1.5'],['day',currentDay,'used','broken'],['day',currentDay,'used','9007199254740992'],['day',currentDay],['used','20000'],['other','value'],['day',currentDay+1,'used','20000'],['day','broken','used','20000']];
  for(const fields of invalidLedgers){
   phase='corrupt-budget-'+corruptCases;
   const freshUser=make('fresh-user-'+corruptCases),badBudget=make('bad-budget-'+corruptCases);
   await command(['HSET',badBudget,...fields]);await command(['EXPIRE',badBudget,3600]);
   const before=await hashSnapshot(badBudget);
   assert.deepEqual(await attempt(freshUser,badBudget),[-1,0,60]);
   assert.deepEqual(await hashSnapshot(badBudget),before);
   assert.equal(Number(await command(['EXISTS',freshUser])),0);corruptCases++;
  }
  for(const target of ['user','budget']){
   phase='persistent-'+target;
   const persistentUser=make('persistent-user-'+target),persistentBudget=make('persistent-budget-'+target);
   assert.equal((await attempt(persistentUser,persistentBudget))[0],1);
   await command(['PERSIST',target==='user'?persistentUser:persistentBudget]);
   assert.deepEqual(await attempt(persistentUser,persistentBudget),[-1,0,60]);
   assert.equal(await command(['GET',persistentUser]),'1');
   assert.equal(await command(['HGET',persistentBudget,'used']),'20000');corruptCases++;
  }
  console.log('AD_ASTRA_REDIS_ACCEPTANCE_PASS concurrent_user=24 allowed=12 global_attempts=16 allowed=5 atomic_budget=100000 ttl=verified reset=verified persistence=verified corrupt_state='+corruptCases+' denied_without_mutation');
 } finally {if(keys.length)await command(['DEL',...keys]);}
}
run().catch(error=>{console.error('AD_ASTRA_REDIS_ACCEPTANCE_FAILED',{phase,code:error.code==='ERR_ASSERTION'?'assertion':'service',...(error.code==='ERR_ASSERTION'?{actual:error.actual,expected:error.expected}: {})});process.exitCode=1;});
