'use strict';
fetch('/api/subscription-status',{headers:{Accept:'application/json'},cache:'no-store'})
  .then(response=>{if(!response.ok)throw new Error('unavailable');return response.json();})
  .then(status=>{
    const node=document.getElementById('california-subscription-status');
    // Test availability is deliberately never advertised as a paid live offer.
    node.textContent=status.market==='US-CA' && status.environment==='production' && status.available===true && status.frameworkDeployed===true
      ?'California subscription availability is confirmed by the current production status check.'
      :'Paid enrollment remains unavailable while the California release checks are completed.';
  })
  .catch(()=>{document.getElementById('california-subscription-status').textContent='Subscription status is temporarily unavailable. Please check again later.';});
