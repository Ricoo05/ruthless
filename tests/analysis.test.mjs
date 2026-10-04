import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoWorkspace,createAnalysisCase,attachAnalysisCandidate,considerAnalysis,analysisIsCurrent,parseWorkspace,serializeWorkspace,validateWorkspace,stageDocument,updateAssessment,incorporateDocument,exportAssessment} from '../dist/threat-core.mjs';
import {analysisScenario} from '../dist/analysis-core.mjs';
import {controlCandidates} from '../dist/evaluation-fixtures.mjs';
const at='2026-10-04',caseId='analysis-case';
const create=(scenarioId='dev-conflict',w=demoWorkspace())=>createAnalysisCase(w,{scenarioId,assessmentId:caseId,documentIds:analysisScenario(scenarioId).documents.map((d,i)=>`CASE-DOC-${i}`),scope:'Domestic',area:'India / fictional training context'},at);
const attach=(w,scenarioId='dev-conflict',candidates=controlCandidates(analysisScenario(scenarioId).split,'faithful'))=>attachAnalysisCandidate(w,caseId,scenarioId,candidates,'RUN-1',at);

test('a question and every selected report enter a new case atomically with no evidence or judgment',()=>{
  const w=demoWorkspace(),before=serializeWorkspace(w),next=create();assert.equal(next.assessments.length,4);assert.equal(next.documents.length,2);assert.equal(next.assessments.at(-1).question,analysisScenario('dev-conflict').question);assert.equal(next.assessments.at(-1).status,'Draft');assert.deepEqual(next.evidence,w.evidence);assert.equal(serializeWorkspace(w),before);
  assert.throws(()=>createAnalysisCase(w,{scenarioId:'dev-conflict',assessmentId:caseId,documentIds:['same','same'],scope:'Domestic',area:'Fictional'},at));assert.equal(serializeWorkspace(w),before);
  assert.throws(()=>createAnalysisCase(w,{scenarioId:'dev-conflict',assessmentId:caseId,documentIds:['A','B'],scope:'Domestic',area:'Fictional'},'2026-10-03'),/precede/);
});
test('multi-report output is source-bound in a case inbox and consideration never inserts evidence',async()=>{
  const w=create(),next=await attach(w);assert.equal(next.analysisRuns.length,1);const run=next.analysisRuns[0];assert.equal(run.status,'Pending');assert.equal(run.snapshot.sources.length,2);assert.equal(run.output.proposals[0].citations.length,2);assert.ok(analysisIsCurrent(next,run));assert.deepEqual(next.evidence,w.evidence);assert.deepEqual(next.assessments,w.assessments);
  const reviewed=considerAnalysis(next,run.id,{status:'Considered',reviewNote:'Authored control for the test only.'},at);assert.equal(reviewed.analysisRuns[0].status,'Considered');assert.deepEqual(reviewed.evidence,w.evidence);assert.deepEqual(reviewed.assessments,w.assessments);assert.deepEqual(parseWorkspace(serializeWorkspace(reviewed)),reviewed);
});
test('invalid/missing/wrong-split responses and wrong questions do not alter the workspace',async()=>{
  const w=create(),before=serializeWorkspace(w);for(const c of [controlCandidates('development','malformed'),{...controlCandidates('development','faithful'),responses:[]},controlCandidates('holdout','faithful')])await assert.rejects(attach(w,'dev-conflict',c));await assert.rejects(attachAnalysisCandidate(w,'training-domestic','dev-conflict',controlCandidates('development','faithful'),'R',at),/question/);assert.equal(serializeWorkspace(w),before);
});
test('revised source blocks reattachment and consideration but preserves the original draft for rejection',async()=>{
  const w=await attach(create()),d=w.documents[0],next=stageDocument(w,{...d,id:'CORRECTION',excerpt:'Fictional correction: earlier wording withdrawn.',supersedesDocumentId:d.id,revisionNote:'Test source withdrawal.',accessAcknowledged:true},at),run=next.analysisRuns[0];assert.equal(analysisIsCurrent(next,run),false);assert.deepEqual(run.output,w.analysisRuns[0].output);assert.throws(()=>considerAnalysis(next,run.id,{status:'Considered',reviewNote:'Cannot rely on superseded input.'},at),/Stale/);await assert.rejects(attachAnalysisCandidate(next,caseId,'dev-conflict',controlCandidates('development','faithful'),'NEW',at),/current matching/);const rejected=considerAnalysis(next,run.id,{status:'Rejected',reviewNote:'Selected source was withdrawn.'},at);assert.equal(rejected.analysisRuns[0].status,'Rejected');assert.deepEqual(parseWorkspace(serializeWorkspace(rejected)),rejected);
});
test('assessment changes make draft snapshots stale while intake notes preserve source currentness',async()=>{
  const w=await attach(create()),changed=updateAssessment(w,caseId,{gaps:'Further corroboration required.'},at);assert.equal(analysisIsCurrent(changed,changed.analysisRuns[0]),false);
  const intake=incorporateDocument(w,w.documents[0].id,{id:'NEW-EVIDENCE',statement:'The first fictional account reports that the training facility was open.',claimState:'Reported',relation:'Context',reviewNote:'Manual attribution and conditions checked.',accessAcknowledged:true},at);assert.equal(analysisIsCurrent(intake,intake.analysisRuns[0]),true);assert.equal(intake.analysisRuns[0].status,'Pending');
});
test('restoration rejects forged source bindings, output citations, invalid states, dates and duplicate runs',async()=>{
  const w=await attach(create());for(const mutate of [x=>x.analysisRuns[0].snapshot.sources[0].document.excerpt='Forged',x=>x.analysisRuns[0].snapshot.sources[0].document.id='UNKNOWN',x=>x.analysisRuns[0].snapshot.sources[1].documentId='D-D1',x=>x.analysisRuns[0].output.proposals[0].citations[0].quote='Invented',x=>x.analysisRuns[0].status='Approved',x=>x.analysisRuns[0].tools=['hack'],x=>x.analysisRuns[0].createdAt='2026-10-03',x=>x.analysisRuns.push(x.analysisRuns[0]),x=>x.analysisRuns[0].status='Considered']){const x=structuredClone(w);mutate(x);assert.throws(()=>validateWorkspace(x));}
  assert.throws(()=>considerAnalysis(w,'RUN-1',{status:'Considered',reviewNote:''},at));assert.throws(()=>considerAnalysis(w,'RUN-1',{status:'Rejected',reviewNote:'Reason'},'2026-10-03'));
});
test('old workspace versions migrate with an empty analysis inbox and existing records retained',()=>{
  const w=demoWorkspace();for(const version of [1,2,3,4,5]){const previous={...w,version};delete previous.analysisRuns;const restored=validateWorkspace(previous);assert.equal(restored.version,7);assert.deepEqual(restored.analysisRuns,[]);assert.deepEqual(restored.evidence,w.evidence);}
});
test('Hindi, repost groups, abstentions and source instructions remain attributed data',async()=>{
  for(const scenarioId of ['held-hindi','dev-repost','dev-no-answer','dev-instructions']){const w=await attach(create(scenarioId),scenarioId),r=w.analysisRuns[0],s=analysisScenario(scenarioId);assert.deepEqual(r.output,controlCandidates(s.split,'faithful').responses.find(x=>x.caseId===scenarioId).output);assert.equal(r.snapshot.sources.length,s.documents.length);assert.deepEqual(w.evidence,demoWorkspace().evidence);assert.equal(w.assessments.at(-1).status,'Draft');}
});
test('existing real-model candidate can enter a case without changing its meaning or claiming approval',async()=>{
  const candidates=JSON.parse(readFileSync(new URL('../dist/examples/reserved-candidates.json',import.meta.url),'utf8')),w=await attach(create('held-hindi'),'held-hindi',candidates);assert.equal(w.analysisRuns[0].kind,'Imported candidate');assert.equal(w.analysisRuns[0].status,'Pending');assert.deepEqual(w.analysisRuns[0].output,candidates.responses.find(r=>r.caseId==='held-hindi').output);assert.deepEqual(w.evidence,demoWorkspace().evidence);
});
test('limits and asynchronous input snapshots preserve the original workspace',async()=>{
  const w=create(),candidates=controlCandidates('development','faithful'),promise=attach(w,'dev-conflict',candidates);candidates.responses.find(r=>r.caseId==='dev-conflict').output.proposals[0].draftStatement='Mutation after validation started';const next=await promise;assert.notEqual(next.analysisRuns[0].output.proposals[0].draftStatement,'Mutation after validation started');const full={...next,analysisRuns:Array.from({length:40},(_,i)=>({...next.analysisRuns[0],id:`R-${i}`}))};await assert.rejects(attachAnalysisCandidate(full,caseId,'dev-conflict',controlCandidates('development','faithful'),'OVER',at),/40 analytical/);assert.equal(w.analysisRuns.length,0);
});
test('brief preserves cited drafts separately from evidence and escapes imported Markdown',async()=>{
  const candidates=controlCandidates('development','faithful');candidates.candidateLabel='<img src=x> [hostile](https://example.org)';const w=await attach(create(),'dev-conflict',candidates),brief=exportAssessment(w,caseId);assert.match(brief,/Case-linked analytical drafts/);assert.match(brief,/separate from assessment evidence/);assert.match(brief,/D-D1/);assert.match(brief,/D-D2/);assert.match(brief,/UTF-16/);assert.doesNotMatch(brief,/<img src=x>|\[hostile\]\(https/);const next=updateAssessment(w,caseId,{gaps:'Missing corroboration.'},at);assert.match(exportAssessment(next,caseId),/STALE INPUTS/);assert.deepEqual(next.evidence,w.evidence);
});
