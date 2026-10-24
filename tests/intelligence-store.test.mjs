import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtemp,rm,symlink,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {openIntelligenceStore,INTELLIGENCE_LIMITS} from '../collection/intelligence-store.mjs';
import {createIntelligenceService} from '../collection/intelligence-service.mjs';

const BASE=Date.parse('2026-10-24T10:00:00Z'),HOUR=3600000;
const hash=value=>createHash('sha256').update(value).digest('hex');
const fixture=(checkedAt='2026-10-24T09:00:00.000Z')=>({run:{id:randomUUID(),sourceId:'govuk-fcdo-india',checkedAt,status:'collected',snapshot:{synthetic:false,publisherUpdatedAt:'2026-10-23T00:00:00.000Z',responseSha256:hash('public source response')}},analysis:{candidates:[{id:'candidate-a',headline:'Source quotation requires verification'}]},rawResponse:'public source response'});
const failed=()=>({run:{id:randomUUID(),sourceId:'govuk-fcdo-india',checkedAt:new Date(BASE).toISOString(),status:'failed',snapshot:null},analysis:null});
const matches=code=>error=>error.code===code;
async function setup(t,{memory=false}={}){
  const directory=memory?null:await mkdtemp(path.join(tmpdir(),'ruthless-intelligence-store-'));
  const file=memory?':memory:':path.join(directory,'public.sqlite');let at=BASE,store=openIntelligenceStore({file,now:()=>new Date(at)});
  t.after(async()=>{store.close();if(directory){const target=path.resolve(directory),root=path.resolve(tmpdir())+path.sep;assert.ok(target.startsWith(root)&&path.basename(target).startsWith('ruthless-intelligence-store-'));await rm(target,{recursive:true,force:true});}});
  return {file,get store(){return store;},advance(ms){at+=ms;},reopen(){store.close();store=openIntelligenceStore({file,now:()=>new Date(at)});return store;},close(){store.close();},get at(){return at;}};
}
const decision=(store,attemptId,extra={})=>store.review({attemptId,candidateId:'candidate-a',disposition:'Needs verification',note:'Retained source needs independent confirmation.',reviewer:'Analyst label',expectedHead:store.head(),...extra});

