import {compareReports} from './report-links.mjs';
import {compareContextMentions} from './context-hints.mjs';

export const WARNING_LINK_FILTERS=['All leads','Date mismatch','Opposing evidence stances','Same source group','Across cases'];

export function warningConnections(workspace,window) {
  const comparison=compareReports(workspace,window);
  const pairs=comparison.pairs.map(pair=>{
    const context=compareContextMentions(pair);
    const opposingStances=(pair.left.relation==='Supports'&&pair.right.relation==='Challenges')||(pair.right.relation==='Supports'&&pair.left.relation==='Challenges');
    return {...pair,left:{...pair.left,dateMentions:context.left},right:{...pair.right,dateMentions:context.right},dateContext:context.date,opposingStances};
  });
  // Keep cosine ordering and every retained pair, including mismatches/denials.
  // These are context checks, not validated semantic event-resolution rules.
  return {...comparison,kind:'warning_report_leads',pairs};
}

export function selectWarningConnections(report,filter='All leads') {
  if(!WARNING_LINK_FILTERS.includes(filter))throw new Error('Choose a supported report-lead filter.');
  return report.pairs.filter(p=>filter==='All leads'||filter==='Date mismatch'&&p.dateContext.relation==='Mismatch'||filter==='Opposing evidence stances'&&p.opposingStances||filter==='Same source group'&&p.sameRecordedGroup||filter==='Across cases'&&p.crossCase);
}

export function warningLinkTaskContext(workspace,window,leftKey,rightKey) {
  const report=warningConnections(workspace,window),p=report.pairs.find(p=>p.left.recordKey===leftKey&&p.right.recordKey===rightKey);
  if(!p)return null;
  return {assessmentId:p.left.assessmentId,title:`Verify report connection: ${p.left.title}`.slice(0,180),scope:`Compare ${p.left.recordKey} (case ${p.left.assessmentId}) with ${p.right.recordKey} (case ${p.right.assessmentId}), ${report.window.from} to ${report.window.to} / ${report.window.scope}. Lexical cosine ${p.similarity.toFixed(3)}; date mentions ${p.dateContext.relation}; ${p.sameRecordedGroup?'same':'different'} recorded group labels; ${p.opposingStances?'opposing assigned evidence stances':'no Supports/Challenges contrast'}. Inspect both full original passages, negation, event-time interpretation, source dependence and later corrections. Explain same-event, repost, conflicting-account, unrelated-event or unresolved interpretations with exact quotations. Use permitted sources. ${p.crossCase?'Review findings in each case separately; this task belongs to the first case. ':''}Do not merge reports or treat similarity as corroboration or an attack prediction.`};
}
