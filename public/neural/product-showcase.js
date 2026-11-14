export function mountProductShowcases(scope=document){
for(const stage of scope.querySelectorAll('[data-product-showcase]')){
 if(stage.dataset.companionReady)continue;stage.dataset.companionReady='true';
 const buttons=[...stage.querySelectorAll('[data-product-pick]')];
 const views=[...stage.querySelectorAll('[data-product-view]')];
 const select=(id,focus=false)=>{
  const button=buttons.find(item=>item.dataset.productPick===id);if(!button)return;
  buttons.forEach(item=>{const active=item===button;item.setAttribute('aria-pressed',String(active));item.tabIndex=active?0:-1;});
  views.forEach(view=>{view.hidden=view.dataset.productView!==id;});
  stage.dataset.selectedProduct=id;if(focus)button.focus();
 };
 stage.querySelector('.ad-product-controls').hidden=false;
 buttons.forEach((button,index)=>{
  button.addEventListener('click',()=>select(button.dataset.productPick));
  button.addEventListener('keydown',event=>{
   const next=event.key==='ArrowRight'?(index+1)%buttons.length:event.key==='ArrowLeft'?(index+buttons.length-1)%buttons.length:event.key==='Home'?0:event.key==='End'?buttons.length-1:null;
   if(next===null)return;event.preventDefault();select(buttons[next].dataset.productPick,true);
  });
 });
 const section=stage.closest('.ad-products');
 section?.querySelectorAll('.ad-product-list>a').forEach(link=>{
  const id=new URL(link.href).pathname.split('/')[2];
  link.addEventListener('pointerenter',()=>select(id));link.addEventListener('focus',()=>select(id));
 });
 select(buttons[0].dataset.productPick);
}
}
mountProductShowcases();
