'use strict';
// One execution contract for the API, catalog and release-contract tests.
const MODES = Object.freeze({
  ask: 'clarify the question and give a useful next step',
  research: 'separate claims, evidence, uncertainty and a research path',
  create: 'develop a concept with options, constraints and a small experiment',
  learn: 'explain progressively with an example and a check for understanding',
  explore: 'compare possibilities, constraints and what would falsify each one'
});
const MODE_IDS = Object.freeze(Object.keys(MODES));
module.exports = { MODES, MODE_IDS };
