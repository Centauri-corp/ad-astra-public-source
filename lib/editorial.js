'use strict';
const crypto=require('node:crypto');
const QUERY='*[_type == "landingPage" && _id in $ids && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && editorialStatus == "approved_for_public"]{_id,_rev,_type,editorialStatus,title,summary,seoTitle,seoDescription,"slug":slug.current,body[]{_type,style,children[]{_type,text}}}';
function digest(doc){return crypto.createHash('sha256').update(JSON.stringify(doc)).digest('hex');}
function validate(doc, approval){
 if(!doc||doc._type!=='landingPage'||doc._id!==approval.id||/^(drafts\.|versions\.|_\.)/.test(doc._id)||doc._rev!==approval.revision||doc.editorialStatus!=='approved_for_public'||digest(doc)!==approval.sha256)throw Error('Editorial approval mismatch');
 if(typeof doc.slug!=='string'||!/^discover\/[a-z0-9-]+$/.test(doc.slug)||doc.slug!==approval.slug)throw Error('Editorial route not approved');
 for(const key of ['title','summary','seoTitle','seoDescription'])if(typeof doc[key]!=='string'||doc[key].length>1000)throw Error('Invalid editorial text');
 if(!Array.isArray(doc.body)||doc.body.length>100)throw Error('Invalid editorial body');
 for(const b of doc.body){if(b._type!=='block'||!['normal','h2','h3'].includes(b.style)||!Array.isArray(b.children)||b.children.length>40)throw Error('Unsupported editorial block');
 for(const s of b.children)if(s._type!=='span'||typeof s.text!=='string'||s.text.length>5000)throw Error('Unsupported editorial span');}
 return doc;
}
function escape(value){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderBody(doc){return doc.body.map(b=>{const tag=b.style==='normal'?'p':b.style;return '<'+tag+'>'+escape(b.children.map(s=>s.text).join(''))+'</'+tag+'>';}).join('');}
async function readApproved(config, token, transport=fetch){
 if(config.projectId!=='6a4vgjc9'||config.dataset!=='production'||config.perspective!=='published'||!Array.isArray(config.approvals)||config.approvals.length>100)throw Error('Unapproved CMS boundary');
 if(!config.approvals.length)return [];
 const ids=config.approvals.map(a=>a.id);
 if(new Set(ids).size!==ids.length||config.approvals.some(a=>!a.id||/^(drafts\.|versions\.|_\.)/.test(a.id)||!a.revision||!/^discover\/[a-z0-9-]+$/.test(a.slug)||!/^[a-f0-9]{64}$/.test(a.sha256)))throw Error('Invalid approval manifest');
 if(!token)throw Error('Server read credential required');
 const url=new URL('https://6a4vgjc9.api.sanity.io/v2026-10-23/data/query/production');
 url.searchParams.set('perspective','published');url.searchParams.set('query',QUERY);url.searchParams.set('$ids',JSON.stringify(ids));
 const response=await transport(url,{headers:{Authorization:'Bearer '+token},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Editorial source unavailable');
 const payload=await response.json();if(!Array.isArray(payload.result)||payload.result.length!==ids.length)throw Error('Approved published revision missing');
 const result=config.approvals.map(a=>validate(payload.result.find(d=>d._id===a.id),a));
 if(new Set(result.map(d=>d.slug)).size!==result.length)throw Error('Duplicate editorial routes');
 return result;
}
module.exports={QUERY,digest,validate,escape,renderBody,readApproved};
