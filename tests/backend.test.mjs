import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdtemp,readFile,rm,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {localTokenAuthenticator,authorize} from '../backend/auth.mjs';
import {openWorkspaceStore,MAX_SAVED_VERSIONS} from '../backend/store.mjs';
import {createBackendServer} from '../backend/http.mjs';
import {demoWorkspace,updateAssessment} from '../dist/threat-core.mjs';

const time=Date.parse('2026-10-04T15:00:00Z');
const principal=(extra={})=>({subject:'analyst-one',tenantId:'training-a',role:'analyst',workspaceIds:['desk-a'],expiresAt:time+60_000,...extra});
const matches=(status,code)=>error=>error.status===status&&error.code===code;
const tokenGrant=(extra={})=>{const token=randomBytes(32).toString('base64url');return {token,grant:{...principal(),tokenHash:createHash('sha256').update(token).digest('hex'),...extra}};};
async function fixture(check,{disk=false}={}) {
  const dir=disk?await mkdtemp(path.join(tmpdir(),'ruthless-backend-')):null,file=disk?path.join(dir,'test.sqlite'):':memory:',key=randomBytes(32);
  const options={file,tenantId:'training-a',key,now:()=>time};
  let store=openWorkspaceStore(options);
  try { await check({get store(){return store;},file,key,reopen(){store.close();store=openWorkspaceStore(options);return store;}}); }
  finally {store.close();key.fill(0);if(dir){await rm(file,{force:true});await rmdir(dir);}}
}
async function httpFixture(check) {
  const store=openWorkspaceStore({file:':memory:',tenantId:'training-a',key:randomBytes(32),now:()=>time});
  let clock=time;
  const analyst=tokenGrant(),reader=tokenGrant({subject:'reader-one',role:'reader'}),auditor=tokenGrant({subject:'auditor-one',role:'auditor'}),foreign=tokenGrant({tenantId:'training-b'});
  const tokenAuth=localTokenAuthenticator([analyst,reader,auditor,foreign].map(x=>x.grant),{now:()=>clock});
  let onAuthentication;
  const authenticate=value=>{const p=tokenAuth(value);onAuthentication?.();onAuthentication=null;return p;};
  const server=createBackendServer({store,authenticate});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const request=(method='GET',suffix='',{token=analyst.token,headers={},body}={})=>fetch(origin+'/api/workspaces/desk-a'+suffix,{method,headers:{Authorization:`Bearer ${token}`,...headers},body});
  const put=(workspace=demoWorkspace(),revision=0,options={})=>request('PUT','',{...options,headers:{'Content-Type':'application/json','If-Match':`"${revision}"`,...options.headers},body:JSON.stringify({workspace})});
  try {await check({store,origin,request,put,analyst,reader,auditor,foreign,nextAuthentication(){return new Promise(resolve=>{onAuthentication=resolve;});},expire(){clock=time+60_001;}});}
  finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();}
}

test('local authentication requires a unique configured credential and rejects expiry, malformed or missing input',()=>{
  const {token,grant}=tokenGrant(),auth=localTokenAuthenticator([grant],{now:()=>time});
  for(const value of [undefined,'','Bearer short','Basic '+token,'Bearer '+randomBytes(32).toString('base64url')]) assert.throws(()=>auth(value),matches(401,'unauthenticated'));
  const p=auth('Bearer '+token);assert.equal(p.subject,grant.subject);assert.ok(!JSON.stringify(p).includes(token));assert.ok(!('tokenHash' in p));
  assert.throws(()=>localTokenAuthenticator([grant,grant]),/Duplicate/);
  assert.throws(()=>localTokenAuthenticator([{...grant,role:'admin'}]),/Invalid/);
  assert.throws(()=>localTokenAuthenticator([{...grant,workspaceIds:['*']}]),/Invalid/);
  assert.throws(()=>localTokenAuthenticator([{...grant,expiresAt:time}],{now:()=>time})('Bearer '+token),matches(401,'unauthenticated'));
  grant.workspaceIds.push('other');assert.deepEqual(p.workspaceIds,['desk-a']);assert.ok(Object.isFrozen(p));
});

