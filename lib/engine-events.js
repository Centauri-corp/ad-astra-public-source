'use strict';
// Observable request lifecycle only: no model traces, prompts or credentials.
function engineEvents(req,res,requestId){
 const requested=String(req.headers?.accept||'').split(',').some(value=>value.split(';')[0].trim()==='text/event-stream');
 let started=false,ended=false,sequence=0;
 function emit(type,extra={}){
  if(!started||ended||res.destroyed||res.writableEnded)return;
  const event={schema:'ad-astra-engine-event/v1',requestId,sequence:++sequence,type,at:new Date().toISOString(),...extra};
  res.write('event: '+type+'\ndata: '+JSON.stringify(event)+'\n\n');
 }
 return {
  get started(){return started;},
  start(headers={}){
   if(!requested)return;
   res.statusCode=200;
   for(const[key,value]of Object.entries({'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive, nosnippet','X-Request-Id':requestId,'X-Accel-Buffering':'no',...headers}))res.setHeader(key,String(value));
   started=true;res.flushHeaders?.();emit('accepted');
  },
  requesting(){emit('requesting');},
  finish(status,payload){
   if(ended)return;
   if(status===200&&payload.ok===true){emit('answer',{answer:payload.answer,mode:payload.mode,agentId:payload.agentId});emit('completed');}
   else emit('failed',{error:'ai_unavailable'});
   ended=true;if(!res.destroyed&&!res.writableEnded)res.end();
  }
 };
}
module.exports={engineEvents};
