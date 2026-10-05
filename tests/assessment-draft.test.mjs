import test from 'node:test';
import assert from 'node:assert/strict';
import {demoWorkspace,createAnalysisCase,attachAnalysisCandidate,considerAnalysis,incorporateDocument,prepareAssessmentFromAnalysis,updateAssessment,stageDocument,serializeWorkspace,parseWorkspace,validateWorkspace,exportAssessment} from '../dist/threat-core.mjs';
import {analysisScenario} from '../dist/analysis-core.mjs';
import {controlCandidates} from '../dist/evaluation-fixtures.mjs';
const at='2026-10-04',caseId='BRIEF-CASE',runId='BRIEF-RUN';
async function setup(scenarioId='dev-conflict'){
  const scenario=analysisScenario(scenarioId),w=createAnalysisCase(demoWorkspace(),{scenarioId,assessmentId:caseId,documentIds:scenario.documents.map((d,i)=>`BRIEF-DOC-${i}`),scope:'Domestic',area:'Fictional context'},at);
  return attachAnalysisCandidate(w,caseId,scenarioId,controlCandidates(scenario.split,'faithful'),runId,at,'Authored control');
}
function incorporate(w,i){const d=w.documents[i];return incorporateDocument(w,d.id,{id:`BRIEF-EV-${i}`,statement:`${d.publisher} states: ${d.excerpt}`,claimState:'Reported',relation:i===0?'Supports':'Challenges',reviewNote:'Authored test only: preserve both accounts and unresolved conflict.',accessAcknowledged:true},at);}
async function ready(){let w=await setup();w=incorporate(incorporate(w,0),1);return considerAnalysis(w,runId,{status:'Considered',reviewNote:'Authored-control workflow test; not a quality grade.'},at);}
const proposalId=w=>w.analysisRuns[0].output.proposals[0]?.id;

