'use strict';
const {applyBrandMetadata}=require('./brand-metadata.cjs');
const {reconcileVisualAssets}=require('./website-project.cjs');
const {families}=require('../../config/public-product-families.json');
const {SERVICE_AREAS}=require('./product-service-architecture.cjs');
// Shared first-party navigation. No tracking, forms or provider calls.
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrow='<svg class="site-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const iconize=html=>html.replaceAll('<span aria-hidden="true">↗</span>',arrow).replaceAll('<span class="mode-arrow" aria-hidden="true">↗</span>','<span class="mode-arrow" aria-hidden="true">'+arrow+'</span>');
function header(route = '/') {
  const links = [['/products/','Products'],['/platform-preview/','Workspace'],['/services/','Solutions'],['/intelligence/','Intelligence']];
  const items = links.map(([href,label]) => `<a href="${href}"${route===href?' aria-current="page"':''}>${label}</a>`).join('');
  const card=(id,href,name,description,index)=>`<li><a class="site-nav-card" href="${esc(href)}" aria-labelledby="site-${id}-name" aria-describedby="site-${id}-description"${route===href?' aria-current="page"':''}><span class="site-nav-number" aria-hidden="true">0${index+1}</span><span class="site-nav-card-name" id="site-${id}-name">${esc(name)}</span><span class="site-nav-card-description" id="site-${id}-description">${esc(description)}</span>${arrow}</a></li>`;
  const productCards=families.map((family,index)=>card(family.id,`/products/${family.id}/`,family.name,family.summary,index)).join('');
  const solutionCards=SERVICE_AREAS.map((area,index)=>card(area.id,`/services/#solutions-${area.id}`,area.label,area.familyIds.map(id=>families.find(family=>family.id===id).name).join(' · '),index)).join('');
  const disclosure=(id,label,title,description,cards,overview)=>`<details class="site-nav-disclosure" name="site-desktop-disclosure"><summary aria-label="${label}" aria-controls="site-${id}-panel"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="m3 4.5 3 3 3-3" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg></summary><div class="site-nav-panel" id="site-${id}-panel"><div class="site-nav-intro"><p class="site-nav-eyebrow">AD ASTRA / ${id.toUpperCase()}</p><p class="site-nav-title">${title}</p><p class="site-nav-description">${description}</p></div><ul class="site-nav-grid">${cards}</ul><div class="site-nav-continuity"><span>Design preview · Products in development</span><a href="${id==='products'?'/products/':'/services/'}">${overview} ${arrow}</a><a href="/platform-preview/">View workspace design ${arrow}</a></div></div></details>`;
  const desktopItems=links.map(([href,label])=>{
    const link=`<a href="${href}"${route===href?' aria-current="page"':''}>${label}</a>`;
    if(label==='Products')return `<div class="site-nav-item"${route.startsWith(href)?' data-section-current':''}>${link}${disclosure('products','Explore product families','One core.<br>Six directions.','Find the product direction that fits.',productCards,'All product directions')}</div>`;
    if(label==='Solutions')return `<div class="site-nav-item"${route.startsWith(href)?' data-section-current':''}>${link}${disclosure('solutions','Explore solution contexts','Start with<br>the work.','Three work contexts. Six product directions.',solutionCards,'All solution contexts')}</div>`;
    return link;
  }).join('');
  // Keep the mobile disclosure first in source order; desktop disclosures are
  // independent native details, with direct section links beside their toggles.
  return `<header class="site-header"><a class="site-brand" href="/" aria-label="AD ASTRA home"><img src="/assets/brand/ad-astra-mark.svg" width="36" height="36" alt=""><span class="brand-wordmark" aria-hidden="true">AD ASTRA</span></a><details class="site-menu"><summary aria-controls="site-navigation"><span class="site-menu-label">Explore</span><span class="site-menu-icon" aria-hidden="true"><i></i><i></i></span></summary><div class="site-menu-overlay"><div class="site-menu-atmosphere" aria-hidden="true"></div><p class="site-menu-kicker">AD ASTRA / NAVIGATION</p><nav id="site-navigation" aria-label="Site navigation">${items}<a href="/start/">Find your starting point</a><a href="/company/">Company</a><a href="/pricing/">Plans & availability</a><a href="/platform/">Customer access</a><a href="/status/">Service status</a></nav><p class="site-menu-note">Enter the product universe. Availability remains clearly labelled at every step.</p></div></details><nav class="site-desktop-nav" aria-label="Primary">${desktopItems}</nav><a class="site-availability" href="/platform-preview/">Explore workspace <span aria-hidden="true">↗</span></a></header><div class="site-transition" aria-hidden="true"></div>`;
}
function footer() {
  return `<footer class="site-footer"><div class="site-footer-top"><a class="site-brand" href="/" aria-label="AD ASTRA home"><img src="/assets/brand/ad-astra-mark.svg" width="36" height="36" alt=""><span>AD ASTRA</span></a><p>Human curiosity.<br>Extraordinary possibilities.</p><nav aria-label="Footer"><a href="/products/">Products</a><a href="/services/">Solutions</a><a href="/intelligence/">Intelligence</a><a href="/company/">Company</a><a href="/pricing/">Plans</a><a href="/status/">Availability</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/security/">Security</a><a href="/support/">Support</a></nav></div><div class="site-footer-bottom"><span>© AD ASTRA · Beyond the expected.</span><span>Design preview. Products in development.</span><a href="/#story">Explore our story ↑</a></div></footer>`;
}
function head(route, title, description) {
  const structuredDescription = 'Human-directed intelligence for clearer questions, connected evidence, and better next decisions. Astra Polaris is the public model direction; the live product experience remains in development.';
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | AD ASTRA</title><meta name="description" content="${esc(description)}"><meta name="robots" content="noindex,follow"><meta name="theme-color" content="#060b12"><link rel="canonical" href="https://adastra.global${route}"><link rel="icon" href="/assets/brand/ad-astra-mark.svg" type="image/svg+xml"><meta property="og:title" content="${esc(title)} | AD ASTRA"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:url" content="https://adastra.global${route}"><meta property="og:image" content="https://adastra.global/assets/story/intelligence-1672.webp"><link rel="stylesheet" href="/design-system.css"><script defer src="/design-system.js"></script><script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"AD ASTRA","url":"https://adastra.global/","description":"${structuredDescription}"}</script></head><body class="experience-site"><a class="site-skip" href="#main">Skip to content</a>${header(route)}`;
}
function picture(id, alt, {hero=false, cls=''}={}) {
  return `<picture${cls?` class="${cls}"`:''}><source type="image/webp" srcset="/assets/story/${id}-960.webp 960w, /assets/story/${id}-1672.webp 1672w" sizes="${hero?'100vw':'(max-width: 760px) 100vw, 70vw'}"><img src="/assets/story/${id}-1672.webp" width="1672" height="941" alt="${esc(alt)}" ${hero?'fetchpriority="high"':'loading="lazy"'} decoding="async"></picture>`;
}
function applySharedShell(html,route) {
  if (!/<header\b/.test(html) || !/<footer\b/.test(html)) throw Error('Missing site shell: '+route);
  html=html.replace(/<header\b[\s\S]*?<\/header>(?:<div class="site-transition"[^>]*>[\s\S]*?<\/div>)*/,header(route)).replace(/<footer\b[\s\S]*?<\/footer>/,footer());
  if(!html.includes('href="/design-system.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/design-system.css"></head>');
  if(!html.includes('src="/design-system.js"'))html=html.replace('</head>','<script defer src="/design-system.js"></script></head>');
  if(!html.includes('href="/customer-experience.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/customer-experience.css"></head>');
  if(!html.includes('href="/assets/brand/experience-tokens.css"'))html=html.replace('<link rel="stylesheet" href="/customer-experience.css">','<link rel="stylesheet" href="/assets/brand/experience-tokens.css"><link rel="stylesheet" href="/customer-experience.css">');
  html=reconcileVisualAssets(html,route);
  return iconize(applyBrandMetadata(html,route));
}
module.exports = {esc,header,footer,head,picture,applySharedShell,iconize};
