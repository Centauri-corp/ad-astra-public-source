/* Public-safe mirror of the canonical Graphics Intelligence Core. Test requires exact source equivalence except export. No tenant data. */
'use strict';
/**
 * AD ASTRA Graphics Intelligence Core v0.1.
 * Foundational deterministic scene compiler: no browser, inference, tenant records or network required.
 * Renderer-agnostic scene AST consumed by separate Three.js/WebGL, charts, GIS or static adapters.
 */
const GRAPHICS_CORE_VERSION='0.1.0';
const SYSTEMS=Object.freeze(['neural-field','cosmic-atlas','scientific-field','industrial-twin','knowledge-graph','temporal-flow','data-landscape']);
const VISUAL_TOKENS=Object.freeze({
  background:'#050b15',space:'#101e34',signal:'#65d6e8',energy:'#e4b878',matter:'#9faaf8',warning:'#e5a16d',foreground:'#eaf2ff',
  typography:Object.freeze({display:'system-ui',data:'ui-monospace'}),
  motion:Object.freeze({idleSeconds:18,focusSeconds:2.4,transitionSeconds:0.65}),
  lighting:Object.freeze({ambient:0.3,key:1.2,rim:0.75})
});
const CORE_SCENES=Object.freeze({
  origin:Object.freeze({system:'neural-field',title:'AD ASTRA Intelligence',motif:'connected-origin',visualRole:'identity',description:'A living constellation of knowledge, physics and human intelligence'}),
  cosmos:Object.freeze({system:'cosmic-atlas',title:'Space and Earth',motif:'orbital-field',visualRole:'exploration',description:'Planetary and orbital intelligence atlas'}),
  science:Object.freeze({system:'scientific-field',title:'Scientific Intelligence',motif:'wave-lattice',visualRole:'scientific',description:'Scientific concepts rendered as explainable geometry'}),
  industry:Object.freeze({system:'industrial-twin',title:'Industrial Intelligence',motif:'process-lattice',visualRole:'operational',description:'Measured systems and simulations, each visibly distinguished'}),
  knowledge:Object.freeze({system:'knowledge-graph',title:'Universal Knowledge',motif:'semantic-network',visualRole:'learning',description:'Explicit topic relationships, never hidden model reasoning'}),
  time:Object.freeze({system:'temporal-flow',title:'Daily Life Intelligence',motif:'chronological-ribbon',visualRole:'personal',description:'Time and progress without exposing personal records'}),
  data:Object.freeze({system:'data-landscape',title:'Analytical Intelligence',motif:'quantitative-landscape',visualRole:'analytical',description:'Auditable dimensions, scales and sources'})
});
function isObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function assertSafeText(value,name,max=180){if(typeof value!=='string'||!value.trim()||value.length>max||/[<>]/.test(value))throw Error(name+'-invalid');return value;}
function deepFreeze(value){if(isObject(value)||Array.isArray(value)){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;}
function compileScene(spec={}){
  if(!isObject(spec))throw Error('scene-spec-invalid');
  const id=assertSafeText(spec.id||'origin','scene-id',64);
  if(!/^[a-z][a-z0-9-]*$/.test(id))throw Error('scene-id-invalid');
  const preset=CORE_SCENES[id];
  if(!preset)throw Error('scene-unknown-preset');
  const variant=spec.variant||'canonical';
  if(!['canonical','educational','cinematic','analytical'].includes(variant))throw Error('scene-variant-invalid');
  const provenance=spec.provenance||'concept';
  if(!['concept','synthetic','verified-data','simulation'].includes(provenance))throw Error('scene-provenance-invalid');
  if(provenance==='verified-data'&&(!spec.sourceId||!spec.observedAt))throw Error('verified-scene-requires-source');
  if(provenance==='simulation'&&(!spec.modelId||!spec.assumptions))throw Error('simulation-requires-model');
  if(spec.customerId||spec.tenantId||spec.credentials||spec.token)throw Error('private-scene-data-not-accepted');
  const nodeId='ad-astra-'+id;
  const scene={
    schema:'ad-astra/graphics-scene/v1',coreVersion:GRAPHICS_CORE_VERSION,
    id:nodeId,title:preset.title,description:preset.description,
    system:preset.system,variant,visualRole:preset.visualRole,
    provenance:Object.freeze({kind:provenance,sourceId:spec.sourceId||null,observedAt:spec.observedAt||null,modelId:spec.modelId||null,assumptions:spec.assumptions||null}),
    accessibility:Object.freeze({label:preset.title+': '+preset.description,staticDescription:preset.description,automaticMotion:false}),
    interaction:Object.freeze({defaultMode:'static',activation:'explicit',inputs:['pointer','keyboard','touch'],interactive:false}),
    composition:Object.freeze({motif:preset.motif,root:Object.freeze({id:nodeId+'-root',kind:'composition',children:[
      Object.freeze({id:nodeId+'-field',kind:'procedural-field',geometry:preset.motif,semanticRole:preset.visualRole}),
      Object.freeze({id:nodeId+'-focus',kind:'focus-anchor',semanticRole:'navigation'}),
      Object.freeze({id:nodeId+'-annotation',kind:'accessible-annotation',semanticRole:'explanation'})
    ]})}),
    palette:VISUAL_TOKENS
  };
  return deepFreeze(scene);
}
function buildGraphicsAtlas(){
 return deepFreeze({schema:'ad-astra/graphics-atlas/v1',version:GRAPHICS_CORE_VERSION,identity:'AD ASTRA',systems:SYSTEMS,scenes:Object.keys(CORE_SCENES).map(id=>compileScene({id}))});
}
function validateScene(scene){
 if(!isObject(scene)||scene.schema!=='ad-astra/graphics-scene/v1'||!SYSTEMS.includes(scene.system))throw Error('scene-schema-invalid');
 if(!scene.accessibility?.staticDescription||scene.interaction?.defaultMode!=='static'||scene.interaction?.activation!=='explicit')throw Error('scene-accessibility-contract-failed');
 if(!scene.provenance?.kind)throw Error('scene-provenance-missing');
 return true;
}
window.AdAstraGraphicsCore=Object.freeze({GRAPHICS_CORE_VERSION,SYSTEMS,VISUAL_TOKENS,CORE_SCENES,compileScene,buildGraphicsAtlas,validateScene});