test('authorization denies unknown actions, roles, workspaces and foreign tenants by default',()=>{
  for(const [p,id,action] of [[principal({tenantId:'training-b'}),'desk-a','read'],[principal(),'unknown','read'],[principal({role:'reader'}),'desk-a','write'],[principal({role:'analyst'}),'desk-a','audit'],[principal({role:'auditor'}),'desk-a','read'],[principal({role:'admin'}),'desk-a','write'],[principal(),'desk-a','delete']]) assert.throws(()=>authorize(p,'training-a',id,action,time),matches(403,'forbidden'));
  assert.throws(()=>authorize({...principal(),expiresAt:time},'training-a','desk-a','read',time),matches(401,'unauthenticated'));
});

test('encrypted workspace survives close/reopen with revision and server actor receipt',async()=>{
  await fixture(async f=>{
    assert.deepEqual(f.store.save(principal(),'desk-a',0,demoWorkspace()),{revision:1,reviewAuthority:'client_assertions_only'});
    f.reopen();assert.deepEqual(f.store.read(principal(),'desk-a').workspace,demoWorkspace());
    const audit=f.store.audit(principal({role:'auditor'}),'desk-a');assert.equal(audit.events[0].actor,'analyst-one');assert.equal(audit.events[0].revision,1);assert.equal(audit.rollbackProtection,false);
    const bytes=await readFile(f.file);assert.ok(!bytes.includes(Buffer.from('Domestic incident report')));assert.ok(!bytes.includes(Buffer.from('Geographic proximity')));
  },{disk:true});
});

test('conflicting writers cannot silently overwrite prior revisions or append failed audit events',async()=>{
  await fixture(({store})=>{
    const w=demoWorkspace();store.save(principal(),'desk-a',0,w);w.assessments[0].gaps='First writer';store.save(principal(),'desk-a',1,w);
    w.assessments[0].gaps='Stale writer';assert.throws(()=>store.save(principal(),'desk-a',1,w),matches(409,'revision_conflict'));
    assert.equal(store.read(principal(),'desk-a').workspace.assessments[0].gaps,'First writer');assert.equal(store.audit(principal({role:'auditor'}),'desk-a').events.length,2);
  });
});

test('a second database connection sees committed revisions and rejects its stale write',async()=>{
  await fixture(f=>{const second=openWorkspaceStore({file:f.file,tenantId:'training-a',key:f.key,now:()=>time});try{f.store.save(principal(),'desk-a',0,demoWorkspace());assert.throws(()=>second.save(principal(),'desk-a',0,demoWorkspace()),matches(409,'revision_conflict'));assert.equal(second.read(principal(),'desk-a').revision,1);}finally{second.close();}},{disk:true});
});

test('invalid workspace and non-synthetic records fail without stored versions',async()=>{
  await fixture(({store})=>{
    assert.throws(()=>store.save(principal(),'desk-a',0,{version:999}),matches(400,'invalid_workspace'));
    const w=demoWorkspace();w.evidence[0].synthetic=false;w.evidence[0].url='https://example.org/report';assert.throws(()=>store.save(principal(),'desk-a',0,w),matches(400,'synthetic_records_required'));
    assert.throws(()=>store.read(principal(),'desk-a'),matches(404,'workspace_not_found'));assert.equal(store.audit(principal({role:'auditor'}),'desk-a').events.length,0);
  });
});

test('cross-workspace and cross-tenant requests cannot read, modify or inspect audit records',async()=>{
  await fixture(({store})=>{store.save(principal(),'desk-a',0,demoWorkspace());for(const p of [principal({tenantId:'training-b'}),principal({workspaceIds:['desk-b']})]){assert.throws(()=>store.read(p,'desk-a'),matches(403,'forbidden'));assert.throws(()=>store.save(p,'desk-a',1,demoWorkspace()),matches(403,'forbidden'));assert.throws(()=>store.audit({...p,role:'auditor'},'desk-a'),matches(403,'forbidden'));}assert.equal(store.read(principal(),'desk-a').revision,1);});
});

test('audit results are scoped and exclude evidence content and client history claims',async()=>{
  await fixture(({store})=>{
    const all=principal({workspaceIds:['desk-a','desk-b']});const w=demoWorkspace();w.history.push({assessmentId:'training-domestic',at:'2026-10-04',action:'User-entered claim',note:'A claimed approval is not a server event.'});
    store.save(all,'desk-a',0,w);store.save(all,'desk-b',0,demoWorkspace());const audit=store.audit(principal({role:'auditor'}),'desk-a');assert.equal(audit.events.length,1);assert.ok(!JSON.stringify(audit).includes('User-entered claim'));assert.ok(!JSON.stringify(audit).includes('desk-b'));assert.equal(store.read(all,'desk-a').reviewAuthority,'client_assertions_only');
  });
});

