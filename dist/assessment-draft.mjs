import {analysisIsCurrent} from './analysis-core.mjs';

export function draftEvidenceIds(workspace,run,proposal){
  return [...new Set(proposal.citations.map(q=>q.documentId))].map(documentId=>{
    const source=run.snapshot.sources.find(s=>s.documentId===documentId);
    const evidence=workspace.evidence.find(e=>e.assessmentId===run.assessmentId&&e.sourceDocumentId===source?.document.id);
    if(!evidence)throw new Error('Review and incorporate every cited source before preparing an assessment.');
    return evidence.id;
  });
}
export function assessmentDraft(workspace,runId,proposalId,at){
  const run=workspace.analysisRuns.find(r=>r.id===runId),proposal=run?.output.proposals.find(p=>p.id===proposalId);
  if(!run||!proposal)throw new Error('Select an attributed proposal; an abstention cannot become an assessment judgment.');
  if(run.status!=='Considered')throw new Error('Record consideration of this draft before preparing an assessment.');
  if(!analysisIsCurrent(workspace,run))throw new Error('Stale draft: selected case inputs changed. Attach a new draft for the current inputs.');
  if(at<run.reviewedAt)throw new Error('Assessment preparation cannot precede draft consideration.');
  const citedEvidence=draftEvidenceIds(workspace,run,proposal);
  return {
    assessmentId:run.assessmentId,
    judgment:proposal.draftStatement,
    gaps:proposal.limitations,
    citedEvidence,
    status:'Needs review',confidence:'Insufficient',reviewNote:'',
    judgmentOrigin:{analysisRunId:run.id,proposalId:proposal.id,preparedAt:at,sourceEvidenceIds:[...citedEvidence]}
  };
}
