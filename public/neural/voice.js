'use strict';
// Device-local speech only. Never silently falls back to a cloud recognizer/voice.
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AdAstraVoice=api;})(globalThis,()=>{
 function create({host=globalThis,onState=()=>{},onTranscript=()=>{},onNotice=()=>{}}={}){
  let recognition=null,utterance=null,generation=0,disposed=false,timer=null;
  const clear=()=>{if(timer!==null)host.clearTimeout(timer);timer=null;};
  function stop(){generation++;clear();const old=recognition;recognition=null;try{old?.abort();}catch{}if(utterance){utterance=null;try{host.speechSynthesis?.cancel();}catch{}}if(!disposed){onState('idle');onNotice('Microphone and playback are off.');}}
  async function dictate(){
   if(disposed)return;stop();const current=++generation;
   const Recognition=host.SpeechRecognition;
   if(!host.isSecureContext||!Recognition||typeof Recognition.available!=='function'||!('processLocally' in Recognition.prototype)){onNotice('On-device English dictation is unavailable. Please type your question.');return;}
   try{
    onNotice('Checking on-device speech support. The microphone has not started.');
    const available=await Recognition.available({langs:['en-US'],processLocally:true});
    if(disposed||current!==generation||host.document?.hidden)return;
    if(available!=='available'){onNotice('The on-device English speech pack is unavailable. Please type; no cloud dictation was started.');return;}
    const rec=new Recognition();recognition=rec;rec.lang='en-US';rec.processLocally=true;rec.continuous=false;rec.interimResults=false;
    const active=()=>!disposed&&current===generation&&recognition===rec&&!host.document?.hidden;
    rec.onstart=()=>{if(!active()){rec.abort();return;}onState('listening');onNotice('Microphone active: on-device dictation. Stop at any time.');};
    rec.onresult=event=>{if(!active())return;let text='';for(let i=event.resultIndex;i<event.results.length;i++)if(event.results[i].isFinal)text+=event.results[i][0].transcript+' ';text=text.trim();if(text.length>4000){stop();onNotice('Dictation was too long. Please shorten the question.');return;}if(text)onTranscript(text);};
    rec.onerror=()=>{if(!active())return;recognition=null;clear();onState('idle');onNotice('Dictation stopped or permission was denied. You can type instead.');};
    rec.onend=()=>{if(!active())return;recognition=null;clear();onState('idle');onNotice('Dictation ended. Review your question before sending it.');};
    timer=host.setTimeout(()=>{if(active()){stop();onNotice('Dictation stopped after 30 seconds. Review the text before sending.');}},30000);
    rec.start();
   }catch{if(!disposed&&current===generation){stop();onNotice('On-device dictation could not start. Please type your question.');}}
  }
  function speak(text){
   if(disposed)return;stop();
   if(typeof text!=='string'||!text.trim()||text.length>6000){onNotice('There is no completed answer to read.');return;}
   const synthesis=host.speechSynthesis,Utterance=host.SpeechSynthesisUtterance;
   const voice=typeof synthesis?.getVoices==='function'?synthesis.getVoices().find(v=>v.localService===true&&/^en(?:-|$)/i.test(v.lang)):null;
   if(!voice||!Utterance){onNotice('No on-device English playback voice is available. The answer remains readable as text.');return;}
   const current=++generation,item=new Utterance(text);utterance=item;item.voice=voice;item.lang=voice.lang;item.rate=1;item.pitch=1;
   const active=()=>!disposed&&current===generation&&utterance===item&&!host.document?.hidden;
   item.onstart=()=>{if(!active()){synthesis.cancel();return;}onState('speaking');onNotice('Reading with an on-device voice. Stop at any time.');};
   item.onend=()=>{if(!active())return;utterance=null;clear();onState('idle');onNotice('Playback complete.');};
   item.onerror=()=>{if(!active())return;utterance=null;clear();onState('idle');onNotice('Playback stopped. The text answer is still available.');};
   timer=host.setTimeout(()=>{if(active()){stop();onNotice('Playback stopped after two minutes. The text remains available.');}},120000);
   synthesis.speak(item);
  }
  function dispose(){if(disposed)return;stop();disposed=true;}
  return {dictate,speak,stop,dispose};
 }
 return Object.freeze({create});
});
