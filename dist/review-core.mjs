import {parseEvaluation,evaluationJSON,evaluateCandidates,reviewTemplate} from './evaluation-core.mjs';

export async function prepareSemanticReview(raw,reviewRaw=''){
  const value=parseEvaluation(raw);
  // Recompute the report. Imported execution metadata and approval claims are untrusted.
  const bundle=value?.format==='ruthless-semantic-review-session';
  if(typeof reviewRaw!=='string')throw new Error('Recorded review must be JSON text.');
  if(bundle&&(value.version!==1||Object.keys(value).sort().join(',')!=='candidates,format,review,version'))throw new Error('Unsupported or unexpected review session fields.');
  if(bundle&&reviewRaw.trim())throw new Error('A review session already contains its recorded review. Clear the optional review input.');
  const candidates=bundle?value.candidates:value?.format==='ruthless-ai-execution'&&value.version===2?value.candidates:value;
  const imported=bundle?value.review:reviewRaw.trim()?parseEvaluation(reviewRaw):null;
  if((bundle||reviewRaw.trim())&&(!imported||typeof imported!=='object'||Array.isArray(imported)))throw new Error('Recorded review must be a review object.');
  const report=await evaluateCandidates(candidates,imported);
  return {candidates:structuredClone(candidates),review:imported?structuredClone(imported):reviewTemplate(report),report};
}

export async function semanticReviewSessionJSON(session){
  const {candidates,review}=structuredClone(session);
  await evaluateCandidates(candidates,review);
  return evaluationJSON({format:'ruthless-semantic-review-session',version:1,candidates,review});
}

export function semanticReviewHasRecords(session){
  return !!session&&(!!session.review.reviewerLabel.trim()||session.review.reviews.some(r=>r.criteria.some(c=>c.result!=='Not assessed'||c.note.trim())));
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
