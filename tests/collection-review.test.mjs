import test from 'node:test';
import assert from 'node:assert/strict';
import {collectAdvisory} from '../collection/govuk-advisory.mjs';
import {parseCollectionReport,collectionCoverage,passageBatch,collectionParents} from '../dist/collection-core.mjs';
import {demoWorkspace,serializeWorkspace,parseWorkspace,documentIsCurrent} from '../dist/threat-core.mjs';
import {importSourceBatch} from '../dist/source-import.mjs';
import {randomBytes} from 'node:crypto';
import {openWorkspaceStore} from '../backend/store.mjs';
import {matchesAnalysisSource} from '../dist/analysis-core.mjs';
const date=new Date('2026-10-05T12:00:00Z');
async function report(body='Authored fixture: no threat was observed.',extra={}){
  return collectAdvisory({now:()=>date,fetchImpl:async()=>new Response(JSON.stringify({
    base_path:'/foreign-travel-advice/india',schema_name:'travel_advice',document_type:'travel_advice',locale:'en',
    content_id:'authored-test-content',title:'Authored fixture only',public_updated_at:'2026-10-01T12:00:00Z',withdrawn_notice:{},
    details:{parts:['warnings-and-insurance','safety-and-security','regional-risks'].map(slug=>({slug,title:`Fixture ${slug}`,body}))},...extra
  }),{headers:{'content-type':'application/json'}})});
}
const inspect=r=>parseCollectionReport(JSON.stringify(r),{at:date,extractText:s=>s});
const choice={assessmentId:'training-domestic',slug:'warnings-and-insurance',excerpt:'Authored fixture: no threat was observed.',permissionNote:'Authored non-sensitive test fixture; permitted only as a test.',at:'2026-10-05',acknowledged:true};
let sequence=0;
const stage=(w,b)=>importSourceBatch(w,b,{batchId:`test-batch-${++sequence}`,idForRecord:()=>`test-doc-${++sequence}`,at:'2026-10-05',accessAcknowledged:true});

test('collection report validation preserves original text and binds selected hashes without trusting authenticity',async()=>{
  const r=await report('जोखिम 🔎 no threat observed'); const inspected=await inspect(r);
  assert.equal(inspected.sections[0].originalText,'जोखिम 🔎 no threat observed');
  assert.equal(inspected.snapshot.synthetic,false);assert.equal(inspected.snapshot.disposition,'quarantined');
  r.snapshot.parts[0].originalHtml='changed';await assert.rejects(()=>inspect(r),/hash/);
});
test('unsupported sources, future clocks, extra fields and malformed reports reject',async()=>{
  for(const mutate of [r=>r.sourceId='unknown',r=>r.endpoint='http://127.0.0.1',r=>r.checkedAt='2026-10-06T00:00:00Z',r=>r.role='reviewer',r=>r.snapshot.parts[0].sourceUrl='https://evil.invalid',r=>r.snapshot.synthetic=true,r=>r.snapshot.publisher='another publisher']){
    const r=await report();mutate(r);await assert.rejects(()=>inspect(r));
  }
  await assert.rejects(()=>parseCollectionReport('{'),/JSON/);
  await assert.rejects(()=>parseCollectionReport('a'.repeat(2*1024*1024+1)),/2 MB/);
});
test('failed capture has no passages and does not turn retained success into a newest success',async()=>{
  const failed=await collectAdvisory({now:()=>date,fetchImpl:async()=>new Response('',{status:429})});
  const bad=await inspect(failed),good=await inspect(await report());
  assert.deepEqual(bad.sections,[]);const coverage=collectionCoverage(bad,good,date);
  assert.equal(coverage.status,'Latest attempt failed');assert.equal(coverage.reason,'rate_limited');assert.equal(coverage.retainedAt,good.checkedAt);
  assert.equal(collectionCoverage(null,null,date).status,'Not collected');
  assert.equal(collectionCoverage(good,good,new Date('2026-10-07')).status,'Stale capture');
  failed.snapshot={};await assert.rejects(()=>inspect(failed));
});
test('an exact permitted passage stages atomically with one publisher group and no evidence changes',async()=>{
  const w=demoWorkspace(),before=serializeWorkspace(w),r=await inspect(await report()),batch=await passageBatch(w,r,choice),result=stage(w,batch);
  assert.equal(serializeWorkspace(w),before);assert.equal(result.added.length,1);assert.equal(result.workspace.evidence.length,w.evidence.length);
  const d=result.workspace.documents[0];assert.equal(d.synthetic,false);assert.equal(d.excerpt,choice.excerpt);
  assert.equal(d.originGroup,'FCDO India travel advisory');assert.match(d.locator,/html-text-v1/);assert.match(d.accessNote,/unverified/);
  assert.ok(d.accessNote.includes(r.snapshot.selectedContentSha256));
  assert.deepEqual(parseWorkspace(serializeWorkspace(result.workspace)),result.workspace);
});

