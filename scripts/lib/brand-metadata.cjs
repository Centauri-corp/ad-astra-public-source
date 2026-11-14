'use strict';
// Static brand identity only. Does not change robots, indexing, claims or release gates.
const collection=require('../../config/story-collection.json');
const {loadProject,primaryAsset}=require('./website-project.cjs');
const origin='https://adastra.global';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode=value=>String(value).replace(/&(?:amp|lt|gt|quot|apos|#39|#\d+|#x[\da-f]+);/gi,entity=>{
 const named={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'"};
 if(named[entity.toLowerCase()])return named[entity.toLowerCase()];
 const code=entity.toLowerCase().startsWith('&#x')?parseInt(entity.slice(3,-1),16):parseInt(entity.slice(2,-1),10);
 return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):'\uFFFD';
});
function metadataForRoute(route){
 if(typeof route!=='string'||!/^\/(?:[a-z0-9-]+\/)*$/.test(route))throw new Error('A canonical static route is required.');
 if(['/','/platform-preview/','/agent/'].includes(route)){const selected=primaryAsset(route,loadProject());return {canonical:origin+route,image:origin+selected.src,alt:selected.alt};}
 let id='intelligence';
 if(['/company/','/about/'].includes(route))id='vision';
 else if(route.startsWith('/markets/')||route==='/products/business-commerce/')id='global';
 else if(['/products/specialist-intelligence/','/products/developer-platform/'].includes(route))id='agi';
 else if(['/products/','/services/','/products/creative-studio/'].includes(route))id='products';
 const asset=collection.assets.find(a=>a.id===id);
 return {canonical:origin+route,image:origin+'/assets/story/'+id+'-1672.webp',alt:asset.alt};
}
function applyBrandMetadata(html,route){
 const metadata=metadataForRoute(route);
 return html.replace(/<head\b([^>]*)>([\s\S]*?)<\/head>/i,(_all,attrs,head)=>{
  const title=decode(head.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'AD ASTRA').replace(/\s+/g,' ').trim();
  const description=decode(head.match(/<meta\b[^>]*\bname=["']description["'][^>]*\bcontent="([^"]*)"[^>]*>/i)?.[1]||'Explore Ad Astra product directions and current availability.');
  const controlled=new Set(['og:title','og:description','og:type','og:url','og:image','og:image:alt','twitter:card','twitter:title','twitter:description','twitter:image','twitter:image:alt']);
  head=head.replace(/<meta\b[^>]*>/gi,tag=>{
   const key=tag.match(/\b(?:property|name)=["']([^"']+)["']/i)?.[1]?.toLowerCase();
   return controlled.has(key)?'':tag;
  });
  if(!/<link\b[^>]*\brel=["']icon["']/i.test(head))head+='\n<link rel="icon" href="/assets/brand/ad-astra-mark.svg" type="image/svg+xml">';
  const values={'og:title':title,'og:description':description,'og:type':'website','og:url':metadata.canonical,'og:image':metadata.image,'og:image:alt':metadata.alt,'twitter:card':'summary_large_image','twitter:title':title,'twitter:description':description,'twitter:image':metadata.image,'twitter:image:alt':metadata.alt};
  // A fixed marker makes source regeneration byte-idempotent without touching other metadata.
  head=head.replace(/\n?<!-- AD ASTRA brand metadata -->[\s\S]*?<!-- \/AD ASTRA brand metadata -->/g,'');
  const tags=Object.entries(values).map(([key,value])=>`<meta ${key.startsWith('og:')?'property':'name'}="${key}" content="${esc(value)}">`).join('');
  return '<head'+attrs+'>'+head+'\n<!-- AD ASTRA brand metadata -->'+tags+'<!-- /AD ASTRA brand metadata --></head>';
 });
}
module.exports={applyBrandMetadata,metadataForRoute};