test('a structurally valid imported Reviewed judgment never becomes a server-authenticated approval',async()=>{
  await fixture(({store})=>{
    const workspace=updateAssessment(demoWorkspace(),'training-domestic',{status:'Reviewed',confidence:'Low',judgment:'Authored UI training judgment only.',gaps:'Contradictory fictional accounts remain unresolved.',reviewNote:'The conflicting source prevents a stronger conclusion.',citedEvidence:['SYN-001','SYN-003'],challengesAcknowledged:true},'2026-10-04');
    store.save(principal(),'desk-a',0,workspace);const saved=store.read(principal(),'desk-a');assert.equal(saved.workspace.assessments[0].status,'Reviewed');assert.equal(saved.reviewAuthority,'client_assertions_only');assert.deepEqual(store.audit(principal({role:'auditor'}),'desk-a').events.map(e=>e.action),['workspace.saved']);
  });
});

test('wrong encryption key or tenant cannot open even an empty initialized database',async()=>{
  await fixture(f=>{for(const changed of [{key:randomBytes(32)},{tenantId:'training-b'}])assert.throws(()=>openWorkspaceStore({file:f.file,tenantId:'training-a',key:f.key,...changed}),matches(503,'storage_integrity_failure'));assert.equal(f.store.audit(principal({role:'auditor'}),'desk-a').events.length,0);},{disk:true});
});

test('ciphertext changes, source substitution and audit edits fail closed',async()=>{
  for(const sql of ["UPDATE versions SET ciphertext=x'00'","UPDATE audit SET actor='forged'","UPDATE versions SET workspace_id='desk-b'","DELETE FROM versions","DELETE FROM audit"]){
    await fixture(f=>{f.store.save(principal(),'desk-a',0,demoWorkspace());const db=new DatabaseSync(f.file);db.exec(sql);db.close();assert.throws(()=>f.store.read(principal(),'desk-a'),matches(503,'storage_integrity_failure'));assert.throws(()=>f.store.save(principal(),'desk-a',1,demoWorkspace()),matches(503,'storage_integrity_failure'));},{disk:true});
  }
});

