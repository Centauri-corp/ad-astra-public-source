'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '../governance/division-registry.json'), 'utf8'));

test('fourteen unique divisions and accountable roles', () => {
  assert.equal(registry.divisions.length, 14);
  assert.equal(new Set(registry.divisions.map(d => d.id)).size, 14);
  assert.equal(new Set(registry.divisions.map(d => d.name)).size, 14);
  registry.divisions.forEach(d => {
    assert.ok(typeof d.accountableRole === 'string' && d.accountableRole.trim());
    assert.ok(typeof d.sourceOfTruth === 'string' && d.sourceOfTruth.trim());
    assert.ok(typeof d.kpi === 'string' && d.kpi.trim());
    assert.equal(d.appointmentVerified, false, 'Cannot certify an appointment from a design document');
  });
});
test('separate CRC sister businesses are not internal AD ASTRA divisions', () => {
  assert.ok(registry.externalBusinessesNotDivisions.includes('Centauri Labs'));
  assert.equal(registry.divisions.some(d => d.name === 'Centauri Labs'), false);
  assert.equal(registry.status, 'proposed-unverified');
});
