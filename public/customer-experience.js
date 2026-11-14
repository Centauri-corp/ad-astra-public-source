'use strict';
// Local interaction only. No account, network, microphone or persistent storage access.
function mountHomeInteractions(scope=document) {
 const section=scope.querySelector('[data-explore]');if(!section||section.dataset.companionReady)return;
 section.dataset.companionReady='true';
 const tabs=[...section.querySelectorAll('[data-explore-tab]')];
 function select(tab,focus=false){
  tabs.forEach(item=>{
   const selected=item===tab;
   item.setAttribute('aria-selected',String(selected));
   item.tabIndex=selected?0:-1;
   document.getElementById(item.getAttribute('aria-controls')).hidden=!selected;
  });
  if(focus)tab.focus();
 }
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>select(tab));
  tab.addEventListener('keydown',event=>{
   let next;
   if(event.key==='ArrowRight')next=(index+1)%tabs.length;
   else if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;
   else if(event.key==='Home')next=0;
   else if(event.key==='End')next=tabs.length-1;
   else return;
   event.preventDefault();select(tabs[next],true);
  });
 });
 // All examples remain readable if scripting is unavailable.
 document.documentElement.classList.add('ad-interactive');
}
globalThis.AdAstraHomeInteractions=Object.freeze({mount:mountHomeInteractions});
mountHomeInteractions();