test('audit insert failure rolls back its workspace write in the same transaction',async()=>{
  await fixture(f=>{f.store.save(principal(),'desk-a',0,demoWorkspace());const db=new DatabaseSync(f.file);db.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT,'test failure'); END;");assert.throws(()=>f.store.save(principal(),'desk-a',1,demoWorkspace()));db.exec('DROP TRIGGER fail_audit');db.close();assert.equal(f.store.read(principal(),'desk-a').revision,1);assert.equal(f.store.audit(principal({role:'auditor'}),'desk-a').events.length,1);},{disk:true});
});

test('prototype storage limit rejects growth without losing the last revision',async()=>{
  await fixture(({store})=>{for(let n=0;n<MAX_SAVED_VERSIONS;n++)store.save(principal(),'desk-a',n,demoWorkspace());assert.throws(()=>store.save(principal(),'desk-a',MAX_SAVED_VERSIONS,demoWorkspace()),matches(507,'prototype_storage_limit'));assert.equal(store.read(principal(),'desk-a').revision,MAX_SAVED_VERSIONS);});
});

test('documented limitation: a complete valid-prefix rollback requires an external trusted anchor to detect',async()=>{
  await fixture(f=>{f.store.save(principal(),'desk-a',0,demoWorkspace());f.store.save(principal(),'desk-a',1,demoWorkspace());const db=new DatabaseSync(f.file);db.exec('BEGIN; DELETE FROM versions WHERE revision=2; DELETE FROM audit WHERE revision=2; COMMIT;');db.close();assert.equal(f.store.read(principal(),'desk-a').revision,1);assert.equal(f.store.audit(principal({role:'auditor'}),'desk-a').rollbackProtection,false);},{disk:true});
});

test('HTTP endpoints require authentication and ignore client-selected identities or roles',async()=>{
  await httpFixture(async({request,put,reader,foreign})=>{
    assert.equal((await request('GET','',{token:''})).status,401);
    assert.equal((await put()).status,200);
    assert.equal((await request('GET','',{token:foreign.token})).status,403);
    assert.equal((await put(demoWorkspace(),1,{token:reader.token,headers:{'X-Role':'analyst','X-Tenant':'training-a','X-Subject':'analyst-one'}})).status,403);
    assert.equal((await request('GET','',{token:reader.token})).status,200);
  });
});

test('HTTP host/origin, content type, body shape, route and revision guards enforce the contract',async()=>{
  await httpFixture(async({origin,request,put,analyst})=>{
    for(const headers of [{Origin:'https://example.org'},{'Sec-Fetch-Site':'cross-site'}])assert.equal((await put(undefined,0,{headers})).status,403);
    assert.equal((await put(undefined,0,{headers:{'Content-Type':'text/plain'}})).status,415);
    assert.equal((await put(undefined,0,{headers:{'If-Match':'*'}})).status,428);
    assert.equal((await request('PUT','',{headers:{'Content-Type':'application/json','If-Match':'"0"'},body:'{"workspace":{},"role":"analyst"}'})).status,400);
    assert.equal((await request('DELETE')).status,405);
    assert.equal((await request('GET','?tenant=training-b')).status,404);
    const status=await new Promise((resolve,reject)=>{const req=http.request(origin+'/api/workspaces/desk-a',{headers:{Host:'example.org',Authorization:`Bearer ${analyst.token}`}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});assert.equal(status,403);
    assert.equal((await request()).status,404);
  });
});

test('HTTP save/read returns revision preconditions and scoped audit without exposing secrets',async()=>{
  await httpFixture(async({request,put,auditor})=>{const saved=await put();assert.equal(saved.headers.get('etag'),'"1"');assert.equal((await put()).status,409);const read=await request();assert.equal(read.headers.get('cache-control'),'no-store');assert.deepEqual((await read.json()).workspace,demoWorkspace());assert.equal((await request('GET','/audit')).status,403);const audit=await request('GET','/audit',{token:auditor.token});assert.equal((await audit.json()).events[0].actor,'analyst-one');assert.equal((await request('GET','',{token:auditor.token})).status,403);});
});

test('HTTP oversized body and expired credentials are rejected without saving',async()=>{
  await httpFixture(async({request,expire})=>{assert.equal((await request('PUT','',{headers:{'Content-Type':'application/json','If-Match':'"0"'},body:'x'.repeat(2_000_100)})).status,413);expire();assert.equal((await request()).status,401);});
});

test('HTTP duplicate credentials and malformed JSON cannot create a workspace',async()=>{
  await httpFixture(async({origin,analyst,request})=>{
    const status=await new Promise((resolve,reject)=>{const req=http.request(origin+'/api/workspaces/desk-a',{headers:{Authorization:[`Bearer ${analyst.token}`,`Bearer ${analyst.token}`]}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});assert.equal(status,401);
    const response=await request('PUT','',{headers:{'Content-Type':'application/json','If-Match':'"0"'},body:'invalid'});assert.equal(response.status,400);assert.deepEqual(await response.json(),{error:'invalid_json'});assert.equal((await request()).status,404);
  });
});

test('HTTP storage failures return generic errors without exception text',async()=>{
  const marker='internal diagnostic must not escape';
  const server=createBackendServer({store:{read(){throw new Error(marker);}},authenticate:()=>principal()});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {const response=await fetch(`http://127.0.0.1:${server.address().port}/api/workspaces/desk-a`,{headers:{Authorization:'Bearer fixture'}});assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'backend_unavailable'});}
  finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('a credential expiring while an HTTP body arrives cannot write',async()=>{
  await httpFixture(async({origin,analyst,expire,store,nextAuthentication})=>{
    const authenticated=nextAuthentication();let request;
    const result=new Promise((resolve,reject)=>{request=http.request(origin+'/api/workspaces/desk-a',{method:'PUT',headers:{Authorization:`Bearer ${analyst.token}`,'Content-Type':'application/json','If-Match':'"0"'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});request.on('error',reject);request.write('{');});
    await authenticated;expire();request.end('"workspace":'+JSON.stringify(demoWorkspace())+'}');
    assert.equal(await result,401);assert.equal(store.audit(principal({role:'auditor'}),'desk-a').events.length,0);
  });
});
