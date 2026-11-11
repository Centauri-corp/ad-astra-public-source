'use strict';
// Availability metadata only. Never represents request execution or entitlements.
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AdAstraNeuralStatus=api;})(globalThis,()=>{
 const ids=['website','engine','products','workspace','crm','billing','outreach'];
 const labels={available:'Service reports available',preview:'Design preview',planned:'In development',paused:'Paused'};
 function parseAvailability(payload,now=Date.now()){
  if(!payload||payload.schema!=='ad-astra-operating-status/v1'||payload.basis!=='release-configuration'||!Number.isFinite(now))throw Error('Unverified status shape');
  if(typeof payload.generatedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(payload.generatedAt))throw Error('Invalid status time');
  const at=Date.parse(payload.generatedAt),age=now-at;
  if(!Number.isFinite(at)||new Date(at).toISOString()!==payload.generatedAt||age< -5000||age>60000)throw Error('Status expired');
  if(!Array.isArray(payload.services)||payload.services.length!==ids.length)throw Error('Incomplete service set');
  const states=new Map();
  for(const service of payload.services){
   if(!service||!ids.includes(service.id)||states.has(service.id)||!Object.hasOwn(labels,service.state))throw Error('Invalid service state');
   states.set(service.id,service.state);
  }
  return {at,expiresAt:at+60000,services:Object.fromEntries(['engine','crm','billing','outreach'].map(id=>[id,{state:states.get(id),label:labels[states.get(id)]}]))};
 }
 return Object.freeze({parseAvailability});
});
