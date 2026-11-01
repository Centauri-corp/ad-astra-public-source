'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const releaseScript = path.join(__dirname, '..', 'scripts', 'check-release.cjs');
const publicProjectId = 'prj_FX8QO3TIqUNAfFR4enz0bALmjeg1';
const publicTeamId = 'team_5xblMPo2zEBjbz4KPmeDVHPr';
const privateEngineProjectId = 'prj_Xp4ChPgnGc5AivH69sQtT89vyFkS';
const privateEngineTeamId = 'team_Sth5QRQV27xdek3gwROdfjSJ';

function checkWith(projectId, teamId) {
  return spawnSync(process.execPath, [releaseScript], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      VERCEL_PROJECT_ID: projectId,
      VERCEL_ORG_ID: teamId,
    },
    encoding: 'utf8',
    timeout: 30000,
  });
}

test('AD ASTRA release check accepts the intended public project and team', () => {
  const result = checkWith(publicProjectId, publicTeamId);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /AD_ASTRA_STATIC_RELEASE_PASS/);
});

test('AD ASTRA release check rejects private Intelligence OS project', () => {
  const result = checkWith(privateEngineProjectId, publicTeamId);
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0, 'Release guard must reject a non-public project');
});

test('AD ASTRA release check rejects private Intelligence OS team', () => {
  const result = checkWith(publicProjectId, privateEngineTeamId);
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0, 'Release guard must reject a non-public team');
});
