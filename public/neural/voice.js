'use strict';
// Device-local speech only. Never silently falls back to a cloud recognizer/voice.
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AdAstraVoice=api;})(globalThis,()=>{
 function create({host=globalThis,onState=()=>{},onTranscript=()=>{},onNotice=()=>{},onEnd=()=>{},onFailure=()=>{}}={}){
  let recognition=null,utterance=null,generation=0,disposed=false,timer=null;
  const clear=()=>{if(timer!==null)host.clearTimeout(timer);timer=null;};
  function release(){const current=++generation;clear();const old=recognition,item=utterance;recognition=null;utterance=null;try{old?.abort();}catch{}if(item)try{host.speechSynthesis?.cancel();}catch{}return current;}
  function idle(current,notice,done=()=>{}){if(disposed||current!==generation)return;onState('idle');if(disposed||current!==generation)return;onNotice(notice);if(!disposed&&current===generation)done();}
  function begin(){const current=release();idle(current,'Microphone and playback are off.');return current;}
  function stop(){begin();}
  // Completion kinds are 'dictation' and 'playback'; failure reasons are operation-prefixed.
  function fail(reason,notice){idle(release(),notice,()=>onFailure(reason));return false;}
  function complete(kind,current,notice){clear();idle(current,notice,()=>{if(!host.document?.hidden)onEnd(kind);});}
  const permissionDenied=error=>['not-allowed','service-not-allowed','NotAllowedError','SecurityError'].includes(error?.error||error?.name);
  // User-selected rate/pitch stay in [0.8, 1.2]; non-numeric or non-finite values use 1.
  const bounded=value=>typeof value==='number'&&Number.isFinite(value)?Math.min(1.2,Math.max(.8,value)):1;
  async function dictate(){
   if(disposed)return false;const current=begin();
   if(disposed||current!==generation||host.document?.hidden)return false;
   const Recognition=host.SpeechRecognition;
   if(!host.isSecureContext||!Recognition||typeof Recognition.available!=='function'||!Recognition.prototype||!('processLocally' in Recognition.prototype))return fail('dictation-unsupported','On-device English dictation is unavailable. Please type your question.');
   try{
    onNotice('Checking on-device speech support. The microphone has not started.');
    if(disposed||current!==generation||host.document?.hidden)return false;
    const available=await Recognition.available({langs:['en-US'],processLocally:true});
    if(disposed||current!==generation||host.document?.hidden)return false;
    if(available!=='available')return fail('dictation-unavailable','The on-device English speech pack is unavailable. Please type; no cloud dictation was started.');
    const rec=new Recognition();recognition=rec;rec.lang='en-US';rec.processLocally=true;rec.continuous=false;rec.interimResults=false;
    const active=()=>{if(disposed||current!==generation||recognition!==rec)return false;if(host.document?.hidden){stop();return false;}return true;};
    rec.onstart=()=>{if(!active()){try{rec.abort();}catch{}return;}onState('listening');if(active())onNotice('Microphone active: on-device dictation. Stop at any time.');};
    rec.onresult=event=>{if(!active())return;let text='';for(let i=event.resultIndex;i<event.results.length;i++)if(event.results[i].isFinal)text+=event.results[i][0].transcript+' ';text=text.trim();if(text.length>4000){fail('dictation-too-long','Dictation was too long. Please shorten the question.');return;}if(text)onTranscript(text);};
    rec.onerror=error=>{if(!active())return;fail(permissionDenied(error)?'dictation-permission-denied':'dictation-error','Dictation stopped or permission was denied. You can type instead.');};
    rec.onend=()=>{if(!active())return;recognition=null;complete('dictation',current,'Dictation ended. Review your question before sending it.');};
    timer=host.setTimeout(()=>{if(active())fail('dictation-timeout','Dictation stopped after 30 seconds. Review the text before sending.');},30000);
    rec.start();
    return !disposed&&current===generation&&!host.document?.hidden;
   }catch(error){if(!disposed&&current===generation)return fail(permissionDenied(error)?'dictation-permission-denied':'dictation-error','On-device dictation could not start. Please type your question.');return false;}
  }
  function speak(text,options={}){
   if(disposed)return false;const current=begin();
   if(disposed||current!==generation||host.document?.hidden)return false;
   if(typeof text!=='string'||!text.trim()||text.length>6000)return fail('playback-invalid-text','There is no completed answer to read.');
   try{
    const synthesis=host.speechSynthesis,Utterance=host.SpeechSynthesisUtterance;
    const voice=typeof synthesis?.getVoices==='function'?synthesis.getVoices().find(v=>v.localService===true&&/^en(?:-|$)/i.test(v.lang)):null;
    if(!voice||!Utterance||typeof synthesis.speak!=='function')return fail('playback-unavailable','No on-device English playback voice is available. The answer remains readable as text.');
    const item=new Utterance(text);utterance=item;item.voice=voice;item.lang=voice.lang;item.rate=bounded(options?.rate);item.pitch=bounded(options?.pitch);
    const active=()=>{if(disposed||current!==generation||utterance!==item)return false;if(host.document?.hidden){stop();return false;}return true;};
    item.onstart=()=>{if(!active())return;onState('speaking');if(active())onNotice('Reading with an on-device voice. Stop at any time.');};
    item.onend=()=>{if(!active())return;utterance=null;complete('playback',current,'Playback complete.');};
    item.onerror=error=>{if(!active())return;fail(permissionDenied(error)?'playback-permission-denied':'playback-error','Playback stopped. The text answer is still available.');};
    timer=host.setTimeout(()=>{if(active())fail('playback-timeout','Playback stopped after two minutes. The text remains available.');},120000);
    synthesis.speak(item);
    return !disposed&&current===generation&&!host.document?.hidden;
   }catch(error){if(!disposed&&current===generation)return fail(permissionDenied(error)?'playback-permission-denied':'playback-error','On-device playback could not start. The text answer is still available.');return false;}
  }
  function dispose(){if(disposed)return;disposed=true;release();onState('idle');onNotice('Microphone and playback are off.');}
  return {dictate,speak,stop,dispose};
 }
 return Object.freeze({create});
});
