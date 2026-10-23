'use strict';
(async()=>{
  let available=false,message='The live engine is paused while release checks are completed.';
  try {
    const response=await fetch('/api/status',{cache:'no-store',signal:AbortSignal.timeout(5000)});
    const data=await response.json();
    if(response.ok&&data.available===true){available=true;message='';}
  } catch {}
  document.querySelectorAll('[data-engine-status]').forEach(el=>{el.textContent=message;});
  const submit=document.getElementById('live-ai-submit');
  if(submit){submit.disabled=!available;submit.dataset.available=String(available);}
})();
