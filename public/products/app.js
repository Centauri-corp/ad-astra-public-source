'use strict';
const directions={
  'beyond-physics':{label:'DISCOVERY',title:'Beyond Physics',copy:'Connect questions, evidence and perspective across disciplines.',motif:'orbital-knowledge-field'},
  'astra-lumen':{label:'LEARNING',title:'Astra Lumen',copy:'Turn complex subjects into clearer, human-directed next steps.',motif:'luminous-neural-core'},
  'neural-visual-experience':{label:'VISUALIZATION',title:'Neural Visual Experience',copy:'Make systems, patterns and possibilities easier to see.',motif:'responsive-signal-lattice'},
  'governed-workflows':{label:'OPERATIONS',title:'Governed AI Workflows',copy:'Move from intent to action through explicit controls and review.',motif:'approval-control-plane'}
};
const controls=[...document.querySelectorAll('[data-product-direction]')];
const stage=document.querySelector('[data-product-stage]');
const title=document.querySelector('[data-product-title]');
const copy=document.querySelector('[data-product-copy]');
const label=document.querySelector('[data-product-label]');
function selectDirection(id){
  const d=directions[id]; if(!d||!stage)return;
  stage.dataset.motif=d.motif;
  title.textContent=d.title; copy.textContent=d.copy; label.textContent=d.label+' / EXPLICIT PUBLIC PREVIEW';
  controls.forEach(b=>{const active=b.dataset.productDirection===id;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});
}
controls.forEach(b=>b.addEventListener('click',()=>selectDirection(b.dataset.productDirection)));
selectDirection('beyond-physics');
