'use strict';
// Public stage is intentionally static-first. Its motifs are product scene IDs;
// graphics runtime activation remains a separate reviewed release gate.
const directions={
  'beyond-physics':{label:'DISCOVERY',title:'Beyond Physics',copy:'Connect questions, evidence and perspective across disciplines.',motif:'orbital-knowledge-field',description:'An orbital knowledge field representing connected questions and evidence.'},
  'astra-lumen':{label:'LEARNING',title:'Astra Lumen',copy:'Turn complex subjects into clearer, human-directed next steps.',motif:'luminous-neural-core',description:'A luminous neural core representing guided learning.'},
  'neural-visual-experience':{label:'VISUALIZATION',title:'Neural Visual Experience',copy:'Make systems, patterns and possibilities easier to see.',motif:'responsive-signal-lattice',description:'A signal lattice representing conceptual relationships.'},
  'governed-workflows':{label:'OPERATIONS',title:'Governed AI Workflows',copy:'Move from intent to action through explicit controls and review.',motif:'approval-control-plane',description:'A control-plane illustration representing reviewed workflows.'}
};
const controls=[...document.querySelectorAll('[data-product-direction]')];
const stage=document.querySelector('.stage-orbit');
const title=document.querySelector('[data-product-title]');
const copy=document.querySelector('[data-product-copy]');
const label=document.querySelector('.stage-readout [data-product-label]');
const heroLabel=document.querySelector('.hero-art [data-product-label]');
function selectDirection(id,focus=false){
  if(!Object.hasOwn(directions,id)||!stage||!title||!copy||!label)return false;
  const d=directions[id];
  stage.dataset.motif=d.motif;
  stage.setAttribute('aria-label',d.description);
  title.textContent=d.title;
  copy.textContent=d.copy;
  label.textContent=d.label+' / EXPLICIT PUBLIC PREVIEW';
  if(heroLabel)heroLabel.textContent=d.label+' / EXPLICIT PUBLIC PREVIEW';
  controls.forEach(b=>{
    const active=b.dataset.productDirection===id;
    b.classList.toggle('active',active);
    b.setAttribute('aria-pressed',String(active));
    b.removeAttribute('aria-selected'); // buttons, not tabs
    if(active&&focus)b.focus();
  });
  return true;
}
controls.forEach((b,index)=>{
  b.addEventListener('click',()=>selectDirection(b.dataset.productDirection));
  b.addEventListener('keydown',event=>{
    const next={ArrowRight:(index+1)%controls.length,ArrowDown:(index+1)%controls.length,ArrowLeft:(index+controls.length-1)%controls.length,ArrowUp:(index+controls.length-1)%controls.length,Home:0,End:controls.length-1}[event.key];
    if(next===undefined)return;
    event.preventDefault();
    selectDirection(controls[next].dataset.productDirection,true);
  });
});
selectDirection('beyond-physics');
