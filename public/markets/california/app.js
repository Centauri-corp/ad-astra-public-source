'use strict';
fetch('/api/subscription-status',{headers:{Accept:'application/json'},cache:'no-store'})
  .then(response=>{if(!response.ok)throw new Error('unavailable');return response.json();})
  .then(status=>{
    const node=document.getElementById('california-subscription-status');
    // Test availability is deliberately never advertised as a paid live offer.
    node.textContent=status.environment==='production' && status.available
      ?'California subscriptions have passed the production release requirements.'
      :'The California subscription framework is deployed. Paid enrollment is awaiting final release checks.';
  })
  .catch(()=>{document.getElementById('california-subscription-status').textContent='Subscription status is temporarily unavailable. Please check again later.';});
