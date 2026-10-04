import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdtemp,readFile,rm,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {openWorkspaceStore,MAX_REVIEW_DECISIONS} from '../backend/store.mjs';
import {localTokenAuthenticator} from '../backend/auth.mjs';
import {createBackendServer} from '../backend/http.mjs';
import {demoWorkspace,updateAssessment} from '../dist/threat-core.mjs';

const time=Date.parse('2026-10-05T00:00:00Z');
const identity=(extra={})=>({subject:'author',tenantId:'fictional-org',role:'analyst',workspaceIds:['desk','other'],expiresAt:time+60_000,...extra});
const reviewer=identity({subject:'reviewer-one',role:'reviewer'}),auditor=identity({subject:'auditor',role:'auditor'});
const command=(extra={})=>({assessmentId:'training-domestic',decision:'approve',note:'Authored synthetic review: compare the attributed sources and retain the alternative account.',sourcesConsidered:true,...extra});
const matches=(status,code)=>e=>e.status===status&&(!code||e.code===code);
function ready(){return updateAssessment(demoWorkspace(),'training-domestic',{judgment:'The cause is not established by these fictional accounts.',gaps:'An independent original account is missing.',confidence:'Low',status:'Reviewed',reviewNote:'The conflicting explanation is retained and attribution remains uncertain.',citedEvidence:['SYN-001','SYN-003'],challengesAcknowledged:true},'2026-10-05');}
async function fixture(check,{disk=false}={}){
  const dir=disk?await mkdtemp(path.join(tmpdir(),'ruthless-review-')):null,file=disk?path.join(dir,'test.sqlite'):':memory:',key=randomBytes(32);
  let clock=time,store;
  const options={file,key,tenantId:'fictional-org',now:()=>clock};store=openWorkspaceStore(options);
  try{await check({get store(){return store;},file,key,options,expire(){clock=time+60_001;},reopen(){store.close();store=openWorkspaceStore(options);return store;}});}
  finally{store?.close();key.fill(0);if(dir){await rm(file,{force:true});await rmdir(dir);}}
}

test('configured reviewer can decide the stored revision; imported review labels alone grant no approval',async()=>{
  await fixture(({store})=>{const w=ready();w.serverApproval={actor:'forged',decision:'approve'};store.save(identity(),'desk',0,w);assert.deepEqual(store.reviews(reviewer,'desk').decisions,[]);const receipt=store.decide(reviewer,'desk',1,command());assert.equal(receipt.actor,'reviewer-one');assert.equal(receipt.revision,1);assert.equal(receipt.assessmentId,'training-domestic');assert.equal(store.read(identity(),'desk').reviewAuthority,'client_assertions_only');assert.equal(store.read(reviewer,'desk').workspace.assessments[0].status,'Reviewed');assert.equal(store.reviews(reviewer,'desk').decisions[0].current,true);});
});

test('review authorization rejects analyst, reader, auditor, unknown roles, foreign tenant and workspace',async()=>{
  await fixture(({store})=>{store.save(identity(),'desk',0,ready());for(const p of [identity(),identity({role:'reader'}),auditor,identity({role:'admin'}),{...reviewer,tenantId:'other-org'},{...reviewer,workspaceIds:['other']}])assert.throws(()=>store.decide(p,'desk',1,command()),matches(403));assert.throws(()=>store.save(reviewer,'desk',1,ready()),matches(403));assert.throws(()=>store.audit(reviewer,'desk'),matches(403));assert.deepEqual(store.reviews(identity(),'desk').decisions,[]);});
});

test('every historical contributor is excluded from review, including a second credential for the same subject',async()=>{
  await fixture(({store})=>{store.save(identity(),'desk',0,ready());store.save(identity({subject:'coauthor'}),'desk',1,ready());for(const subject of ['author','coauthor'])assert.throws(()=>store.decide({...reviewer,subject},'desk',2,command()),matches(403,'self_review_forbidden'));assert.deepEqual(store.reviews(reviewer,'desk').decisions,[]);});
});

