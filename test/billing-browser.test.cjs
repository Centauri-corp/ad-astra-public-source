'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const tenantId='12345678-1234-4234-8234-123456789012',workflowId='22345678-1234-4234-8234-123456789012';
const source=fs.readFileSync(require.resolve('../public/account/billing/app.js'),'utf8');
async function settle(){for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));}
async function browser(onRequest){
 class Element{constructor(id='',tagName='DIV'){this.id=id;this.tagName=tagName;this.value=id==='billing-plan'?'starter':'';this.checked=false;this.disabled=false;this.hidden=false;this.textContent='';this.children=[];this.handlers={};this.attributes={};}setAttribute(key,value){this.attributes[key]=value;}removeAttribute(key){delete this.attributes[key];}addEventListener(event,handler){this.handlers[event]=handler;}append(...children){this.children.push(...children);if(this.id==='billing-workspace'&&!this.value)this.value=children[0]?.value||'';}replaceChildren(...children){this.children=[...children];if(this.id==='billing-workspace')this.value='';}emit(event){return this.handlers[event]?.({preventDefault(){}});}}
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};
 const html=fs.readFileSync(require.resolve('../public/account/billing/index.html'),'utf8');for(const id of html.matchAll(/id="([^"]+)"/g))node(id[1]);
 const calls=[],navigations=[];let nextKey=0,listener;
 const clerk={session:{id:'sess_first',getToken:async()=> 'session-fixture'},load:async()=>{},addListener(callback){listener=callback;},signOut:async()=>{clerk.session=null;listener?.({session:null});}};
 const account={linked:true,environment:'production',market:'US-CA',linkingEnabled:true,checkoutEnabled:true,accessCurrent:false,consentVersion:'ca-v1',termsUrl:'https://adastra.global/terms/',privacyUrl:'https://adastra.global/privacy/',workspaces:[{tenantId,name:'Workspace'}],subscriptions:[]};
 const document={getElementById:node,createElement:tag=>new Element('',tag.toUpperCase()),querySelectorAll:()=>[...nodes.values()].filter(element=>/^billing-/.test(element.id))};
 const context={document,window:{Clerk:clerk},location:{assign:url=>navigations.push(url),replace:url=>navigations.push(url)},URL,AbortSignal,Intl,crypto:{randomUUID:()=> 'attempt-key-'+(++nextKey)},fetch:async(url,init)=>{const body=JSON.parse(init.body);calls.push({body,headers:init.headers});return onRequest?.(body,account,init)??Response.json(account);}};
 vm.runInNewContext(source,context);await settle();return {node,calls,navigations,account,clerk,sessionChanged:session=>listener({session})};
}
test('billing keeps completed enrollment across checkout failures and disables mutable form fields',async()=>{
 let completeEnrollment,checkoutCalls=0;
 const page=await browser((body,account)=>{if(body.action==='enroll')return new Promise(resolve=>{completeEnrollment=()=>resolve(Response.json({workflowId,state:'requested'}));});if(body.action==='checkout'){checkoutCalls++;return checkoutCalls===1?Response.json({error:'unavailable'},{status:503}):Response.json({url:'https://checkout.stripe.com/c/pay-fixture'});}return Response.json(account);});
 page.node('billing-consent').checked=true;page.node('billing-enroll-form').emit('submit');await settle();assert.equal(page.node('billing-plan').disabled,true);assert.equal(page.node('billing-workspace').disabled,true);
 completeEnrollment();await settle();assert.equal(page.calls.filter(call=>call.body.action==='enroll').length,1);assert.equal(page.node('billing-plan').disabled,false);
 page.node('billing-enroll-form').emit('submit');await settle();assert.equal(page.calls.filter(call=>call.body.action==='enroll').length,1);assert.equal(checkoutCalls,2);assert.deepEqual(page.navigations,['https://checkout.stripe.com/c/pay-fixture']);
});
test('changed enrollment selections receive a new key while an uncertain identical attempt reuses its key',async()=>{
 const page=await browser(body=>body.action==='enroll'?Response.json({error:'unavailable'},{status:503}):undefined);
 page.node('billing-consent').checked=true;
 page.node('billing-enroll-form').emit('submit');await settle();page.node('billing-enroll-form').emit('submit');await settle();
 page.node('billing-plan').value='pro';page.node('billing-enroll-form').emit('submit');await settle();
 const enrollments=page.calls.filter(call=>call.body.action==='enroll');assert.equal(enrollments.length,3);assert.equal(enrollments[0].headers['Idempotency-Key'],enrollments[1].headers['Idempotency-Key']);assert.notEqual(enrollments[1].headers['Idempotency-Key'],enrollments[2].headers['Idempotency-Key']);assert.equal(enrollments[2].body.input.plan,'pro');
});
test('a changed Clerk session clears stale billing details and blocks further account operations',async()=>{
 const page=await browser();page.node('billing-password').value='private-fixture';page.node('billing-mfa').value='123456';page.clerk.session={id:'sess_second',getToken:async()=> 'other-token'};page.sessionChanged(page.clerk.session);
 assert.equal(page.node('billing-password').value,'');assert.equal(page.node('billing-mfa').value,'');assert.equal(page.node('billing-account').hidden,true);assert.equal(page.node('billing-sign-in').hidden,false);assert.equal(page.node('billing-subscriptions').children.length,0);
 const count=page.calls.length;page.node('billing-refresh').emit('click');await settle();assert.equal(page.calls.length,count);assert.match(page.node('billing-message').textContent,/sign-in changed/);
});
