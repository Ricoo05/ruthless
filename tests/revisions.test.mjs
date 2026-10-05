import test from 'node:test';
import assert from 'node:assert/strict';
import {demoWorkspace,stageDocument,incorporateDocument,updateAssessment,validateWorkspace,parseWorkspace,serializeWorkspace,createFixtureProposal,reviewProposal,proposalIsCurrent,documentIsCurrent,requiredRevisionIds,exportAssessment,evidenceSummary,addTask,updateTask} from '../dist/threat-core.mjs';
const at='2026-10-04',assessmentId='training-domestic';
const original={id:'DOC-OLD',assessmentId,title:'Original fictional report',publisher:'Fictional source',originGroup:'fictional-origin',url:'',reportedAt:'2026-10-03',recordedAt:at,language:'English',locator:'Paragraph 1',accessNote:'Synthetic material authored for testing.',excerpt:'A fictional publisher alleges damage; confirmation is absent.',synthetic:true};
const correction={...original,id:'DOC-NEW',title:'Fictional correction',reportedAt:at,excerpt:'The allegation is withdrawn. कारण अज्ञात है 🛰️.',supersedesDocumentId:original.id,revisionNote:'Publisher withdraws the earlier allegation.',accessAcknowledged:true};
const staged=()=>stageDocument(demoWorkspace(),original,at);
const incorporated=()=>incorporateDocument(staged(),original.id,{id:'EV-OLD',statement:'Fictional source alleges damage; confirmation remains absent.',claimState:'Reported',relation:'Supports',reviewNote:'Attribution and uncertainty retained.',accessAcknowledged:true},at);
const review={status:'Reviewed',asOf:at,confidence:'Low',judgment:'Attribution remains unestablished.',gaps:'No independent confirmation.',reviewNote:'Conflicting account considered.',citedEvidence:['EV-OLD','SYN-003'],challengesAcknowledged:true};

