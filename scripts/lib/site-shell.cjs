'use strict';
const {applyBrandMetadata}=require('./brand-metadata.cjs');
// Shared first-party navigation. No tracking, forms or provider calls.
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arrow='<svg class="site-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const iconize=html=>html.replaceAll('<span aria-hidden="true">↗</span>',arrow).replaceAll('<span class="mode-arrow" aria-hidden="true">↗</span>','<span class="mode-arrow" aria-hidden="true">'+arrow+'</span>');
function header(route = '/') {
  const links = [['/start/','Start here'],['/products/','Products'],['/services/','Solutions'],['/intelligence/','Intelligence']];
  const items = links.map(([href,label]) => `<a href="${href}"${route===href?' aria-current="page"':''}>${label}</a>`).join('');
  return `<header class="site-header"><a class="site-brand" href="/" aria-label="AD ASTRA home"><img src="/assets/brand/ad-astra-mark.svg" width="36" height="36" alt=""><span class="brand-wordmark" aria-hidden="true">AD ASTRA</span></a><nav class="site-desktop-nav" aria-label="Primary">${items}</nav><a class="site-availability" href="/status/"><span aria-hidden="true">◦</span> In development <span aria-hidden="true">↗</span></a><details class="site-menu"><summary>Menu <span aria-hidden="true">＋</span></summary><nav aria-label="Mobile navigation">${items}<a href="/company/">Company</a><a href="/platform-preview/">Workspace design</a><a href="/pricing/">Plans & availability</a></nav></details></header>`;
}
function footer() {
  return `<footer class="site-footer"><div class="site-footer-top"><a class="site-brand" href="/" aria-label="AD ASTRA home"><img src="/assets/brand/ad-astra-mark.svg" width="36" height="36" alt=""><span>AD ASTRA</span></a><p>Human curiosity.<br>Extraordinary possibilities.</p><nav aria-label="Footer"><a href="/products/">Products</a><a href="/services/">Solutions</a><a href="/intelligence/">Intelligence</a><a href="/company/">Company</a><a href="/pricing/">Plans</a><a href="/status/">Availability</a></nav></div><div class="site-footer-bottom"><span>© AD ASTRA · Beyond the expected.</span><span>Design preview. Products in development.</span><a href="/#story">Explore our story ↑</a></div></footer>`;
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
  html=html.replace(/<header\b[\s\S]*?<\/header>/,header(route)).replace(/<footer\b[\s\S]*?<\/footer>/,footer());
  if(!html.includes('href="/design-system.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/design-system.css"></head>');
  if(!html.includes('src="/design-system.js"'))html=html.replace('</head>','<script defer src="/design-system.js"></script></head>');
  return iconize(applyBrandMetadata(html,route));
}
module.exports = {esc,header,footer,head,picture,applySharedShell,iconize};
