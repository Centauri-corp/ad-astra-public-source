'use strict';
// Real browser, generated conversation source, local HTTP and synthetic streams.
// No deployed pages, source inventory, identity provider or model is contacted.
const { chromium } = require('playwright');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { conversationSection } = require('./lib/neural-conversation.cjs');
const agents = require('../lib/customer-agent-catalog').publicCustomerAgents();
const root = path.join(__dirname, '..');
async function main() {
  const asks = [], external = [], errors = [];
  let responseKind = 'success', pending;
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/api/ask') {
      const chunks = []; for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      asks.push({ body, idempotencyKey: request.headers['idempotency-key'], requestId: crypto.randomUUID() });
      const current = asks.at(-1);
      const reply = () => {
        const at = new Date().toISOString(), answer = { answer: 'Synthetic browser answer. <script>not executable</script>', mode: body.mode, agentId: responseKind === 'mismatch' ? (body.agentId === 'guide' ? 'visual' : 'guide') : body.agentId };
        const rows = ['accepted', 'requesting', 'answer', 'completed'].map((type, i) => ({
          schema: 'ad-astra-engine-event/v1', requestId: current.requestId, sequence: i + 1, type, at, ...(type === 'answer' ? answer : {})
        }));
        response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Request-Id': current.requestId });
        response.end(rows.map(row => 'event: ' + row.type + '\ndata: ' + JSON.stringify(row) + '\n\n').join(''));
      };
      if (responseKind === 'pending') pending = reply; else reply();
      return;
    }
    if (['/neural/engine-client.js', '/neural/conversation.js'].includes(url.pathname)) {
      response.writeHead(200, { 'Content-Type': 'text/javascript' });
      return response.end(fs.readFileSync(path.join(root, 'public', url.pathname)));
    }
    if (url.pathname === '/favicon.ico') { response.writeHead(204); return response.end(); }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Local selection fixture</title><body data-authenticated="true"><main>'
      + conversationSection() + '</main><script src="/neural/engine-client.js"></script><script src="/neural/conversation.js"></script><script>window.AdAstraConversation.mount(document.querySelector(".neural-conversation"))</script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.route('**/*', async route => {
      if (new URL(route.request().url()).origin !== origin) { external.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    await context.addInitScript(() => {
      window.Clerk = { session: { id: 'sess_syntheticBrowser', getToken: async () => 'synthetic-browser-token' } };
      window.AdAstraVoice = { create: () => ({ stop() {}, dispose() {}, dictate() {}, speak() {} }) };
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/?agentId=visual&mode=create');
    assert.equal(await page.locator('[name=agentId]').inputValue(), 'visual');
    assert.equal(await page.locator('[name=mode]').inputValue(), 'create');
    assert.equal(await page.locator('[name=agentId] option').count(), agents.length);
    for (const agent of agents) {
      await page.selectOption('[name=agentId]', agent.id);
      assert.equal(await page.locator('[name=mode]').inputValue(), agent.defaultMode);
      await page.fill('[name=question]', 'A synthetic selected profile question.');
      await page.getByRole('button', { name: 'Send authenticated request', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-conversation-status]').textContent.startsWith('Response complete.'));
      const last = asks.at(-1);
      assert.equal(last.body.agentId, agent.id); assert.equal(last.body.mode, agent.defaultMode);
      assert.equal(await page.locator('[data-engine-answer]').getAttribute('data-agent-id'), agent.id);
      assert.equal(await page.locator('[data-engine-answer]').getAttribute('data-request-id'), last.requestId);
      assert.equal(await page.locator('[data-engine-answer] script').count(), 0);
    }
    assert.equal(new Set(asks.map(ask => ask.idempotencyKey)).size, agents.length);
    responseKind = 'mismatch';
    await page.getByRole('button', { name: 'Send authenticated request', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-conversation-status]').textContent.includes('could not be verified'));
    assert.equal(await page.locator('[data-engine-answer]').textContent(), '');
    assert.equal(await page.locator('[data-voice-read]').isDisabled(), true);
    responseKind = 'pending';
    await page.getByRole('button', { name: 'Send authenticated request', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[name=agentId]').disabled);
    assert.equal(await page.locator('[name=mode]').isDisabled(), true);
    await page.waitForTimeout(50); await page.locator('[data-conversation-stop]').click();
    responseKind = 'success'; pending?.(); pending = null;
    await page.waitForTimeout(50); assert.equal(await page.locator('[data-engine-answer]').textContent(), '');
    for (const search of ['?agentId=unknown', '?agentId=visual&agentId=guide', '?agentId=__proto__&mode=__proto__']) {
      await page.goto(origin + '/' + search);
      assert.equal(await page.locator('[name=agentId]').inputValue(), 'guide');
      assert.match(await page.locator('[data-conversation-status]').textContent(), /unsupported/);
    }
    await page.locator('[name=agentId]').focus(); await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('[name=agentId]').inputValue(), agents[1].id);
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
    assert.deepEqual(external, []); assert.deepEqual(errors, []);
    console.log(JSON.stringify({ scope: 'local-browser-synthetic-streams-only', agents: agents.length, deepLinks: 'pass',
      responseCorrelation: 'pass', cancellation: 'pass', keyboard: 'pass', providerCalls: 0, productionAuthorized: false }));
    await context.close();
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
if (require.main === module) main().catch(() => { console.error('AGENT_SELECTION_BROWSER_FAILED'); process.exitCode = 1; });
module.exports = { main };
