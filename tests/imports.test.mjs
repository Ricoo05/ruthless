import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {demoWorkspace,serializeWorkspace,parseWorkspace,validateWorkspace} from '../dist/threat-core.mjs';
import {trainingSourceBatch,importSourceBatch,parseSourceBatch} from '../dist/source-import.mjs';
const at='2026-10-04',assessmentId='training-domestic',batch=()=>trainingSourceBatch(assessmentId,at);
const options={batchId:'BATCH-1',idForRecord:(r,i)=>`IMPORT-${i}`,at,accessAcknowledged:true};

test('synthetic import stages originals/repost/correction with reciprocal lineage and no new evidence',()=>{
  const w=demoWorkspace(),result=importSourceBatch(w,batch(),options),next=result.workspace;assert.equal(result.added.length,3);assert.equal(next.documents.length,3);assert.deepEqual(next.evidence,w.evidence);assert.equal(next.documents[2].supersedesDocumentId,next.documents[0].id);assert.equal(next.documents[0].originGroup,next.documents[1].originGroup);assert.equal(next.importBatches[0].sourceSystem,batch().sourceSystem);assert.equal(w.documents.length,0);assert.deepEqual(parseWorkspace(serializeWorkspace(next)),next);
});
test('unchanged external IDs skip without adding a ledger/history or invalidating current work',()=>{
  const initial=importSourceBatch(demoWorkspace(),batch(),options).workspace,raw=serializeWorkspace(initial),repeat=importSourceBatch(initial,batch(),{...options,batchId:'BATCH-2'});assert.equal(repeat.workspace,initial);assert.equal(repeat.added.length,0);assert.equal(repeat.skipped.length,3);assert.equal(serializeWorkspace(initial),raw);
  const changed=batch();changed.records[0].excerpt='Changed silently.';assert.throws(()=>importSourceBatch(initial,changed,{...options,batchId:'BATCH-2'}),/new external ID/);assert.equal(serializeWorkspace(initial),raw);
});
test('malformed later rows, missing dates, unknown cases and executable fields reject the entire batch',()=>{
  const w=demoWorkspace(),raw=serializeWorkspace(w);
  for(const mutate of [b=>b.records[2].reportedAt='',b=>b.records[2].assessmentId='missing',b=>b.records[2].accessNote='',b=>b.records[2].language='',b=>b.records[2].url='javascript:alert(1)',b=>b.records[2].recordedAt='2026-10-05',b=>b.records[2].execute='send_files',b=>b.records[2].reviewNote='approved',b=>b.records[2].synthetic=false]){const b=batch();mutate(b);assert.throws(()=>importSourceBatch(w,b,options));assert.equal(serializeWorkspace(w),raw);}
});
test('a later mixed batch skips existing records and links a new correction to an earlier import',()=>{
  const original=importSourceBatch(demoWorkspace(),batch(),options).workspace,raw=serializeWorkspace(original),b=batch();
  b.records=[b.records[1],{...b.records[2],externalRecordId:'training-correction-2',supersedesExternalRecordId:'training-correction',excerpt:'Second fictional correction: cause and attribution remain unresolved.',revisionNote:'Clarifies that attribution also remains unknown.'}];
  const result=importSourceBatch(original,b,{...options,batchId:'BATCH-2',idForRecord:()=> 'IMPORT-NEXT'});
  assert.equal(result.skipped.length,1);assert.equal(result.added.length,1);assert.equal(result.workspace.importBatches.length,2);assert.deepEqual(result.workspace.importBatches[1].documentIds,['IMPORT-NEXT']);
  const next=result.workspace.documents.find(d=>d.id==='IMPORT-NEXT');assert.equal(next.supersedesDocumentId,'IMPORT-2');assert.equal(next.importBatchId,'BATCH-2');assert.deepEqual(parseWorkspace(serializeWorkspace(result.workspace)),result.workspace);assert.equal(serializeWorkspace(original),raw);
});
test('batch acknowledgement, unique IDs, bounded records, permissions and format are required',()=>{
  assert.throws(()=>importSourceBatch(demoWorkspace(),batch(),{...options,accessAcknowledged:false}),/Confirm source/);
  for(const mutate of [b=>b.permissionNote='',b=>b.sourceSystem='invalid space',b=>b.records.push(b.records[0]),b=>b.records=[],b=>b.records=Array(51).fill(b.records[0]),b=>b.version=2,b=>b.tools=[]]){const b=batch();mutate(b);assert.throws(()=>importSourceBatch(demoWorkspace(),b,options));}
  assert.throws(()=>importSourceBatch(demoWorkspace(),batch(),{...options,idForRecord:()=> 'SAME-ID'}),/identifier already/);
  const w=importSourceBatch(demoWorkspace(),batch(),options).workspace;assert.throws(()=>importSourceBatch(w,batch(),options),/batch identifier already/);
});
test('correction dependencies must be present and ordered; duplicate content with a new identity is rejected',()=>{
  const forward=batch();forward.records=[forward.records[2],forward.records[0],forward.records[1]];assert.throws(()=>importSourceBatch(demoWorkspace(),forward,options),/appear earlier/);
  const duplicate=batch();duplicate.records[1]={...duplicate.records[0],externalRecordId:'duplicate-content'};assert.throws(()=>importSourceBatch(demoWorkspace(),duplicate,options),/already in the intake/);
  const foreign=batch();foreign.records[2].publisher='Other publisher';assert.throws(()=>importSourceBatch(demoWorkspace(),foreign,options),/retain publisher/);
});
test('real-source rows require HTTPS and recorded conditions but no source is fetched',()=>{
  const b=batch();b.records=b.records.slice(0,1);b.records[0].synthetic=false;assert.throws(()=>importSourceBatch(demoWorkspace(),b,options),/source URL/);b.records[0].url='https://example.org/test-reference';b.records[0].accessNote='Test-only authorization assertion; no real material collected.';const result=importSourceBatch(demoWorkspace(),b,options);assert.equal(result.workspace.documents[0].synthetic,false);assert.equal(result.workspace.evidence.length,4);
});
test('restore rejects forged batch/document lineage, external identity duplicates and batch bounds',()=>{
  const w=importSourceBatch(demoWorkspace(),batch(),options).workspace;
  for(const mutate of [x=>x.documents[0].importBatchId='missing',x=>x.documents[0].externalRecordId='',x=>x.importBatches[0].documentIds.pop(),x=>x.documents[1].externalRecordId=x.documents[0].externalRecordId,x=>x.importBatches[0].stagedAt='2026-10-03',x=>x.importBatches[0].permissionNote='',x=>x.importBatches=Array(41).fill(x.importBatches[0])]){const x=structuredClone(w);mutate(x);assert.throws(()=>validateWorkspace(x));}
  assert.throws(()=>parseSourceBatch(JSON.stringify({text:'क'.repeat(700000)})),/2 MB/);assert.throws(()=>parseSourceBatch('{broken'),/valid JSON/);
});
test('offline importer writes a new valid workspace and leaves inputs and existing outputs intact',()=>{
  const dir=mkdtempSync(join(tmpdir(),'ruthless-import-')),files=['workspace.json','batch.json','result.json'],cli=fileURLToPath(new URL('../scripts/import-documents.mjs',import.meta.url)),run=args=>execFileSync(process.execPath,[cli,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  try{const original=serializeWorkspace(demoWorkspace());writeFileSync(join(dir,files[0]),original);writeFileSync(join(dir,files[1]),JSON.stringify(batch()));const args=['--workspace',join(dir,files[0]),'--batch',join(dir,files[1]),'--out',join(dir,files[2]),'--at',at];assert.throws(()=>run(args),e=>e.status===1);const response=JSON.parse(run([...args,'--acknowledge-source-conditions']));assert.equal(response.added.length,3);assert.equal(response.evidenceAutomaticallyAdded,0);assert.equal(parseWorkspace(readFileSync(join(dir,files[2]),'utf8')).importBatches.length,1);const result=readFileSync(join(dir,files[2]),'utf8');assert.throws(()=>run([...args,'--acknowledge-source-conditions']),e=>e.status===1);assert.equal(readFileSync(join(dir,files[2]),'utf8'),result);assert.equal(readFileSync(join(dir,files[0]),'utf8'),original);
  }finally{for(const f of files)try{unlinkSync(join(dir,f));}catch(e){if(e.code!=='ENOENT')throw e;}rmdirSync(dir);}
});
