'use strict';

const MODELS = Object.freeze([
  Object.freeze({ id: 'astra-lumen', name: 'Astra Lumen', role: 'Fast everyday intelligence', modes: ['ask', 'learn'], visual: 'central radiant core', latency: 'fast' })
]);

const byId = new Map(MODELS.map(model => [model.id, model]));

function getModel(id) {
  return byId.get(id) || null;
}

function publicModels() {
  return MODELS.map(model => ({ ...model }));
}

module.exports = { MODELS, getModel, publicModels };
