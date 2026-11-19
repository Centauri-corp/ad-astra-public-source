'use strict';
(function(root,factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.AdAstraWorkspaceClient = value;
})(typeof window === 'object' ? window : globalThis,function() {
  const PROTOCOL = 'ad-astra-customer-workspace/v1';
  function createClient({getToken,getIdentity,fetchImpl=fetch,uuid=()=>crypto.randomUUID()}) {
    let pending = null,epoch = 0;
    async function send(body,key) {
      const identity = getIdentity();
      if (!identity) throw Error('authentication_required');
      const started = epoch;
      const token = await getToken();
      if (!token || getIdentity() !== identity || started !== epoch) throw Error('authentication_changed');
      const headers = {'Content-Type':'application/json','X-Ad-Astra-Request':'public-v1',Authorization:'Bearer ' + token};
      if (key) headers['Idempotency-Key'] = key;
      const response = await fetchImpl('/api/workspace',{method:'POST',credentials:'same-origin',cache:'no-store',
        signal:AbortSignal.timeout(body.action==='run'?58000:18000),headers,body:JSON.stringify(body)});
      const data = await response.json();
      if (getIdentity() !== identity || started !== epoch) throw Error('authentication_changed');
      if (!response.ok) {
        const error = Error(typeof data.error === 'string' ? data.error : 'workspace_unavailable');
        error.requestId = typeof data.transportRequestId === 'string' ? data.transportRequestId : '';
        throw error;
      }
      if (data.protocol !== PROTOCOL || !['production','development'].includes(data.environment) || data.market !== 'US-CA' || typeof data.canExecute !== 'boolean') throw Error('workspace_unavailable');
      if (key && pending && pending.key === key && pending.identity === identity && ['completed','failed'].includes(data.status)) pending = null;
      return data;
    }
    async function request(body) {
      if (body.action === 'recover') throw Error('invalid_workspace_request');
      if (body.action !== 'run') return send(body);
      const identity = getIdentity();
      if (!identity) throw Error('authentication_required');
      // Retain the original payload, including the absent/new session choice.
      // Rendering an accepted session must not change a later recovery's hash.
      const fingerprint = JSON.stringify(body);
      if (!pending || pending.identity !== identity || pending.fingerprint !== fingerprint) pending = {identity,fingerprint,key:uuid(),body:JSON.parse(fingerprint)};
      return send(pending.body,pending.key);
    }
    function hasPending() {return Boolean(pending && pending.identity === getIdentity());}
    async function recover() {
      if (!hasPending()) throw Error('workspace_not_found');
      return send({...pending.body,action:'recover'},pending.key);
    }
    return Object.freeze({request,recover,hasPending,reset(){pending=null;++epoch;}});
  }
  return Object.freeze({createClient,PROTOCOL});
});

