'use strict';
const {assetPicture,loadProject}=require('./website-project.cjs');
const {families}=require('../../config/public-product-families.json');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function productShowcase(context=loadProject()){
 return `<div class="ad-product-stage" data-product-showcase><div class="ad-product-controls" role="group" aria-label="Preview a product direction" hidden>${families.map((f,i)=>`<button type="button" data-product-pick="${f.id}" aria-controls="preview-${f.id}" aria-pressed="${i===0}" tabindex="${i===0?0:-1}"><span aria-hidden="true">0${i+1}</span><span class="ad-control-name">${esc(f.name)}</span></button>`).join('')}</div>${families.map((f,i)=>`<figure class="ad-product-view" id="preview-${f.id}" data-product-view="${f.id}"${i?' hidden':''}>${assetPicture(context.selection.familyAssets[f.id],{sizes:'(max-width: 760px) 100vw, 50vw'},context)}<figcaption><p class="ad-kicker">0${i+1} / ${esc(f.name).toUpperCase()}</p><p>${esc(f.outcome)}</p><a href="/products/${f.id}/">Explore this direction <span aria-hidden="true">↗</span></a><span>Product concept artwork</span></figcaption></figure>`).join('')}</div>`;
}
module.exports={productShowcase};
