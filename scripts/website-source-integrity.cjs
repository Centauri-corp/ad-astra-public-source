'use strict';
// Byte identity and public/private containment, not rights or release approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const surfaces=['public','api','lib'];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function capture(root){
  const files=[];
  for(const surface of surfaces){
    const visit=relative=>{
      const full=path.join(root,relative),stat=fs.lstatSync(full);
      assert.ok(!stat.isSymbolicLink(),'Source surface cannot contain symlinks: '+relative);
      if(stat.isDirectory()){
        for(const name of fs.readdirSync(full).sort()){
          assert.ok(!name.startsWith('.'),'Hidden file in deployment surface: '+relative+'/'+name);
          visit(relative+'/'+name);
        }
        return;
      }
      assert.ok(stat.isFile(),'Unsupported deployment entry: '+relative);
      assert.ok(!/\.map$|(?:^|\/)(?:imports|data-room|source-patches|workspace)(?:\/|$)/i.test(relative),'Private source in deployment surface: '+relative);
      const bytes=fs.readFileSync(full);
      if(surface==='public'&&/\.(?:html|js|css|json|txt|xml|svg)$/i.test(relative)){
        assert.ok(!/sk-proj-[A-Za-z0-9_-]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|ad-astra-cognitive|astra_private|source-patches\//.test(bytes.toString('utf8')),'Private material in public output: '+relative);
      }
      files.push({path:relative,bytes:bytes.length,sha256:sha(bytes)});
    };
    visit(surface);
  }
  return files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
}
function createManifest(root){
  const files=capture(root);
  return {schema:'ad-astra-website-source-integrity/v1',scope:'public-marketing-site-and-existing-api',status:'candidate',releaseAuthorization:false,surfaces,files,fingerprint:sha(JSON.stringify(files))};
}
function verify(root,manifest){
  assert.equal(manifest.schema,'ad-astra-website-source-integrity/v1');
  assert.equal(manifest.status,'candidate');assert.equal(manifest.releaseAuthorization,false);
  assert.deepEqual(manifest.surfaces,surfaces);
  const actual=createManifest(root);
  assert.deepEqual(manifest.files,actual.files,'Website bytes or file set changed; regenerate the candidate manifest and review the new source.');
  assert.equal(manifest.fingerprint,actual.fingerprint,'Website fingerprint mismatch');
  return actual;
}
if(require.main===module){
  const root=path.join(__dirname,'..'),file=path.join(root,'config/website-source-integrity.json');
  try{
    assert.ok(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--write'),'Usage: node scripts/website-source-integrity.cjs [--write]');
    if(process.argv[2]==='--write')fs.writeFileSync(file,JSON.stringify(createManifest(root),null,2)+'\n');
    const result=verify(root,JSON.parse(fs.readFileSync(file,'utf8')));
    console.log('AD_ASTRA_WEBSITE_SOURCE_PASS files='+result.files.length+' fingerprint='+result.fingerprint+' releaseAuthorization=false');
  }catch(error){console.error('AD_ASTRA_WEBSITE_SOURCE_HOLD '+error.message);process.exitCode=1;}
}
module.exports={capture,createManifest,verify};
