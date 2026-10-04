import test from 'node:test';
import assert from 'node:assert/strict';
import {controlCandidates} from '../dist/evaluation-fixtures.mjs';
import {evaluationJSON,evaluateCandidates} from '../dist/evaluation-core.mjs';
import {prepareSemanticReview,recordSemanticReview,semanticReviewSessionJSON,semanticReviewHasRecords} from '../dist/review-core.mjs';
const prepared=()=>prepareSemanticReview(evaluationJSON(controlCandidates('holdout','faithful')));
const decision=s=>({caseId:s.report.rows[0].caseId,reviewerLabel:'Fictional reviewer',criteria:s.review.reviews[0].criteria.map(c=>({...c,result:'Pass',note:'Synthetic test annotation only; not a human quality assessment.'}))});

test('opening execution rechecks candidates and ignores imported report and approval claims',async()=>{
  const candidates=controlCandidates('holdout','malformed');
  const session=await prepareSemanticReview(evaluationJSON({format:'ruthless-ai-execution',version:2,candidates,report:{approved:true},reviewerLabel:'Forged'}));
  assert.equal(session.report.counts.structurallyInvalid,6);assert.equal(session.review.reviewerLabel,'');assert.ok(session.review.reviews.every(r=>r.criteria.every(c=>c.result==='Not assessed')));
  await assert.rejects(recordSemanticReview(session,decision(session)),/structurally valid/);
});
test('recording one review retains other cases unassessed, source/output fingerprints and exact Hindi quotes',async()=>{
  const session=await prepared(),original=structuredClone(session),next=await recordSemanticReview(session,decision(session));
  assert.deepEqual(session,original);assert.deepEqual(next.candidates,session.candidates);assert.equal(next.review.candidateFingerprint,session.review.candidateFingerprint);assert.equal(next.review.inputFingerprint,session.review.inputFingerprint);
  assert.equal(next.report.counts.reviewerChecksSatisfied,1);assert.equal(next.report.counts.needsSemanticReview,5);assert.equal(next.report.counts.cases,6);
  assert.deepEqual(await evaluateCandidates(next.candidates,JSON.parse(evaluationJSON(next.review))),next.report);
});
test('missing reviewer, incomplete criteria and unexplained decisions fail atomically',async()=>{
  const session=await prepared(),before=structuredClone(session),valid=decision(session);
  for(const patch of [{reviewerLabel:''},{criteria:valid.criteria.slice(1)},{criteria:valid.criteria.map(c=>({...c,note:''}))},{criteria:valid.criteria.map(c=>({...c,result:'Approved'}))},{caseId:'invented'}])await assert.rejects(recordSemanticReview(session,{...valid,...patch}));
  assert.deepEqual(session,before);
});
test('failure and partial review cannot become satisfied, reviewer relabeling rejects',async()=>{
  const session=await prepared(),input=decision(session);input.criteria[0].result='Fail';const failed=await recordSemanticReview(session,input);assert.equal(failed.report.counts.semanticReviewFailed,1);
  await assert.rejects(recordSemanticReview(failed,{...decision(failed),reviewerLabel:'Another person'}),/fixed/);
  input.criteria[0].result='Not assessed';const partial=await recordSemanticReview(failed,input);assert.equal(partial.report.counts.needsSemanticReview,6);assert.equal(partial.report.counts.reviewerChecksSatisfied,0);
});
test('changed candidate or source fingerprint blocks old annotations',async()=>{
  const session=await prepared();session.candidates.responses[0].output.proposals[0].draftStatement+=' Altered.';
  await assert.rejects(recordSemanticReview(session,decision(session)),/Stale or mismatched/);
});
test('wrong suite, unsupported execution, executable candidate fields and over-limit input reject',async()=>{
  const value=controlCandidates('holdout','faithful');value.responses[0].output.proposals[0].execute='operation';const malformed=await prepareSemanticReview(evaluationJSON(value));assert.equal(malformed.report.rows[0].structuralValid,false);
  await assert.rejects(prepareSemanticReview(JSON.stringify({format:'ruthless-ai-execution',version:1,candidates:value})));
  await assert.rejects(prepareSemanticReview(' '.repeat(2_000_001)),/2 MB/);
  const wrong=controlCandidates('holdout','faithful');wrong.suiteVersion=99;await assert.rejects(prepareSemanticReview(evaluationJSON(wrong)),/Unsupported/);
});

