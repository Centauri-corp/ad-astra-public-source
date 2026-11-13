'use strict';

// Internal admission contract. Never return this object from a public endpoint.
const CONTRACT = Object.freeze({
  productId: 'astra-lumen', publicName: 'Astra Polaris', publicRole: 'Connected foundation intelligence',
  runtimeModel: 'astra-lumen',
  modes: Object.freeze(['ask', 'research', 'create', 'learn', 'explore']),
  profileCount: 24, maxOutputTokens: 700, maxInputTokens: 16384,
  maxResponseBytes: 65536, maxAnswerCharacters: 6000,
});
const { publicCustomerAgents } = require('./customer-agent-catalog');
const modelKeys = ['id', 'name', 'role', 'modes', 'visual', 'latency'];
const profileKeys = ['id', 'name', 'market', 'focus', 'foundationModel'];
const agentKeys = ['id', 'name', 'purpose', 'capabilities', 'defaultMode', 'availability', 'entitlement'];
function reject() { throw new Error('model_contract_invalid'); }
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value, keys) {
  if (!object(value) || Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) reject();
}
function text(value, limit = 300) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit || /[\u0000-\u001f\u007f<>]/.test(value)) reject();
}
function sameModes(value) {
  if (!Array.isArray(value) || value.length !== CONTRACT.modes.length
    || value.some((mode, i) => mode !== CONTRACT.modes[i])) reject();
}
function validateAgents(agents) {
  if (!Array.isArray(agents) || agents.length !== 6) reject();
  const ids = new Set(), names = new Set();
  for (const agent of agents) {
    exactKeys(agent, agentKeys);
    if (!/^[a-z][a-z0-9-]{1,31}$/.test(agent.id) || ids.has(agent.id) || names.has(agent.name)) reject();
    for (const key of ['name', 'purpose', 'availability', 'entitlement']) text(agent[key]);
    if (!Array.isArray(agent.capabilities) || agent.capabilities.length < 1) reject();
    for (const capability of agent.capabilities) text(capability, 120);
    if (!CONTRACT.modes.includes(agent.defaultMode) || agent.availability !== 'development-preview' || agent.entitlement !== 'release-gate-required') reject();
    if (/provider|connector|openai|google|ollama|llama|api[-_ ]?key/i.test(JSON.stringify(agent))) reject();
    ids.add(agent.id); names.add(agent.name);
  }
  return agents.length;
}
function validateCatalog(models, profiles, agents = publicCustomerAgents()) {
  if (!Array.isArray(models) || models.length !== 1 || !Array.isArray(profiles) || profiles.length !== CONTRACT.profileCount) reject();
  const model = models[0]; exactKeys(model, modelKeys);
  if (model.id !== CONTRACT.productId || model.name !== CONTRACT.publicName || model.role !== CONTRACT.publicRole) reject();
  sameModes(model.modes);
  for (const key of ['role', 'visual', 'latency']) text(model[key]);
  const ids = new Set(), names = new Set();
  for (const profile of profiles) {
    exactKeys(profile, profileKeys);
    if (typeof profile.id !== 'string' || !/^[a-z][a-z0-9-]{1,79}$/.test(profile.id)
      || ids.has(profile.id) || names.has(profile.name) || profile.foundationModel !== CONTRACT.productId) reject();
    for (const key of ['name', 'market', 'focus']) text(profile[key]);
    if (!profile.name.startsWith('Astra ')) reject();
    ids.add(profile.id); names.add(profile.name);
  }
  return { connectedModelCount: models.length, modeCount: CONTRACT.modes.length, sectorProfileCount: profiles.length, customerAgentCount: validateAgents(agents) };
}
function validateRelease(release) {
  if (!object(release) || release.customerAiModel !== CONTRACT.productId || release.publicModelName !== CONTRACT.publicName
    || release.connectedPublicModelCount !== 1 || release.marketProfileCount !== CONTRACT.profileCount
    || release.customerAgentCount !== 6 || release.customerAgentAvailability !== 'development-preview'
    || release.marketProfileArchitecture !== 'one-connected-model-with-sector-profiles') reject();
  sameModes(release.customerModes);
  if (release.intelligenceLayers?.agi !== 'research-direction' || release.intelligenceLayers?.asi !== 'hypothetical-horizon'
    || release.intelligenceLayers?.liveTelemetry !== false) reject();
  return true;
}
function validateCompletion(data) {
  if (!object(data) || data.object !== 'chat.completion' || data.model !== CONTRACT.runtimeModel
    || !Array.isArray(data.choices) || data.choices.length !== 1) reject();
  const choice = data.choices[0], message = choice?.message;
  if (choice?.index !== 0 || choice.finish_reason !== 'stop' || !object(message) || message.role !== 'assistant'
    || (message.refusal !== undefined && message.refusal !== null)
    || (message.tool_calls != null && (!Array.isArray(message.tool_calls) || message.tool_calls.length !== 0))
    || message.function_call != null) reject();
  const answer = message.content;
  if (typeof answer !== 'string' || !answer.trim() || answer.length > CONTRACT.maxAnswerCharacters || answer.includes('\u0000')) reject();
  const usage = data.usage;
  if (!object(usage) || !['prompt_tokens', 'completion_tokens', 'total_tokens'].every(key => Number.isSafeInteger(usage[key]) && usage[key] >= 0)
    || usage.prompt_tokens < 1 || usage.completion_tokens < 1
    || usage.prompt_tokens > CONTRACT.maxInputTokens || usage.completion_tokens > CONTRACT.maxOutputTokens
    || usage.total_tokens !== usage.prompt_tokens + usage.completion_tokens) reject();
  return answer.trim();
}
async function readCompletion(response) {
  if (!response?.ok || !/^application\/json(?:\s*;|$)/i.test(response.headers?.get('content-type') || '')) {
    await response?.body?.cancel(); reject();
  }
  const length = response.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > CONTRACT.maxResponseBytes)) {
    await response.body?.cancel(); reject();
  }
  if (typeof response.body?.getReader !== 'function') reject();
  const reader = response.body.getReader(), chunks = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > CONTRACT.maxResponseBytes) { await reader.cancel(); reject(); }
      chunks.push(value);
    }
    return validateCompletion(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))));
  } finally { reader.releaseLock(); }
}
module.exports = { CONTRACT, validateCatalog, validateAgents, validateRelease, validateCompletion, readCompletion };
