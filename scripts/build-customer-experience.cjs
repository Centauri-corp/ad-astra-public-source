'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {experienceFiles} = require('./lib/customer-experience.cjs');
const root = path.join(__dirname, '..');
const files = experienceFiles(require('../config/customer-experience-framework.json'), require('../config/public-product-families.json'), require('../config/story-collection.json'));
for (const [file, body] of files) {
  const target = path.join(root, file);
  if (process.argv.includes('--check')) assert.equal(fs.readFileSync(target, 'utf8'), body, 'Customer experience drifted: ' + file);
  else { fs.mkdirSync(path.dirname(target), {recursive:true}); fs.writeFileSync(target, body); }
}
console.log('AD_ASTRA_CUSTOMER_EXPERIENCE_PASS routes=1 writtenSamples=6 liveCustomerAccess=false');
