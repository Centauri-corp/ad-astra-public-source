'use strict';
// Export canonical graphics atlas into a local file for offline Unreal ingestion.
// No live APIs, inference, user data or deployment.
const fs=require('node:fs'),path=require('node:path');
const {buildGraphicsAtlas,validateScene}=require('../../../lib/graphics-intelligence-core.cjs');
const root=path.resolve(__dirname,'..');
const atlas=buildGraphicsAtlas();
for(const scene of atlas.scenes)validateScene(scene);
if(atlas.scenes.length!==7)throw Error('expected-seven-platform-scenes');
const exported={schema:'ad-astra/unreal-scene-bridge/v1',mode:'offline-static-contract',productionEnabled:false,graphicsCoreVersion:atlas.version,scenes:atlas.scenes.map(s=>({
 id:s.id,system:s.system,visualRole:s.visualRole,geometryMotif:s.composition.motif,
 name:s.title,provenance:s.provenance.kind,staticDescription:s.accessibility.staticDescription
}))};
const output=path.join(root,'Content','Pipeline','scene-contract.json');
if(process.argv.includes('--check')){
 const prior=JSON.parse(fs.readFileSync(output,'utf8'));
 if(JSON.stringify(prior)!==JSON.stringify(exported))throw Error('unreal-scene-contract-drift');
 console.log('UNREAL_SCENE_CONTRACT_PASS');
}else{
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,JSON.stringify(exported,null,2)+'\n');
 console.log('UNREAL_SCENE_CONTRACT_WRITTEN '+output);
}
