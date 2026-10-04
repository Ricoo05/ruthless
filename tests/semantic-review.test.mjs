import test from 'node:test';
import assert from 'node:assert/strict';
import {controlCandidates} from '../dist/evaluation-fixtures.mjs';
import {evaluationJSON,evaluateCandidates} from '../dist/evaluation-core.mjs';
import {prepareSemanticReview,recordSemanticReview} from '../dist/review-core.mjs';
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
