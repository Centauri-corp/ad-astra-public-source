'use strict';
(() => {
  const $ = id=>document.getElementById(id);
  const definitions = {
    day:{name:'DayFlow',label:'What is your goal today?',field:'goal',amount:'Minutes available',number:'minutes',max:1440,initial:25},
    learn:{name:'LearnPath',label:'What would you like to learn?',field:'subject',amount:'Hours per week',number:'hours',max:168,initial:6},
    career:{name:'CareerStep',label:'What role or skill are you preparing for?',field:'role',amount:'Weeks to prepare',number:'weeks',max:520,initial:8}
  };
  const radios = [...document.querySelectorAll('input[name="productId"]')];
  let clerk,client,currentSession=null,canExecute=false,busy=false,selected='day',navigation=0,signedIdentity='';
  const identity = ()=>clerk && clerk.session && clerk.user ? clerk.session.id + ':' + clerk.user.id : '';
  function node(tag,value,className) {const element=document.createElement(tag);if(value!==undefined)element.textContent=value;if(className)element.className=className;return element;}
  function message(error) {
    const messages = {
      authentication_required:'Please sign in again to continue.',
      authentication_invalid:'Your session could not be verified. Please sign in again.',
      authentication_changed:'Your account changed. Reload the workspace before continuing.',
      customer_access_required:'Execution is not available for this account and release. Saved work can still be viewed when authorized.',
      subscription_required:'A current subscription and approved product access are required.',
      release_not_ready:'Customer execution is paused while release checks are completed.',
      rate_limit_reached:'The request limit has been reached. Please try again later.',
      request_limit_reached:'The request limit has been reached. Please try again later.',
      daily_capacity_reached:'Today’s request capacity has been reached. Please try again later.',
      budget_exhausted:'The approved usage allowance has been reached.',
      request_conflict:'This request does not match its saved retry. Refresh your saved work before trying again.',
      idempotency_conflict:'This request does not match its saved retry. Refresh your saved work before trying again.',
      not_found:'That saved session is not available to this account.',
      workspace_not_found:'That saved request or session is not available to this account.',
      result_reconciliation_required:'The request needs reconciliation. Check last request or refresh saved work for its retained outcome before submitting again.',
      customer_execution_failed:'The attempt could not complete. Check last request for its saved status; the same attempt will not run again.',
      invalid_workspace_request:'Please check the journey inputs and try again.'
    };
    const text=messages[error.message] || 'The workspace could not confirm the result. Refresh saved work, or retry the same inputs; the same request identity will be used.';
    return text + (error.requestId ? ' Reference: ' + error.requestId : '');
  }
  function controls() {
    $('run').disabled = busy || !canExecute;
    $('refresh-history').disabled = busy;
    $('refresh-session').disabled = busy;
    $('new-session').disabled = busy;
    $('load-older').disabled = busy;
    $('recover-request').disabled = busy;
    $('recover-request').hidden = !client || !client.hasPending();
    for (const radio of radios) radio.disabled=busy;
    $('goal').disabled=busy; $('amount').disabled=busy; $('question').disabled=busy;
    document.querySelectorAll('.session-button').forEach(button=>{button.disabled=busy;});
  }
  function execution(value) {
    canExecute=value.canExecute===true;
    $('access-status').textContent=canExecute
      ? 'Your account can use the included Life journeys. Plans and AI responses are saved with your session.'
      : 'Customer execution is paused or unavailable for this account. You can check authorized saved work and manage your account.';
    $('environment-note').hidden=value.environment!=='development';
    controls();
  }
  function choose(product,reset=true) {
    if (!Object.hasOwn(definitions,product)) return;
    selected=product;const def=definitions[product];
    radios.forEach(radio=>{radio.checked=radio.value===product;});
    $('goal-label').textContent=def.label;$('amount-label').textContent=def.amount;$('amount').max=String(def.max);
    if (reset) {$('goal').value='';$('amount').value=String(def.initial);$('question').value='';}
  }
  function clearPrivateView() {
    ++navigation;
    currentSession=null;canExecute=false;busy=false;
    if(client)client.reset();
    $('turns').replaceChildren();$('session-list').replaceChildren();
    $('goal').value='';$('question').value='';
    $('workspace').hidden=true;$('results').hidden=true;$('sign-out').hidden=true;
    $('auth-state').hidden=false;
    controls();
  }
  function linkToSession(id) {
    const url=new URL(location.href);
    if(id)url.searchParams.set('session',id);else url.searchParams.delete('session');
    history.replaceState(null,'',url.pathname+url.search);
  }
  async function loadHistory() {
    $('history-status').textContent='Loading saved work…';
    const data=await client.request({action:'list'});
    execution(data);
    const items=data.sessions.map(session=>{
      const item=node('li'),button=node('button',session.title,'session-button');
      button.type='button';button.setAttribute('aria-current',String(currentSession && currentSession.id===session.id));
      const description=definitions[session.productId].name+' · '+new Date(session.updatedAt).toLocaleString();
      button.append(node('small',description));
      button.addEventListener('click',()=>{if(!busy)loadSession(session.id).catch(error=>{$('request-status').textContent=message(error);});});
      item.append(button);return item;
    });
    $('session-list').replaceChildren(...items);
    $('history-status').textContent=items.length ? 'Select a session to return to its saved results.' : 'No saved work yet.';
    controls();
  }
  function renderTurn(turn) {
    const article=node('article',undefined,'saved-turn');
    article.append(node('p',new Date(turn.createdAt).toLocaleString(),'meta'));
    if(turn.status==='pending')article.append(node('p','This request is still being processed or reconciled. Refresh this plan to check its saved outcome.','turn-pending'));
    if(turn.status==='failed')article.append(node('p','This attempt did not complete. Earlier saved work remains available.','turn-pending'));
    if(turn.result) {
      article.append(node('h3',turn.result.title),node('p',turn.result.metric,'meta'));
      const steps=node('ol');turn.result.items.forEach(text=>steps.append(node('li',text)));article.append(steps);
    }
    if(turn.answer)article.append(node('p',turn.answer,'answer'));
    if(turn.citations.length) {
      article.append(node('h3','Sources'));
      const sources=node('ul',undefined,'citations');
      turn.citations.forEach(source=>{
        const item=node('li'),anchor=node('a',source.title);
        anchor.href=source.url;anchor.target='_blank';anchor.rel='noopener noreferrer';
        item.append(anchor);sources.append(item);
      });
      article.append(sources);
    }
    if(turn.result && turn.result.notice)article.append(node('p',turn.result.notice,'small'));
    const usage=turn.usage.state==='reconciled'
      ? 'Usage recorded. Provider cost: $'+(turn.usage.actualCents/100).toFixed(2)+'.'
      : 'Usage reconciliation: '+turn.usage.state+'. The reserved allowance remains held where required.';
    article.append(node('p',usage+' This is provider usage, not a customer invoice.','meta'));
    article.append(node('p','Request reference: '+turn.requestId,'meta'));
    return article;
  }
  function renderSession(session) {
    currentSession=session;choose(session.productId,false);linkToSession(session.id);
    $('results-title').textContent=session.title;
    $('turns').replaceChildren(...session.turns.map(renderTurn));
    $('results').hidden=false;$('refresh-session').hidden=false;
    $('export-result').disabled=!session.turns.some(turn=>turn.status==='completed');
    $('load-older').hidden=!session.nextCursor;
    const latest=session.turns[session.turns.length-1],def=definitions[session.productId];
    if(latest){$('goal').value=latest.input[def.field];$('amount').value=String(latest.input[def.number]);}
  }
  async function loadSession(id) {
    const ticket=++navigation;
    $('request-status').textContent='Opening saved work…';
    const data=await client.request({action:'get',sessionId:id});
    if(ticket!==navigation)return;
    execution(data);renderSession(data.session);$('question').value='';
    $('request-status').textContent='Saved work loaded.';
  }
  async function refreshCurrent() {
    if(!currentSession)return;
    const id=currentSession.id,ticket=navigation;
    const data=await client.request({action:'get',sessionId:id});
    if(ticket!==navigation || !currentSession || currentSession.id!==id)return;
    execution(data);renderSession(data.session);
    $('request-status').textContent=data.session.turns.some(turn=>turn.status==='pending')
      ? 'A request is still pending. Refresh again to check the saved outcome.'
      : 'Saved results are up to date.';
  }
  async function recoverLastRequest() {
    if(busy || !client.hasPending())return;
    busy=true;controls();$('request-status').textContent='Checking the saved outcome of your last request…';
    try {
      const data=await client.recover();
      execution(data);renderSession(data.session);
      $('request-status').textContent=data.status==='pending'
        ? 'The accepted request is still pending. This check did not create another attempt.'
        : 'The saved outcome is shown below. This check did not create another attempt.';
      try{await loadHistory();}catch{$('history-status').textContent='The result was retrieved; the session list could not refresh.';}
    } catch(error) {$('request-status').textContent=message(error);}
    finally {busy=false;controls();}
  }
  async function loadOlder() {
    if(!currentSession || !currentSession.nextCursor)return;
    const id=currentSession.id,before=currentSession.nextCursor,ticket=navigation;
    $('load-older').disabled=true;
    try {
      const data=await client.request({action:'get',sessionId:id,before});
      if(ticket!==navigation || !currentSession || currentSession.id!==id)return;
      if(data.session.nextCursor===before)throw Error('workspace_unavailable');
      execution(data);
      const existing=new Set(currentSession.turns.map(turn=>turn.requestId));
      const turns=data.session.turns.filter(turn=>!existing.has(turn.requestId)).concat(currentSession.turns);
      renderSession({...currentSession,turns,nextCursor:data.session.nextCursor});
      $('request-status').textContent='Older results loaded.';
    } finally {controls();}
  }
  function newSession() {
    ++navigation;currentSession=null;linkToSession(null);choose(selected);
    $('results').hidden=true;$('turns').replaceChildren();$('refresh-session').hidden=true;
    $('request-status').textContent='A new session will be saved when an authorized request is accepted.';
    $('goal').focus();
  }
  async function submit(event) {
    event.preventDefault();
    if(busy || !canExecute)return;
    const def=definitions[selected],label=$('goal').value.trim(),amount=Number($('amount').value);
    if(!label || label.length>160 || !Number.isFinite(amount) || amount<=0 || amount>def.max){$('request-status').textContent='Enter a goal and a positive amount within the displayed limit.';return;}
    const body={action:'run',productId:selected,input:{[def.field]:label,[def.number]:amount}};
    if(currentSession)body.sessionId=currentSession.id;
    const question=$('question').value.trim();if(question)body.question=question;
    busy=true;controls();$('request-status').textContent='Creating your plan and saving the result…';
    try {
      const data=await client.request(body);
      execution(data);renderSession(data.session);
      $('request-status').textContent=data.status==='completed'?'Your plan and response are saved.':data.status==='pending'
        ? 'The request is accepted and still pending. Use Refresh this plan to check its saved result.'
        : 'The attempt did not complete. Its status is saved.';
      // History refresh is a read. Its failure must not hide an accepted result.
      try{await loadHistory();}catch{$('history-status').textContent='The result is saved; the session list could not refresh.';}
    } catch(error) {$('request-status').textContent=message(error);}
    finally {busy=false;controls();}
  }
  function exportResult() {
    if(!currentSession)return;
    const lines=[currentSession.title,'Ad Astra Life / '+definitions[currentSession.productId].name,currentSession.nextCursor?'Loaded results only; more history is available in the workspace.':'All currently loaded results.',''];
    for(const turn of currentSession.turns) {
      lines.push(new Date(turn.createdAt).toISOString(),'Status: '+turn.status);
      if(turn.result)lines.push(turn.result.title,turn.result.metric,...turn.result.items.map((item,i)=>String(i+1)+'. '+item));
      if(turn.answer)lines.push('',turn.answer);
      turn.citations.forEach(source=>lines.push(source.title+' — '+source.url));
      lines.push('Request: '+turn.requestId,'');
    }
    const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));
    const anchor=node('a');anchor.href=url;anchor.download='ad-astra-'+currentSession.productId+'-'+currentSession.id+'.txt';
    document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function initialize() {
    // Only allow a known Life journey selection from the public landing page.
    // The query never supplies identity, entitlement, or permission to execute.
    const requestedProduct=new URLSearchParams(location.search).get('product');
    if(requestedProduct && Object.hasOwn(definitions,requestedProduct)) {
      choose(requestedProduct);
      // Keep the selected journey across the sign-in return, without trusting
      // an arbitrary redirect or letting the URL authorize any execution.
      $('sign-in-link').href='/sign-in/?return='+encodeURIComponent('/workspace/?product='+requestedProduct);
    }
    clerk=window.Clerk;
    if(!clerk)throw Error('authentication_unavailable');
    await clerk.load();
    if(!clerk.session){$('auth-message').textContent='Sign in to view your workspace and check product access.';return;}
    await window.adAstraVerifySession(clerk);
    signedIdentity=identity();
    client=window.AdAstraWorkspaceClient.createClient({getToken:()=>clerk.session && clerk.session.getToken(),getIdentity:identity});
    $('auth-state').hidden=true;$('workspace').hidden=false;$('sign-out').hidden=false;
    $('workspace-form').addEventListener('submit',submit);
    radios.forEach(radio=>radio.addEventListener('change',()=>{choose(radio.value);newSession();}));
    $('new-session').addEventListener('click',newSession);
    $('refresh-history').addEventListener('click',()=>loadHistory().catch(error=>{$('history-status').textContent=message(error);}));
    $('refresh-session').addEventListener('click',()=>refreshCurrent().catch(error=>{$('request-status').textContent=message(error);}));
    $('recover-request').addEventListener('click',recoverLastRequest);
    $('export-result').addEventListener('click',exportResult);
    $('load-older').addEventListener('click',()=>loadOlder().catch(error=>{$('request-status').textContent=message(error);}));
    $('sign-out').addEventListener('click',async()=>{
      clearPrivateView();$('auth-message').textContent='Signing out…';
      try{await clerk.signOut();$('auth-message').textContent='You are signed out.';}
      catch{$('auth-message').textContent='Sign-out could not be confirmed. Reload and check your account.';}
    });
    if(clerk.addListener)clerk.addListener(()=>{
      if(identity()!==signedIdentity){clearPrivateView();$('auth-message').textContent='Your account changed. Reload to continue securely.';}
    });
    // Independent read failures must not erase a legitimate direct link to a
    // saved plan. Each request still passes authenticated, tenant-bound API checks.
    try {
      execution(await client.request({action:'status'}));
    } catch(error) {
      canExecute=false;controls();$('access-status').textContent=message(error);
    }
    try {
      await loadHistory();
    } catch(error) {
      $('history-status').textContent='Saved work could not be listed: '+message(error);
    }
    const sessionId=new URLSearchParams(location.search).get('session');
    if(sessionId && /^[0-9a-f-]{36}$/i.test(sessionId)) {
      try {await loadSession(sessionId);}
      catch(error) {$('request-status').textContent=message(error);}
    }
  }
  initialize().catch(error=>{
    clearPrivateView();$('auth-message').textContent=message(error);
  });
})();

