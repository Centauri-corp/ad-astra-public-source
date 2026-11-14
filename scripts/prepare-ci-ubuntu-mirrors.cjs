'use strict';
// Hosted-runner setup only. Preserve suites, components and Signed-By keys;
// replace the observed failing Azure mirror indirection with official HTTPS.
const fs=require('node:fs'),assert=require('node:assert/strict');
function normalizeUbuntuMirrors(text){
 return text
  .replace(/mirror\+file:\/\/\/etc\/apt\/apt-mirrors-security\.txt/g,'https://security.ubuntu.com/ubuntu')
  .replace(/mirror\+file:\/etc\/apt\/apt-mirrors-security\.txt/g,'https://security.ubuntu.com/ubuntu')
  .replace(/mirror\+file:\/\/\/etc\/apt\/apt-mirrors\.txt/g,'https://archive.ubuntu.com/ubuntu')
  .replace(/mirror\+file:\/etc\/apt\/apt-mirrors\.txt/g,'https://archive.ubuntu.com/ubuntu')
  .replace(/https?:\/\/azure\.archive\.ubuntu\.com\/ubuntu\b/g,'https://archive.ubuntu.com/ubuntu')
  .replace(/http:\/\/archive\.ubuntu\.com\/ubuntu\b/g,'https://archive.ubuntu.com/ubuntu')
  .replace(/http:\/\/security\.ubuntu\.com\/ubuntu\b/g,'https://security.ubuntu.com/ubuntu');
}
if(require.main===module){
 assert.deepEqual(process.argv.slice(2),['--apply']);
 assert.equal(process.env.CI,'true','Mirror repair is only permitted in CI');
 assert.equal(process.env.RUNNER_ENVIRONMENT,'github-hosted','Only the disposable GitHub-hosted runner may be modified');
 assert.equal(process.platform,'linux');
 const paths=['/etc/apt/sources.list','/etc/apt/sources.list.d/ubuntu.sources'];
 let found=0,changed=0;
 for(const file of paths){
  if(!fs.existsSync(file))continue;found++;
  const before=fs.readFileSync(file,'utf8'),after=normalizeUbuntuMirrors(before);
  if(before!==after){fs.writeFileSync(file,after);changed++;}
 }
 assert.ok(found,'Expected Ubuntu runner repository configuration was not found');
 console.log('AD_ASTRA_CI_UBUNTU_MIRRORS files='+found+' updated='+changed+' officialHttps=true signingConfiguration=preserved');
}
module.exports={normalizeUbuntuMirrors};