test('resumable review round trip preserves partial decisions, notes, Hindi sources and reviewer label',async()=>{
  const initial=await prepared(),input=decision(initial);input.criteria[0].result='Fail';input.criteria[1].result='Not assessed';input.criteria[1].note='Awaiting an independent reviewer; synthetic test record.';
  const recorded=await recordSemanticReview(initial,input),raw=await semanticReviewSessionJSON(recorded),restored=await prepareSemanticReview(raw);
  assert.deepEqual(restored,recorded);assert.equal(restored.report.counts.semanticReviewFailed,1);assert.equal(restored.report.counts.needsSemanticReview,5);
  const changed=decision(restored);changed.criteria[0].result='Not assessed';const continued=await recordSemanticReview(restored,changed);assert.equal(continued.report.counts.reviewerChecksSatisfied,0);assert.equal(continued.report.counts.needsSemanticReview,6);
});
test('old separate review files can be resumed only with the exact candidates and source fingerprint',async()=>{
  const recorded=await recordSemanticReview(await prepared(),decision(await prepared()));
  const restored=await prepareSemanticReview(evaluationJSON(recorded.candidates),evaluationJSON(recorded.review));assert.deepEqual(restored,recorded);
  for(const mutation of [v=>v.review.inputFingerprint='0'.repeat(64),v=>v.candidates.responses[0].output.proposals[0].draftStatement+=' Changed.']){
    const altered=structuredClone(recorded);mutation(altered);await assert.rejects(prepareSemanticReview(evaluationJSON(altered.candidates),evaluationJSON(altered.review)),/Stale or mismatched/);
  }
  assert.equal(recorded.report.counts.reviewerChecksSatisfied,1);
});
test('review-session import is atomic and rejects injected claims, ambiguous reviews and invalid decisions',async()=>{
  const initial=await prepared(),bundle=JSON.parse(await semanticReviewSessionJSON(initial));
  for(const patch of [{version:2},{approved:true},{report:{approved:true}},{review:null}])await assert.rejects(prepareSemanticReview(evaluationJSON({...bundle,...patch})));
  await assert.rejects(prepareSemanticReview(evaluationJSON(bundle),evaluationJSON(initial.review)),/already contains/);
  await assert.rejects(prepareSemanticReview(evaluationJSON(initial.candidates),'null'),/review object/);
  const invalid=structuredClone(bundle);invalid.review.reviews[0].criteria[0].result='Pass';await assert.rejects(prepareSemanticReview(evaluationJSON(invalid)),/reviewer label/);
  assert.deepEqual(await prepareSemanticReview(evaluationJSON(bundle)),initial);
});
test('serialized sessions revalidate fingerprints and enforce a combined UTF-8 limit',async()=>{
  const stale=await prepared();stale.review.candidateFingerprint='0'.repeat(64);await assert.rejects(semanticReviewSessionJSON(stale),/Stale or mismatched/);
  const valid=await prepared(),raw=await semanticReviewSessionJSON(valid);assert.ok(Buffer.byteLength(raw)<2_000_000);
  await assert.rejects(prepareSemanticReview(' '.repeat(2_000_001)),/2 MB/);
});
test('unassessed notes and reviewer labels require loss protection, empty templates do not',async()=>{
  const initial=await prepared();assert.equal(semanticReviewHasRecords(initial),false);assert.equal(semanticReviewHasRecords(null),false);
  const notes=structuredClone(initial);notes.review.reviews[0].criteria[0].note='Pending linguistic review.';assert.equal(semanticReviewHasRecords(notes),true);
  notes.review.reviews[0].criteria[0].note='';notes.review.reviewerLabel='A reviewer';assert.equal(semanticReviewHasRecords(notes),true);
});
