import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {EVALUATION_CASES,exportedInputs,controlCandidates} from '../dist/evaluation-fixtures.mjs';
import {evaluateCandidates,reviewTemplate,parseEvaluation,evaluationJSON,evaluationFingerprint} from '../dist/evaluation-core.mjs';
const allReviewed=report=>{const v=reviewTemplate(report);v.reviewerLabel='Synthetic test reviewer — not an authenticated identity';for(const r of v.reviews)for(const c of r.criteria){c.result='Pass';c.note='Synthetic unit-test annotation; not an independent quality assessment.';}return v;};

test('12 fictional cases are separated into two input-only exports without rubric or controls',()=>{
  assert.equal(EVALUATION_CASES.length,12);const development=exportedInputs('development'),holdout=exportedInputs('holdout');assert.equal(development.cases.length,6);assert.equal(holdout.cases.length,6);
  assert.ok(!development.cases.some(c=>holdout.cases.some(h=>h.id===c.id)));for(const c of [...development.cases,...holdout.cases]){assert.deepEqual(Object.keys(c),['id','question','documents']);assert.ok(c.documents.every(d=>d.synthetic));}
  const raw=JSON.stringify(holdout);assert.ok(raw.includes('कारण'));assert.ok(raw.includes('🛰️'));assert.ok(!raw.includes('controls'));assert.ok(!raw.includes('guidance'));assert.throws(()=>exportedInputs('other'));
  development.cases[0].documents[0].excerpt='changed';assert.notEqual(EVALUATION_CASES[0].documents[0].excerpt,'changed');
});
test('faithful and semantically misleading controls both pass structure but remain unreviewed',async()=>{
  for(const split of ['development','holdout'])for(const kind of ['faithful','misleading']){const report=await evaluateCandidates(controlCandidates(split,kind));assert.equal(report.counts.structurallyValid,6);assert.equal(report.counts.needsSemanticReview,6);assert.equal(report.counts.reviewerChecksSatisfied,0);assert.ok(report.rows.every(r=>r.criteria.every(c=>c.result==='Not assessed')));}
});
test('invented source quotes are blocked in every case, without suppressing the denominator',async()=>{
  for(const split of ['development','holdout']){const r=await evaluateCandidates(controlCandidates(split,'malformed'));assert.equal(r.counts.cases,6);assert.equal(r.counts.structurallyInvalid,6);assert.equal(r.counts.reviewerChecksSatisfied,0);assert.ok(r.rows.every(row=>row.error.includes('quote does not match')));}
});
test('missing responses are explicit; duplicate, unknown or wrong-split records are rejected',async()=>{
  const missing=controlCandidates('development','faithful');missing.responses.pop();const r=await evaluateCandidates(missing);assert.equal(r.counts.cases,6);assert.equal(r.counts.structurallyInvalid,1);assert.equal(r.rows.at(-1).error,'Missing case response.');
  for(const mutate of [v=>v.responses.push(v.responses[0]),v=>v.responses[0].caseId='held-hindi',v=>v.responses[0].caseId='invented',v=>v.execute='run',v=>v.responses[0].tool='send_files']){const v=controlCandidates('development','faithful');mutate(v);await assert.rejects(evaluateCandidates(v));}
});
test('candidate fields and citations cannot smuggle commands, forged documents or unsupported limits',async()=>{
  for(const mutate of [v=>v.responses[0].output.execute='run',v=>v.responses[0].output.proposals[0].tools=[],v=>v.responses[0].output.proposals[0].citations[0].documentId='invented',v=>v.responses[0].output.proposals[0].draftStatement='x'.repeat(4001),v=>v.responses[0].output.proposals.push(v.responses[0].output.proposals[0]),v=>v.responses[0].output.abstention='unsupported',v=>v.responses[0].output.proposals[0].citations[0].start=-1]){const v=controlCandidates('development','faithful');mutate(v);const r=await evaluateCandidates(v);assert.equal(r.rows[0].structuralValid,false);assert.equal(r.counts.structurallyInvalid,1);}
});
test('manual checks require every applicable criterion, reviewer label and explanatory notes',async()=>{
  const v=controlCandidates('development','faithful'),r=await evaluateCandidates(v),template=reviewTemplate(r);
  assert.equal((await evaluateCandidates(v,template)).counts.needsSemanticReview,6);
  for(const mutate of [a=>a.reviews.pop(),a=>a.reviews[0].criteria.pop(),a=>a.reviews[0].criteria[0].id='other',a=>a.reviews[0].criteria[0].result='Approved',a=>a.reviews[0].criteria.push(a.reviews[0].criteria[0]),a=>a.reviews[0].criteria[0].note='',a=>a.reviewerLabel='']){const a=allReviewed(r);mutate(a);await assert.rejects(evaluateCandidates(v,a));}
  const reviewed=await evaluateCandidates(v,allReviewed(r));assert.equal(reviewed.counts.reviewerChecksSatisfied,6);assert.equal(reviewed.counts.needsSemanticReview,0);assert.ok(reviewed.notice.includes('not authenticated or tamper protected'));
});
test('semantic failures are kept even with valid citations; reviewer checks cannot rescue invalid structure',async()=>{
  const v=controlCandidates('development','misleading'),r=await evaluateCandidates(v),a=allReviewed(r);a.reviews[0].criteria[0]={id:'attribution',result:'Fail',note:'Control upgrades an attributed allegation to an established fact.'};
  const failed=await evaluateCandidates(v,a);assert.equal(failed.counts.structurallyValid,6);assert.equal(failed.counts.semanticReviewFailed,1);assert.equal(failed.rows[0].outcome,'Semantic review failed');
  const malformed=controlCandidates('development','malformed'),blocked=await evaluateCandidates(malformed);const cannotOverride=await evaluateCandidates(malformed,allReviewed(blocked));assert.equal(cannotOverride.counts.structurallyInvalid,6);assert.equal(cannotOverride.counts.reviewerChecksSatisfied,0);
});
test('review hashes bind input/rubric, split and candidate version; reordered object keys are stable',async()=>{
  const v=controlCandidates('development','faithful'),r=await evaluateCandidates(v),a=allReviewed(r),changed=structuredClone(v);changed.responses[0].output.proposals[0].draftStatement+=' Altered.';await assert.rejects(evaluateCandidates(changed,a),/Stale or mismatched/);
  for(const mutate of [x=>x.inputFingerprint='changed',x=>x.split='holdout',x=>x.candidateFingerprint='changed',x=>x.suiteVersion=2]){const changed=structuredClone(a);mutate(changed);await assert.rejects(evaluateCandidates(v,changed),/Stale or mismatched/);}
  assert.equal(await evaluationFingerprint({b:2,a:{d:4,c:3}}),await evaluationFingerprint({a:{c:3,d:4},b:2}));
});
test('async evaluation snapshots caller data and UTF-8 limits apply before parsing or hashing',async()=>{
  const v=controlCandidates('development','faithful'),original=structuredClone(v),promise=evaluateCandidates(v);v.responses[0].output.proposals[0].draftStatement='Concurrent change';const r=await promise;assert.equal(r.candidateFingerprint,await evaluationFingerprint(original));
  const oversized=JSON.stringify({text:'क'.repeat(700000)});assert.throws(()=>parseEvaluation(oversized),/2 MB/);assert.throws(()=>evaluationJSON({text:'क'.repeat(700000)}),/2 MB/);assert.throws(()=>parseEvaluation('{bad'),/valid JSON/);
});
test('offline CLI exports, checks and creates review templates; blocks invalid controls and overwrites',()=>{
  const dir=mkdtempSync(join(tmpdir(),'ruthless-eval-')),files=['inputs.json','candidate.json','report.json','review.json','bad.json'],cli=fileURLToPath(new URL('../scripts/evaluate.mjs',import.meta.url));
  const run=args=>execFileSync(process.execPath,[cli,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  try{
    run(['inputs','--split','holdout','--out',join(dir,files[0])]);assert.equal(JSON.parse(readFileSync(join(dir,files[0]),'utf8')).cases.length,6);
    run(['controls','--split','development','--kind','faithful','--out',join(dir,files[1])]);
    const summary=JSON.parse(run(['check','--input',join(dir,files[1]),'--out',join(dir,files[2]),'--template',join(dir,files[3])]));assert.equal(summary.counts.needsSemanticReview,6);assert.equal(summary.semanticApproval,false);
    const raw=readFileSync(join(dir,files[2]),'utf8');assert.throws(()=>run(['check','--input',join(dir,files[1]),'--out',join(dir,files[2])]),e=>e.status===1);assert.equal(readFileSync(join(dir,files[2]),'utf8'),raw);
    writeFileSync(join(dir,files[4]),evaluationJSON(controlCandidates('development','malformed')));assert.throws(()=>run(['check','--input',join(dir,files[4])]),e=>e.status===2);assert.throws(()=>run(['check','--unknown','x']),e=>e.status===1);
  }finally{for(const f of files)try{unlinkSync(join(dir,f));}catch(e){if(e.code!=='ENOENT')throw e;}rmdirSync(dir);}
});
