'use strict';
const fs = require('node:fs'), path = require('node:path');
const {renderSocial} = require('../lib/social-metadata.cjs');
const root = path.resolve(__dirname, '../public-v3');
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
}
const pages = walk(root).filter(file => file.endsWith('.html'));
// Prepare every page before writing so a malformed template fails without partial output.
const prepared = pages.map(file => ({file, html:renderSocial(fs.readFileSync(file,'utf8'))}));
for (const {file,html} of prepared) fs.writeFileSync(file,html);
console.log('AD_ASTRA_SOCIAL_PASS pages=' + pages.length);
