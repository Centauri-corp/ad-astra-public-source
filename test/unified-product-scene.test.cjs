'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { PRODUCT_TO_CORE, compileUnifiedProductScene } = require('../lib/unified-product-scene.cjs');
const { validateScene, VISUAL_TOKENS } = require('../lib/graphics-intelligence-core.cjs');

test('every registered product compiles to a validated canonical scene', () => {
  for (const id of Object.keys(PRODUCT_TO_CORE)) {
    const scene = compileUnifiedProductScene(id);
    assert.equal(scene.productId, id);
    assert.equal(scene.schema, 'ad-astra/unified-product-scene/v1');
    assert.equal(scene.rendererScene.schema, 'ad-astra/graphics-scene/v1');
    assert.equal(validateScene(scene.rendererScene), true);
    assert.deepEqual(scene.visualTokens, VISUAL_TOKENS);
    assert.equal(scene.interaction.interactive, false);
    assert.equal(scene.interaction.activation, 'explicit');
    assert.equal(scene.provenance.verified, false);
    assert.ok(scene.accessibility.staticDescription);
    assert.ok(Object.isFrozen(scene));
  }
});
test('rejects unknown product and unsafe IDs', () => {
  for (const id of ['missing', '../secret', '', null, 'constructor']) {
    assert.throws(() => compileUnifiedProductScene(id), /unified-product-unknown/);
  }
});
test('cinematic variant preserves explicit static-by-default interaction', () => {
  const scene = compileUnifiedProductScene('astra-lumen', 'cinematic');
  assert.equal(scene.product.variant, 'cinematic');
  assert.equal(scene.rendererScene.variant, 'cinematic');
  assert.equal(scene.rendererScene.interaction.defaultMode, 'static');
});
test('invalid variants fail closed', () => {
  assert.throws(() => compileUnifiedProductScene('astra-lumen', 'unapproved'));
});
