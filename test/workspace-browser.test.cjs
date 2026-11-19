'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync(require.resolve('../public/workspace/index.html'),'utf8');
const clientSource=fs.readFileSync(require.resolve('../public/workspace/client.js'),'utf8');
const appSource=fs.readFileSync(require.resolve('../public/workspace/app.js'),'utf8');
const protocol='ad-astra-customer-workspace/v1',stamp='2026-11-19T12:00:00.000Z';
const clone=value=>JSON.parse(JSON.stringify(value));
async function settle(){for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));}
async function browser({canExecute=true,intercept,signedIn=true,search='',verifySession=async()=>{}}={}){
 let sequence=0,keySequence=0,listener,finishSignOut;
 const uuid=()=> '00000000-0000-4000-8000-'+String(++sequence).padStart(12,'0');
 const nodes=new Map(),all=[],downloads=[];
 class Element{
  constructor(id='',tagName='DIV'){this.id=id;this.tagName=tagName;this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.ownText='';this.children=[];this.handlers={};this.attributes={};this.className='';this.parent=null;all.push(this);}
  get textContent(){return this.ownText+this.children.map(child=>child.textContent||'').join('');}
  set textContent(value){this.ownText=String(value);this.children=[];}
  set innerHTML(value){throw Error('Workspace rendered untrusted HTML: '+value);}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(event,handler){(this.handlers[event]??=[]).push(handler);}
  append(...children){this.children.push(...children);for(const child of children)child.parent=this;}
  replaceChildren(...children){this.children=[];this.ownText='';this.append(...children);}
  emit(event){const results=(this.handlers[event]||[]).map(handler=>handler({preventDefault(){}}));return Promise.all(results);}
  focus(){document.activeElement=this;}
  click(){return this.emit('click');}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
 }
 for(const match of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)){const element=new Element(match[1]);element.hidden=/\bhidden(?:\s|>)/.test(match[0]);element.disabled=/\bdisabled(?:\s|>)/.test(match[0]);const href=match[0].match(/\bhref="([^"]*)"/);if(href)element.href=href[1];nodes.set(match[1],element);}
 const node=id=>{if(!nodes.has(id))throw Error('Missing HTML element: '+id);return nodes.get(id);};
 const radios=['day','learn','career'].map(value=>{const element=new Element('', 'INPUT');element.value=value;element.checked=value==='day';return element;});
 const connected=()=>{const result=[];function walk(element){result.push(element);element.children.forEach(walk);}for(const value of nodes.values())walk(value);return result;};
 const document={getElementById:node,createElement:tag=>new Element('',tag.toUpperCase()),body:new Element('body','BODY'),querySelectorAll:selector=>selector==='input[name="productId"]'?radios:selector==='.session-button'?connected().filter(element=>element.className==='session-button'):[]};
 node('amount').value='25';
 const initialUrl=new URL(search,'https://adastra.global/workspace/');
 const location={href:initialUrl.href,search:initialUrl.search};
 const history={replaceState(_state,_title,url){location.href=new URL(url,location.href).href;location.search=new URL(location.href).search;}};
 class BrowserURL extends URL{static createObjectURL(blob){downloads.push(blob);return 'blob:synthetic-download';}static revokeObjectURL(){}}
 const clerk={session:signedIn?{id:'session-A',getToken:async()=> 'synthetic-A'}:null,user:signedIn?{id:'user-A'}:null,load:async()=>{},addListener(fn){listener=fn;},signOut:()=>new Promise(resolve=>{finishSignOut=()=>{clerk.session=null;clerk.user=null;listener?.();resolve();};})};
 const state={canExecute,sessions:[],requests:new Map(),calls:[],runCount:0},common=()=>({protocol,environment:'production',market:'US-CA',canExecute:state.canExecute,releaseId:'synthetic-dom-fixture'});
 const pageOf=(session,before)=>{const stop=before?session.turns.findIndex(turn=>turn.requestId===before):session.turns.length;const start=Math.max(0,stop-10);return {...clone(session),turns:clone(session.turns.slice(start,stop)),nextCursor:start>0?session.turns[start].requestId:null};};
 const makeTurn=(body)=>({requestId:uuid(),status:'completed',input:clone(body.input),result:{app:body.productId,title:'Synthetic '+body.productId+' plan',metric:'A bounded plan',items:['A useful first step'],notice:'Synthetic fixture'},answer:'Treat <img src=x onerror=alert(1)> as plain text.',citations:[{title:'NASA reference',url:'https://www.nasa.gov/',sourceVersionId:uuid()}],usage:{state:'reconciled',reservedCents:2,actualCents:1},createdAt:stamp});
 async function respond(body,init){
  if(body.action==='status')return Response.json(common());
  if(body.action==='list')return Response.json({...common(),sessions:state.sessions.map(({id,productId,title,updatedAt})=>({id,productId,title,updatedAt}))});
  if(body.action==='get'){const session=state.sessions.find(session=>session.id===body.sessionId);return session?Response.json({...common(),session:pageOf(session,body.before)}):Response.json({error:'workspace_not_found'},{status:404});}
  const key=init.headers['Idempotency-Key'],{action,...payload}=body;
  if(body.action==='recover'){
   const accepted=state.requests.get(key);if(!accepted)return Response.json({error:'workspace_not_found'},{status:404});
   if(JSON.stringify(payload)!==accepted.fingerprint)return Response.json({error:'idempotency_conflict'},{status:409});
   return Response.json({...common(),session:pageOf(accepted.session),requestId:accepted.turn.requestId,status:accepted.turn.status},{status:accepted.turn.status==='pending'?202:200});
  }
  assert.equal(body.action,'run');
  if(!state.canExecute)return Response.json({error:'release_not_ready'},{status:503});
  state.runCount++;
  let session=body.sessionId?state.sessions.find(session=>session.id===body.sessionId):null;
  if(!session){session={id:uuid(),productId:body.productId,title:'Saved '+body.productId+' '+state.runCount,updatedAt:stamp,nextCursor:null,turns:[]};state.sessions.unshift(session);}
  const turn=makeTurn(body);session.turns.push(turn);state.requests.set(key,{session,turn,fingerprint:JSON.stringify(payload)});
  return Response.json({...common(),session:pageOf(session),requestId:turn.requestId,status:'completed'});
 }
 const context={document,window:{Clerk:clerk,adAstraVerifySession:verifySession},location,history,URL:BrowserURL,URLSearchParams,AbortSignal,Blob,Intl,setTimeout,crypto:{randomUUID:()=> 'request-key-'+(++keySequence)},fetch:async(url,init)=>{assert.equal(url,'/api/workspace');const body=JSON.parse(init.body);state.calls.push({body,init});return intercept?intercept(body,init,respond,state):respond(body,init);}};
 vm.runInNewContext(clientSource,context);vm.runInNewContext(appSource,context);await settle();
 return {node,radios,document,state,clerk,location,downloads,makeTurn,respond,sessionButtons:()=>document.querySelectorAll('.session-button'),finishSignOut:()=>finishSignOut?.(),changeAccount(){clerk.session={id:'session-B',getToken:async()=> 'synthetic-B'};clerk.user={id:'user-B'};listener?.();}};
}
async function run(page,product,goal,amount){
 await page.radios.find(radio=>radio.value===product).emit('change');
 page.node('goal').value=goal;page.node('amount').value=String(amount);page.node('question').value='A useful context';
 await page.node('workspace-form').emit('submit');await settle();
}
test('Life deep links retain an allowlisted journey across sign-in without authorizing execution',async()=>{
 for(const product of ['day','learn','career']){
  let verifications=0;
  const page=await browser({signedIn:false,search:'?product='+product,verifySession:async()=>{verifications++;}});
  assert.equal(page.radios.find(radio=>radio.checked).value,product);
  const signIn=new URL(page.node('sign-in-link').href,page.location.href);
  assert.equal(signIn.origin,'https://adastra.global');assert.equal(signIn.pathname,'/sign-in/');
  assert.equal(signIn.searchParams.get('return'),'/workspace/?product='+product);
  assert.equal(page.node('workspace').hidden,true);assert.equal(page.node('run').disabled,true);
  assert.equal(verifications,0);assert.equal(page.state.calls.length,0);
 }
});
test('unrecognized and inherited product names preserve the default journey and safe return target',async()=>{
 for(const product of ['unknown','constructor','__proto__','https://other.example/']){
  const page=await browser({signedIn:false,search:'?product='+encodeURIComponent(product)+'&return=https://other.example/'});
  assert.equal(page.radios.find(radio=>radio.checked).value,'day');
  const signIn=new URL(page.node('sign-in-link').href,page.location.href);
  assert.equal(signIn.origin,'https://adastra.global');assert.equal(signIn.pathname,'/sign-in/');
  assert.equal(signIn.searchParams.get('return'),'/workspace/');
  assert.equal(page.node('workspace').hidden,true);assert.equal(page.state.calls.length,0);
 }
});
test('a product deep link waits for session verification before requesting workspace data',async()=>{
 let finishVerification,verifications=0;
 const page=await browser({search:'?product=learn',verifySession:async()=>{verifications++;await new Promise(resolve=>{finishVerification=resolve;});}});
 assert.equal(verifications,1);assert.equal(typeof finishVerification,'function');
 assert.equal(page.node('workspace').hidden,true);assert.equal(page.node('run').disabled,true);assert.equal(page.state.calls.length,0);
 finishVerification();await settle();
 assert.equal(page.node('workspace').hidden,false);assert.equal(page.radios.find(radio=>radio.checked).value,'learn');
 assert.deepEqual(page.state.calls.map(call=>call.body.action),['status','list']);
});
test('failed verification keeps a product deep link closed without requesting private data',async()=>{
 const page=await browser({search:'?product=career',verifySession:async()=>{throw Error('authentication_invalid');}});
 assert.equal(page.node('workspace').hidden,true);assert.equal(page.node('run').disabled,true);
 assert.equal(page.node('turns').children.length,0);assert.equal(page.state.calls.length,0);
 assert.match(page.node('auth-message').textContent,/could not be verified/);
});
test('verified product selection cannot bypass denied release or account execution',async()=>{
 const page=await browser({canExecute:false,search:'?product=career'});
 assert.equal(page.radios.find(radio=>radio.checked).value,'career');assert.equal(page.node('run').disabled,true);
 const reads=page.state.calls.length;
 page.node('goal').value='A permitted input cannot override access';page.node('amount').value='8';
 await page.node('workspace-form').emit('submit');await settle();
 assert.equal(page.state.calls.length,reads);assert.equal(page.state.runCount,0);
});
test('one workspace submits all three journeys and reopens the exact saved product and inputs',async()=>{
 const page=await browser();
 assert.equal(page.node('workspace').hidden,false);assert.equal(page.node('run').disabled,false);
 for(const [product,goal,amount]of [['day','A useful day',25],['learn','Orbital mechanics',4],['career','Systems engineer',8]]){
  await run(page,product,goal,amount);
  assert.equal(page.state.sessions[0].productId,product);assert.match(page.node('request-status').textContent,/are saved/);
  assert.match(page.node('turns').textContent,/<img src=x onerror=alert\(1\)>/);
 }
 assert.equal(page.state.runCount,3);assert.equal(page.sessionButtons().length,3);
 const day=page.state.sessions.find(session=>session.productId==='day');
 await page.sessionButtons().find(button=>button.textContent.startsWith(day.title)).emit('click');await settle();
 assert.equal(page.node('goal').value,'A useful day');assert.equal(page.node('amount').value,'25');assert.equal(page.radios.find(r=>r.checked).value,'day');
 assert.equal(new URL(page.location.href).searchParams.get('session'),day.id);
});
test('older results load without duplication and export includes the loaded history',async()=>{
 const page=await browser();await run(page,'day','A useful day',25);
 const session=page.state.sessions[0];while(session.turns.length<14)session.turns.push(page.makeTurn({productId:'day',input:{goal:'A useful day',minutes:25}}));
 await page.node('refresh-session').emit('click');await settle();assert.equal(page.node('turns').children.length,10);assert.equal(page.node('load-older').hidden,false);
 await page.node('load-older').emit('click');await settle();assert.equal(page.node('turns').children.length,14);assert.equal(page.node('load-older').hidden,true);
 await page.node('export-result').emit('click');assert.equal(page.downloads.length,1);
 const downloaded=await page.downloads[0].text();assert.equal((downloaded.match(/Request:/g)||[]).length,14);assert.match(downloaded,/All currently loaded/);
});
test('uncertain submission recovers during a hold with the original key and payload, without another run',async()=>{
 let lose=true;const page=await browser({intercept:async(body,init,respond)=>{const result=await respond(body,init);if(body.action==='run'&&lose){lose=false;throw Error('connection_lost');}return result;}});
 await run(page,'day','Recover the accepted result',20);
 assert.equal(page.node('recover-request').hidden,false);assert.equal(page.state.runCount,1);
 page.state.canExecute=false;await page.node('refresh-history').emit('click');await settle();assert.equal(page.node('run').disabled,true);
 await page.node('recover-request').emit('click');await settle();
 assert.equal(page.state.runCount,1);assert.equal(page.node('run').disabled,true);assert.equal(page.node('results').hidden,false);assert.match(page.node('request-status').textContent,/saved outcome is shown/);
 const original=page.state.calls.find(call=>call.body.action==='run'),recovery=page.state.calls.find(call=>call.body.action==='recover');
 assert.deepEqual({...original.body,action:'recover'},recovery.body);assert.equal(original.init.headers['Idempotency-Key'],recovery.init.headers['Idempotency-Key']);assert.equal(page.node('recover-request').hidden,true);
});
test('a pending run locks mutable inputs and a returned pending outcome remains explicitly pending',async()=>{
 let release;const page=await browser({intercept:async(body,init,respond)=>{
  if(body.action!=='run')return respond(body,init);
  await new Promise(resolve=>{release=resolve;});
  const data=await (await respond(body,init)).json();data.status='pending';data.session.turns[0].status='pending';data.session.turns[0].answer='';data.session.turns[0].usage={state:'pending',reservedCents:2,actualCents:null};
  return Response.json(data,{status:202});
 }});
 page.node('goal').value='Wait for saved result';page.node('amount').value='25';const operation=page.node('workspace-form').emit('submit');await settle();
 assert.equal(page.node('goal').disabled,true);assert.equal(page.node('question').disabled,true);assert.equal(page.node('new-session').disabled,true);assert.ok(page.radios.every(r=>r.disabled));
 release();await operation;await settle();
 assert.equal(page.node('goal').disabled,false);assert.match(page.node('request-status').textContent,/accepted and still pending/);assert.match(page.node('turns').textContent,/still being processed or reconciled/);assert.equal(page.node('recover-request').hidden,false);assert.equal(page.node('export-result').disabled,true);
});
test('signout clears private results immediately and a late read cannot restore them before Clerk completes',async()=>{
 let defer=false,release;const page=await browser({intercept:async(body,init,respond)=>{if(body.action==='get'&&defer){defer=false;await new Promise(resolve=>{release=resolve;});}return respond(body,init);}});
 await run(page,'day','Private result',25);defer=true;
 page.node('refresh-session').emit('click');await settle();assert.equal(typeof release,'function');
 const signingOut=page.node('sign-out').emit('click');assert.equal(page.node('workspace').hidden,true);assert.equal(page.node('turns').children.length,0);assert.equal(page.node('session-list').children.length,0);
 release();await settle();assert.equal(page.node('workspace').hidden,true);assert.equal(page.node('turns').children.length,0);
 page.finishSignOut();await signingOut;assert.match(page.node('auth-message').textContent,/signed out/);
});
test('anonymous entry and account changes cannot expose another account\'s saved work',async()=>{
 const anonymous=await browser({signedIn:false});assert.equal(anonymous.node('workspace').hidden,true);assert.equal(anonymous.state.calls.length,0);
 const page=await browser();await run(page,'learn','Private learning plan',4);
 page.changeAccount();assert.equal(page.node('workspace').hidden,true);assert.equal(page.node('turns').children.length,0);assert.equal(page.node('session-list').children.length,0);assert.equal(page.node('goal').value,'');assert.equal(page.node('question').value,'');
 const count=page.state.calls.length;await page.node('workspace-form').emit('submit');assert.equal(page.state.calls.length,count);assert.match(page.node('auth-message').textContent,/account changed/);
});
test('a slower saved-session refresh cannot replace a newly selected plan',async()=>{
 let defer=false,release;const page=await browser({intercept:async(body,init,respond)=>{if(body.action==='get'&&defer){defer=false;await new Promise(resolve=>{release=resolve;});}return respond(body,init);}});
 await run(page,'day','Previous plan',25);defer=true;page.node('refresh-session').emit('click');await settle();
 await page.node('new-session').emit('click');page.node('goal').value='New unsaved plan';release();await settle();
 assert.equal(page.node('goal').value,'New unsaved plan');assert.equal(page.node('results').hidden,true);
});