test('durable real-data journal records server first observation and retains raw bytes privately',async t=>{
  const f=await setup(t),input=fixture(),saved=f.store.appendAttempt(input);
  assert.equal(saved.firstObservedAt,new Date(BASE).toISOString());assert.notEqual(saved.firstObservedAt,input.run.checkedAt);
  assert.equal(saved.rawResponse,undefined);assert.equal(f.store.rawResponse(saved.id).toString(),'public source response');
  input.analysis.candidates[0].headline='Mutated caller value';assert.notEqual(f.store.attempts()[0].analysis.candidates[0].headline,input.analysis.candidates[0].headline);
  const before=f.store.head();assert.equal(f.reopen().attempts()[0].id,saved.id);assert.deepEqual(f.store.head(),before);assert.equal(f.store.verify().ok,true);
});
test('as-of reads exclude captures unavailable at the time and cannot expose a future local observation',async t=>{
  const f=await setup(t),saved=f.store.appendAttempt(fixture());
  assert.equal(f.store.attempts({asOf:'2026-10-24T09:30:00Z'}).length,0);
  assert.equal(f.store.attempts({asOf:new Date(BASE)}).length,1);
  f.advance(1000);const review=decision(f.store,saved.id);
  assert.equal(f.store.listReviews({asOf:new Date(BASE)}).length,0);assert.equal(f.store.listReviews({asOf:new Date(BASE+1000)}).length,1);
  f.advance(-2000);assert.equal(f.store.attempts({asOf:'2030-01-01T00:00:00Z'}).length,0);assert.equal(f.store.listReviews().length,0);
  assert.equal(review.reviewer,'Analyst label');
});
test('future capture or publication, synthetic records, invalid raw digest and duplicate run identities reject atomically',async t=>{
  const f=await setup(t,{memory:true}),input=fixture();
  for(const change of [x=>x.run.checkedAt='2026-10-25T00:00:00Z',x=>x.run.snapshot.publisherUpdatedAt='2026-10-24T09:30:00Z',x=>x.run.snapshot.synthetic=true,x=>x.rawResponse='altered']){
    const invalid=structuredClone(input);change(invalid);assert.throws(()=>f.store.appendAttempt(invalid));assert.equal(f.store.head().sequence,0);
  }
  f.store.appendAttempt(input);assert.throws(()=>f.store.appendAttempt(input),matches('intelligence_attempt_already_saved'));assert.equal(f.store.attempts().length,1);
  f.advance(-1);assert.throws(()=>f.store.configure({enabled:true}),matches('intelligence_clock_regression'));
});
test('failed collection attempts remain readable without an analysis or raw response',async t=>{
  const f=await setup(t,{memory:true}),saved=f.store.appendAttempt(failed());assert.equal(saved.analysis,null);assert.equal(f.store.rawResponse(saved.id),null);
  assert.throws(()=>decision(f.store,saved.id),matches('intelligence_candidate_not_found'));
  assert.throws(()=>f.store.appendAttempt({...failed(),rawResponse:'response'}),matches('invalid_failed_intelligence_attempt'));
});
test('review is append-only, linked to an actual candidate, bounded and concurrency checked',async t=>{
  const f=await setup(t),attempt=f.store.appendAttempt(fixture()),before=f.store.head();
  const first=decision(f.store,attempt.id,{expectedHead:before.digest});
  assert.equal(first.disposition,'Needs verification');assert.equal(first.head.digest,before.digest);
  assert.throws(()=>decision(f.store,attempt.id,{expectedHead:before}),matches('intelligence_review_head_conflict'));
  for(const override of [{candidateId:'missing'},{disposition:'Confirmed attack'},{note:'short'},{note:'x'.repeat(2001)},{reviewer:''},{reviewer:'x'.repeat(101)}])assert.throws(()=>decision(f.store,attempt.id,override));
  const second=decision(f.store,attempt.id,{disposition:'Context only',note:'The same public advisory provides background context.'});
  assert.equal(f.reopen().listReviews().length,2);assert.equal(f.store.listReviews()[0].id,first.id);assert.equal(f.store.listReviews()[1].id,second.id);
});
test('later successful source capture supersedes review eligibility while failures do not erase a valid capture',async t=>{
  const f=await setup(t,{memory:true}),old=f.store.appendAttempt(fixture());
  f.store.appendAttempt(failed());decision(f.store,old.id);
  f.advance(1000);const newer=f.store.appendAttempt(fixture(new Date(BASE).toISOString()));
  assert.throws(()=>decision(f.store,old.id),matches('intelligence_capture_superseded'));decision(f.store,newer.id);
  assert.equal(f.store.listReviews().length,2);
});
test('automatic monitoring is opt-in and durable reservation precedes network, including crashes and manual requests',async t=>{
  const f=await setup(t);assert.deepEqual(f.store.state(),{enabled:false,nextAt:0,failures:0,lastAttemptAt:null});
  assert.equal(f.store.reserveCollection({at:BASE}),false);f.store.configure({enabled:true});
  assert.equal(f.store.reserveCollection({at:BASE}),true);assert.equal(f.store.state().nextAt,BASE+HOUR);
  assert.equal(f.reopen().reserveCollection({at:BASE,manual:true}),false);
  f.advance(HOUR-1);assert.equal(f.store.reserveCollection({at:f.at,manual:true}),false);
  f.advance(1);assert.equal(f.store.reserveCollection({at:f.at}),true);
  f.store.finishCollection({at:f.at,failed:false});assert.equal(f.store.state().nextAt,BASE+2*HOUR);
  f.store.configure({enabled:false});f.advance(HOUR);assert.equal(f.store.reserveCollection({at:f.at}),false);assert.equal(f.store.reserveCollection({at:f.at,manual:true}),true);
  assert.throws(()=>f.store.reserveCollection({at:f.at+1,manual:true}),matches('invalid_intelligence_reservation'));
});
test('failures persist exponential cooldown and Retry-After without shortening a reservation',async t=>{
  const f=await setup(t);f.store.configure({enabled:true});
  for(let n=1;n<=7;n++){
    assert.equal(f.store.reserveCollection({at:f.at}),true);
    const next=f.store.finishCollection({at:f.at,failed:true,retryAfterMs:n===1?3*HOUR:0});
    assert.equal(next.failures,n);assert.equal(next.nextAt,f.at+Math.max(n===1?3*HOUR:0,Math.min(24*HOUR,HOUR*2**(n-1))));
    f.reopen();assert.equal(f.store.state().failures,n);f.advance(next.nextAt-f.at);
  }
  assert.equal(f.store.reserveCollection({at:f.at,manual:true}),true);const healthy=f.store.finishCollection({at:f.at,failed:false});assert.equal(healthy.failures,0);assert.equal(healthy.nextAt,f.at+HOUR);
  assert.throws(()=>f.store.finishCollection({at:f.at,failed:false}),matches('intelligence_collection_not_reserved'));
});
test('direct edits and deletes are blocked; modified attempt payload or raw bytes fail integrity after restart',async t=>{
  for(const mode of ['payload','raw']){
    const f=await setup(t),saved=f.store.appendAttempt(fixture());f.close();
    const db=new DatabaseSync(f.file);
    assert.throws(()=>db.prepare('UPDATE intelligence_attempts SET run_json=? WHERE id=?').run('{}',saved.id),/append_only/);
    assert.throws(()=>db.prepare('DELETE FROM journal_audit').run(),/append_only/);
    db.exec('DROP TRIGGER intelligence_attempts_update');
    if(mode==='payload')db.prepare('UPDATE intelligence_attempts SET analysis_json=? WHERE id=?').run('{"candidates":[]}',saved.id);
    else db.prepare('UPDATE intelligence_attempts SET raw_response=? WHERE id=?').run(Buffer.from('edited source'),saved.id);
    db.close();assert.throws(()=>f.reopen(),matches('intelligence_journal_integrity_failure'));
  }
});
test('metadata head detects removal of the terminal audit event and its associated attempt',async t=>{
  const f=await setup(t);f.store.appendAttempt(fixture());f.close();const db=new DatabaseSync(f.file);
  db.exec('DROP TRIGGER intelligence_attempts_delete; DROP TRIGGER journal_audit_delete; DELETE FROM intelligence_attempts; DELETE FROM journal_audit;');db.close();
  assert.throws(()=>f.reopen(),matches('intelligence_journal_integrity_failure'));
});
test('review alteration and audit alteration cannot pass a fresh verification',async t=>{
  for(const mode of ['review','audit']){
    const f=await setup(t),saved=f.store.appendAttempt(fixture());decision(f.store,saved.id);f.close();const db=new DatabaseSync(f.file);
    if(mode==='review'){db.exec('DROP TRIGGER intelligence_reviews_update');db.prepare('UPDATE intelligence_reviews SET review_json=?').run('{}');}
    else{db.exec('DROP TRIGGER journal_audit_update');db.prepare('UPDATE journal_audit SET payload=? WHERE sequence=2').run('{}');}
    db.close();assert.throws(()=>f.reopen(),matches('intelligence_journal_integrity_failure'));
  }
});
test('oversized data, missing directory and symlink database destinations are rejected',async t=>{
  const f=await setup(t,{memory:true}),input=fixture();input.rawResponse='x'.repeat(INTELLIGENCE_LIMITS.raw+1);assert.throws(()=>f.store.appendAttempt(input),matches('intelligence_raw_response_too_large'));
  assert.throws(()=>openIntelligenceStore({file:path.join(tmpdir(),randomUUID(),'missing.sqlite')}),matches('invalid_intelligence_store_directory'));
  const disk=await setup(t),link=path.join(path.dirname(disk.file),'linked.sqlite');disk.close();
  try{await symlink(disk.file,link,'file');assert.throws(()=>openIntelligenceStore({file:link}),matches('invalid_intelligence_store_file'));}catch(error){if(error.code!=='EPERM')throw error;t.diagnostic('Windows denied symlink creation; no symlink destination was opened.');}
  const bad=path.join(path.dirname(disk.file),'corrupt.sqlite');await writeFile(bad,'This is not a SQLite database.');assert.throws(()=>openIntelligenceStore({file:bad}));
});

