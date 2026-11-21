(()=>{'use strict';
const root=document.querySelector('[data-human-stage]');
if(!root)return;
const listen=root.querySelector('[data-stage-listen]');
const stop=root.querySelector('[data-stage-stop]');
const input=root.querySelector('[data-stage-input]');
const response=root.querySelector('[data-stage-response]');
const status=root.querySelector('[data-stage-status]');
const synth=window.speechSynthesis;
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
const replies=[
 {keys:['life','daily','day','routine'],text:'I can help you explore daily life intelligence: plan, reflect, learn, and choose a next step.'},
 {keys:['research','science','question','learn'],text:'Let’s turn your question into a clearer path through evidence, context, and perspective.'},
 {keys:['business','market','work','company'],text:'I can help you map a work or market question into a structured direction.'},
 {keys:['hello','hi','who'],text:'Welcome to Ad Astra. I’m your guided intelligence preview. Tell me what you want to understand next.'}
];
function answer(value){const q=String(value||'').toLowerCase();const found=replies.find(item=>item.keys.some(key=>q.includes(key)));return found?found.text:'I heard your question. In this preview, I can help you begin with daily life, research, learning, work, or a new direction.'}
function speak(text){if(!synth)return;synth.cancel();synth.speak(new SpeechSynthesisUtterance(text))}
function publish(text,spoken=false){response.textContent=text;status.textContent=spoken?'VOICE PREVIEW / RESPONSE READY':'TEXT PREVIEW / RESPONSE READY';if(spoken)speak(text)}
function fallback(){status.textContent='VOICE UNAVAILABLE / USE TEXT INPUT';listen.disabled=true}
if(!Recognition)fallback();
let recognition=null;
if(Recognition){recognition=new Recognition();recognition.lang='en-US';recognition.interimResults=false;recognition.maxAlternatives=1;recognition.onstart=()=>{status.textContent='LISTENING / SPEAK NOW';listen.setAttribute('aria-pressed','true')};recognition.onresult=e=>{const text=e.results[0][0].transcript;input.value=text;publish(answer(text),true)};recognition.onerror=()=>{status.textContent='VOICE PREVIEW / TRY AGAIN OR TYPE BELOW'};recognition.onend=()=>{listen.setAttribute('aria-pressed','false');if(status.textContent==='LISTENING / SPEAK NOW')status.textContent='VOICE PREVIEW / READY'};listen.addEventListener('click',()=>recognition.start());stop.addEventListener('click',()=>recognition.stop())}
root.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const text=answer(input.value);publish(text,false)});
root.querySelectorAll('[data-stage-domain]').forEach(button=>button.addEventListener('click',()=>{input.value=button.textContent.trim();publish(answer(input.value),false)}));
})();