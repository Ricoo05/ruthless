import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {workspaceConnection} from '../dist/backend-client.mjs';
import {demoWorkspace} from '../dist/threat-core.mjs';
import {openWorkspaceStore} from '../backend/store.mjs';
import {localTokenAuthenticator} from '../backend/auth.mjs';
import {createBackendServer} from '../backend/http.mjs';
import {serveFrontend} from '../backend/static.mjs';

const token='f'.repeat(43),origin='http://127.0.0.1:4174';
const profile={subject:'synthetic-user',tenantId:'training',role:'analyst',workspaceIds:['desk'],expiresAt:Date.now()+60_000,mode:'local_credential_adapter',storageMode:'temporary_test_database'};
const json=(data,status=200,etag=null)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json',...(etag?{ETag:etag}:{})}});
const snapshot=(revision=1)=>({workspace:demoWorkspace(),revision,reviewAuthority:'client_assertions_only'});
function mocked(handler){return workspaceConnection({origin,fetcher:async(route,options)=>route==='/api/session'?json(profile):handler(route,options)});}
async function bound(client){await client.connect(token);const s=await client.inspect('desk');client.accept(s);return client;}

test('browser transport uses relative same-origin routes, memory credentials and verified server membership',async()=>{
  let calls=0;const c=workspaceConnection({origin,fetcher:async(route,options)=>{calls++;assert.equal(route,'/api/session');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,`Bearer ${token}`);return json(profile);}});
  await c.connect(token);assert.ok(!JSON.stringify(c.state()).includes(token));assert.equal(c.state().binding,null);assert.throws(()=>c.save(demoWorkspace()),/Load or explicitly create/);c.disconnect();assert.equal(c.state().profile,null);
  const remote=workspaceConnection({origin:'https://example.org',fetcher:()=>{calls++;}});assert.throws(()=>remote.connect(token),/loopback/);assert.throws(()=>c.connect('sk-proj-fixture'),/not an API key/);assert.equal(calls,1);
});

test('inspecting does not bind or overwrite local work; accepting binds the exact server revision',async()=>{
  const c=mocked(()=>json(snapshot(),200,'"1"'));await c.connect(token);const local=demoWorkspace();local.assessments[0].gaps='Retain local';const result=await c.inspect('desk');assert.equal(c.state().binding,null);assert.equal(local.assessments[0].gaps,'Retain local');const w=c.accept(result);assert.equal(c.state().binding.revision,1);assert.equal(c.matches(w),true);assert.equal(c.matches(local),false);
});

test('malformed or mismatched server snapshots reject without advancing a prior binding',async()=>{
  for(const corrupt of [{...snapshot(),revision:2},{...snapshot(),reviewAuthority:'verified'},{...snapshot(),workspace:{version:999}}]){let bad=false;const c=mocked(()=>json(bad?corrupt:snapshot(),200,'"1"'));await bound(c);bad=true;await assert.rejects(c.inspect('desk'),/could not be verified/);assert.equal(c.state().binding.revision,1);}
});

test('save sends the mandatory expected revision and advances only after a matching acknowledgement',async()=>{
  const c=mocked((route,options)=>{if(options.method==='GET')return json(snapshot(),200,'"1"');assert.equal(route,'/api/workspaces/desk');assert.equal(options.headers['If-Match'],'"1"');assert.deepEqual(Object.keys(JSON.parse(options.body)),['workspace']);return json({revision:2,reviewAuthority:'client_assertions_only'},200,'"2"');});await bound(c);const w=demoWorkspace();w.assessments[0].gaps='Local change';assert.equal(c.matches(w),false);await c.save(w);assert.equal(c.state().binding.revision,2);assert.equal(c.matches(w),true);
});

test('conflicts, expired credentials and forbidden writes never discard caller work or silently rebase',async()=>{
  for(const status of [401,403,409]){const c=mocked((route,o)=>o.method==='GET'?json(snapshot(),200,'"1"'):json({error:'fixture'},status));await bound(c);const w=demoWorkspace();w.assessments[0].gaps='Retain this edit';await assert.rejects(c.save(w),e=>e.status===status);assert.equal(w.assessments[0].gaps,'Retain this edit');if(status===401){assert.equal(c.state().profile,null);assert.equal(c.state().binding,null);}else assert.equal(c.state().binding.revision,1);if(status===409){assert.equal(c.state().conflict,true);assert.throws(()=>c.save(w),/Load or explicitly create/);}}
});

