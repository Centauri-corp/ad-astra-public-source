'use strict';
// Presentation-only inventory. This module NEVER authorizes model execution,
// subscriptions or activation. Source catalogs and provider receipts remain authoritative.
const { MARKET_PROFILES } = require('./model-catalog');
const { AGENTS } = require('./customer-agent-catalog');
const { OFFERS } = require('./offer-catalog');

const MAIN_ONLY_WORKSPACES = Object.freeze([
  Object.freeze({ id:'dayflow', name:'DayFlow', summary:'Daily goal and time planning', productId:'day' }),
  Object.freeze({ id:'learnpath', name:'LearnPath', summary:'Learning plans and study progression', productId:'learn' }),
  Object.freeze({ id:'careerstep', name:'CareerStep', summary:'Career planning and development', productId:'career' })
]);

function item(type, value, source, status) {
  return Object.freeze({ kind:type, id:value.id, name:value.name, summary:value.focus||value.purpose||value.summary,
    source, status, live:false });
}

function ultraCatalog() {
  const groups=[
    {id:'specialist-solutions',name:'Specialist Solutions',items:MARKET_PROFILES.map(x=>item('sector-profile',x,'lib/model-catalog.js','development-preview'))},
    {id:'intelligence-agents',name:'Intelligence Agents',items:AGENTS.map(x=>item('agent',x,'lib/customer-agent-catalog.js',x.availability))},
    {id:'capability-offers',name:'Capability Offers',items:OFFERS.map(x=>item('offer',x,'lib/offer-catalog.js',x.availability))},
    {id:'personal-workspaces',name:'Personal Workspaces',items:MAIN_ONLY_WORKSPACES.map(x=>item('workspace',x,'main:lib/customer-workspace.js','main-only-not-integrated'))}
  ];
  const all=groups.flatMap(x=>x.items);
  if (new Set(all.map(x=>x.kind+':'+x.id)).size!==all.length)throw Error('ultra-catalog-duplicate-ids');
  return Object.freeze({schema:'ad-astra/ultra-experience/v1',release:'HOLD',marketingAvailability:'development-preview',
    groups:groups.map(g=>Object.freeze({...g,items:Object.freeze(g.items)})),totalExperiences:all.length,
    launchApprovedCount:0,foundationModel:'astra-lumen',
    note:'Individual experiences include profiles, agents, offers and main-only workspaces. Counts are not unique deployed products.'});
}
module.exports={ultraCatalog,MAIN_ONLY_WORKSPACES};
