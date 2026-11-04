'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {authorize}=require('../lib/platform-policy');
const {validateEvent,idempotencyScope}=require('../lib/business-events');
const {newTask,transition}=require('../lib/agent-policy');
const user={active:true,subject:'u123',tenantId:'tenant-A',role:'sales'};
const resource={tenantId:'tenant-A'};
test('deny cross-tenant even if role allows the operation',()=>assert.equal(authorize({principal:user,action:'crm.update',resource:{tenantId:'tenant-B'}}).allowed,false));
test('permit same-tenant least-privilege CRM update',()=>assert.equal(authorize({principal:user,action:'crm.update',resource}).allowed,true));
test('reject payments and external calls without independent approval',()=>{
 assert.equal(authorize({principal:user,action:'billing.refund',resource}).allowed,false);
 assert.equal(authorize({principal:{...user,delegatedActions:['marketing.send']},action:'marketing.send',resource,approval:{action:'marketing.send',tenantId:'tenant-A',state:'approved',requester:'u123',approver:'u123',evidenceId:'ev1'}}).allowed,false);
});
test('allow delegated action only with independent evidenced approval',()=>{
 const decision=authorize({principal:{...user,delegatedActions:['marketing.send']},action:'marketing.send',resource,approval:{action:'marketing.send',tenantId:'tenant-A',state:'approved',requester:'u123',approver:'manager1',evidenceId:'ev1'}});
 assert.equal(decision.allowed,true);
});
const evt={type:'lead.created',schemaVersion:'1.0',tenantId:'tenant-A',eventId:'evt123',idempotencyKey:'key123',occurredAt:'2026-11-03T22:00:00Z',producer:'crm-zoho',traceId:'trace123',payload:{leadId:'L01',source:'organic',consentState:'granted',lawfulContactBasis:'consent'}};
test('validate business event and scope dedupe by tenant',()=>{assert.equal(validateEvent(evt).ok,true);assert.equal(idempotencyScope(evt),'tenant-A:crm-zoho:key123')});
test('reject unknown schema and unconsented malformed event',()=>{assert.equal(validateEvent({...evt,type:'invalid'}).ok,false);assert.equal(validateEvent({...evt,payload:{...evt.payload,consentState:'forced'}}).ok,false);});
test('agent tasks require approval for external execution',()=>{
 const task=newTask({tenantId:'tenant-A',createdBy:'u123',action:'external:crm.send',payloadHash:'hash123'});
 assert.equal(transition(task,'running',{principal:user}).ok,false);
 assert.equal(transition(task,'completed',{principal:user}).ok,false);
});
test('agent never runs across tenant',()=>{
 const task=newTask({tenantId:'tenant-A',createdBy:'u123',action:'analysis',payloadHash:'hash123'});
 assert.equal(transition(task,'running',{principal:{...user,tenantId:'tenant-B'}}).ok,false);
});