test('unconfirmed network or invalid write acknowledgements block another save until reconciliation',async()=>{
  for(const mode of ['network','invalid','server-error']){const c=mocked((route,o)=>{if(o.method==='GET')return json(snapshot(),200,'"1"');if(mode==='network')throw new Error('sensitive diagnostic');if(mode==='server-error')return json({},503);return json({revision:99,reviewAuthority:'client_assertions_only'},200,'"99"');});await bound(c);await assert.rejects(c.save(demoWorkspace()),e=>!e.message.includes('sensitive diagnostic'));assert.equal(c.state().uncertain,true);assert.equal(c.state().binding.revision,1);assert.throws(()=>c.save(demoWorkspace()),/Load or explicitly create/);const latest=await c.inspect('desk');c.accept(latest);assert.equal(c.state().uncertain,false);}
});

test('disconnect invalidates pending responses and prevents an old operation from clearing a new identity',async()=>{
  let release;const delayed=new Promise(resolve=>release=resolve);let slow=true;const c=workspaceConnection({origin,fetcher:async()=>slow?delayed:json(profile)});const first=c.connect(token);assert.equal(c.state().busy,true);c.disconnect();slow=false;await c.connect(token);release(json({},401));await assert.rejects(first,e=>e.code==='connection_changed');assert.equal(c.state().profile.subject,'synthetic-user');assert.equal(c.state().busy,false);
});

test('create and imported-workspace detach do not allow blind overwrite of an existing revision',async()=>{
  const c=mocked((route,o)=>o.method==='GET'?json(snapshot(),200,'"1"'):json({},409));await c.connect(token);c.prepareCreate('desk');assert.equal(c.state().binding.revision,0);await assert.rejects(c.save(demoWorkspace()),e=>e.status===409);c.detach();assert.equal(c.state().binding,null);assert.equal(c.state().conflict,false);assert.throws(()=>c.save(demoWorkspace()),/Load or explicitly create/);
});

test('read-only roles cannot create or save, and returned profile copies cannot grant permissions',async()=>{
  const c=workspaceConnection({origin,fetcher:async(route)=>route==='/api/session'?json({...profile,role:'reader'}):json(snapshot(),200,'"1"')});const p=await c.connect(token);p.role='analyst';p.workspaceIds.push('other');const s=await c.inspect('desk');c.accept(s);assert.throws(()=>c.save(demoWorkspace()),e=>e.status===403);assert.throws(()=>c.prepareCreate('desk'),e=>e.status===403);assert.throws(()=>c.inspect('other'),e=>e.status===403);
});

test('same-origin static assets and client transport integrate with the real authenticated repository',async()=>{
  const credential=randomBytes(32).toString('base64url'),grant={...profile,tokenHash:createHash('sha256').update(credential).digest('hex')};delete grant.mode;delete grant.storageMode;
  const store=openWorkspaceStore({file:':memory:',tenantId:'training',key:randomBytes(32)}),server=createBackendServer({store,authenticate:localTokenAuthenticator([grant]),serveAssets:serveFrontend});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  try {
    const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/connect-src 'self'/);assert.ok((await page.text()).includes('Connect local backend'));
    for(const route of ['/backend/store.mjs','/.env.local','/%2e%2e/.env.local','/../.env.local','/api/session?role=analyst'])assert.equal((await fetch(base+route)).status,route.startsWith('/api/')?401:404);
    const a=workspaceConnection({origin:base,fetcher:(route,options)=>fetch(base+route,options)}),b=workspaceConnection({origin:base,fetcher:(route,options)=>fetch(base+route,options)});
    await a.connect(credential);a.prepareCreate('desk');await a.save(demoWorkspace());await b.connect(credential);b.accept(await b.inspect('desk'));const edit=demoWorkspace();edit.assessments[0].gaps='First writer';await a.save(edit);edit.assessments[0].gaps='Second writer retained';await assert.rejects(b.save(edit),e=>e.status===409);const latest=await b.inspect('desk');assert.equal(latest.workspace.assessments[0].gaps,'First writer');assert.equal(edit.assessments[0].gaps,'Second writer retained');
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();}
});
