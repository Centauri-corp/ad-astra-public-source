'use strict';
(() => {
  const data = window.AD_ASTRA_HOME_DATA;
  if (!data) throw new Error('AD_ASTRA_HOME_DATA_REQUIRED');
  const {PRODUCT_FAMILIES, SOLUTIONS} = data;

  function init() {
    alignMetadata();
    alignNavigation();
    alignHero();
    buildCustomerPathways();
    buildProductUniverse();
    buildSolutions();
    reorderExperience();
    observeRevealElements();
  }

  function alignMetadata() {
    document.title = 'AD ASTRA - Intelligence for what comes next';
    const description = 'Explore AD ASTRA products and solutions for research, creativity, business, engineering, Earth and space through a governed intelligence platform.';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute('content', description);
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', description);
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) twitterDescription.setAttribute('content', description);

    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (!jsonLd) return;
    try {
      const data = JSON.parse(jsonLd.textContent || '{}');
      data.description = description;
      data.hasOfferCatalog = {
        '@type': 'OfferCatalog',
        name: 'AD ASTRA product families',
        itemListElement: PRODUCT_FAMILIES.map((product) => ({
          '@type': 'Offer',
          name: product.title,
          description: product.summary,
          availability: 'https://schema.org/PreOrder'
        }))
      };
      jsonLd.textContent = JSON.stringify(data);
    } catch {
      // Existing structured data remains untouched if parsing fails.
    }
  }

  function alignNavigation() {
    const status = document.querySelector('.site-header .status');
    if (status) {
      status.innerHTML = '<span></span> PLATFORM PREVIEW';
      status.setAttribute('aria-label', 'Platform preview');
    }

    const navMenus = Array.from(document.querySelectorAll('.desktop-nav .nav-menu'));
    const possibilities = navMenus[1];
    if (possibilities) {
      const summary = possibilities.querySelector(':scope > summary');
      if (summary) summary.innerHTML = 'Products &amp; solutions <span aria-hidden="true">⌄</span>';
      const intro = possibilities.querySelector('.mega-intro');
      if (intro) {
        intro.innerHTML = '<p class="eyebrow">02 / PRODUCT UNIVERSE</p><h2>Start with<br>what you need.</h2><p>Explore products, solutions and customer pathways.</p><a class="text-link" href="#hx-products">Explore products <span aria-hidden="true">↗</span></a>';
      }
      const links = possibilities.querySelector('.mega-links');
      if (links) {
        links.innerHTML = [
          ['#hx-products', '01', 'Products', 'Six connected product families.'],
          ['#hx-solutions', '02', 'Solutions', 'Outcomes for people and organizations.'],
          ['#neural-lab', '03', 'Neural model', 'Explore the interactive intelligence field.'],
          ['/resources/', '04', 'Knowledge network', 'Public resources with source controls.'],
          ['/knowledge/', '05', 'Workspace', 'Enter the guided knowledge experience.']
        ].map(([href, number, title, detail]) => '<a href="' + href + '"><span><i>' + number + '</i> ' + title + '</span><small>' + detail + '</small><b aria-hidden="true">↗</b></a>').join('');
      }
    }

    const mobileDetails = Array.from(document.querySelectorAll('#mobile-nav > details'));
    const mobileProducts = mobileDetails[1];
    if (mobileProducts) {
      const summary = mobileProducts.querySelector('summary');
      if (summary) summary.textContent = 'Products & solutions';
      mobileProducts.querySelectorAll('a').forEach((link) => link.remove());
      [
        ['#hx-products', 'Products'],
        ['#hx-solutions', 'Solutions'],
        ['#neural-lab', 'Neural model'],
        ['/resources/', 'Knowledge network'],
        ['/knowledge/', 'Knowledge workspace']
      ].forEach(([href, label]) => {
        const link = document.createElement('a');
        link.href = href;
        link.textContent = label;
        mobileProducts.append(link);
      });
    }
  }

  function alignHero() {
    const title = document.getElementById('hero-title');
    if (title) title.innerHTML = 'Intelligence for<br>what comes next<span>.</span>';
    const sub = document.querySelector('.hero-sub');
    if (sub) sub.textContent = 'Research. Create. Build. Decide.';
    const detail = document.querySelector('.hero-detail');
    if (detail) detail.innerHTML = 'One governed intelligence platform for people, teams,<br>science and industry.';

    const actions = document.querySelector('.hero-actions');
    if (actions) {
      const primary = actions.querySelector('.button');
      if (primary) {
        primary.href = '#hx-products';
        primary.innerHTML = 'Explore products <span aria-hidden="true">↗</span>';
      }
      const secondary = actions.querySelector('.film-launch-link');
      if (secondary) {
        secondary.href = '/knowledge/';
        secondary.removeAttribute('target');
        secondary.removeAttribute('rel');
        secondary.innerHTML = '<span class="play" aria-hidden="true">◎</span> Enter the knowledge workspace <span aria-hidden="true">↗</span>';
      }
    }

    const heroBottom = document.querySelector('.hero-bottom p');
    if (heroBottom) heroBottom.innerHTML = 'AD ASTRA INTELLIGENCE OS<span>PRODUCTS · SOLUTIONS · KNOWLEDGE</span>';
    const scroll = document.querySelector('.hero-bottom > a');
    if (scroll) {
      scroll.href = '#hx-pathways';
      scroll.innerHTML = 'START WITH YOUR GOAL <span aria-hidden="true">↓</span>';
    }
  }

  function buildCustomerPathways() {
    const hero = document.getElementById('top');
    if (!hero || document.getElementById('hx-pathways')) return;

    const section = document.createElement('section');
    section.id = 'hx-pathways';
    section.className = 'hx-section hx-pathways hx-reveal';
    section.setAttribute('aria-labelledby', 'hx-pathways-title');
    section.innerHTML = `
      <div class="hx-wrap">
        <div class="hx-kicker"><span>START WITH YOUR GOAL</span><span>ONE PLATFORM / MULTIPLE PATHS</span></div>
        <div class="hx-pathway-layout">
          <div class="hx-pathway-copy">
            <h2 id="hx-pathways-title">What do you want<br><em>to move forward?</em></h2>
            <p>Choose a direction. AD ASTRA connects the right product family, knowledge sources and human controls around the outcome you need.</p>
            <div class="hx-pathway-actions">
              <a class="hx-primary" href="#hx-products">Explore the product universe <span aria-hidden="true">↗</span></a>
              <a class="hx-secondary" href="#hx-solutions">Find a solution <span aria-hidden="true">↓</span></a>
            </div>
          </div>
          <div class="hx-pathway-grid" role="list" aria-label="Customer pathways">
            <a href="/knowledge/" role="listitem"><span>01</span><b>Understand</b><small>Research, learn and connect evidence.</small></a>
            <a href="/products/" role="listitem"><span>02</span><b>Create</b><small>Develop ideas, media and digital experiences.</small></a>
            <a href="/markets/business-professional-services/" role="listitem"><span>03</span><b>Operate</b><small>Improve customer, sales and business workflows.</small></a>
            <a href="/platform/" role="listitem"><span>04</span><b>Build</b><small>Design APIs, agents and enterprise intelligence.</small></a>
            <a href="/resources/" role="listitem"><span>05</span><b>Discover</b><small>Explore Earth, space, science and public knowledge.</small></a>
            <a href="/markets/manufacturing-energy/" role="listitem"><span>06</span><b>Engineer</b><small>Support industry, energy and technical research.</small></a>
          </div>
        </div>
        <div class="hx-signal-bar" aria-label="Current AD ASTRA product and knowledge scope">
          <span><strong>6</strong> product families</span>
          <span><strong>25</strong> product directions</span>
          <span><strong>12</strong> knowledge domains</span>
          <span><strong>42</strong> source candidates</span>
        </div>
      </div>`;
    hero.after(section);
  }

  function buildProductUniverse() {
    if (document.getElementById('hx-products')) return;
    const section = document.createElement('section');
    section.id = 'hx-products';
    section.className = 'hx-section hx-products hx-reveal';
    section.setAttribute('aria-labelledby', 'hx-products-title');
    section.innerHTML = `
      <div class="hx-wrap">
        <div class="hx-kicker"><span>PRODUCT UNIVERSE</span><span>SIX CONNECTED FAMILIES</span></div>
        <div class="hx-section-heading">
          <h2 id="hx-products-title">A product for the question.<br><em>A system for the journey.</em></h2>
          <p>AD ASTRA organizes twenty-five product directions into six families so customers can move from a single task to a complete intelligence workflow without changing platforms.</p>
        </div>
        <div class="hx-product-grid">
          ${PRODUCT_FAMILIES.map((product) => `
            <article class="hx-product-card" data-product="${product.id}">
              <div class="hx-product-top"><span>${product.index}</span><small>${product.label}</small></div>
              <h3>${product.title}</h3>
              <p>${product.summary}</p>
              <ul>${product.features.map((feature) => `<li>${feature}</li>`).join('')}</ul>
              <a href="${product.href}">${product.cta} <span aria-hidden="true">↗</span></a>
            </article>`).join('')}
        </div>
        <div class="hx-product-footer">
          <p>Product status is explicit: guided preview, private development, research direction or planned. No card implies general availability.</p>
          <a href="/products/">View all 25 product directions <span aria-hidden="true">↗</span></a>
        </div>
      </div>`;
    document.body.append(section);
  }

  function buildSolutions() {
    if (document.getElementById('hx-solutions')) return;
    const section = document.createElement('section');
    section.id = 'hx-solutions';
    section.className = 'hx-section hx-solutions hx-reveal';
    section.setAttribute('aria-labelledby', 'hx-solutions-title');
    section.innerHTML = `
      <div class="hx-wrap">
        <div class="hx-kicker"><span>SOLUTIONS</span><span>START WITH THE OUTCOME</span></div>
        <div class="hx-section-heading hx-section-heading-wide">
          <h2 id="hx-solutions-title">From personal curiosity<br><em>to enterprise operations.</em></h2>
          <p>Select an audience to reveal the most relevant solution pathways. Every workflow remains bounded by the same identity, evidence, approval and cost controls.</p>
        </div>
        <div class="hx-solution-filter" role="group" aria-label="Filter solutions by audience">
          <button type="button" aria-pressed="true" data-audience="all">All</button>
          <button type="button" aria-pressed="false" data-audience="individual">Individuals</button>
          <button type="button" aria-pressed="false" data-audience="creator">Creators</button>
          <button type="button" aria-pressed="false" data-audience="business">Business</button>
          <button type="button" aria-pressed="false" data-audience="enterprise">Enterprise</button>
          <button type="button" aria-pressed="false" data-audience="science">Science & industry</button>
        </div>
        <p class="hx-filter-status" aria-live="polite">Showing all six solution pathways.</p>
        <div class="hx-solution-grid">
          ${SOLUTIONS.map((solution, index) => `
            <article class="hx-solution-card" data-audiences="${solution.audience.join(' ')}">
              <span>${String(index + 1).padStart(2, '0')}</span>
              <h3>${solution.title}</h3>
              <p>${solution.summary}</p>
              <ul>${solution.outcomes.map((outcome) => `<li>${outcome}</li>`).join('')}</ul>
              <a href="${solution.href}">Explore this solution <span aria-hidden="true">↗</span></a>
            </article>`).join('')}
        </div>
        <div class="hx-trust-rail" aria-label="AD ASTRA operating principles">
          <span><b>Human-directed</b><small>People define the goal and approve consequential action.</small></span>
          <span><b>Evidence-aware</b><small>Sources, limits and uncertainty stay visible.</small></span>
          <span><b>Governed by design</b><small>Identity, cost, security and release gates fail closed.</small></span>
        </div>
      </div>`;

    section.querySelectorAll('.hx-solution-filter button').forEach((button) => {
      button.addEventListener('click', () => filterSolutions(section, button.dataset.audience || 'all'));
    });
    document.body.append(section);
  }

  function filterSolutions(section, audience) {
    const buttons = section.querySelectorAll('.hx-solution-filter button');
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.audience === audience)));
    let visible = 0;
    section.querySelectorAll('.hx-solution-card').forEach((card) => {
      const audiences = (card.dataset.audiences || '').split(' ');
      const show = audience === 'all' || audiences.includes(audience);
      card.hidden = !show;
      if (show) visible += 1;
    });
    const status = section.querySelector('.hx-filter-status');
    if (status) status.textContent = audience === 'all' ? 'Showing all six solution pathways.' : 'Showing ' + visible + ' solution pathways for ' + audience.replace('-', ' ') + '.';
  }

  function reorderExperience() {
    const pathways = document.getElementById('hx-pathways');
    const neuralLab = document.getElementById('neural-lab');
    const intelligenceLayer = document.getElementById('intelligence-layer');
    const products = document.getElementById('hx-products');
    const solutions = document.getElementById('hx-solutions');
    const film = document.getElementById('film');
    const systems = document.getElementById('systems');

    if (systems) {
      systems.hidden = true;
      systems.setAttribute('aria-hidden', 'true');
    }
    if (!pathways) return;
    let anchor = pathways;
    [neuralLab, intelligenceLayer, products, solutions, film].forEach((section) => {
      if (!section) return;
      anchor.after(section);
      anchor = section;
    });
  }

  function observeRevealElements() {
    const elements = Array.from(document.querySelectorAll('.hx-reveal'));
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('hx-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('hx-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold: 0.08});
    elements.forEach((element) => observer.observe(element));
  }

  window.AD_ASTRA_HOME_UI = Object.freeze({init});
})();
