import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,symlink,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {collectAdvisory} from '../collection/govuk-advisory.mjs';
import {readCollectionCatalog,createCollectionServer} from '../collection/local-service.mjs';
import {loadLocalCaptures,parseCollectionCatalog,localCollectionOrigin} from '../dist/collection-client.mjs';
const at=new Date('2026-10-05T12:00:00Z'),extractText=s=>s;
async function success(checkedAt='2026-10-05T10:00:00Z'){
  return collectAdvisory({now:()=>new Date(checkedAt),fetchImpl:async()=>new Response(JSON.stringify({base_path:'/foreign-travel-advice/india',schema_name:'travel_advice',document_type:'travel_advice',locale:'en',content_id:'authored-local-test',title:'Authored local test',public_updated_at:'2026-10-01T00:00:00Z',withdrawn_notice:{},details:{parts:['warnings-and-insurance','safety-and-security','regional-risks'].map(slug=>({slug,title:slug,body:'<p>Authored non-sensitive local bridge control.</p>'}))}}),{headers:{'content-type':'application/json'}})});
}
const failed=(base,checkedAt)=>({...base,id:randomUUID(),checkedAt,status:'failed',reason:'rate_limited',httpStatus:429,snapshot:null});
async function directory(t){const root=await mkdtemp(path.join(tmpdir(),'ruthless-collection-test-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
const put=(root,r)=>writeFile(path.join(root,`${r.id}.json`),JSON.stringify(r));
async function running(t,root){const server=createCollectionServer({directory:root,now:()=>at});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});return {server,origin:`http://127.0.0.1:${server.address().port}`};}
const request=(origin,extra={})=>fetch(`${origin}/api/collection/latest`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Ruthless-Request':'collection-review-v1',...extra},body:'{}'});

test('local catalog selects latest failure and retains a separate validated success',async t=>{
  const root=await directory(t),r=await success();await put(root,r);await put(root,failed(r,'2026-10-05T11:00:00Z'));
  const catalog=await readCollectionCatalog(root,{at});assert.equal(catalog.reportCount,2);assert.equal(catalog.lastAttempt.reason,'rate_limited');assert.equal(catalog.lastSuccess.id,r.id);assert.equal(catalog.lastSuccess.sections,undefined);
  const parsed=await parseCollectionCatalog(JSON.stringify(catalog),{at,extractText});assert.equal(parsed.lastAttempt.status,'failed');assert.equal(parsed.lastSuccess.sections.length,3);
});
test('newest success avoids redundant payload; simultaneous failure stays visible',async t=>{
  const root=await directory(t),r=await success();await put(root,r);await put(root,failed(r,'2026-10-05T09:00:00Z'));
  let c=await readCollectionCatalog(root,{at});assert.equal(c.lastAttempt.id,r.id);assert.equal(c.lastSuccess,null);
  assert.equal((await parseCollectionCatalog(JSON.stringify(c),{at,extractText})).lastSuccess.id,r.id);
  await put(root,failed(r,r.checkedAt));c=await readCollectionCatalog(root,{at});assert.equal(c.lastAttempt.status,'failed');assert.equal(c.lastSuccess.id,r.id);
});
test('missing directory is explicitly empty and unrelated filenames cannot become reports',async t=>{
  const root=await directory(t);await writeFile(path.join(root,'not-a-report.json'),'bad');assert.equal((await readCollectionCatalog(root,{at})).reportCount,0);
  assert.equal((await readCollectionCatalog(path.join(root,'missing'),{at})).reportCount,0);
});
test('corrupt, future, mismatched identities and oversized reports reject the entire catalog',async t=>{
  for(const kind of ['corrupt','future','identity','oversize']){
    const root=await directory(t),r=await success();await put(root,r);const bad=failed(r,'2026-10-05T11:00:00Z');
    if(kind==='future')bad.checkedAt='2026-10-06T00:00:00Z';if(kind==='identity')bad.id=r.id;
    await writeFile(path.join(root,`${kind==='identity'?randomUUID():bad.id}.json`),kind==='corrupt'?'{':kind==='oversize'?'a'.repeat(2*1024*1024+1):JSON.stringify(bad));
    await assert.rejects(()=>readCollectionCatalog(root,{at}));
  }
});
test('directories and directory symlinks cannot be loaded as capture files',async t=>{
  const root=await directory(t);await mkdir(path.join(root,`${randomUUID()}.json`));await assert.rejects(()=>readCollectionCatalog(root,{at}),/Invalid/);
  const target=await directory(t),link=path.join(target,'linked');await symlink(root,link,'junction');await assert.rejects(()=>readCollectionCatalog(link,{at}),/directory/);
});
test('catalog bounds directory entries and total report bytes',async t=>{
  const root=await directory(t);for(let i=0;i<101;i++)await writeFile(path.join(root,`unrelated-${i}`),'');await assert.rejects(()=>readCollectionCatalog(root,{at}),/limit/);
  const second=await directory(t),r=await success();r.scope='x'.repeat(300);
  for(let i=0;i<9;i++){const big=structuredClone(r);big.id=randomUUID();big.snapshot.parts.forEach(p=>p.originalHtml='x'.repeat(650000));const {digest}=await import('../dist/collection-core.mjs');big.snapshot.selectedContentSha256=await digest(JSON.stringify(big.snapshot.parts));await put(second,big);}
  await assert.rejects(()=>readCollectionCatalog(second,{at}),/scan/);
});
test('real same-origin HTTP bridge is read-only, bounded and separate from AI/backend routes',async t=>{
  const root=await directory(t),r=await success();await put(root,r);const {origin}=await running(t,root);
  const status=await fetch(`${origin}/api/collection/status`);assert.equal(status.status,200);assert.equal((await status.json()).mode,'read-only');
  const response=await request(origin);assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),null);assert.equal(response.headers.get('cache-control'),'no-store');
  const loaded=await loadLocalCaptures({origin,at,extractText,fetchImpl:(url,opts)=>fetch(url,{...opts,headers:{...opts.headers,Origin:origin}})});assert.equal(loaded.lastSuccess.sections.length,3);
  for(const route of ['/api/ai/status','/api/workspaces','/.collection-runtime/'+r.id+'.json'])assert.equal((await fetch(origin+route)).status,404);
  const after=await readCollectionCatalog(root,{at});assert.equal(after.reportCount,1);assert.equal(after.lastAttempt.id,r.id);
});
test('cross-origin, missing review marker, foreign host, cookies and path input cannot read reports',async t=>{
  const root=await directory(t),{origin}=await running(t,root);
  for(const headers of [{Origin:'https://foreign.invalid'},{'X-Ruthless-Request':''},{'Sec-Fetch-Site':'cross-site'},{Cookie:'session=test'},{Authorization:'test'}])assert.equal((await request(origin,headers)).status,403,JSON.stringify(headers));
  assert.equal((await fetch(`${origin}/api/collection/latest`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Ruthless-Request':'collection-review-v1'},body:'{"path":"x"}'})).status,400);
  assert.equal((await fetch(`${origin}/api/collection/latest`)).status,404);
  const foreign=await new Promise((resolve,reject)=>{const u=new URL(origin);const req=http.request({hostname:u.hostname,port:u.port,path:'/api/collection/latest',method:'POST',headers:{Host:'foreign.invalid',Origin:origin,'Content-Type':'application/json','X-Ruthless-Request':'collection-review-v1'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end('{}');});assert.equal(foreign,403);
  const duplicate=await new Promise((resolve,reject)=>{const u=new URL(origin);const req=http.request({hostname:u.hostname,port:u.port,path:'/api/collection/latest',method:'POST',headers:['Host',u.host,'Origin',origin,'Origin',origin,'Content-Type','application/json','X-Ruthless-Request','collection-review-v1']},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end('{}');});assert.equal(duplicate,403);
});
test('invalid matching local file returns a visible whole-catalog failure',async t=>{
  const root=await directory(t),r=await success();await put(root,r);await writeFile(path.join(root,`${randomUUID()}.json`),'{');const {origin}=await running(t,root);
  const res=await request(origin);assert.equal(res.status,422);assert.equal((await res.json()).error,'collection_catalog_invalid');
});
test('client refuses hosted origins before fetching and validates catalog relations atomically',async()=>{
  let calls=0;await assert.rejects(()=>loadLocalCaptures({origin:'https://project.example',fetchImpl:()=>{calls++;}}));assert.equal(calls,0);
  for(const origin of ['http://localhost:4175','http://127.0.0.1:4175/path','https://127.0.0.1:4175','http://127.0.0.1:4175@evil.invalid'])assert.equal(localCollectionOrigin(origin),false);
  assert.equal(localCollectionOrigin('http://127.0.0.1:4175'),true);
  const r=await success(),base={format:'ruthless-collection-catalog',version:1,sourceId:r.sourceId,reportCount:1,lastAttempt:r,lastSuccess:null};
  for(const mutate of [c=>c.reportCount=0,c=>c.extra=true,c=>c.lastSuccess=r,c=>c.lastAttempt.snapshot.parts[0].originalHtml='tampered',c=>c.lastAttempt.checkedAt='2026-10-06T00:00:00Z']){const c=structuredClone(base);mutate(c);await assert.rejects(()=>parseCollectionCatalog(JSON.stringify(c),{at,extractText}));}
  const c={...base,lastAttempt:failed(r,'2026-10-05T09:00:00Z'),lastSuccess:r,reportCount:2};await assert.rejects(()=>parseCollectionCatalog(JSON.stringify(c),{at,extractText}),/retained/);
});
test('client checks transport metadata and streamed response limits without using partial reports',async()=>{
  const origin='http://127.0.0.1:4175';
  for(const mode of ['mime','url','oversize','declared','invalid-utf8']){
    await assert.rejects(()=>loadLocalCaptures({origin,at,extractText,fetchImpl:async()=>{
      const bytes=mode==='invalid-utf8'?new Uint8Array([0xff]):mode==='oversize'?'x'.repeat(4*1024*1024+4097):'{}';
      const res=new Response(bytes,{headers:{'content-type':mode==='mime'?'text/html':'application/json',...(mode==='declared'?{'content-length':'99999999'}:{})}});Object.defineProperty(res,'url',{value:mode==='url'?'https://foreign.invalid':`${origin}/api/collection/latest`});return res;
    }}));
  }
});
