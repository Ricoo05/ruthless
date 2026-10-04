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
export function scanSignals(input,settings) {
  const workspace=validateWorkspace(input),query=signalQuery(settings),cases=new Map(workspace.assessments.map(c=>[c.id,c]));
  // Scan retained original excerpts where available. An incorporated source
  // is not counted again from its analyst statement; staged sources stay staged.
  const availableDocuments=workspace.documents.filter(d=>d.reportedAt<=query.to&&d.recordedAt<=query.to);
  const rows=[...availableDocuments.filter(d=>!availableDocuments.some(next=>next.supersedesDocumentId===d.id)).map(d=>({...d,kind:'source_excerpt',text:d.excerpt,claimState:'Not incorporated',relation:'Unassigned',evidenceId:workspace.evidence.find(e=>e.sourceDocumentId===d.id)?.id??''})),...workspace.evidence.filter(e=>!e.sourceDocumentId).map(e=>({...e,kind:'analyst_statement',text:e.statement,evidenceId:e.id}))];
  for(const row of rows)if(row.evidenceId){const e=workspace.evidence.find(e=>e.id===row.evidenceId);row.claimState=e.claimState;row.relation=e.relation;}
  const matches=[];
  for(const row of rows) {
    const c=cases.get(row.assessmentId);if((query.scope!=='All'&&c.scope!==query.scope)||row.reportedAt<query.from||row.reportedAt>query.to||row.recordedAt>query.to)continue;
    const hits=query.terms.map(term=>({term,...spans(row.text,term)})).filter(h=>h.count);
    if(!hits.length||(query.mode==='all'&&hits.length!==query.terms.length))continue;
    matches.push({recordId:row.id,assessmentId:row.assessmentId,caseTitle:c.title,scope:c.scope,area:c.area,kind:row.kind,title:row.title,publisher:row.publisher,originGroup:row.originGroup,reportedAt:row.reportedAt,recordedAt:row.recordedAt,synthetic:row.synthetic,sourceURL:row.url,locator:row.locator??'',accessNote:row.accessNote??'',text:row.text,claimState:row.claimState,relation:row.relation,evidenceId:row.evidenceId,hits});
  }
  const caseMatches=workspace.assessments.map(c=>{const records=matches.filter(r=>r.assessmentId===c.id),groups=new Set(records.map(r=>r.originGroup.toLocaleLowerCase('en-US')));return {assessmentId:c.id,title:c.title,scope:c.scope,area:c.area,recordCount:records.length,sourceGroupCount:groups.size,thresholdMet:groups.size>=query.minGroups,challengingCount:records.filter(r=>r.relation==='Challenges').length,recordIds:records.map(r=>r.recordId)};}).filter(c=>c.recordCount);
  const sourceGroups=[...new Set(matches.map(r=>r.originGroup.toLocaleLowerCase('en-US')))].map(key=>{const records=matches.filter(r=>r.originGroup.toLocaleLowerCase('en-US')===key);return {label:records[0].originGroup,recordIds:records.map(r=>r.recordId),assessmentIds:[...new Set(records.map(r=>r.assessmentId))]};});
  return {kind:'literal_indicator_triage',query,recordsScanned:rows.filter(r=>r.reportedAt>=query.from&&r.reportedAt<=query.to&&r.recordedAt<=query.to&&(query.scope==='All'||cases.get(r.assessmentId).scope===query.scope)).length,matches:matches.sort((a,b)=>a.reportedAt.localeCompare(b.reportedAt)||a.recordId.localeCompare(b.recordId)),cases:caseMatches,sourceGroups,limitations:['Literal matches include negations, allegations and benign contexts. No semantic threat classification is performed.','Source groups and provenance are analyst-supplied and do not prove independent corroboration.','No match does not mean no threat. Missing, late or differently worded reports may be missed.','Thresholds prioritize review only; they are not attack probabilities, actor links or agency approvals.']};
}
