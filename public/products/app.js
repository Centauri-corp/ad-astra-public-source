'use strict';
// Public-only product direction to shared cinematic scene; no backend or customer data.
(() => {
  const stage=document.querySelector('.stage-orbit');
  const readout=document.querySelector('.stage-readout');
  const cinematic=document.querySelector('.products-cinematic-host');
  const liveMode=document.querySelector('[data-product-mode]');
  const directions=[...document.querySelectorAll('details[data-product-direction]')];
  function showSelection(detail,fromVisitor=false){
    if(!detail.open)return;
    const title=detail.querySelector('summary span')?.textContent||'Product direction';
    const role=detail.querySelector('summary small')?.textContent||'preview';
    const copy=detail.querySelector('p')?.textContent||'';
    if(stage)stage.dataset.motif=detail.dataset.motif;
    if(readout){
      const label=readout.querySelector('[data-product-label]');
      const heading=readout.querySelector('[data-product-title]');
      const description=readout.querySelector('[data-product-copy]');
      if(label)label.textContent=role;
      if(heading)heading.textContent=title;
      if(description)description.textContent=copy;
    }
    if(liveMode)liveMode.textContent='Visual direction: '+title+' · '+role;
    const index=Number(detail.dataset.cinematicTarget);
    if(fromVisitor&&cinematic&&Number.isInteger(index)&&index>=0&&index<=2){
      cinematic.dataset.cinematicScene=String(index);
      cinematic.dispatchEvent(new CustomEvent('ad-astra:request-scene',{detail:{index,source:'product'}}));
    }
  }
  directions.forEach(detail=>{
    detail.querySelector('summary')?.addEventListener('click',()=>{
      detail.dataset.userSceneIntent='yes';
    });
    detail.addEventListener('toggle',()=>{
      showSelection(detail,detail.dataset.userSceneIntent==='yes');
    });
  });
  showSelection(directions.find(detail=>detail.open)||directions[0]);
})();