test('maximum permission note and capture identity remain within intake metadata limits',async()=>{
  const r=await inspect(await report());r.id='x'.repeat(100);
  const b=await passageBatch(demoWorkspace(),r,{...choice,permissionNote:'a'.repeat(900)});
  assert.ok(b.records[0].accessNote.length<=1500);assert.equal(stage(demoWorkspace(),b).added.length,1);
});
test('passage and permission validation rejects inference, repeated text, oversize and missing acknowledgement',async()=>{
  const w=demoWorkspace(),r=await inspect(await report());
  for(const edit of [{acknowledged:false},{permissionNote:''},{excerpt:'A threat is imminent.'},{excerpt:'x'.repeat(4001)},{assessmentId:'unknown'},{slug:'health'},{at:'2026-10-04'},{revisionNote:'correction without parent'}])await assert.rejects(()=>passageBatch(w,r,{...choice,...edit}));
  const repeated=await inspect(await report(`${choice.excerpt} ${choice.excerpt}`));
  await assert.rejects(()=>passageBatch(w,repeated,choice),/exactly once/);
});
test('unchanged captures replay without changing recorded provenance or adding import history',async()=>{
  const r=await inspect(await report()),first=stage(demoWorkspace(),await passageBatch(demoWorkspace(),r,choice));
  const later=structuredClone(r);later.checkedAt='2026-10-06T12:00:00Z';
  const batch=await passageBatch(first.workspace,later,{...choice,at:'2026-10-06',permissionNote:'A later review does not rewrite original rights provenance.'});
  const result=stage(first.workspace,batch);assert.equal(result.workspace,first.workspace);assert.equal(result.skipped.length,1);
  assert.equal(batch.records[0].recordedAt,'2026-10-05');assert.match(batch.records[0].accessNote,/Authored non-sensitive/);
});
test('a selected correction preserves parent, excludes it from current use and rejects old capture resurrection',async()=>{
  const w=demoWorkspace(),a=await inspect(await report()),first=stage(w,await passageBatch(w,a,choice));
  const parent=first.workspace.documents[0];assert.equal(collectionParents(first.workspace,choice.assessmentId,choice.slug).length,1);
  const b=await inspect(await report('Authored correction: attribution remains unverified.'));
  await assert.rejects(()=>passageBatch(first.workspace,b,{...choice,excerpt:b.sections[0].originalText,parentId:parent.id}),/note/);
  const batch=await passageBatch(first.workspace,b,{...choice,excerpt:b.sections[0].originalText,parentId:parent.id,revisionNote:'Authored correction for regression testing.'});
  const next=stage(first.workspace,batch).workspace;
  assert.equal(next.documents.length,2);assert.equal(next.documents[1].supersedesDocumentId,parent.id);
  assert.equal(documentIsCurrent(next,parent.id),false);assert.equal(next.documents[0].excerpt,choice.excerpt);
  await assert.rejects(()=>passageBatch(next,a,choice),/superseded/);
  await assert.rejects(()=>passageBatch(first.workspace,a,{...choice,parentId:parent.id,revisionNote:'Same passage.'}),/itself/);
});
test('correction links cannot cross assessment or section and dates cannot precede the parent',async()=>{
  const w=demoWorkspace(),a=await inspect(await report()),first=stage(w,await passageBatch(w,a,choice));
  const parentId=first.workspace.documents[0].id,b=await inspect(await report('Authored revision.'));
  for(const edit of [{assessmentId:'training-crossborder'},{slug:'regional-risks'}])await assert.rejects(()=>passageBatch(first.workspace,b,{...choice,...edit,excerpt:b.sections[0].originalText,parentId,revisionNote:'New content.'}),/earlier excerpt/);
  const earlier=await inspect(await report('Authored revision.',{public_updated_at:'2026-09-30T12:00:00Z'}));
  await assert.rejects(()=>passageBatch(first.workspace,earlier,{...choice,excerpt:earlier.sections[0].originalText,parentId,revisionNote:'New content.'}),/dates/);
});
test('content-hash prefix collision or edited local identity rejects instead of treating conflicting text as unchanged',async()=>{
  const w=demoWorkspace(),r=await inspect(await report()),first=stage(w,await passageBatch(w,r,choice));
  first.workspace.documents[0].excerpt='Edited local source text';
  await assert.rejects(()=>passageBatch(first.workspace,r,choice),/identity conflict/);
});
test('publication/observation timestamps use UTC dates consistently across a midnight offset',async()=>{
  const r=await inspect(await report('Authored fixture: no threat was observed.',{public_updated_at:'2026-10-05T00:15:00+05:30'}));
  r.checkedAt='2026-10-04T19:00:00Z';
  const b=await passageBatch(demoWorkspace(),r,choice);assert.equal(b.records[0].reportedAt,'2026-10-04');assert.equal(b.records[0].recordedAt,'2026-10-04');
});

test('staged public-source content cannot cross into the synthetic backend or match a synthetic model input',async()=>{
  const w=demoWorkspace(),r=await inspect(await report()),next=stage(w,await passageBatch(w,r,choice)).workspace;
  const key=randomBytes(32),time=date.getTime(),store=openWorkspaceStore({file:':memory:',tenantId:'collection-test',key,now:()=>time});
  try{
    const principal={subject:'test-analyst',tenantId:'collection-test',role:'analyst',workspaceIds:['test-desk'],expiresAt:time+60_000};
    assert.throws(()=>store.save(principal,'test-desk',0,next),e=>e.status===400&&e.code==='synthetic_records_required');
    const source=next.documents[0];assert.equal(matchesAnalysisSource(source,{...source,synthetic:true}),false);
  }finally{store.close();key.fill(0);}
});
