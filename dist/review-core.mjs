import {parseEvaluation,evaluationJSON,evaluateCandidates,reviewTemplate} from './evaluation-core.mjs';

export async function prepareSemanticReview(raw){
  const value=parseEvaluation(raw);
  // Recompute the report. Imported execution metadata and approval claims are untrusted.
  const candidates=value?.format==='ruthless-ai-execution'&&value.version===2?value.candidates:value;
  const report=await evaluateCandidates(candidates);
  return {candidates:structuredClone(candidates),review:reviewTemplate(report),report};
}

export async function recordSemanticReview(session,{caseId,reviewerLabel,criteria}){
  const next=structuredClone(session),row=next.report.rows.find(r=>r.caseId===caseId);
  if(!row?.structuralValid)throw new Error('Only structurally valid output can receive a semantic review.');
  if(typeof reviewerLabel!=='string'||!reviewerLabel.trim())throw new Error('Enter a reviewer label.');
  const hasDecisions=next.review.reviews.some(r=>r.criteria.some(c=>c.result!=='Not assessed'));
  if(hasDecisions&&reviewerLabel!==next.review.reviewerLabel)throw new Error('Reviewer label is fixed after the first recorded decision. Start a new review to change it.');
  next.review.reviewerLabel=reviewerLabel;
  next.review.reviews.find(r=>r.caseId===caseId).criteria=structuredClone(criteria);
  next.report=await evaluateCandidates(next.candidates,next.review);
  evaluationJSON(next.review);
  return next;
}
