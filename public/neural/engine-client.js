'use strict';
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AdAstraEngineClient=api;})(globalThis,()=>{
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 const order={idle:['accepted'],accepted:['requesting','failed'],requesting:['answer','failed'],answer:['completed'],completed:[],failed:[]};
 function reducer(requestId,now=Date.now){
  if(!uuid.test(requestId||''))throw Error('invalid_request_id');let state='idle',sequence=0,answer='';
  return {
   accept(event){
    if(!event||event.schema!=='ad-astra-engine-event/v1'||event.requestId!==requestId||!Number.isSafeInteger(event.sequence)||event.sequence!==sequence+1||!order[state].includes(event.type))throw Error('invalid_engine_event');
    const at=Date.parse(event.at),age=now()-at;
    if(typeof event.at!=='string'||!Number.isFinite(at)||new Date(at).toISOString()!==event.at||age< -30000||age>300000)throw Error('stale_engine_event');
    const allowed=['schema','requestId','sequence','type','at',...(event.type==='answer'?['answer','mode']:event.type==='failed'?['error']:[])];
    if(Object.keys(event).some(key=>!allowed.includes(key)))throw Error('unexpected_engine_event_field');
    if(event.type==='answer'){
     if(typeof event.answer!=='string'||!event.answer.trim()||event.answer.length>6000||!['ask','research','create','learn','explore'].includes(event.mode))throw Error('invalid_engine_answer');
     answer=event.answer;
    }
    if(event.type==='failed'&&event.error!=='ai_unavailable')throw Error('invalid_engine_error');
    state=event.type;sequence=event.sequence;return state;
   },
   result(){if(state==='failed')throw Error('ai_unavailable');if(state!=='completed')throw Error('incomplete_engine_stream');return answer;}
  };
 }
 async function readStream(response,{onEvent=()=>{},signal,now=Date.now}={}){
  if(!response.ok)throw Error(response.status===401?'authentication_required':response.status===403?'access_denied':response.status===409?'request_replayed':response.status===429?'capacity_reached':response.status===503?'release_or_provider_unavailable':'request_rejected');
  if(!response.headers.get('content-type')?.startsWith('text/event-stream'))throw Error('invalid_engine_transport');
  const state=reducer(response.headers.get('x-request-id'),now),reader=response.body?.getReader();if(!reader)throw Error('missing_engine_stream');
  const decoder=new TextDecoder('utf-8',{fatal:true});let buffer='',size=0;
  function drain(){let index;while((index=buffer.indexOf('\n\n'))!==-1){const frame=buffer.slice(0,index);buffer=buffer.slice(index+2);if(!frame.trim())continue;const lines=frame.split('\n');if(lines.length!==2||!lines[0].startsWith('event: ')||!lines[1].startsWith('data: '))throw Error('invalid_engine_frame');const event=JSON.parse(lines[1].slice(6));if(lines[0].slice(7)!==event.type)throw Error('mismatched_engine_event');state.accept(event);onEvent(event);}}
  try{
   for(;;){if(signal?.aborted)throw Error('request_cancelled');const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>65536)throw Error('engine_stream_limit');buffer+=decoder.decode(chunk.value,{stream:true});buffer=buffer.replace(/\r\n/g,'\n');drain();}
   buffer+=decoder.decode();drain();if(buffer.trim())throw Error('incomplete_engine_frame');if(signal?.aborted)throw Error('request_cancelled');return state.result();
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 }
 async function ask({question,mode='ask',getToken,fetcher=fetch,signal,onEvent,now=Date.now,idempotencyKey=globalThis.crypto.randomUUID()}){
  if(typeof question!=='string'||question.trim().length<5||question.trim().length>4000||!['ask','research','create','learn','explore'].includes(mode))throw Error('invalid_question');
  const token=await getToken();if(signal?.aborted)throw Error('request_cancelled');if(typeof token!=='string'||!token)throw Error('authentication_required');
  const response=await fetcher('/api/ask',{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',signal,headers:{Accept:'text/event-stream','Content-Type':'application/json','X-Ad-Astra-Request':'public-v1','Idempotency-Key':idempotencyKey,Authorization:'Bearer '+token},body:JSON.stringify({question:question.trim(),mode})});
  return readStream(response,{signal,onEvent,now});
 }
 return Object.freeze({reducer,readStream,ask});
});
