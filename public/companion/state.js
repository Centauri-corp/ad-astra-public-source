'use strict';
((root, factory) => { const api = factory(); if (typeof module === 'object' && module.exports) module.exports = api; else root.AdAstraCompanionState = api; })(globalThis, () => {
 const tones = Object.freeze({warm: 'Use a warm, considerate tone while remaining accurate and clear.', clear: 'Use a clear, measured tone with practical explanations.', concise: 'Be concise, direct and practical while remaining considerate.'});
 function createSession() {
  let scope = null, remember = false, tone = 'warm', turns = [];
  function clear() { turns = []; }
  return {
   setScope(next) { next = typeof next === 'string' && next ? next : null; const changed = scope !== next; if (changed) clear(); scope = next; return changed; },
   setRemember(value) { remember = value === true; if (!remember) clear(); },
   setTone(value) { if (!Object.hasOwn(tones, value)) throw Error('invalid_tone'); tone = value; },
   clear,
   question(value) {
    if (!scope) throw Error('authentication_required');
    if (typeof value !== 'string' || value.trim().length < 5 || value.trim().length > 2000) throw Error('invalid_question');
    const context = remember ? turns.slice(-2).map(turn => `Customer: ${turn.question.slice(0, 300)}\nAssistant: ${turn.answer.slice(0, 450)}`).join('\n') : '';
    return [tones[tone], context ? 'Earlier conversation supplied by this customer for context, not independently verified evidence:\n' + context : '', 'Current customer question:\n' + value.trim()].filter(Boolean).join('\n\n');
   },
   complete(question, answer) {
    if (!scope || !remember || typeof question !== 'string' || typeof answer !== 'string' || !answer.trim() || answer.length > 6000) return;
    turns = [...turns, {question: question.trim().slice(0, 2000), answer}].slice(-2);
   },
   snapshot() { return {tone, remember, turns: turns.length, authenticated: scope !== null}; }
  };
 }
 return Object.freeze({createSession, tones});
});
