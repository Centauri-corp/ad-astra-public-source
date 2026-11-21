'use strict';

/**
 * Read-only compatibility adapter between public Products & Solutions scene v1
 * and the canonical graphics-scene v1. No private data, network or GPU runtime.
 * Explicitly preserve product identity and provenance; do not relabel a product
 * as a verified scientific simulation.
 */
const { compileScene, validateScene, VISUAL_TOKENS } = require('./graphics-intelligence-core.cjs');
const { compileProductScene } = require('./products-solutions-graphics.cjs');

const PRODUCT_TO_CORE = Object.freeze({
  'beyond-physics': 'knowledge',
  'astra-lumen': 'origin',
  'neural-visual-experience': 'science',
  'governed-workflows': 'industry'
});

function compileUnifiedProductScene(productId, variant = 'canonical') {
  if (typeof productId !== 'string' || !Object.hasOwn(PRODUCT_TO_CORE, productId)) {
    throw new Error('unified-product-unknown');
  }
  const product = compileProductScene({ id: productId, variant });
  const core = compileScene({ id: PRODUCT_TO_CORE[productId], variant, provenance: product.provenance });
  validateScene(core);
  return Object.freeze({
    schema: 'ad-astra/unified-product-scene/v1',
    productId,
    product,
    core,
    rendererScene: core,
    visualTokens: VISUAL_TOKENS,
    accessibility: Object.freeze({
      label: product.accessibility.label,
      staticDescription: product.accessibility.staticDescription,
      automaticMotion: false
    }),
    interaction: Object.freeze({ defaultMode: 'static', activation: 'explicit', interactive: false }),
    provenance: Object.freeze({ kind: product.provenance, verified: false })
  });
}

module.exports = { PRODUCT_TO_CORE, compileUnifiedProductScene };
