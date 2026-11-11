'use strict';
(() => {
 const node=id=>document.getElementById(id),message=node('billing-message');
 let clerk,account=null,busy=false,enrollmentAttempt=null,sessionId=null;
 const stateNames={requested:'Enrollment started',checkout_created:'Checkout started',checkout_expired:'Checkout expired',payment_pending:'Payment confirmation pending',paid:'Paid · onboarding pending',active:'Onboarding active',past_due:'Payment needs attention',canceled:'Canceled',refunded:'Refunded',disputed:'Payment under review',market_hold:'Regional eligibility needs review',payment_review:'Payment verification needs review'};
 function tell(text){message.textContent=text;}
 function clearAccount(){
  account=null;
  for(const id of ['billing-connect','billing-disconnect','billing-start','billing-subscriptions-section'])node(id).hidden=true;
  node('billing-subscriptions').replaceChildren();node('billing-workspace').replaceChildren();
  node('billing-terms').removeAttribute('href');node('billing-privacy').removeAttribute('href');
  node('billing-password').value='';node('billing-mfa').value='';
  node('billing-disconnect-confirm').checked=false;
 }
 function currentSession(){if(!sessionId||clerk.session?.id!==sessionId)throw Error('Your sign-in changed. Reload this page to continue.');}
 async function request(action,input={}){
  currentSession();
  const token=await clerk.session?.getToken();if(!token)throw Error('Please sign in again.');
  currentSession();
  const headers={'Content-Type':'application/json',Authorization:`Bearer ${token}`,'X-Ad-Astra-Request':'public-v1'};
  if(action==='enroll')headers['Idempotency-Key']=enrollmentAttempt.key;
  const response=await fetch('/api/subscriptions',{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(28000),headers,body:JSON.stringify({action,input})});
  const body=await response.json();
  currentSession();
  if(!response.ok)throw Error(response.status===401?'Verification failed. Check your sign-in and billing details, including an authenticator code if enabled.':response.status===409?'This subscription or account connection needs review. Refresh its status before trying again.':response.status===429?'Too many attempts. Wait a few minutes before trying again.':'Billing is temporarily unavailable or awaiting release checks. Please try again later.');
  return body;
 }
 function navigate(value,host){const url=new URL(value);if(url.protocol!=='https:'||url.hostname!==host||url.port||url.username||url.password)throw Error('Secure billing could not be opened.');location.assign(url.href);}
 function button(label,action){const element=document.createElement('button');element.type='button';element.className='button alt';element.textContent=label;element.addEventListener('click',()=>operate(action));return element;}
 async function operate(action){
  if(busy)return;busy=true;node('billing-account').setAttribute('aria-busy','true');
  const disabled=new Map();document.querySelectorAll('#billing-account button, #billing-account input, #billing-account select').forEach(control=>{disabled.set(control,control.disabled);control.disabled=true;});
  try{await action();}catch(error){tell(error.message||'Billing is temporarily unavailable.');}
  finally{busy=false;node('billing-account').removeAttribute('aria-busy');document.querySelectorAll('#billing-account button, #billing-account input, #billing-account select').forEach(control=>{control.disabled=disabled.get(control)??false;});node('billing-disconnect-button').disabled=!node('billing-disconnect-confirm').checked;node('billing-password').value='';node('billing-mfa').value='';}
 }
 async function refresh(){
  const selectedWorkspace=node('billing-workspace').value;
  clearAccount();node('billing-access').textContent='Checking your current billing access…';node('billing-enrollment').textContent='';
  account=await request('account');node('billing-account').hidden=false;
  node('billing-access').textContent=account.accessCurrent?'Your paid product access is current.':account.linked?'Your billing account is connected. Current paid product access has not been verified.':'No billing account is connected to this sign-in.';
  node('billing-enrollment').textContent=account.checkoutEnabled?'California enrollment is available. Review the recurring price and terms at checkout.':'New paid California enrollment is awaiting release checks. Existing billing management remains separate from new sales.';
  node('billing-connect').hidden=account.linked||!account.linkingEnabled;
  node('billing-disconnect').hidden=!account.linked;
  node('billing-start').hidden=!account.linked||!account.checkoutEnabled||!account.workspaces.length;
  if(account.termsUrl)node('billing-terms').href=account.termsUrl;if(account.privacyUrl)node('billing-privacy').href=account.privacyUrl;
  node('billing-subscriptions-section').hidden=!account.linked;
  const list=node('billing-subscriptions');list.replaceChildren();
  if(!account.subscriptions.length){const empty=document.createElement('p');empty.textContent='No subscriptions were found for your current workspace memberships.';list.append(empty);}
  for(const subscription of account.subscriptions){
   const row=document.createElement('article');row.className='subscription-row';
   const heading=document.createElement('h3');heading.textContent=(subscription.plan==='pro'?'Pro':'Starter')+' · '+(account.workspaces.find(workspace=>workspace.tenantId===subscription.tenantId)?.name||'Workspace');
   const status=document.createElement('p');status.textContent=stateNames[subscription.state]||'Status unavailable';row.append(heading,status);
   if(subscription.paidThrough){const date=document.createElement('p');date.textContent='Payment period ends '+new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(subscription.paidThrough))+'.';row.append(date);}
   if(subscription.canManageBilling)row.append(button('Manage cancellation',async()=>{const result=await request('portal',{workflowId:subscription.workflowId});navigate(result.url,'billing.stripe.com');}));
   if(account.checkoutEnabled&&['requested','checkout_created'].includes(subscription.state))row.append(button('Continue checkout',async()=>{const result=await request('checkout',{workflowId:subscription.workflowId});navigate(result.url,'checkout.stripe.com');}));
   if(subscription.state==='paid')row.append(button('Continue onboarding',async()=>{await request('activate',{workflowId:subscription.workflowId});await refresh();}));
   list.append(row);
  }
  const select=node('billing-workspace');select.replaceChildren();for(const workspace of account.workspaces){const option=document.createElement('option');option.value=workspace.tenantId;option.textContent=workspace.name;select.append(option);}if(account.workspaces.some(workspace=>workspace.tenantId===selectedWorkspace))select.value=selectedWorkspace;
  tell(account.linked?'Your billing status is up to date.':account.linkingEnabled?'Connect your existing billing account to continue.':'Account connections are awaiting release checks. New billing account setup is not available yet.');
 }
 node('billing-refresh').addEventListener('click',()=>operate(refresh));
 node('billing-connect-form').addEventListener('submit',event=>{event.preventDefault();const input={email:node('billing-email').value.trim(),password:node('billing-password').value};if(node('billing-mfa').value)input.mfaCode=node('billing-mfa').value;operate(async()=>{await request('link',input);await refresh();});});
 node('billing-enroll-form').addEventListener('submit',event=>{event.preventDefault();if(busy||!account?.checkoutEnabled||!account.consentVersion||!node('billing-consent').checked)return;
  const input={tenantId:node('billing-workspace').value,plan:node('billing-plan').value,market:'US-CA',consent:true,consentVersion:account.consentVersion,channel:'direct'};
  const fingerprint=JSON.stringify(input);
  if(enrollmentAttempt?.fingerprint!==fingerprint)enrollmentAttempt={fingerprint,key:crypto.randomUUID(),workflowId:null};
  operate(async()=>{
   try{
    if(!enrollmentAttempt.workflowId){const enrolled=await request('enroll',input);enrollmentAttempt.workflowId=enrolled.workflowId;}
    const checkout=await request('checkout',{workflowId:enrollmentAttempt.workflowId});navigate(checkout.url,'checkout.stripe.com');
   }catch(error){await refresh().catch(()=>{});throw error;}
  });});
 node('billing-disconnect-confirm').addEventListener('change',()=>{node('billing-disconnect-button').disabled=busy||!node('billing-disconnect-confirm').checked;});
 node('billing-disconnect-button').addEventListener('click',()=>{if(!node('billing-disconnect-confirm').checked)return;operate(async()=>{await request('unlink',{confirm:true});node('billing-disconnect-confirm').checked=false;await refresh();});});
 node('billing-sign-out').addEventListener('click',()=>operate(async()=>{await clerk.signOut();location.replace('/sign-in/?return=%2Faccount%2Fbilling%2F');}));
 (async()=>{try{clerk=window.Clerk;if(!clerk)throw Error('Secure sign-in could not load. Please try again later.');await clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}});
  if(!clerk.session){tell('Sign in to view your billing account.');node('billing-sign-in').hidden=false;return;}
  sessionId=clerk.session.id;
  clerk.addListener?.(({session})=>{if(session?.id!==sessionId){clearAccount();enrollmentAttempt=null;node('billing-account').hidden=true;node('billing-sign-in').hidden=false;tell('Your sign-in changed. Reload this page to continue.');}});
  await operate(refresh);
 }catch(error){tell(error.message||'Your billing account could not load. Please try again later.');}})();
})();
