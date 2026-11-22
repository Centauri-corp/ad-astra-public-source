'use strict';
(() => {
  const sets=Object.freeze({
    'beyond-physics':Object.freeze({
      measurement:'A measured change is an observation; its cause still requires evidence, controls, and reproducible methods.',
      model:'Different models may explain the same observations. Compare assumptions before accepting an interpretation.',
      uncertainty:'A reliable investigation documents uncertainty and identifies what additional evidence could distinguish the models.'
    }),
    'astra-lumen':Object.freeze({
      concept:'An orbit is a continuous path shaped by motion and gravity. This lesson is an illustrative learning sample.',
      example:'A satellite remains in orbit because it moves forward while gravity bends its path toward Earth.',
      review:'Ask: what changes when a satellite increases or decreases its orbital speed? Verify answers using trusted scientific references.'
    }),
    'governed-workflows':Object.freeze({
      request:'An operator defines an intended task, its permissible scope, and the data it can access.',
      identity:'Permissions and tenant boundaries must be checked server-side before any customer operation.',
      review:'A designated human reviewer checks the proposed action and supporting evidence; this demonstration creates no approval.',
      receipt:'The final system must record an auditable receipt and support rollback. No live transaction occurs in this concept.'
    })
  });
  const host=document.querySelector('[data-demo-kind]');
  if(!host || !Object.hasOwn(sets,host.dataset.demoKind))return;
  const steps=sets[host.dataset.demoKind];
  const controls=[...host.querySelectorAll('[data-demo-step]')];
  const heading=host.querySelector('[data-demo-title]');
  const caption=host.querySelector('[data-demo-copy]');
  const set=(id)=>{
    if(!Object.hasOwn(steps,id))return;
    const button=controls.find(b=>b.dataset.demoStep===id);
    if(heading)heading.textContent=button?.textContent.trim()||id;
    if(caption)caption.textContent=steps[id];
    controls.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.demoStep===id)));
  };
  controls.forEach((button,index)=>{
    button.addEventListener('click',()=>set(button.dataset.demoStep));
    button.addEventListener('keydown',event=>{
      const key=event.key;
      if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(key))return;
      event.preventDefault();
      const next=key==='Home'?0:key==='End'?controls.length-1:(index+((key==='ArrowRight'||key==='ArrowDown')?1:-1)+controls.length)%controls.length;
      controls[next].focus();
      set(controls[next].dataset.demoStep);
    });
  });
  if(controls.length)set(controls[0].dataset.demoStep);
})();
