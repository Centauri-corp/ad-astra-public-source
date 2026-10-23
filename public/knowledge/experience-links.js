'use strict';
(() => {
 const link=document.getElementById('experience-launch');
 if(!link)return;
 const allowed=new Set(['ask','research','create','learn','explore']);
 function sync(){const tab=document.querySelector('[role="tab"][data-mode][aria-selected="true"]');const mode=tab&&allowed.has(tab.dataset.mode)?tab.dataset.mode:'ask';link.href='/knowledge/?mode='+encodeURIComponent(mode)+'#ask-ad-astra';link.textContent='Open '+mode.charAt(0).toUpperCase()+mode.slice(1)+' workspace \u2192';}
 const tabs=document.querySelector('.tabs');
 if(tabs)new MutationObserver(sync).observe(tabs,{attributes:true,subtree:true,attributeFilter:['aria-selected']});
 sync();
})();

