'use strict';
// Web derivatives of the original native CGI; never upscale a raster source.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),dir='public/assets/neural-master/delivery';
const master='public/assets/neural-master/neural-master-landscape-3840x2160.png';
const provenance='public/assets/neural-master/manifest.json',manifest=dir+'/manifest.json';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(path.join(root,p));
(async()=>{
 const proof=JSON.parse(read(provenance)),source=proof.artifacts.find(a=>a.preset==='landscape').files.find(f=>f.path===master);
 assert.equal(hash(read(master)),source.sha256,'Native master drift');
 const checking=process.argv.includes('--check');
 assert.ok(process.argv.slice(2).every(a=>a==='--check'),'Unknown delivery option');
 const widths=[800,1600,3840],exports=[];
 if(!checking)fs.mkdirSync(path.join(root,dir),{recursive:true});
 for(const width of widths){
  const file=dir+'/neural-core-'+width+'.avif';
  if(!checking)await sharp(read(master)).resize({width,withoutEnlargement:true}).avif({quality:55,effort:6}).toFile(path.join(root,file));
  const bytes=read(file),meta=await sharp(bytes).metadata();await sharp(bytes).stats();
  assert.equal(meta.width,width);assert.equal(meta.height,width*9/16);assert.ok(bytes.length<=300000,'Hero exceeds delivery budget');
  exports.push({path:'/'+file.replace(/^public\//,''),width:meta.width,height:meta.height,bytes:bytes.length,sha256:hash(bytes)});
 }
 const expected={schema:'ad-astra-native-cgi-delivery/v1',generator:'scripts/build-neural-master-delivery.cjs',classification:'Original procedural CGI',source:{file:master,width:3840,height:2160,sha256:source.sha256,resourceId:'native-neural-cgi',provenance},encoding:{format:'avif',quality:55,effort:6,upscaled:false},exports,humanVisualApproval:null,releaseAuthorization:false};
 if(checking)assert.deepEqual(JSON.parse(read(manifest)),expected,'Delivery manifest drift');
 else fs.writeFileSync(path.join(root,manifest),JSON.stringify(expected,null,2)+'\n');
 console.log(JSON.stringify({nativeMaster:source.sha256,exports:exports.map(e=>({width:e.width,bytes:e.bytes})),check:checking}));
})().catch(e=>{console.error(e);process.exitCode=1});
