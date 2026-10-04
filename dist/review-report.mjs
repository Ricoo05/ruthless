import {evaluateCandidates,evaluationJSON} from './evaluation-core.mjs';
import {EVALUATION_CASES,CRITERIA} from './evaluation-fixtures.mjs';

const priority={'Missing output':0,'Invalid output':1,'Semantic review failed':2,'Needs semantic review':3,'Reviewer checks satisfied':4};
export async function reviewHandoff(session){
  const {candidates,review}=structuredClone(session);
  // Never trust a stored report or its claimed counts/readiness.
  const report=await evaluateCandidates(candidates,review);
  const rows=report.rows.map(row=>{
    const c=EVALUATION_CASES.find(c=>c.id===row.caseId);
    const hasOutput=candidates.responses.some(r=>r.caseId===row.caseId);
    const status=!hasOutput?'Missing output':!row.structuralValid?'Invalid output':row.outcome;
    return {...row,status,question:c.question,guidance:c.guidance,documents:structuredClone(c.documents),failedCriteria:row.criteria.filter(c=>c.result==='Fail').map(c=>c.id),unassessedCriteria:row.criteria.filter(c=>c.result==='Not assessed').map(c=>c.id)};
  }).sort((a,b)=>priority[a.status]-priority[b.status]);
  const counts={...report.counts,missingOutputs:rows.filter(r=>r.status==='Missing output').length,invalidOutputs:rows.filter(r=>r.status==='Invalid output').length};
  const status=counts.structurallyInvalid?'Structural issues remain':counts.semanticReviewFailed?'Review failures remain':counts.needsSemanticReview?'Review incomplete':'Recorded checks satisfied';
  const result={format:'ruthless-review-handoff',version:1,suiteId:report.suiteId,suiteVersion:report.suiteVersion,split:report.split,candidateLabel:report.candidateLabel,reviewerLabel:report.reviewerLabel,inputFingerprint:report.inputFingerprint,candidateFingerprint:report.candidateFingerprint,status,counts,criteria:structuredClone(CRITERIA),rows,notice:'Synthetic review handoff only. All selected-suite cases remain in the total. Missing/invalid outputs cannot pass semantic review. Recorded labels and notes are editable and unverified; checks satisfied does not establish model quality, independent review, agency approval or operational readiness. No model request or assessment write is made.'};
  evaluationJSON(result);
  return result;
}

const md=v=>String(v??'').replace(/\r\n?/g,'\n').replace(/([\\`*_{}\[\]()<>#+.!|~-])/g,'\\$1');
const quote=v=>md(v).split('\n').map(line=>'> '+line).join('\n');
export async function reviewHandoffMarkdown(session){
  const r=await reviewHandoff(session),c=r.counts;
  const lines=['# Ruthless — synthetic review handoff','',`Status: ${r.status}`,`Candidate label (unverified): ${md(r.candidateLabel)}`,`Reviewer label (unverified): ${md(r.reviewerLabel||'None recorded')}`,`Suite: ${md(r.suiteId)} / ${r.suiteVersion} / ${md(r.split)}`,'',`Cases: ${c.cases}; missing outputs: ${c.missingOutputs}; invalid outputs: ${c.invalidOutputs}; semantic failures: ${c.semanticReviewFailed}; needs review: ${c.needsSemanticReview}; recorded checks satisfied: ${c.reviewerChecksSatisfied}.`,'',r.notice,'',`Input/rubric SHA-256: ${r.inputFingerprint}`,`Candidates SHA-256: ${r.candidateFingerprint}`];
  for(const row of r.rows){
    lines.push('',`## ${md(row.caseId)} — ${row.status}`,'',md(row.question));
    if(row.error)lines.push('',`Structural error: ${md(row.error)}`);
    lines.push('',`Authored review guidance: ${md(row.guidance)}`,'','### Recorded criteria');
    for(const k of row.criteria)lines.push('',`- ${md(k.id)}: ${k.result}. ${md(r.criteria[k.id])}`,`  Note: ${md(k.note||'No note recorded')}`);
    if(row.output?.abstention)lines.push('','### Abstention','',md(row.output.abstention));
    for(const p of row.output?.proposals??[]){
      lines.push('',`### Draft ${md(p.id)}`,'',md(p.draftStatement),'',`Limitations: ${md(p.limitations)}`);
      for(const q of p.citations)lines.push('',`Citation: ${md(q.documentId)} / UTF-16 ${q.start}–${q.end}`,'',quote(q.quote));
    }
    lines.push('','### Retained source context');
    for(const d of row.documents)lines.push('',`Source: ${md(d.publisher)} / ${md(d.id)}`,`Date: ${d.reportedAt}; language: ${md(d.language)}; source group: ${md(d.originGroup)}`,`Locator: ${md(d.locator)}; conditions: ${md(d.accessNote)}`,'',quote(d.excerpt));
  }
  const raw=lines.join('\n')+'\n';
  if(new TextEncoder().encode(raw).length>2_000_000)throw new Error('Handoff exceeds 2 MB in UTF-8.');
  return raw;
}
