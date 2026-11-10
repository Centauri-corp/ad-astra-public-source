'use strict';

const manifest = require('../public/release-manifest.json');
const products = require('../config/public-product-families.json');
const routing = require('../vercel.json');

const labels = Object.freeze({available:'Available', preview:'Preview', paused:'Paused', planned:'In development'});

// Public availability only. This registry contains no provider settings, tenant
// information, customer records, internal gate details or credentials.
function operatingStatus(engineAvailable = false, {release = manifest, redirects = routing.redirects} = {}) {
  const engineRoutesClosed = ['/platform/:path*', '/knowledge/:path*'].every(source => redirects.some(rule => rule.source === source));
  const engineReleased = engineAvailable === true && release.engineAvailable === true && release.publicLaunchEnabled === true && !engineRoutesClosed;
  const services = [
    {id:'website', name:'Public website', state:release.publicLaunchEnabled === true ? 'available' : 'preview', description:'Explore the AD ASTRA vision, visual studies and product directions.', href:'/'},
    {id:'engine', name:'Astra Polaris engine', state:engineReleased ? 'available' : 'paused', description:engineReleased ? 'The engine is available to signed-in customers.' : 'The live engine is paused while release checks are completed.', href:'/agent/'},
    {id:'products', name:'Product families', state:products.availability === 'in-development' ? 'planned' : 'preview', description:'Explore the intended audiences and outcomes across six product families.', href:'/products/'},
    {id:'workspace', name:'Customer workspace', state:'preview', description:'View the workspace design. Customer activation is being prepared.', href:'/platform-preview/'},
    {id:'crm', name:'CRM automation', state:'planned', description:'Customer lead intake and follow-up automation are being developed.'},
    {id:'billing', name:'Subscriptions and payments', state:'planned', description:'Plans, prices and checkout are being prepared. No purchase is available.', href:'/pricing/'},
    {id:'outreach', name:'Outbound messaging', state:'paused', description:'Automated customer outreach is not enabled.'}
  ];
  // CRM, billing and outreach have no accepted production adapters in this
  // release. An engine flag or a healthy provider cannot activate their states.
  return {
    schema:'ad-astra-operating-status/v1',
    basis:'release-configuration',
    services:services.map(service => ({...service, label:labels[service.state]}))
  };
}

module.exports = {operatingStatus};
