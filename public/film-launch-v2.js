(()=>{
  'use strict';

  function addProductionStyles(){
    if(document.querySelector('link[data-production-alignment]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/production-alignment.css';
    link.dataset.productionAlignment='true';
    document.head.append(link);
  }

  function createLink(href,text,className){
    const link=document.createElement('a');
    link.href=href;
    link.textContent=text;
    if(className)link.className=className;
    return link;
  }

  function enhanceNavigation(){
    const desktop=document.querySelector('.desktop-nav');
    if(desktop&&!desktop.querySelector('[data-products-nav]')){
      const link=createLink('/products/','Products','products-nav-link');
      link.dataset.productsNav='true';
      const menus=desktop.querySelectorAll('.nav-menu');
      const companyMenu=menus.length?menus[menus.length-1]:null;
      desktop.insertBefore(link,companyMenu);
    }

    const mobile=document.getElementById('mobile-nav');
    if(mobile&&!mobile.querySelector('[data-products-nav]')){
      const details=document.createElement('details');
      details.className='products-mobile-nav';
      details.dataset.productsNav='true';
      details.innerHTML='<summary>Products</summary><a href="/products/">All product directions</a><a href="/pricing/">Planned workspaces</a><a href="/access/#early-access-title">Early access</a>';
      const groups=mobile.querySelectorAll(':scope > details');
      mobile.insertBefore(details,groups.length?groups[groups.length-1]:null);
    }

    const chapter=document.querySelector('.chapter-nav>div');
    if(chapter&&!chapter.querySelector('a[href="#products-overview"]')){
      const link=createLink('#products-overview','Products');
      const company=chapter.querySelector('a[href="#company"]');
      chapter.insertBefore(link,company);
    }

    const footer=document.querySelector('footer nav[aria-label="Customer information"]');
    if(footer&&!footer.querySelector('a[href="/products/"]')){
      footer.insertBefore(createLink('/products/','Products'),footer.firstElementChild);
    }
  }

  function addProductsOverview(){
    if(document.getElementById('products-overview'))return;
    const company=document.getElementById('company');
    if(!company)return;
    const companyLabel=company.querySelector('.section-label span:first-child');
    if(companyLabel&&companyLabel.textContent.trim()==='04 / THE COMPANY')companyLabel.textContent='05 / THE COMPANY';
    const template=document.createElement('template');
    template.innerHTML=`
      <section class="home-products" id="products-overview" aria-labelledby="home-products-title">
        <div class="wrap">
          <div class="section-label"><span>04 / PRODUCT SYSTEMS</span><span>25 DIRECTIONS · SIX FAMILIES</span></div>
          <div class="home-products-heading">
            <div>
              <h2 id="home-products-title">Intelligence,<br><em>shaped into products.</em></h2>
            </div>
            <div>
              <p>AD ASTRA is organizing its public product direction across intelligence, creative work, specialist knowledge, business operations, development and governed agents. Every capability remains subject to product, graphics, security and exact-version release review.</p>
              <div class="home-products-actions">
                <a class="button light" href="/access/#early-access-title">Request early access <span aria-hidden="true">↗</span></a>
                <a class="button secondary" href="/products/">Explore all products</a>
              </div>
            </div>
          </div>
          <div class="home-products-grid" aria-label="AD ASTRA product families">
            <article class="home-product-family"><span>01 / 07 DIRECTIONS</span><h3>Core Intelligence</h3><p>Assistant, research, writing, translation, learning, career and life workflows shaped around human direction.</p><a href="/products/#core-intelligence">Explore Core Intelligence ↗</a></article>
            <article class="home-product-family"><span>02 / 06 DIRECTIONS</span><h3>Creative Studio</h3><p>Human-controlled image, video, voice, web, social and document experiences.</p><a href="/products/#creative-studio">Explore Creative Studio ↗</a></article>
            <article class="home-product-family"><span>03 / 05 DIRECTIONS</span><h3>Specialist Intelligence</h3><p>Security, health, science and space, finance, legal and civic directions with documented oversight.</p><a href="/products/#specialist-intelligence">Explore Specialist Intelligence ↗</a></article>
            <article class="home-product-family"><span>04 / 05 DIRECTIONS</span><h3>Business &amp; Commerce</h3><p>Governed business, marketing, customer support, data intelligence and commerce workflows.</p><a href="/products/#business-commerce">Explore Business &amp; Commerce ↗</a></article>
            <article class="home-product-family"><span>05 / 01 DIRECTION</span><h3>Developer Platform</h3><p>APIs, model gateways, bounded tools and testable engineering controls.</p><a href="/products/#developer-platform">Explore Developer Platform ↗</a></article>
            <article class="home-product-family"><span>06 / 01 DIRECTION</span><h3>Autonomous Workflows</h3><p>Human-directed agents with visible approvals, audit trails and controlled execution boundaries.</p><a href="/products/#autonomous-workflows">Explore Autonomous Workflows ↗</a></article>
          </div>
          <div class="home-products-boundary"><strong>Current release state: informational portfolio only.</strong><span>Public AI inference, paid enrollment, checkout, automatic publication and unbounded autonomous actions remain disabled.</span></div>
        </div>
      </section>`;
    company.before(template.content.firstElementChild);
  }

  function revealFilm(){
    const frame=document.querySelector('.film-launch-frame');
    if(!frame)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){frame.classList.add('is-visible');return;}
    if(!('IntersectionObserver' in window)){frame.classList.add('is-visible');return;}
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(entry.isIntersecting){frame.classList.add('is-visible');observer.disconnect();break;}
      }
    },{threshold:.16});
    observer.observe(frame);
  }

  function initialize(){
    if(document.documentElement.dataset.productionAlignment==='true')return;
    document.documentElement.dataset.productionAlignment='true';
    addProductionStyles();
    enhanceNavigation();
    addProductsOverview();
    revealFilm();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
