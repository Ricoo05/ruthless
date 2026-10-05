import {currentReportRecords} from './signals-core.mjs';
import {extractContextMentions} from './context-hints.mjs';
import {validateWorkspace} from './threat-core.mjs';

// A case is an analyst-assigned container, not an automatically resolved event.
// Review rules operate on provenance/context gaps, never on inferred intent.
export function warningReview(workspace,window) {
  workspace=validateWorkspace(workspace);
  const rows=currentReportRecords(workspace,window).map(r=>({...r,dateMentions:extractContextMentions(r.text)}));
  const cases=workspace.assessments.map(c=>{
    const records=rows.filter(r=>r.assessmentId===c.id).sort((a,b)=>a.recordedAt.localeCompare(b.recordedAt)||a.reportedAt.localeCompare(b.reportedAt)||a.recordKey.localeCompare(b.recordKey));
    const groups=new Map();
    for(const r of records){const key=r.originGroup.trim().toLocaleLowerCase('en-US');if(!groups.has(key))groups.set(key,{label:r.originGroup,recordKeys:[]});groups.get(key).recordKeys.push(r.recordKey);}
    const pending=records.filter(r=>r.kind==='source_excerpt'&&!r.evidenceId),challenges=records.filter(r=>r.relation==='Challenges');
    const uncertainDates=records.filter(r=>r.dateMentions.dateState!=='Single'||r.dateMentions.dates[0]?.year===null);
    const rules=[];
    if(pending.length)rules.push({code:'pending-intake',label:'Review unincorporated sources',count:pending.length,recordKeys:pending.map(r=>r.recordKey),reason:'These passages are staged source material; their meaning has not been incorporated as evidence.'});
    if(challenges.length)rules.push({code:'challenging-evidence',label:'Examine challenging evidence',count:challenges.length,recordKeys:challenges.map(r=>r.recordKey),reason:'The analyst assigned Challenges to these records. Resolve alternatives before relying on the assessment.'});
    const repeated=[...groups.values()].filter(g=>g.recordKeys.length>1);
    if(repeated.length)rules.push({code:'source-dependence',label:'Check repeated source groups',count:repeated.length,recordKeys:repeated.flatMap(g=>g.recordKeys),reason:'Repeated group labels can represent dependent reporting. They do not establish either independence or a confirmed repost.'});
    if(records.length&&groups.size===1)rules.push({code:'single-group',label:'Seek independent source context',count:records.length,recordKeys:records.map(r=>r.recordKey),reason:'Only one recorded source group is represented in this window. Multiple records are not independent confirmation.'});
    if(uncertainDates.length)rules.push({code:'date-context',label:'Resolve date uncertainty',count:uncertainDates.length,recordKeys:uncertainDates.map(r=>r.recordKey),reason:'The limited parser found missing, multiple, invalid or yearless date mentions. Publication dates are not event dates; even a unique date needs interpretation.'});
    return {assessmentId:c.id,title:c.title,scope:c.scope,area:c.area,recordCount:records.length,groups:[...groups.values()],rules,timeline:records.slice(-30),hiddenTimelineCount:Math.max(0,records.length-30)};
  }).filter(c=>c.recordCount);
  return {kind:'source_context_review',window:{from:window.from,to:window.to,scope:window.scope??'All'},recordsScanned:rows.length,cases,reviewCaseCount:cases.filter(c=>c.rules.length).length,limitations:['Cases use existing analyst assignments; reports are not merged into events and no actors are linked.','Every review reason is a provenance or context rule, not a terrorism classifier, threat probability or predicted incident.','The desk refreshes on opening or applying a window. It does not fetch sources or run in the background.','English/Hindi named dates and ISO dates are supported. Relative dates, other languages and event-time attachment require analyst review.','Source groups and evidence stances are editable analyst metadata, not independently verified facts.']};
}

export function warningTaskContext(workspace,window,assessmentId) {
  const report=warningReview(workspace,window),c=report.cases.find(c=>c.assessmentId===assessmentId);
  if(!c||!c.rules.length)return null;
  const keys=[...new Set(c.rules.flatMap(r=>r.recordKeys))],refs=keys.slice(0,8);
  return {assessmentId,title:`Verify source context: ${c.title}`.slice(0,180),scope:`Source-context review, ${report.window.from} to ${report.window.to} / ${report.window.scope}. Case ${c.assessmentId}. Review reasons: ${c.rules.map(r=>r.label).join('; ')}. Retained record references (${refs.length} of ${keys.length}): ${refs.join(', ')}. Reopen the current desk and check later corrections before acting. Compare original passages, challenging accounts, event-date uncertainty and source dependence. Seek permitted independent confirmation and document alternative explanations with linked evidence. These are context gaps, not an attack prediction.`.slice(0,1500)};
}
