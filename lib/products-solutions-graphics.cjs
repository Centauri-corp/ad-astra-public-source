'use strict';

/**
 * Ad Astra Products & Solutions Graphics Contract v1.
 * Deterministic, renderer-agnostic scene metadata for public product surfaces.
 * No tenant data, credentials, network calls, or live claims.
 */
const VERSION='1.0.0';
const PRODUCT_SCENES=Object.freeze({
  'beyond-physics':Object.freeze({
    title:'Beyond Physics',
    eyebrow:'META-KNOWLEDGE ENGINE',
    motif:'orbital-knowledge-field',
    role:'discovery',
    description:'Connect questions, evidence and perspective across disciplines.',
    provenance:'concept'
  }),
  'astra-lumen':Object.freeze({
    title:'Astra Lumen',
    eyebrow:'GUIDED INTELLIGENCE',
    motif:'luminous-neural-core',
    role:'learning',
    description:'Turn complex subjects into clearer, human-directed next steps.',
    provenance:'concept'
  }),
  'neural-visual-experience':Object.freeze({
    title:'Neural Visual Experience',
    eyebrow:'VISUAL INTELLIGENCE',
    motif:'responsive-signal-lattice',
    role:'visualization',
    description:'Make systems, patterns and possibilities easier to see.',
    provenance:'synthetic'
  }),
  'governed-workflows':Object.freeze({
    title:'Governed AI Workflows',
    eyebrow:'PRODUCTION SYSTEMS',
    motif:'approval-control-plane',
    role:'operations',
    description:'Move from intent to action through explicit controls and review.',
    provenance:'concept'
  })
});

function assertId(id){
  if(typeof id!=='string'||!/^[a-z][a-z0-9-]*$/.test(id)||id.length>64)throw Error('product-scene-id-invalid');
  return id;
}
function compileProductScene(spec={}){
  const id=assertId(spec.id);
  const preset=PRODUCT_SCENES[id];
  if(!preset)throw Error('product-scene-unknown');
  const variant=spec.variant||'canonical';
  if(!['canonical','educational','cinematic','analytical'].includes(variant))throw Error('product-scene-variant-invalid');
  const scene=Object.freeze({
    schema:'ad-astra/products-solutions-scene/v1',
    version:VERSION,
    id:'ad-astra-products-'+id,
    title:preset.title,
    eyebrow:preset.eyebrow,
    role:preset.role,
    description:preset.description,
    motif:preset.motif,
    variant,
    provenance:preset.provenance,
    accessibility:Object.freeze({
      label:preset.title+': '+preset.description,
      staticDescription:preset.description
    }),
    interaction:Object.freeze({defaultMode:'static',activation:'explicit',interactive:false}),
    visualTokens:Object.freeze({
      background:'#07111c',
      signal:'#9bdfe3',
      horizon:'#9a7cff',
      accent:'#e9c990'
    })
  });
  return scene;
}
function buildProductsSolutionsAtlas(){
  return Object.freeze({
    schema:'ad-astra/products-solutions-atlas/v1',
    version:VERSION,
    route:'/products/',
    publicClaims:'directional-only',
    scenes:Object.freeze(Object.keys(PRODUCT_SCENES).map(id=>compileProductScene({id})))
  });
}
function validateProductScene(scene){
  if(!scene||scene.schema!=='ad-astra/products-solutions-scene/v1')throw Error('product-scene-schema-invalid');
  if(!scene.accessibility?.staticDescription||scene.interaction?.defaultMode!=='static'||scene.interaction?.activation!=='explicit')throw Error('product-scene-accessibility-contract-failed');
  return true;
}
module.exports={VERSION,PRODUCT_SCENES,compileProductScene,buildProductsSolutionsAtlas,validateProductScene};