test('approval requires a prepared Reviewed assessment; rejection can return a draft without mutating it',async()=>{
  await fixture(({store})=>{store.save(identity(),'desk',0,demoWorkspace());assert.throws(()=>store.decide(reviewer,'desk',1,command()),matches(400,'assessment_not_ready'));store.decide(reviewer,'desk',1,command({decision:'reject'}));assert.equal(store.read(reviewer,'desk').workspace.assessments[0].status,'Draft');assert.throws(()=>store.decide(reviewer,'desk',1,command({decision:'reject'})),matches(409,'review_already_recorded'));assert.equal(store.reviews(reviewer,'desk').decisions.length,1);});
});

test('review input is strict, bounded and cannot select reviewer, timestamp, revision or approval fields',async()=>{
  await fixture(({store})=>{store.save(identity(),'desk',0,ready());for(const change of [{actor:'forged'},{at:'2026-10-01'},{revision:1},{decision:'auto_approve'},{sourcesConsidered:false},{sourcesConsidered:'true'},{note:' '},{note:'x'.repeat(2001)},{assessmentId:'../other'}])assert.throws(()=>store.decide(reviewer,'desk',1,command(change)),matches(400));assert.throws(()=>store.decide(reviewer,'desk',0,command()),matches(400));assert.throws(()=>store.decide(reviewer,'desk',1,command({assessmentId:'missing'})),matches(404));assert.deepEqual(store.reviews(reviewer,'desk').decisions,[]);});
});

test('every subsequent workspace save invalidates current approval, including an identical payload',async()=>{
  await fixture(({store})=>{const w=ready();store.save(identity(),'desk',0,w);store.decide(reviewer,'desk',1,command());store.save(identity(),'desk',1,w);assert.equal(store.reviews(reviewer,'desk').decisions[0].current,false);assert.throws(()=>store.decide(reviewer,'desk',1,command()),matches(409,'revision_conflict'));store.decide(reviewer,'desk',2,command());const rows=store.reviews(reviewer,'desk').decisions;assert.deepEqual(rows.map(r=>r.current),[false,true]);assert.equal(rows[0].revision,1);});
});

test('encrypted decision notes survive reopening; auditor receipts exclude plaintext rationale and sources',async()=>{
  await fixture(async f=>{const note='Private authored test rationale with हिंदी and emoji 🔎';f.store.save(identity(),'desk',0,ready());f.store.decide(reviewer,'desk',1,command({note}));assert.equal((await readFile(f.file)).includes(Buffer.from(note)),false);f.reopen();assert.equal(f.store.reviews(reviewer,'desk').decisions[0].note,note);const audit=f.store.audit(auditor,'desk');assert.equal(audit.reviewEvents.length,1);assert.equal(JSON.stringify(audit).includes(note),false);assert.equal(JSON.stringify(audit).includes('The cause is not established'),false);f.store.save(identity(),'other',0,ready());assert.deepEqual(f.store.audit({...auditor,workspaceIds:['other']},'other').reviewEvents,[]);assert.throws(()=>f.store.reviews(auditor,'desk'),matches(403));},{disk:true});
});

test('review ciphertext, actor, decision, version binding and one-sided deletion tampering fail closed',async()=>{
  for(const sql of ["UPDATE review_notes SET ciphertext=x'00'","UPDATE review_audit SET actor='forged'","UPDATE review_audit SET decision='reject'","UPDATE review_audit SET version_digest=printf('%064d',0)","DELETE FROM review_notes","DELETE FROM review_audit"]){await fixture(f=>{f.store.save(identity(),'desk',0,ready());f.store.decide(reviewer,'desk',1,command());const db=new DatabaseSync(f.file);try{db.exec('PRAGMA foreign_keys=OFF;');db.exec(sql);}finally{db.close();}assert.throws(()=>f.store.reviews(reviewer,'desk'),matches(503,'storage_integrity_failure'));assert.throws(()=>f.store.save(identity(),'desk',1,ready()),matches(503,'storage_integrity_failure'));},{disk:true});}
});

