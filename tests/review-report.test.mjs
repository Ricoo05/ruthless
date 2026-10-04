import test from 'node:test';
import assert from 'node:assert/strict';
import {controlCandidates} from '../dist/evaluation-fixtures.mjs';
import {evaluationJSON} from '../dist/evaluation-core.mjs';
import {prepareSemanticReview,recordSemanticReview} from '../dist/review-core.mjs';
import {reviewHandoff,reviewHandoffMarkdown} from '../dist/review-report.mjs';
const prepared=()=>prepareSemanticReview(evaluationJSON(controlCandidates('holdout','faithful')));
const decision=(s,index,result='Pass')=>({caseId:s.report.rows[index].caseId,reviewerLabel:'Synthetic UI test reviewer',criteria:s.report.rows[index].criteria.map(c=>({...c,result,note:'Authored test annotation, not an independent human review.'}))});

test('handoff recomputes outcomes, ignores forged report claims and does not mutate assessment/session data',async()=>{
  const session=await prepared();session.report={approved:true,counts:{reviewerChecksSatisfied:6}};const original=structuredClone(session),r=await reviewHandoff(session);
  assert.deepEqual(session,original);assert.equal(r.status,'Review incomplete');assert.equal(r.counts.cases,6);assert.equal(r.counts.needsSemanticReview,6);assert.equal(r.counts.reviewerChecksSatisfied,0);assert.ok(r.notice.includes('operational readiness'));
});
test('missing, invalid, failed, incomplete and satisfied cases stay in the denominator and sort by attention',async()=>{
  const candidates=controlCandidates('holdout','faithful');candidates.responses.pop();candidates.responses[1].output.proposals[0].citations[0].quote='Invented';
  let session=await prepareSemanticReview(evaluationJSON(candidates));session=await recordSemanticReview(session,decision(session,2,'Fail'));session=await recordSemanticReview(session,decision(session,3));
  const r=await reviewHandoff(session);assert.equal(r.counts.cases,6);assert.equal(r.counts.missingOutputs,1);assert.equal(r.counts.invalidOutputs,1);assert.equal(r.counts.semanticReviewFailed,1);assert.equal(r.counts.needsSemanticReview,2);assert.equal(r.counts.reviewerChecksSatisfied,1);assert.equal(r.status,'Structural issues remain');
  assert.deepEqual(r.rows.map(r=>r.status),['Missing output','Invalid output','Semantic review failed','Needs semantic review','Needs semantic review','Reviewer checks satisfied']);
});
test('imported Pass labels cannot make invalid outputs ready or omit them from a handoff',async()=>{
  const session=await prepareSemanticReview(evaluationJSON(controlCandidates('holdout','malformed')));session.review.reviewerLabel='Editable imported label';
  for(const r of session.review.reviews)for(const c of r.criteria){c.result='Pass';c.note='Unverified annotation.';}
  const r=await reviewHandoff(session);assert.equal(r.counts.invalidOutputs,6);assert.equal(r.counts.reviewerChecksSatisfied,0);assert.equal(r.status,'Structural issues remain');assert.ok(r.rows.every(r=>r.status==='Invalid output'));
});
test('stale candidates and input/rubric annotations cannot produce a handoff or Markdown export',async()=>{
  const session=await prepared();session.candidates.responses[0].output.proposals[0].draftStatement+=' Changed.';await assert.rejects(reviewHandoff(session),/Stale or mismatched/);await assert.rejects(reviewHandoffMarkdown(session),/Stale or mismatched/);
  const stale=await prepared();stale.review.inputFingerprint='0'.repeat(64);await assert.rejects(reviewHandoff(stale),/Stale or mismatched/);
});
test('handoff retains Hindi, dates, exact citation spans, shared-source groups and unassessed notes',async()=>{
  const session=await prepared();session.review.reviews[0].criteria[0].note='Awaiting a fluent reviewer.';const r=await reviewHandoff(session),hindi=r.rows.find(r=>r.caseId==='held-hindi'),correction=r.rows.find(r=>r.caseId==='held-correction');
  assert.equal(hindi.criteria[0].note,'Awaiting a fluent reviewer.');assert.equal(hindi.documents[0].excerpt,session.report.rows[0].output.proposals[0].citations[0].quote);assert.deepEqual(hindi.output,session.report.rows[0].output);assert.equal(correction.documents.length,2);assert.equal(new Set(correction.documents.map(d=>d.originGroup)).size,1);
  const raw=await reviewHandoffMarkdown(session);assert.ok(raw.includes(hindi.documents[0].excerpt));assert.ok(raw.includes('Cases: 6;'));assert.ok(raw.includes(r.candidateFingerprint));assert.ok(raw.includes('UTF-16 0–'));assert.ok(raw.includes('Awaiting a fluent reviewer'));
});
test('Markdown neutralizes markup in imported labels, drafts and review notes',async()=>{
  const candidates=controlCandidates('development','faithful');candidates.candidateLabel='<img src=x> **claimed provider**';candidates.responses[0].output.proposals[0].draftStatement='<script>untrusted</script> ![image](https://example.invalid)';
  const session=await prepareSemanticReview(evaluationJSON(candidates));session.review.reviews[0].criteria[0].note='<script>note</script>';const raw=await reviewHandoffMarkdown(session);
  assert.ok(!raw.includes('<script>'));assert.ok(!raw.includes('<img src=x>'));assert.ok(raw.includes('\\<script\\>'));assert.ok(raw.includes('\\!\\[image\\]\\(https://example'));
});
test('handoff snapshots before asynchronous hashing and all-recorded checks remain explicitly unverified',async()=>{
  let session=await prepared();for(let i=0;i<6;i++)session=await recordSemanticReview(session,decision(session,i));const label=session.candidates.candidateLabel,pending=reviewHandoff(session);session.candidates.candidateLabel='Changed during hashing';const r=await pending;
  assert.equal(r.candidateLabel,label);assert.equal(r.status,'Recorded checks satisfied');assert.equal(r.counts.reviewerChecksSatisfied,6);assert.ok(r.notice.includes('unverified'));assert.ok(r.notice.includes('model quality'));
});