test('preparation requires consideration and every cited source incorporated; it mutates no records',async()=>{
  let w=await setup(),before=serializeWorkspace(w);assert.throws(()=>prepareAssessmentFromAnalysis(w,runId,proposalId(w),at),/consideration/);assert.equal(serializeWorkspace(w),before);
  w=considerAnalysis(w,runId,{status:'Considered',reviewNote:'Authored control test.'},at);assert.throws(()=>prepareAssessmentFromAnalysis(w,runId,proposalId(w),at),/every cited source/);w=incorporate(w,0);assert.throws(()=>prepareAssessmentFromAnalysis(w,runId,proposalId(w),at),/every cited source/);w=incorporate(w,1);before=serializeWorkspace(w);const draft=prepareAssessmentFromAnalysis(w,runId,proposalId(w),at);assert.equal(serializeWorkspace(w),before);assert.deepEqual(draft.citedEvidence,['BRIEF-EV-0','BRIEF-EV-1']);assert.equal(draft.status,'Needs review');assert.equal(draft.confidence,'Insufficient');assert.equal(draft.reviewNote,'');assert.equal(w.assessments.at(-1).judgment,'');
});
test('manual application preserves edited starting-point lineage and never marks Reviewed implicitly',async()=>{
  const w=await ready(),draft=prepareAssessmentFromAnalysis(w,runId,proposalId(w),at),next=updateAssessment(w,caseId,{...draft,judgment:`Analyst edit: ${draft.judgment}`},at),c=next.assessments.at(-1);assert.equal(c.status,'Needs review');assert.equal(c.confidence,'Insufficient');assert.match(c.judgment,/Analyst edit/);assert.equal(c.judgmentOrigin.analysisRunId,runId);assert.deepEqual(next.evidence,w.evidence);assert.deepEqual(parseWorkspace(serializeWorkspace(next)),next);const brief=exportAssessment(next,caseId);assert.match(brief,/Judgment starting-point lineage/);assert.match(brief,/BRIEF-EV-0, BRIEF-EV-1/);assert.match(brief,/analyst edits/);
});
test('stale sources/assessment, absent proposals, rejection and abstention cannot become judgments',async()=>{
  const w=await ready();assert.throws(()=>prepareAssessmentFromAnalysis(w,runId,'MISSING',at),/attributed proposal/);const changed=updateAssessment(w,caseId,{gaps:'Changed after model input selection.'},at);assert.throws(()=>prepareAssessmentFromAnalysis(changed,runId,proposalId(w),at),/Stale/);
  const d=w.documents[0],revised=stageDocument(w,{...d,id:'BRIEF-CORRECTION',excerpt:'Fictional source correction.',supersedesDocumentId:d.id,revisionNote:'Changed original account.',accessAcknowledged:true},at);assert.throws(()=>prepareAssessmentFromAnalysis(revised,runId,proposalId(w),at),/Stale/);
  const pending=await setup(),rejected=considerAnalysis(pending,runId,{status:'Rejected',reviewNote:'Authored test rejection.'},at);assert.throws(()=>prepareAssessmentFromAnalysis(rejected,runId,proposalId(rejected),at),/consideration/);
  const abstaining=await setup('dev-no-answer');assert.throws(()=>prepareAssessmentFromAnalysis(abstaining,runId,'anything',at),/abstention/);
});
test('application rechecks source/case currentness after preview and rejects partial citations atomically',async()=>{
  const w=await ready(),draft=prepareAssessmentFromAnalysis(w,runId,proposalId(w),at),changed=updateAssessment(w,caseId,{gaps:'Concurrent update.'},at),before=serializeWorkspace(changed);assert.throws(()=>updateAssessment(changed,caseId,draft,at),/stale/);assert.equal(serializeWorkspace(changed),before);assert.throws(()=>updateAssessment(w,caseId,{...draft,citedEvidence:['BRIEF-EV-0']},at),/every cited source/);assert.throws(()=>updateAssessment(w,caseId,{...draft,question:'Different question'},at),/starting point/);
});
test('status-only edits preserve historical lineage; later manual text/citation changes clear it',async()=>{
  const w=await ready(),draft=prepareAssessmentFromAnalysis(w,runId,proposalId(w),at),applied=updateAssessment(w,caseId,draft,at),reviewed=updateAssessment(applied,caseId,{status:'Reviewed',confidence:'Low',reviewNote:'Both conflicting fictional accounts considered; current status unresolved.',challengesAcknowledged:true},at);assert.ok(reviewed.assessments.at(-1).judgmentOrigin);assert.equal(reviewed.assessments.at(-1).status,'Reviewed');
  const edited=updateAssessment(reviewed,caseId,{judgment:'Fresh analyst wording and interpretation.',status:'Needs review'},at);assert.equal(edited.assessments.at(-1).judgmentOrigin,null);
  const recited=updateAssessment(applied,caseId,{citedEvidence:['BRIEF-EV-0']},at);assert.equal(recited.assessments.at(-1).judgmentOrigin,null);
});
test('restoration rejects invented, cross-case, malformed and chronologically impossible lineage',async()=>{
  const w=await ready(),applied=updateAssessment(w,caseId,prepareAssessmentFromAnalysis(w,runId,proposalId(w),at),at);
  for(const mutate of [x=>x.assessments.at(-1).judgmentOrigin.analysisRunId='MISSING',x=>x.assessments.at(-1).judgmentOrigin.proposalId='MISSING',x=>x.assessments.at(-1).judgmentOrigin.sourceEvidenceIds=['SYN-001'],x=>x.assessments.at(-1).judgmentOrigin.sourceEvidenceIds=['BRIEF-EV-0','BRIEF-EV-0'],x=>x.assessments.at(-1).judgmentOrigin.preparedAt='2026-10-03',x=>x.assessments.at(-1).judgmentOrigin.execute='send',x=>x.analysisRuns[0].status='Rejected',x=>x.assessments.at(-1).citedEvidence.pop()]){const x=structuredClone(applied);mutate(x);assert.throws(()=>validateWorkspace(x));}
  assert.throws(()=>prepareAssessmentFromAnalysis(w,runId,proposalId(w),'2026-02-30'));assert.throws(()=>prepareAssessmentFromAnalysis(w,runId,proposalId(w),'2026-10-03'),/precede/);
});
test('v6 files retain analytical drafts and migrate without invented judgment lineage',async()=>{
  const w=await ready(),v6=structuredClone(w);v6.version=6;for(const c of v6.assessments)delete c.judgmentOrigin;for(const r of v6.analysisRuns)delete r.snapshot.assessment.judgmentOrigin;const restored=validateWorkspace(v6);assert.equal(restored.version,8);assert.ok(restored.assessments.every(c=>c.judgmentOrigin===null));assert.deepEqual(restored.analysisRuns[0].output,w.analysisRuns[0].output);assert.doesNotThrow(()=>prepareAssessmentFromAnalysis(restored,runId,proposalId(w),at));
});
