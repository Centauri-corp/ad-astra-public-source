// Keep the companion mounted when moving between supported public documents.
// Authentication, billing and page-specific applications retain normal navigation.
const allowed = new Set(['/design-system.js','/companion/app.js','/customer-experience.js','/neural/cinematic-home.js','/neural/product-showcase.js','/platform-preview/knowledge-map.js','/products/discovery.js','/homepage-experience.js','/start/experience.js','/platform-preview/app.js','/markets/california/app.js','/status/status.js','/neural/state.js','/neural/experience.js']);
const safeDocument = doc => [...doc.scripts].every(script => {
 if (!script.getAttribute('src')) return !script.textContent.trim() || script.type === 'application/ld+json';
 const url=new URL(script.getAttribute('src'),location.href);
 return url.origin===location.origin&&allowed.has(url.pathname)
  || script.hasAttribute('data-companion-auth')&&url.href==='https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6.40.1/dist/clerk.browser.js';
});
const commonStyle = href => ['/design-system.css','/customer-experience.css','/companion/companion.css','/assets/brand/experience-tokens.css'].includes(new URL(href, location.href).pathname);
export function publicNavigation({beforeChange, afterChange}) {
 document.head.querySelectorAll('link[rel="stylesheet"],style').forEach(style=>{if(style.tagName!=='LINK'||!commonStyle(style.href))style.dataset.companionRouteStyle='';});
 let generation = 0, request;
 async function navigate(url, push = true) {
  if (!safeDocument(document)) { location.assign(url.href); return; }
  const current = ++generation;
  request?.abort(); request = new AbortController();
  try {
   const response = await fetch(url.href, {headers: {Accept:'text/html'}, credentials:'same-origin', redirect:'error', signal:request.signal});
   if (!response.ok || !response.headers.get('content-type')?.startsWith('text/html')) throw Error('document_unavailable');
   const doc = new DOMParser().parseFromString(await response.text(), 'text/html'), main = doc.querySelector('main#main');
   if (current !== generation) return;
   if (!main || !safeDocument(doc) || doc.querySelector('base')) { location.assign(url.href); return; }
   window.dispatchEvent(new CustomEvent('ad-astra:before-route-change'));
   beforeChange();
   main.querySelectorAll('script').forEach(script => script.remove());
   const replace = () => {
    document.querySelector('main#main').replaceWith(document.importNode(main, true));
    document.body.className = doc.body.className;
    document.body.classList.add('motion-ready');
    document.title = doc.title;
    for (const selector of ['meta[name="description"]','meta[name="robots"]','link[rel="canonical"]','meta[property="og:title"]','meta[property="og:description"]','meta[property="og:url"]','meta[property="og:image"]']) {
     const incoming = doc.querySelector(selector), old = document.querySelector(selector);
     if (incoming && old) old.replaceWith(document.importNode(incoming, true));
    }
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach(node=>node.remove());
    doc.head.querySelectorAll('script[type="application/ld+json"]').forEach(node=>document.head.append(document.importNode(node,true)));
    document.querySelectorAll('link[data-companion-route-style],style[data-companion-route-style]').forEach(node => node.remove());
    for (const style of doc.head.querySelectorAll('link[rel="stylesheet"],style')) {
     if (style.tagName === 'LINK' && commonStyle(style.href)) continue;
     const copy = document.importNode(style, true); copy.dataset.companionRouteStyle = ''; document.head.append(copy);
    }
    if (push) history.pushState({adAstraPublicRoute:true}, '', url.href);
    for (const details of document.querySelectorAll('header details')) details.open = false;
    document.documentElement.classList.remove('site-menu-open','site-transitioning');
    document.querySelectorAll('header a[aria-current]').forEach(link => link.removeAttribute('aria-current'));
    document.querySelectorAll('header a[href]').forEach(link => { if (new URL(link.href).pathname === url.pathname) link.setAttribute('aria-current','page'); });
    const target = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
    if (target) target.scrollIntoView(); else scrollTo({top:0,behavior:'instant'});
    afterChange();
    window.dispatchEvent(new CustomEvent('ad-astra:route-change'));
    const heading = document.querySelector('main h1'); if (heading) { heading.tabIndex = -1; heading.focus({preventScroll:true}); }
   };
   // The persistent canvas stays outside view-transition snapshots and is not recreated.
   replace();
  } catch (error) { if (current === generation && error.name !== 'AbortError') location.assign(url.href); }
 }
 document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || link.target || link.download || link.relList.contains('external') || !safeDocument(document)) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || url.protocol !== 'https:' && url.hostname !== '127.0.0.1' || url.pathname === location.pathname && url.search === location.search) return;
  if (/^\/(?:api|platform|knowledge|sign-in|account)(?:\/|$)/.test(url.pathname)) return;
  event.preventDefault(); navigate(url);
 }, {capture:true});
 window.addEventListener('popstate', () => { if (safeDocument(document)) navigate(new URL(location.href), false); });
 return {navigate};
}