test('collection quotas block the real service before fetch and do not consume a reservation',async()=>{
  for(const cap of [{maxCollectionAttempts:1},{maxRetainedBytes:1024}]){
    const now=()=>new Date(BASE),store=openIntelligenceStore({file:':memory:',now,...cap});let calls=0;
    try{
      if(cap.maxCollectionAttempts)store.appendAttempt(fixture());
      const service=createIntelligenceService({store,now,fetchImpl:async()=>{calls++;throw new Error('A full journal must never reach the network.');}}),before=store.head();
      await assert.rejects(()=>service.collect({manual:true}),matches('intelligence_journal_capacity_reached'));
      assert.equal(calls,0);assert.deepEqual(store.head(),before);assert.equal(store.state().nextAt,0);await service.stop();
    }finally{store.close();}
  }
  for(const options of [{maxCollectionAttempts:1001},{maxCollectionAttempts:0},{maxRetainedBytes:INTELLIGENCE_LIMITS.bytes+1}])assert.throws(()=>openIntelligenceStore({file:':memory:',...options}),matches('invalid_intelligence_store_configuration'));
});

test('pending collection byte headroom survives concurrent review writes and is released after append and finish',()=>{
  const headroom=2*INTELLIGENCE_LIMITS.payload+INTELLIGENCE_LIMITS.raw+4096;
  const store=openIntelligenceStore({file:':memory:',now:()=>new Date(BASE),maxRetainedBytes:headroom+2500});
  try{
    const old=store.appendAttempt(fixture());assert.equal(store.reserveCollection({at:BASE,manual:true}),true);
    const before=store.head();assert.throws(()=>decision(store,old.id,{note:'x'.repeat(1900)}),matches('intelligence_journal_capacity_reached'));assert.deepEqual(store.head(),before);
    const newer=store.appendAttempt(fixture());assert.throws(()=>store.appendAttempt(fixture()),matches('intelligence_collection_already_saved'));
    store.finishCollection({at:BASE,failed:false});decision(store,newer.id,{note:'x'.repeat(1900)});assert.equal(store.verify().ok,true);
  }finally{store.close();}
});

test('collection reserves audit slots for attempt and finish before network starts',async t=>{
  const f=await setup(t);f.close();const db=new DatabaseSync(f.file);
  try{
    let previous=db.prepare('SELECT digest FROM journal_metadata').get().digest;const payload=JSON.stringify({enabled:true}),at=new Date(BASE).toISOString(),insert=db.prepare('INSERT INTO journal_audit VALUES(?,?,?,?,?,?)');
    db.exec('BEGIN');for(let sequence=1;sequence<INTELLIGENCE_LIMITS.audit-1;sequence++){const digest=hash(JSON.stringify([1,sequence,at,'configure',payload,previous]));insert.run(sequence,at,'configure',payload,previous,digest);previous=digest;}
    db.prepare('UPDATE journal_metadata SET sequence=?,digest=? WHERE id=1').run(INTELLIGENCE_LIMITS.audit-2,previous);db.exec('COMMIT');
  }finally{db.close();}
  f.reopen();const before=f.store.head();assert.throws(()=>f.store.reserveCollection({at:BASE,manual:true}),matches('intelligence_journal_capacity_reached'));assert.deepEqual(f.store.head(),before);assert.equal(f.store.state().nextAt,0);
});