test('failed review receipt insertion rolls back its encrypted note atomically',async()=>{
  await fixture(f=>{f.store.save(identity(),'desk',0,ready());const db=new DatabaseSync(f.file);db.exec("CREATE TRIGGER fail_review BEFORE INSERT ON review_audit BEGIN SELECT RAISE(ABORT,'authored test'); END;");assert.throws(()=>f.store.decide(reviewer,'desk',1,command()));assert.equal(db.prepare('SELECT count(*) AS n FROM review_notes').get().n,0);db.exec('DROP TRIGGER fail_review');db.close();assert.deepEqual(f.store.reviews(reviewer,'desk').decisions,[]);f.store.decide(reviewer,'desk',1,command());assert.equal(f.store.audit(auditor,'desk').reviewEvents.length,1);},{disk:true});
});

test('two database connections cannot record conflicting decisions for one assessment revision',async()=>{
  await fixture(f=>{f.store.save(identity(),'desk',0,ready());const second=openWorkspaceStore(f.options);try{f.store.decide(reviewer,'desk',1,command());assert.throws(()=>second.decide({...reviewer,subject:'reviewer-two'},'desk',1,command({decision:'reject'})),matches(409,'review_already_recorded'));assert.equal(second.reviews(reviewer,'desk').decisions[0].decision,'approve');}finally{second.close();}},{disk:true});
});

test('legacy schema migration verifies existing data and preserves snapshots and save receipts',async()=>{
  await fixture(f=>{f.store.save(identity(),'desk',0,ready());f.store.close();const db=new DatabaseSync(f.file);db.exec('DROP TABLE review_audit; DROP TABLE review_notes; DROP TABLE review_metadata; PRAGMA user_version=1;');db.close();f.reopen();assert.deepEqual(f.store.read(reviewer,'desk').workspace,ready());assert.equal(f.store.audit(auditor,'desk').events.length,1);assert.deepEqual(f.store.reviews(reviewer,'desk').decisions,[]);f.store.decide(reviewer,'desk',1,command());f.reopen();assert.equal(f.store.reviews(reviewer,'desk').decisions.length,1);},{disk:true});
});

