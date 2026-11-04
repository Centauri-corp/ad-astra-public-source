'use strict';
const crypto = require('node:crypto');
const {authorize}=require('./platform-policy');
const TRANSITIONS=Object.freeze({
  queued:['awaiting_approval','running','cancelled'],
  awaiting_approval:['queued','cancelled'],
  running:['completed','failed','cancelled'],
  failed:['queued','cancelled'],
  completed:[],
  cancelled:[]
});
function newTask({tenantId,createdBy,action,payloadHash}) {
 if (![tenantId,createdBy,action,payloadHash].every(x=>typeof x==='string'&&x.length>2)) throw new Error('invalid_task');
 return {id:crypto.randomUUID(),tenantId,createdBy,action,payloadHash,state:'queued',attempts:0,createdAt:new Date().toISOString()};
}
function transition(task,next,{principal,approval}={}) {
 if(!task||!TRANSITIONS[task.state]?.includes(next)) return {ok:false,reason:'invalid_transition'};
 if(!principal||principal.tenantId!==task.tenantId||principal.active!==true) return {ok:false,reason:'unauthorized'};
 if(next==='running' && task.action.startsWith('external:')) {
   const decision=authorize({principal,action:'agent.external_action',resource:{tenantId:task.tenantId},approval});
   if(!decision.allowed) return {ok:false,reason:decision.reason};
 }
 if(next==='queued'&&task.state==='failed'&&task.attempts>=3)return {ok:false,reason:'retry_exhausted'};
 return {ok:true,task:{...task,state:next,attempts:next==='running'?task.attempts+1:task.attempts}};
}
module.exports={TRANSITIONS,newTask,transition};
