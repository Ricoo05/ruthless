import {validateWorkspace,day} from './threat-core.mjs';

export function signalQuery({terms='',mode='any',from,to,minGroups=1,scope='All'}={}) {
  if(typeof terms!=='string'||terms.length>648)throw new Error('Use at most eight literal terms of up to 80 characters each.');
  const needles=terms.split(',').map(t=>t.trim()).filter(Boolean);
  if(!needles.length||needles.length>8||needles.some(t=>t.length>80))throw new Error('Enter one to eight comma-separated literal terms.');
  if(!['any','all'].includes(mode)||!['All','Domestic','Cross-border','International'].includes(scope)||!Number.isInteger(minGroups)||minGroups<1||minGroups>10)throw new Error('Invalid signal query settings.');
  day(from);day(to);if(from>to)throw new Error('Start date must be no later than the as-of date.');
  return {terms:[...new Set(needles.map(t=>t.toLocaleLowerCase('en-US')))],mode,from,to,minGroups,scope};
}
function spans(text,term) {
  const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  let count=0;const matches=[];for(const m of text.matchAll(new RegExp(escaped,'giu'))){count++;if(matches.length<20)matches.push({start:m.index,end:m.index+m[0].length,quote:m[0]});}return {spans:matches,count};
}
function latestWorkspaceActivity(workspace) {
  // This distinguishes a current workspace view from a historical replay. It
  // does not authenticate editable history or reconstruct earlier labels.
  const dates=[...workspace.history.map(h=>h.at),...workspace.documents.map(d=>d.recordedAt),...workspace.evidence.map(e=>e.recordedAt),
    ...workspace.tasks.map(t=>t.updatedAt),...workspace.importBatches.map(b=>b.stagedAt),
    ...workspace.proposalRuns.flatMap(r=>[r.createdAt,...r.proposals.map(p=>p.reviewedAt)]),
    ...workspace.analysisRuns.flatMap(r=>[r.createdAt,r.reviewedAt]),...workspace.linkReviews.map(r=>r.createdAt)];
  return dates.filter(Boolean).reduce((latest,date)=>date>latest?date:latest,'');
}
function sourceAnalystMetadata(workspace,document,evidence,to,currentView) {
  const pending={evidenceId:'',claimState:'Not incorporated',relation:'Unassigned',reviewNote:'',incorporationState:'Not incorporated',incorporatedAt:'',analystMetadataBasis:'No linked evidence'};
  if(!evidence)return pending;
  // Evidence inherits the source's recordedAt, not the date of incorporation.
  // Only an exact workflow-history binding or an accepted proposal has that
  // date in workspace v8. Missing/conflicting provenance cannot be backdated.
  const note=`${document.id} → ${evidence.id}: analyst reviewed source conditions and statement; not independent verification`;
  const dates=workspace.history.filter(h=>h.assessmentId===document.assessmentId&&h.action==='Document incorporated'&&h.note===note).map(h=>h.at);
  if(evidence.proposalRunId){
    const run=workspace.proposalRuns.find(r=>r.id===evidence.proposalRunId),proposal=run?.proposals.find(p=>p.id===evidence.proposalId);
    if(proposal?.status==='Accepted'&&proposal.evidenceId===evidence.id)dates.push(proposal.reviewedAt);
  }
  const distinct=[...new Set(dates)];
  if(distinct.length!==1||distinct[0]<document.recordedAt)return {...pending,claimState:'Unknown',relation:'Unknown',incorporationState:'Unknown',analystMetadataBasis:'Incorporation date unavailable or inconsistent'};
  const incorporatedAt=distinct[0];
  if(incorporatedAt>to)return {...pending,analystMetadataBasis:'Incorporation occurs after cutoff'};
  const known={evidenceId:evidence.id,incorporationState:'Incorporated',incorporatedAt};
  // No prior claimState/relation/reviewNote snapshots exist. Historical views
  // retain the known incorporation, but must not borrow current annotations.
  if(!currentView)return {...pending,...known,claimState:'Unknown',relation:'Unknown',analystMetadataBasis:'Historical analyst labels unavailable'};
  return {...pending,...known,claimState:evidence.claimState,relation:evidence.relation,reviewNote:document.reviewNote,analystMetadataBasis:'Current workspace labels; no historical label snapshot'};
}
function currentRows(workspace,{from,to,scope='All'}) {
  day(from);day(to);if(from>to||!['All','Domestic','Cross-border','International'].includes(scope))throw new Error('Invalid report comparison window.');
  const cases=new Map(workspace.assessments.map(c=>[c.id,c]));
  // Scan retained original excerpts where available. An incorporated source
  // is not counted again from its analyst statement; staged sources stay staged.
  const availableDocuments=workspace.documents.filter(d=>d.reportedAt<=to&&d.recordedAt<=to),currentView=to>=latestWorkspaceActivity(workspace);
  const rows=[...availableDocuments.filter(d=>!availableDocuments.some(next=>next.supersedesDocumentId===d.id)).map(d=>({...d,kind:'source_excerpt',text:d.excerpt,...sourceAnalystMetadata(workspace,d,workspace.evidence.find(e=>e.sourceDocumentId===d.id),to,currentView)})),...workspace.evidence.filter(e=>!e.sourceDocumentId).map(e=>({...e,kind:'analyst_statement',text:e.statement,evidenceId:e.id}))];
  return rows.filter(row=>row.reportedAt>=from&&row.reportedAt<=to&&row.recordedAt<=to&&(scope==='All'||cases.get(row.assessmentId).scope===scope)).map(row=>({...row,recordKey:`${row.kind}:${row.id}`,caseTitle:cases.get(row.assessmentId).title,scope:cases.get(row.assessmentId).scope,area:cases.get(row.assessmentId).area}));
}
export function currentReportRecords(input,window){return currentRows(validateWorkspace(input),window);}
export function scanSignals(input,settings) {
  const workspace=validateWorkspace(input),query=signalQuery(settings),cases=new Map(workspace.assessments.map(c=>[c.id,c])),rows=currentRows(workspace,query);
  const matches=[];
  for(const row of rows) {
    const c=cases.get(row.assessmentId);if((query.scope!=='All'&&c.scope!==query.scope)||row.reportedAt<query.from||row.reportedAt>query.to||row.recordedAt>query.to)continue;
    const hits=query.terms.map(term=>({term,...spans(row.text,term)})).filter(h=>h.count);
    if(!hits.length||(query.mode==='all'&&hits.length!==query.terms.length))continue;
    matches.push({recordId:row.id,assessmentId:row.assessmentId,caseTitle:c.title,scope:c.scope,area:c.area,kind:row.kind,title:row.title,publisher:row.publisher,originGroup:row.originGroup,reportedAt:row.reportedAt,recordedAt:row.recordedAt,synthetic:row.synthetic,sourceURL:row.url,locator:row.locator??'',accessNote:row.accessNote??'',text:row.text,claimState:row.claimState,relation:row.relation,evidenceId:row.evidenceId,...(row.kind==='source_excerpt'?{incorporationState:row.incorporationState,incorporatedAt:row.incorporatedAt,analystMetadataBasis:row.analystMetadataBasis}:{}),hits});
  }
  const caseMatches=workspace.assessments.map(c=>{const records=matches.filter(r=>r.assessmentId===c.id),groups=new Set(records.map(r=>r.originGroup.toLocaleLowerCase('en-US')));return {assessmentId:c.id,title:c.title,scope:c.scope,area:c.area,recordCount:records.length,sourceGroupCount:groups.size,thresholdMet:groups.size>=query.minGroups,challengingCount:records.filter(r=>r.relation==='Challenges').length,recordIds:records.map(r=>r.recordId)};}).filter(c=>c.recordCount);
  const sourceGroups=[...new Set(matches.map(r=>r.originGroup.toLocaleLowerCase('en-US')))].map(key=>{const records=matches.filter(r=>r.originGroup.toLocaleLowerCase('en-US')===key);return {label:records[0].originGroup,recordIds:records.map(r=>r.recordId),assessmentIds:[...new Set(records.map(r=>r.assessmentId))]};});
  return {kind:'literal_indicator_triage',query,recordsScanned:rows.length,matches:matches.sort((a,b)=>a.reportedAt.localeCompare(b.reportedAt)||a.recordId.localeCompare(b.recordId)),cases:caseMatches,sourceGroups,limitations:['Literal matches include negations, allegations and benign contexts. No semantic threat classification is performed.','Source groups and provenance are analyst-supplied and do not prove independent corroboration.','No match does not mean no threat. Missing, late or differently worded reports may be missed.','Thresholds prioritize review only; they are not attack probabilities, actor links or agency approvals.']};
}
