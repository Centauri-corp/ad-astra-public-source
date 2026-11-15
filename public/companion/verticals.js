'use strict';
// Public-only vertical choices. Customer selection is a visual/agent request hint,
// NEVER a tenant/role/entitlement or a claim that the AI engine is available.
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AdAstraCustomerVerticals=api;})(globalThis,()=>{
 const entries=Object.freeze([
  Object.freeze({id:'core-intelligence',label:'Core Intelligence',agentId:'guide',interaction:'ask',sceneMode:'research',accent:'#b6deed'}),
  Object.freeze({id:'creative-studio',label:'Creative Studio',agentId:'creator',interaction:'create',sceneMode:'create',accent:'#d5ba91'}),
  Object.freeze({id:'specialist-intelligence',label:'Specialist Intelligence',agentId:'researcher',interaction:'research',sceneMode:'research',accent:'#b6deed'}),
  Object.freeze({id:'business-commerce',label:'Business & Commerce',agentId:'analyst',interaction:'explore',sceneMode:'create',accent:'#d5ba91'}),
  Object.freeze({id:'developer-platform',label:'Developer Platform',agentId:'researcher',interaction:'research',sceneMode:'plan',accent:'#aec9ed'}),
  Object.freeze({id:'autonomous-workflows',label:'Autonomous Workflows',agentId:'navigator',interaction:'ask',sceneMode:'plan',accent:'#aec9ed'})
 ]);
 const byId=new Map(entries.map(item=>[item.id,item]));
 const fallback=entries[0];
 function select(id){return byId.get(id)||fallback;}
 function resolveRoute(search){
  let id=null;try{const query=new URLSearchParams(search);
   if(query.getAll('family').length===1)id=query.get('family');
  }catch{}
  return select(id);
 }
 function createSession(initial=fallback.id){
  let chosen=select(initial);
  return Object.freeze({
   choices:()=>entries.map(({id,label})=>({id,label})),
   choose:id=>{chosen=select(id);return chosen;},
   current:()=>chosen,
   requestHint:()=>({agentId:chosen.agentId,mode:chosen.interaction}),
   // No localStorage: no cross-user leakage on shared devices.
   reset:()=>{chosen=fallback;return chosen;}
  });
 }
 return Object.freeze({entries,select,resolveRoute,createSession});
});