test('invalid legacy snapshots cannot be blessed by migration and schema change rolls back',async()=>{
  await fixture(f=>{f.store.save(identity(),'desk',0,ready());f.store.close();const db=new DatabaseSync(f.file);db.exec("DROP TABLE review_audit; DROP TABLE review_notes; DROP TABLE review_metadata; PRAGMA user_version=1; UPDATE audit SET actor='forged';");assert.throws(()=>openWorkspaceStore(f.options),matches(503,'storage_integrity_failure'));assert.equal(db.prepare('PRAGMA user_version').get().user_version,1);assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='review_audit'").get().n,0);db.close();},{disk:true});
});

test('documented limit: deleting the entire valid review suffix needs an external anchor to detect',async()=>{
  await fixture(f=>{f.store.save(identity(),'desk',0,ready());f.store.decide(reviewer,'desk',1,command());const db=new DatabaseSync(f.file);db.exec('BEGIN; DELETE FROM review_audit; DELETE FROM review_notes; COMMIT;');db.close();assert.deepEqual(f.store.reviews(reviewer,'desk').decisions,[]);assert.equal(f.store.audit(auditor,'desk').rollbackProtection,false);},{disk:true});
});

test('decision cap and expiry reject additional reviews without pruning existing history',async()=>{
  await fixture(f=>{const w=demoWorkspace();w.assessments=Array.from({length:100},(_,n)=>({...w.assessments[0],id:n===0?'training-domestic':`assessment-${n}`}));w.evidence=w.evidence.filter(e=>e.assessmentId==='training-domestic');f.store.save(identity(),'desk',0,w);for(let n=0;n<100;n++)f.store.decide(reviewer,'desk',1,command({assessmentId:w.assessments[n].id,decision:'reject'}));f.store.save(identity(),'desk',1,w);for(let n=0;n<MAX_REVIEW_DECISIONS-100;n++)f.store.decide(reviewer,'desk',2,command({assessmentId:w.assessments[n].id,decision:'reject'}));assert.throws(()=>f.store.decide(reviewer,'desk',2,command({assessmentId:w.assessments[28].id,decision:'reject'})),matches(507,'prototype_review_limit'));assert.equal(f.store.reviews(reviewer,'desk').decisions.length,128);f.expire();assert.throws(()=>f.store.decide(reviewer,'desk',2,command()),matches(401));});
});

test('real HTTP review commands enforce roles, exact revision, source acknowledgement and strict request shape',async()=>{
  await fixture(async f=>{
    const grants=[identity(),reviewer,auditor].map(p=>{const token=randomBytes(32).toString('base64url');return {token,grant:{...p,tokenHash:createHash('sha256').update(token).digest('hex')}};});
    const server=createBackendServer({store:f.store,authenticate:localTokenAuthenticator(grants.map(g=>g.grant),{now:()=>time})});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const origin=`http://127.0.0.1:${server.address().port}`,url=origin+'/api/workspaces/desk/reviews';
    const post=(body=command(),{token=grants[1].token,headers={}}={})=>fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','If-Match':'"1"',...headers},body:JSON.stringify(body)});
    try{
      f.store.save(identity(),'desk',0,ready());assert.equal((await post(command(),{token:grants[0].token})).status,403);
      for(const headers of [{Origin:'https://example.org'},{'Sec-Fetch-Site':'cross-site'}])assert.equal((await post(command(),{headers})).status,403);
      assert.equal((await post(command(),{headers:{'If-Match':'*'}})).status,428);assert.equal((await post(command(),{headers:{'If-Match':'"0"'}})).status,400);
      assert.equal((await post(command({actor:'forged'}))).status,400);assert.equal((await post(command({note:'x'.repeat(17_000)}))).status,413);
      assert.equal((await post(command(),{headers:{'Content-Type':'text/plain'}})).status,415);
      const result=await post();assert.equal(result.status,200);assert.equal(result.headers.get('etag'),'"1"');assert.equal((await result.json()).actor,reviewer.subject);assert.equal((await post()).status,409);
      const rows=await fetch(url,{headers:{Authorization:`Bearer ${grants[1].token}`}});assert.equal(rows.status,200);assert.equal((await rows.json()).decisions.length,1);
      const audit=await fetch(origin+'/api/workspaces/desk/audit',{headers:{Authorization:`Bearer ${grants[2].token}`}});assert.equal((await audit.json()).reviewEvents.length,1);
      f.store.save(identity(),'desk',1,ready());assert.equal((await post()).status,409);
    }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  });
});

test('review credential expiring while its HTTP body arrives cannot record a decision',async()=>{
  await fixture(async f=>{
    f.store.save(identity(),'desk',0,ready());const token=randomBytes(32).toString('base64url');let clock=time,seen;const first=new Promise(resolve=>seen=resolve);
    const auth=localTokenAuthenticator([{...reviewer,tokenHash:createHash('sha256').update(token).digest('hex')}],{now:()=>clock});
    const server=createBackendServer({store:f.store,authenticate:value=>{const p=auth(value);seen();return p;}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    try{const body=JSON.stringify(command()),url=`http://127.0.0.1:${server.address().port}/api/workspaces/desk/reviews`;let req;
      const result=new Promise((resolve,reject)=>{req=http.request(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','If-Match':'"1"','Content-Length':Buffer.byteLength(body)}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.write(body.slice(0,1));});await first;clock=time+60_001;req.end(body.slice(1));assert.equal(await result,401);assert.deepEqual(f.store.reviews(reviewer,'desk').decisions,[]);
    }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  });
});
