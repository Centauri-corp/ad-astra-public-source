'use strict';
(() => {
  const filters=[...document.querySelectorAll('[data-portfolio-filter]')];
  const cards=[...document.querySelectorAll('[data-portfolio-card]')];
  const count=document.querySelector('[data-portfolio-count]');
  if(!filters.length || !cards.length)return;
  function select(filter) {
    if(!['all','research','education','professional'].includes(filter))return;
    let shown=0;
    cards.forEach(card=>{
      const audiences=(card.dataset.audiences||'').split(' ').filter(Boolean);
      const visible=filter==='all'||audiences.includes(filter);
      card.hidden=!visible;
      if(visible)shown++;
    });
    filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.portfolioFilter===filter)));
    if(count)count.textContent=shown+' of '+cards.length+' flagship product directions shown. Concept previews, not live offers.';
  }
  filters.forEach(button=>button.addEventListener('click',()=>select(button.dataset.portfolioFilter)));
  select('all');
})();
