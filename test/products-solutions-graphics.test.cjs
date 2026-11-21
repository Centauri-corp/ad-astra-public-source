'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {
  PRODUCT_SCENES,
  compileProductScene,
  buildProductsSolutionsAtlas,
  validateProductScene
}=require('../lib/products-solutions-graphics.cjs');

test('Products and Solutions atlas compiles every governed scene',()=>{
  const atlas=buildProductsSolutionsAtlas();
  assert.equal(atlas.route,'/products/');
  assert.equal(atlas.scenes.length,Object.keys(PRODUCT_SCENES).length);
  atlas.scenes.forEach(scene=>assert.equal(validateProductScene(scene),true));
});

test('product scene rejects unknown or unsafe ids',()=>{
  assert.throws(()=>compileProductScene({id:'unknown'}),/product-scene-unknown/);
  assert.throws(()=>compileProductScene({id:'bad id'}),/product-scene-id-invalid/);
});

test('public scene contract contains no tenant or credential fields',()=>{
  const scene=compileProductScene({id:'astra-lumen',variant:'educational'});
  assert.equal(scene.interaction.defaultMode,'static');
  assert.equal(scene.interaction.activation,'explicit');
  assert.equal('tenantId' in scene,false);
  assert.equal('credentials' in scene,false);
});