test('a linked correction preserves earlier source/evidence/judgment and reopens Reviewed immediately',()=>{
  const w=updateAssessment(incorporated(),assessmentId,review,at),next=stageDocument(w,correction,at);
  assert.deepEqual(next.documents[0],w.documents[0]);assert.deepEqual(next.evidence,w.evidence);assert.equal(next.assessments[0].status,'Needs review');assert.equal(next.assessments[0].judgment,review.judgment);
  assert.equal(next.documents[1].reviewNote,'');assert.equal(documentIsCurrent(next,original.id),false);assert.equal(documentIsCurrent(next,correction.id),true);assert.deepEqual(requiredRevisionIds(next,next.assessments[0]),[correction.id]);assert.equal(next.history.at(-1).action,'Source revision staged');
});
test('corrections require source acknowledgement, changed text, same provenance and valid dates atomically',()=>{
  const w=staged(),raw=serializeWorkspace(w);
  for(const patch of [{accessAcknowledged:false},{revisionNote:''},{excerpt:original.excerpt},{publisher:'Different publisher'},{originGroup:'different'},{synthetic:false,url:'https://example.org'},{reportedAt:'2026-10-02'},{recordedAt:'2026-10-03'},{assessmentId:'training-global'},{supersedesDocumentId:'missing'},{id:original.id}])assert.throws(()=>stageDocument(w,{...correction,...patch},at));
  assert.throws(()=>stageDocument(w,{...correction,recordedAt:'2026-10-05'},at),/precede/);assert.equal(serializeWorkspace(w),raw);
});
test('revision chains cannot branch or cycle and retain a single current descendant',()=>{
  const w=stageDocument(staged(),correction,at);assert.throws(()=>stageDocument(w,{...correction,id:'DOC-BRANCH',excerpt:'Different correction.'},at),/latest/);
  const chain=stageDocument(w,{...correction,id:'DOC-LATEST',supersedesDocumentId:correction.id,excerpt:'Another correction: status remains unknown.',revisionNote:'Second correction.'},at);assert.equal(documentIsCurrent(chain,correction.id),false);assert.equal(documentIsCurrent(chain,'DOC-LATEST'),true);
  const cyclic=structuredClone(w);cyclic.documents[0].supersedesDocumentId=correction.id;cyclic.documents[0].revisionNote='Cycle';cyclic.documents[0].reportedAt=at;assert.throws(()=>validateWorkspace(cyclic),/cycle/);
});
test('superseded sources cannot be incorporated or proposed; pending fixtures become stale',()=>{
  const pending=createFixtureProposal(staged(),original.id,'RUN-OLD','PROP-OLD',at),w=stageDocument(pending,correction,at);assert.equal(proposalIsCurrent(w,w.proposalRuns[0]),false);
  assert.throws(()=>incorporateDocument(w,original.id,{id:'EV',statement:'Old',claimState:'Reported',relation:'Context',reviewNote:'Note',accessAcknowledged:true},at),/superseded/);
  assert.throws(()=>createFixtureProposal(w,original.id,'RUN-X','PROP-X',at),/superseded/);
  assert.throws(()=>reviewProposal(w,'RUN-OLD','PROP-OLD',{status:'Accepted',evidenceId:'EV',reviewNote:'Reviewed',claimState:'Reported',relation:'Context',accessAcknowledged:true},at),/Stale/);
  const rejected=reviewProposal(w,'RUN-OLD','PROP-OLD',{status:'Rejected',reviewNote:'Source corrected.'},at);assert.equal(rejected.evidence.length,4);
});
test('reviewing affected citations requires explicit revision acknowledgement and current as-of date',()=>{
  const w=stageDocument(updateAssessment(incorporated(),assessmentId,review,at),correction,at);
  assert.throws(()=>updateAssessment(w,assessmentId,review,at),/Acknowledge revisions/);
  assert.throws(()=>updateAssessment(w,assessmentId,{...review,revisionsAcknowledged:true,asOf:'2026-10-03'},at),/revisions later/);
  const reviewed=updateAssessment(w,assessmentId,{...review,revisionsAcknowledged:true,reviewNote:'The original allegation is withdrawn; judgment remains cautious.'},at);assert.deepEqual(reviewed.assessments[0].reviewedRevisionIds,[correction.id]);assert.equal(reviewed.assessments[0].status,'Reviewed');
  const forged=structuredClone(reviewed);forged.assessments[0].reviewedRevisionIds=[];assert.throws(()=>parseWorkspace(JSON.stringify(forged)),/acknowledge revisions/);
  const next=stageDocument(reviewed,{...correction,id:'DOC-THIRD',supersedesDocumentId:correction.id,excerpt:'The publisher issues a further fictional clarification.'},at);assert.equal(next.assessments[0].status,'Needs review');assert.deepEqual(requiredRevisionIds(next,next.assessments[0]),['DOC-NEW','DOC-THIRD']);
});
test('restore rejects orphan, cross-case and mismatched revision acknowledgements',()=>{
  const w=stageDocument(staged(),correction,at);
  for(const mutate of [x=>x.documents[1].supersedesDocumentId='missing',x=>x.documents[1].assessmentId='training-global',x=>x.documents[1].revisionNote='',x=>x.assessments[0].reviewedRevisionIds=['DOC-OLD'],x=>x.assessments[1].reviewedRevisionIds=['DOC-NEW'],x=>x.assessments[0].reviewedRevisionIds=['DOC-NEW','DOC-NEW']]){const x=structuredClone(w);mutate(x);assert.throws(()=>parseWorkspace(JSON.stringify(x)));}
});
test('briefs retain both excerpts and flag historical evidence and task outputs without changing task status',()=>{
  let w=addTask(incorporated(),{id:'TASK-OLD',assessmentId,title:'Compare fictional statement',scope:'Authorized synthetic comparison.',owner:'Training label',dueAt:at},at);w=updateTask(w,'TASK-OLD',{status:'Completed',resultNote:'Recorded comparison.',linkedEvidence:['EV-OLD']},at);w=stageDocument(w,correction,at);
  assert.equal(w.tasks[0].status,'Completed');assert.equal(evidenceSummary(w,assessmentId).supersededRecords,1);
  const brief=exportAssessment(w,assessmentId);for(const text of ['SOURCE SUPERSEDED','DOC-OLD','DOC-NEW','Source revisions','linked evidence has a superseded source'])assert.ok(brief.includes(text));assert.ok(brief.includes(original.excerpt));assert.ok(brief.includes('कारण अज्ञात है 🛰️.'));
  assert.deepEqual(parseWorkspace(serializeWorkspace(w)),w);
});
test('accepted historical fixture lineage survives revision and v4 migration invents no revisions',()=>{
  const proposed=createFixtureProposal(staged(),original.id,'RUN-OLD','PROP-OLD',at),accepted=reviewProposal(proposed,'RUN-OLD','PROP-OLD',{status:'Accepted',evidenceId:'EV-OLD',reviewNote:'Synthetic attributed statement reviewed.',claimState:'Reported',relation:'Context',accessAcknowledged:true},at),revised=stageDocument(accepted,correction,at);
  assert.equal(parseWorkspace(serializeWorkspace(revised)).proposalRuns[0].proposals[0].status,'Accepted');
  const legacy={...accepted,version:4};delete legacy.importBatches;legacy.documents[0].supersedesDocumentId='forged';legacy.documents[0].revisionNote='forged';legacy.assessments[0].reviewedRevisionIds=['forged'];
  const migrated=parseWorkspace(JSON.stringify(legacy));assert.equal(migrated.version,8);assert.deepEqual(migrated.importBatches,[]);assert.equal(migrated.documents[0].supersedesDocumentId,'');assert.deepEqual(migrated.assessments[0].reviewedRevisionIds,[]);assert.equal(migrated.proposalRuns[0].proposals[0].status,'Accepted');
});
