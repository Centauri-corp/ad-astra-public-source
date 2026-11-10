'use strict';
(()=>{
  const filter=document.querySelector('[data-mode-filter]');if(!filter)return;
  const cards=[...document.querySelectorAll('[data-family]')],buttons=[...filter.querySelectorAll('button[data-mode]')];
  const result=document.getElementById('product-results'),allowed=new Set(buttons.map(b=>b.dataset.mode));
  function select(mode,writeHistory=false){
    if(!allowed.has(mode))mode='all';let count=0;
    for(const card of cards){const shown=mode==='all'||card.dataset.modes.split(' ').includes(mode);card.hidden=!shown;if(shown)count++;}
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));
    result.textContent=mode==='all'?'All six product directions.':`${count} product directions for ${mode[0].toUpperCase()+mode.slice(1)}.`;
    if(writeHistory){const url=new URL(location.href);if(mode==='all')url.searchParams.delete('mode');else url.searchParams.set('mode',mode);history.pushState(null,'',url);}
  }
  buttons.forEach(button=>button.addEventListener('click',()=>select(button.dataset.mode,true)));
  window.addEventListener('popstate',()=>select(new URL(location.href).searchParams.get('mode')||'all'));
  filter.hidden=false;select(new URL(location.href).searchParams.get('mode')||'all');
})();
